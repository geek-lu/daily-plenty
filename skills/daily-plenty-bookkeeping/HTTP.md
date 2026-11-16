<!--
[INPUT]: Daily Plenty 现有 HTTP 路由、输入校验和 API 密钥契约。
[OUTPUT]: agent 可直接执行的鉴权、查询、新增及仅 AI 可修改的请求说明。
[POS]: SKILL.md 的按需接口参考，仅使用相对路径和运行时变量。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# HTTP 契约

所有路径相对于外部配置 `DAILY_PLENTY_BASE_URL`。请求体使用 `Content-Type: application/json`；金额都是整数分。正常响应直接为下述对象，没有通用 `data` 包装。错误为 `{ "error": "说明", "code": "错误码" }`，校验错误另含 `details`。`code` 可能是通用错误码，应结合 HTTP 状态与 `error` 判断。

## API Key 鉴权

任一可记账成员在网页「我们 → API 密钥」为账本生成共享密钥，在宿主私有配置中保存为 `DAILY_PLENTY_API_KEY`。所有请求携带 `Authorization: Bearer <运行时密钥>`，无需账号密码或 Cookie。密钥仅属于账本，生成者只用于审计；撤销或账本归档后返回 401，生成者退出或禁用不影响密钥。无效 Bearer 不回退 Cookie。

权限开放：GET `/api/ledgers`、`/api/ledgers/{ledgerId}/recorders`、`/api/ledgers/{ledgerId}/data`、`/api/ledgers/{ledgerId}/entries`、`/api/ledgers/{ledgerId}/reports`，以及 POST `/api/ledgers/{ledgerId}/entries`、GET/PATCH `/api/ledgers/{ledgerId}/entries/{id}`；PATCH 仅允许 AI 创建的账单。其他受保护接口（包括 `/api/users/me`）需要网页登录，返回 403 `SESSION_REQUIRED`。跨账本访问返回 403 `LEDGER_SCOPE_MISMATCH`。

日常调用按意图使用 `scripts/create.py`、`scripts/update.py`、`scripts/query.py`，鉴权与禁止重定向已由脚本处理。以下仅用于接口排查与查询参数参考。

## 选择账本、分类、成员

`GET /api/ledgers` → HTTP 200 `{ "ledgers": [...] }`。

API Key 请求只返回绑定的一个账本。账本有 `id`、`name`、`timezone`、`baseCurrencyCode`、`role`（密钥为 `editor`，不代表具体成员角色）。

`GET /api/ledgers/{ledgerId}/recorders` → HTTP 200：

```json
{
  "recorders": [{ "memberId": "<成员 UUID>", "userId": "<用户 UUID>", "displayName": "小明" }]
}
```

仅返回该账本未离开、账号未禁用的 `editor` 成员；无候选返回空数组，不返回密码或凭据。Agent 结合对话匹配录入人；无法唯一确定时询问。姓名可能重复，提交以 memberId 为准。录入人和实际付款人分别判断。

`GET /api/ledgers/{ledgerId}/data?month=YYYY-MM` → HTTP 200：

| 字段         | 内容                                                                             |
| ------------ | -------------------------------------------------------------------------------- |
| `ledger`     | 当前账本信息及访问角色                                                           |
| `categories` | 各项含 `id`、`name`、`kind`、`archivedAt` 等；新增只用未归档且收支类型一致的分类 |
| `members`    | 各项含 `id`、`userId`、`displayName`、`role`、`leftAt`；新增只用未离开的成员     |
| `entries`    | 当月账单，最多 50 条；不是全量历史                                               |
| `summary`    | 当月整数分汇总                                                                   |
| `nextCursor` | 下一页游标，没有更多时为 null                                                    |
| `templates`  | 共享密钥固定返回空数组，不暴露个人模板                                           |

`month` 必填且有效。账本/分类/成员的 ID 均从实际响应取得，不能使用名称代替。

## 新增账单

`POST /api/ledgers/{ledgerId}/entries`

下面是“午饭牛肉汤花了 28 元”的**请求体模板**；尖括号内容必须替换为查询/计算结果，不可原样发送：

```json
{
  "kind": "expense",
  "amountMinor": 2800,
  "categoryId": "<该账本餐饮分类的 UUID>",
  "paidByMemberId": "<实际付款成员的 members[].id UUID>",
  "recordedByMemberId": "<上下文确定的 recorders[].memberId UUID>",
  "note": "午饭·牛肉汤",
  "occurredOn": "<账本时区的 YYYY-MM-DD>",
  "requestId": "<此次操作持久保存的 UUID v4>"
}
```

只发送上述字段，创建接口严格拒绝多余字段。不要发送 `version`、`userId`、`currencyCode`、`ledgerId` 等额外字段；账本 ID 在路径中，Bearer 必须提交 `recordedByMemberId`，服务端验证其仍为有效候选并以对应 userId 写入 createdBy/updatedBy；无效候选返回 400 `INVALID_RECORDER`。Cookie 记账仍按登录用户录入，不接受此额外字段。CLI 输入格式见 [新增](references/create.md)。

HTTP **201** 直接返回账单对象（不是 `{ entry: ... }`），含 `id`、`ledgerId`、`kind`、`amountMinor`、`currencyCode`、`categoryId`、`categoryName`、`paidByMemberId`、`payerName`、`note`、`occurredOn`、`createdBy`、`source`、`version` 等。`source` 由服务端设置，新 API 账单为 `ai`，网页新增和全部历史账单为 `manual`；不允许客户端提交来源。编辑保留原始来源。创建返回的 id 和 version 应保留给后续修改，脚本输出额外明确命名为 entryId/version。同一账本、requestId 与相同内容（包括录入人）再次提交也返回 201 和原账单 ID。更换 API Key 不改变幂等范围。重复使用编号但改动录入人或其他内容返回 409。

## 按 ID 查询与修改

`GET /api/ledgers/{ledgerId}/entries/{id}` → HTTP 200 直接返回当前账单（包括人工与 AI），不存在或已删除返回 404；不需要遍历分页查找。

`PATCH /api/ledgers/{ledgerId}/entries/{id}` → HTTP 200 直接返回修改后的账单，ID 不变，version 加 1。Bearer 请求使用完整业务字段与修改人：

```json
{
  "kind": "expense",
  "amountMinor": 3000,
  "categoryId": "<原分类或实际查询到的新分类 UUID>",
  "paidByMemberId": "<实际付款成员 UUID>",
  "occurredOn": "<YYYY-MM-DD>",
  "note": "午饭·牛肉汤",
  "updatedByMemberId": "<当前修改成员 UUID>",
  "version": 1,
  "requestId": "<此次修改持久保存的新 UUID>"
}
```

CLI 支持仅输入变更字段，由 update.py 查询并合并；原生 HTTP PATCH 需发送上述完整业务字段。`updatedByMemberId` 来自 recorders，与原录入人和付款人独立；400 INVALID_UPDATER 表示已非有效 editor。不能传 recordedByMemberId、source、createdBy 等字段；保留原始创建人、来源与 ID，只更新 updatedBy 和业务字段。

服务端在事务内强制 `source=ai`：人工记录返回 403 AI_ENTRY_REQUIRED，即使请求另带 Cookie 也不能绕过。删除/恢复接口仍需网页登录。Cookie 编辑仍可修改人工或 AI，身份来自登录会话，不接受 updatedByMemberId。

版本过期返回 409 VERSION_CONFLICT；不得自动覆盖。修改与创建共用账本/requestId 幂等范围，修改指纹包括操作、目标 ID、版本、修改人和全部业务字段。相同请求重试返回原结果，不再次增版本；跨操作或目标复用编号返回 409。轮换密钥仍可重试，但撤销的密钥无效。幂等响应是当时结果，查询当前值用 GET。

## 核对结果

`GET /api/ledgers/{ledgerId}/entries`

可用查询参数：`start` / `end`（含首尾日，`YYYY-MM-DD`）、`kind`（`expense` / `income` / `all`）、`memberId`（付款成员 ID）、`creatorId`（录入用户 ID）、`minAmount` / `maxAmount`（整数分）、`search`（最多 120 字）、`page`（从 1 开始）、`categoryIds`（逗号分隔的分类 UUID，取并集）、`sort`（newest/oldest/amount_desc/amount_asc）。省略的筛选不生效；查询参数应 URL 编码。

HTTP 200 返回 `{ "ledger", "categories", "members", "entries", "totals", "page", "pageSize", "totalPages" }`，当前每页 30 条。全量汇总是 `totals`，不能把一页条数当作总数；需要核对完整范围时读完对应分页。响应中账单的 `createdBy` 是用户 ID，`paidByMemberId` 是成员 ID。

可用相同的 `start` 和 `end` 限定发生日期，用相同的 `minAmount` 和 `maxAmount` 精确限定金额，再核对用途和人员。查询结果不含 requestId；不可仅凭相似账单自动判定一次结果未知的提交成功，也不可仅凭一次空查询就认定之前的写入必定失败。

## 统计

`GET /api/ledgers/{ledgerId}/reports?granularity=day&period=YYYY-MM` 查询月内每日；`granularity=month&period=YYYY` 查询年内每月；`granularity=year` 查询历史年份。HTTP 200 返回 ledger、granularity、范围 start/end、summary 与 points，金额为整数分且补齐空时段。详细脚本用法见 [查询](references/query.md)。

<!--
[INPUT]: 账单 ID、筛选条件、账本时区与统计范围。
[OUTPUT]: 上下文、单条账单、分页明细与全量汇总、日/月/年统计的调用规则。
[POS]: SKILL.md 的查询分支；只发 GET，不创建写操作文件。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 查询

```bash
python3 scripts/query.py context --date today
python3 scripts/recorders.py
python3 scripts/query.py get --entry-id "$ENTRY_ID"
python3 scripts/query.py list --input "$QUERY_FILE"
python3 scripts/query.py reports --input "$REPORT_FILE"
```

JSON 输入也可用 `--input -` 从标准输入读取。地址/密钥来自宿主私有环境。所有查询均限定密钥所属账本。

## 候选与按 ID 查询

`context` 返回 `ledger`、`occurredOn`、未归档 `categories`、未离开 `members`、有效 `recorders`；不输出已有账单或模板。`--date` 接受 today/yesterday/具体日期。分类取 `id`；付款人取 `members[].id`；录入/修改人取 `recorders[].memberId`。

`recorders` 仅返回 `ledger` 和当前有效记账人列表，只发两个请求（账本 + recorders）；不需要分类或账单数据时用此代替 context。每项含 `memberId`、`userId`、`displayName`；录入/修改人从 `memberId` 匹配，`userId` 仅用于 creatorId 筛选。

`get` 返回 `{entryId, version, entry}`，含 source、金额、日期、分类、付款/录入人；不存在或已删除返回 404。查询允许人工和 AI 记录，但修改只允许 AI。优先用上下文的确切 ID；列表匹配多条时不要擅自取第一条作为修改目标。

## 筛选明细

无筛选传 `{}`。各维度取交集，分类 ID 数组内部取并集：

| JSON 字段             | 含义                                                       |
| --------------------- | ---------------------------------------------------------- |
| start / end           | 含首尾日；today、yesterday 或 YYYY-MM-DD；省略则不限       |
| kind                  | expense / income / all                                     |
| categoryIds           | 实际分类 UUID 数组，可多选                                 |
| memberId              | 付款成员 UUID 或 all                                       |
| creatorId             | 最初录入**用户 UUID** 或 all，不是 memberId，也不是修改人  |
| minAmount / maxAmount | 人民币**元字符串**，如 "20.00"；允许 "0"，脚本转换为整数分 |
| search                | 关键词，最多 120 个字符                                    |
| sort                  | newest / oldest / amount_desc / amount_asc                 |
| page                  | 正整数，默认 1                                             |

```json
{
  "start": "today",
  "end": "today",
  "kind": "expense",
  "minAmount": "20.00",
  "maxAmount": "40.00",
  "search": "牛肉汤",
  "sort": "newest",
  "page": 1
}
```

响应有 `entries`、`totals`、`page`、`pageSize`、`totalPages`，以及 ledger/categories/members；每页 30 条，`totals` 是全部匹配账单的整数分汇总。回答总额使用 totals，找齐匹配记录则按返回 totalPages 翻页；不能把当前页当全量。筛选 source 暂无专用参数；按 AI 来源查找时应遍历所需范围并按 entries[].source 判断，不能把未过滤的 totals 当 AI 合计。

金额输出是整数分，展示时除以 100 精确格式化。GET 查询无法证明一次结果未知的写入成功，因为列表不含 requestId；应优先重试原写操作文件，不能凭相似记录判定或重新记账。

## 收支统计

`reports` JSON 按以下三种形式之一：

- 日趋势：`{"granularity":"day","period":"2026-11"}`，指定月份内每天。
- 月趋势：`{"granularity":"month","period":"2026"}`，指定年份内每月。
- 年趋势：`{"granularity":"year"}`，历史年份，不传 period。

日期只是格式示例，实际使用用户要求的范围。响应含 `ledger`、`granularity`、`start`、`end`、`summary`、`points`；金额为整数分，空时段补零。统计不受列表分页影响。按成员/分类/关键词等组合查询总额用 list 的 totals，reports 不接受这些筛选。

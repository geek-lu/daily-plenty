# tests/

> L2 | 父级: ../CLAUDE.md

成员清单

- server.test.ts：内存 SQLite 服务层回归测试，覆盖金额、幂等、账本隔离、版本、删除、密码和邀请。
- setup.test.ts：直接调用真实 API，验证无配置初始化、6 位密码、有效会话、并发及重复初始化保护。
  同时验证生产 Cookie 的显式 HTTP、本机预览及 HTTPS 模式，登录/退出一致保留 HttpOnly、SameSite 与 Path；仅公网监听不自动放宽 Secure。
- preferences.test.ts：分类共享、模板用户/账本隔离、伪造身份、权限、历史账单保护及旧库升级持久化测试；默认分类补齐不覆盖归档/自定义分类，重复迁移不重复添加。

测试不依赖公网、浏览器或生产数据库。
分类调整回归同时验证保留原分类 ID 的重命名，以及目标已存在时账单/模板关联的合并。

- category-icons.test.ts：验证内置映射、图标白名单、分类/账单/统计返回值及旧库升级和重新打开后图标持久化。

- deletion-reasons.test.ts：删除原因必填、非法/空白说明、权限、版本、原因幂等冲突、恢复与重启持久化回归。

- records.test.ts：高级维度交集、跨月日期、金额边界、四种排序和分页、全量汇总/CSV、历史分类成员、只读查询、URL 往返及输入校验。全部使用内存合成记录。
  同时验证支出统计超过 50 笔仍完整聚合、闰日/月末/跨年、空白日期/年份补零、汇总与折线一致、软删除/权限隔离及日月年 URL 校验。

- frontend/：录入重试、表单规则与导航/动效回归。原 navigation.test.ts：四个真实页面路径、同账本各页查询条件恢复与跨账本条件隔离。

navigation.test.ts 同时用真实 JSX runtime 遍历明细页已加载状态的兄弟元素，验证 key 唯一；还原旧写法确认回归测试能捕捉用户报告的重复 key。
navigation.test.ts 验证 Collapse 的 inert/aria-hidden 与草稿保留、Presence 初始显隐，并扫描正式 features/ui 禁止手工增删节点、写 innerHTML/classList/style。

- comments.test.ts：活跃成员/读写权限、跨账本/账单隔离、持续回复平铺、输入边界、幂等冲突与事务回滚、0007 旧库升级及重开、真实 HTTP router 契约回归。preferences.test.ts / comments.test.ts 迁移数量同步为 10。

- api-keys.test.ts：共享密钥摘要存储和 editor 共同管理、账本隔离、生成者退出/禁用不影响密钥、录入人资格与付款人分离、账本级幂等、撤销/归档及 Cookie 边界；0009 旧库升级撤销个人凭据与重开验证；AI 修改的版本/操作者、来源限制、单条查询、跨操作/目标幂等冲突、换密钥重试与人工修正后的旧响应重放。

- skills/：可移植记账 CLI 的 Python 标准库集成测试；金额、HTTP、候选、持久化与幂等恢复，运行 pnpm test:skill。

- entry-source.test.ts：人工/API 渠道来源、拒绝伪造、人工修正 AI 账单并保留来源、CSV 来源列及 0010 历史数据/幂等响应默认人工的升级重开回归。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

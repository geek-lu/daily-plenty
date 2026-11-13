# src/shared/

> L2 | 父级: ../CLAUDE.md

- types.ts：用户、账本、分类、账单、个人模板及查询结果契约。
- report.ts：统计日期范围、日/月/年连续补零及日期标签纯规则；不含数据库和 UI 依赖。
- validation.ts：输入校验；分类按收入/支出区分，模板只允许业务字段，禁止客户端指定归属用户。
- money.ts：整数分金额与日期规则。
- errors.ts：业务错误和断言契约。

- category-icons.ts：23 个线条图标的白名单、中文标签与路径；18 个内置分类的默认图标映射。

- deletion-reasons.ts：共享删除原因选项、稳定标识及 200 字说明上限；validation 删除分支强制原因，其他原因须非空说明。

RecordsFilters / RecordsData / FormState 为独立账单页与复用弹层契约；recordsInput 校验日期区间、多分类、付款/录入人、整数分金额、排序和页码。
ReportFilters / ReportPoint / ReportData 约定同一范围的完整汇总与支出序列；reportInput 按维度严格校验月份/年份，年维度不接受单个 period。

EntryComment 定义 id、entryId、authorId、authorName、rootId、replyToId、replyToName、content、createdAt；主评论的三个回复字段为 null。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

# migrations/

> L2 | 父级: ../CLAUDE.md

成员清单

- 0001_initial.sql：User、Ledger、Membership、Category、Entry、Session、Invite 和 MutationRequest 的 SQLite STRICT 表、约束、复合外键与索引。
- 0002_entry_templates.sql：新增用户在账本内私有的 EntryTemplate，复合外键约束所属用户、分类、币种和付款成员，保留旧数据。
- 0003_default_categories.sql：为已有账本补齐 12 个支出、6 个收入常用分类，不覆盖同名分类、排序或归档状态。
- 0004_personal_categories.sql：支出房租改房贷、其他改服饰；已有同名目标时合并账单和模板关联，避免重复分类。

迁移由 src/server/db/client.ts 按文件名和 SHA-256 记录执行，已应用迁移禁止修改。

- 0005_category_icons.sql：为分类增加 icon 字段，回填内置图标；其他已有分类使用通用图标，不改变分类 ID。

- 0006_deletion_reasons.sql：为账单增加删除原因和说明字段；旧删除记录保留 NULL。

- 0007_entry_comments.sql：新增 entry_comments，复合外键限制同账本/账单及作者成员，回复关联与时间索引；保留既有账单。

- 0008_api_keys.sql：新增用户 + 账本绑定的 API 密钥摘要与生命周期元数据，独立于 sessions；保留既有数据。

- 0009_ledger_api_keys.sql：密钥改归账本，created_by 仅审计；撤销旧个人凭据，新增 ledger_api_requests 保存账本级 API 幂等记录。

- 0010_entry_source.sql：新增 manual/ai 原始来源，全部历史账单及其幂等响应默认 manual；后续来源由服务端录入渠道确定。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

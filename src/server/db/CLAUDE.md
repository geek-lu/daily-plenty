# src/server/db/

> L2 | 父级: ../CLAUDE.md

- client.ts：SQLite 连接、已校验增量迁移与立即事务。
- schema.ts：Drizzle 表定义，含以用户和账本为归属的个人记账模板，与 SQL 迁移同步。

Category.icon 保存图标标识，默认 tag；与 0005 迁移一致。

Entry.deleteReason/deleteReasonNote 保存最近一次删除的原因及说明，旧记录允许 NULL。

EntryComment 与 0007 同步，复合外键限制账单、作者成员及回复对象归属；rootId 指主评论，replyToId 指直接回复对象。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

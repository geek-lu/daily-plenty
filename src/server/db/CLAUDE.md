# src/server/db/

> L2 | 父级: ../CLAUDE.md

- client.ts：SQLite 连接、已校验增量迁移与立即事务。
- schema.ts：Drizzle 表定义，含以用户和账本为归属的个人记账模板，与 SQL 迁移同步。

Category.icon 保存图标标识，默认 tag；与 0005 迁移一致。

Entry.deleteReason/deleteReasonNote 保存最近一次删除的原因及说明，旧记录允许 NULL。

EntryComment 与 0007 同步，复合外键限制账单、作者成员及回复对象归属；rootId 指主评论，replyToId 指直接回复对象。

ApiKey 与 0009 同步：保存 tokenHash、prefix、名称、ledgerId、审计生成者 createdBy 及创建/使用/撤销时间，不存明文。生成者不参与密钥有效性；LedgerApiRequest 按 ledgerId/requestId 幂等，保存含录入人的指纹、响应及调用 keyId。

Entry.source 与 0010 同步：manual / ai，历史账单全部默认 manual；来源由服务端创建渠道赋值，人工修正保留原始来源。历史幂等响应同步补齐。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

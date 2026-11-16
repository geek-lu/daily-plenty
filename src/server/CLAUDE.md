# src/server/

> L2 | 父级: ../CLAUDE.md

成员清单

- db/：SQLite 连接、迁移执行和 Drizzle schema。
- user/：资料白名单、账号状态和账号凭据访问边界。
- auth/：scrypt 密码、会话、限速、退出与账本共享 API 密钥。
- ledger/：账本、成员、录入人候选、分类、账单、统计、邀请和会话/API 幂等。
- http/：声明式路由表、会话/账本密钥认证、请求解析和统一错误响应。
- flows/：账户、认证、账本之间的事务协调。

服务层不导入 React/Next；跨模块账户创建与邀请加入由 flows 协调，HTTP 只适配请求/响应。

ledger/comments 提供账单评论与一级展示回复；HTTP 复用会话认证，写入与幂等结果同事务提交。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

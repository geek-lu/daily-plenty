# src/server/

> L2 | 父级: ../CLAUDE.md

成员清单

- db/：SQLite 连接、迁移执行和 Drizzle schema。
- user/：资料白名单、账号状态和账号凭据访问边界。
- auth/：scrypt 密码、会话、限速和退出。
- ledger/：账本、成员、分类、账单、统计、邀请和幂等。
- http/：声明式路由表、会话认证、请求解析和统一错误响应。
- flows/：账户、认证、账本之间的事务协调。

服务层不导入 React/Next；跨模块账户创建与邀请加入由 flows 协调，HTTP 只适配请求/响应。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

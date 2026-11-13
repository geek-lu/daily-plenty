# src/server/flows/

> L2 | 父级: ../CLAUDE.md

- accounts.ts：首次初始化、登录、创建账号并加入邀请；协调 user/auth/ledger，保证账号与账本变更的事务边界。

不导入 Next、React 或 Cookie；输入为 Store 和已提取的参数，返回响应数据及可选会话令牌，由 HTTP 层设置 Cookie。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

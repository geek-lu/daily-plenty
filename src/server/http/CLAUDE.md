# src/server/http/

> L2 | 父级: ../CLAUDE.md

- context.ts：可选/必需会话与响应 Cookie；生产默认 Secure，显式 DAILY_PLENTY_ALLOW_HTTP=true 或 loopback 预览可关闭，登录与退出遵循相同策略。
- request.ts：handler 契约、JSON 对象解析、认证包装与错误响应。
- router.ts：按方法与路径模板精确匹配，统一捕获错误；未知路径不初始化数据库。
- account-routes.ts：账户路由表，调用跨域流程并设置 Cookie。
- ledger-routes.ts：账本路由表；会话解析一次，权限由各服务统一校验。

App Route → router → 路由表 → flows/service → repo。禁止在路由表复制权限和业务规则。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

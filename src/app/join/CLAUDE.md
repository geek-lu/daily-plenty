# src/app/join/

> L2 | 父级: ../CLAUDE.md

- page.tsx：邀请路由与 Suspense 加载边界。
- JoinView.tsx：邀请表单和完成视图，使用 Collapse 保留账号草稿。
- runtime.ts：读取邀请链接、切换账号模式、登录/接受邀请，复用公共 API 并阻止重复提交。

依赖 page → JoinView → runtime → ledger/api；折叠称呼字段不参与校验。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

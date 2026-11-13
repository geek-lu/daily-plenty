# src/app/(main)/

> L2 | 父级: ../CLAUDE.md

- layout.tsx：持久 AppShell，注入 nav={{ pc: Sidebar, m: BottomBar }}；Suspense 仅显示加载状态。app 层是唯一同时导入 pc/ 与 m/ 的位置。
- page.tsx：/ 首页。
- reports/page.tsx：/reports 收支统计。
- records/page.tsx：/records 全部账单。
- together/page.tsx：/together 成员与账号。

每个 page.tsx 只用 Adaptive 二选一渲染 features/pc 或 features/m 的同名页面，路由与 URL 条件两端一致。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

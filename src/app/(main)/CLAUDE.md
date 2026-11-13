# src/app/(main)/

> L2 | 父级: ../CLAUDE.md

- layout.tsx：四个主路由共用的持久 Shell；Suspense 仅显示加载状态，底栏由 Shell 在认证就绪后渲染。
- page.tsx：/ 装配 home/HomePage，日常记账。
- reports/page.tsx：/reports 装配 reports/ReportsPage，收支分析。
- records/page.tsx：/records 装配 records/RecordsPage，高级查账。
- together/page.tsx：/together 装配 together/TogetherPage，成员与账号。

路由组名称不出现在 URL。四页真实目录隔离，底栏由 layout 唯一提供，不在各页重复挂载。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

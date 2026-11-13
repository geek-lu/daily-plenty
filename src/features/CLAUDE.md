# src/features/

> L2 | 父级: ../CLAUDE.md

按设备分三棵树：业务逻辑只写一次，视图按端各写一套。

- common/：两端共用。会话/鉴权/导航规则与设备断点（session/）、HTTP（api.ts）、录入表单（editor/）、全局记账抽屉（entry/）、月度查询（ledger/）、各页 runtime（home/ records/ reports/ together/）与共用 UI 原子（ui/）。
- m/：手机视图（<1024px）。shell/ 底部四栏 + 中央记一笔；home/ records/ reports/ together/ 为原有手机页面。
- pc/：桌面视图（≥1024px）。shell/ 左侧固定侧边栏与 PcPage/PcPanel/PcStats 版式原子；四页各自重排为 B 端两栏/表格布局。

依赖方向：pc/ → common/ ← m/；pc 与 m 互不导入，只有 app/(main) 同时装配两端。断点唯一定义在 common/session/Adaptive.tsx 的 desktopQuery，globals.css 的抽屉右侧面板使用同一 1024px。
四页仍是 App Router 独立路由；每个 page.tsx 用 Adaptive 二选一渲染，跨断点缩放窗口时自动切换且 URL 条件不丢失。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

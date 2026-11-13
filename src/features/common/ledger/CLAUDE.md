# src/features/common/ledger/

> L2 | 父级: ../CLAUDE.md

- useOverview.ts：首页/我们页共享月度查询；读取 URL 月份、取消过时请求，消费 dataVersion 刷新。
- useDialogViewport.ts：订阅 VisualViewport/resize 返回 React 样式；仅读取尺寸，背景滚动锁由 globals.css 的 :has(.mobile-dialog) 负责。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

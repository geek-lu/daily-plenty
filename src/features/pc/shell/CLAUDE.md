# src/features/pc/shell/

> L2 | 父级: ../CLAUDE.md

- Sidebar.tsx：232px 固定侧边栏；账本切换调用会话 selectLedger，导航复用 common/session/useTabLinks。
- sidebar.css：侧边栏版式与导航选中态；账本原生选择框隐藏系统箭头，共用线性图标居中并保留右侧 14px 间距。
- PcPage.tsx：PcPage 默认页面滚动、fixed 可选整屏的标题栏/加载状态骨架、PcPanel（fill 内滚动与 bodyRef）、PcStats 指标条、PcToast 浮动提示。
- pc-page.css：默认自然滚动、fixed 时 100dvh 的骨架、内部细滚动条、窄屏紧凑布局、卡片、指标条与 .pc-table 表格（粘性表头、行悬停、数字右对齐）。

侧栏使用 surface 米白底，导航选中与主记账统一使用暗红强调。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

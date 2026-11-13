# src/features/pc/

> L2 | 父级: ../CLAUDE.md

桌面 B 端视图（视口 ≥1024px），MUJI 风：纸色底、细线卡片、朱红强调、列表优先。只依赖 common/，不导入 m/。

- shell/：左侧固定侧边栏（品牌、账本切换、记一笔、导航、账号），PcPage/PcPanel/PcStats 版式原子与列表样式。
- home/：指标条 + 最近账单列表 + 模板/分类 Top5 侧栏。
- records/：左侧常驻筛选栏（字段内部滚动） + 指标条 + 账单列表，无限下拉。
- reports/：标题栏内维度切换，宽幅折线，下方收支/分类/付款人三栏。
- together/：成员与邀请 / 账号与安装两栏。

仅 /records 固定在 100dvh 内并使用内部滚动；首页、统计和我们页内容自然撑高，页面正常滚动。

编辑与记账抽屉在 PC 由 globals.css 改为右侧滑出面板，组件与手机相同。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

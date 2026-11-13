# src/features/m/records/

> L2 | 父级: ../CLAUDE.md

- RecordsPage.tsx：手机明细页编排：标题/账本、筛选、提示、结果与下载。
- RecordsFilters.tsx：搜索 + BottomDrawer 右滑浮层的高级条件；草稿与字段来自 common/records/filter-panel。
- RecordsResults.tsx：条件标签、2×2 汇总、EntryRow 卡片列表、LoadMore 与 EntryDetail。
- records.css：按 CSS 视口宽度适配；400px 起成对字段，768px 起四项汇总并排；48px 触控区与四边安全区。

手机筛选包含圆形展开标记、分组细线、三列分类与至少 44px 收支切换触点；保留草稿应用和重置语义。

高级筛选在右侧浮层中独立滚动，底部重置/应用固定；表单 ID 关联外部提交按钮，应用成功自动关闭。

明细列表评论默认收起，每项底部独立折叠看板提供展开/收起与写评论按钮，账单主行仅查看详情；收起时查询数量，收起保留草稿。

首页/明细统一使用纸色页面背景，账单列表容器使用全局暖白 surface；评论看板保留自身底色。

折叠栏使用纸色底、暖灰操作文字，仅评论总条数（含回复）使用朱红，发布成功后同步数量，内部不重复数量。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

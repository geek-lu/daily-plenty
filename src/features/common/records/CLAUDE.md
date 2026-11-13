# src/features/common/records/

> L2 | 父级: ../CLAUDE.md

明细页两端共用的逻辑与组件；视图版式在 m/records 与 pc/records。

- runtime.ts：useRecords 查询/导航/刷新、无限下拉累积与按 id 去重、编辑后重取已加载页；导出只返回文件状态交 ui/Download 渲染。
- filters.ts：筛选 URL 序列化（不含页码）、人民币精确转换、月份快捷范围、appliedFilterLabels 条件摘要。
- useEntryEditor.ts：账单编辑、删除原因、动态分类和保存模板，复用 editor/。
- EntryDetail.tsx：可编辑成员打开 EntryDrawer，只读成员打开详情抽屉。
- LoadMore.tsx：IntersectionObserver 哨兵（提前 400px，可传 root 指定内部滚动容器）+ 加载更多/重试兜底按钮。
- records-common.css：筛选字段网格、分类多选按钮与加载尾部；.records-filter-narrow 让 PC 筛选栏固定两列。
- filter-panel/：筛选草稿 runtime 与 AdvancedFields 字段，手机折叠面板和 PC 常驻栏共用。

日期默认不限，开始/结束均含当天；金额显示元、传整数分；分类多选取并集，各维度取交集。服务端每页 30 笔，汇总与 CSV 覆盖全部匹配记录。

评论在 EntryRow 下方展示，EntryDetail 仅保留详情/编辑；只读成员不可发送。

筛选视觉共用分组标题、纸色字段、分段收支与快捷日期选中态；桌面字段单列、分类两列。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

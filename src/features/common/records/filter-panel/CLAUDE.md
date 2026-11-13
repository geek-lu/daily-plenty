# src/features/common/records/filter-panel/

> L2 | 父级: ../CLAUDE.md

- runtime.ts：useFilterDraft 草稿、金额转换、输入校验及应用/重置；查询按钮 ref 仅用于提交后恢复焦点。
- AdvancedFields.tsx：收支/排序/日期/快捷日期/分类/人员/金额字段，消费 runtime 草稿。

本目录不承担网络查询，也不决定展开方式：m/records/RecordsFilters 用 BottomDrawer 右滑浮层，pc/records/FilterRail 常驻展开。

筛选按收支/排序、日期、分类、人员、金额五组展示；收支分段按钮、快捷日期与多选分类使用 aria-pressed 表达选中态。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

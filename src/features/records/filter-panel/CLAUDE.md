# src/features/records/filter-panel/

> L2 | 父级: ../CLAUDE.md

- RecordsFilters.tsx：搜索入口、条件展开和表单提交布局。
- AdvancedFields.tsx：日期、分类、人员、金额和排序选项，消费 runtime 的草稿状态。
- runtime.ts：草稿、金额转换、输入校验及应用/重置；查询按钮 ref 仅用于提交后恢复焦点。

本目录是 records 内的筛选面板，不承担网络查询；成功应用交由外层 runtime。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

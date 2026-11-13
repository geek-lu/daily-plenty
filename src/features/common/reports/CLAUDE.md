# src/features/common/reports/

> L2 | 父级: ../CLAUDE.md

统计页两端共用的逻辑与组件；视图版式在 m/reports 与 pc/reports。

- runtime.ts：统计请求生命周期、过时请求取消、dataVersion 刷新与 URL 切换。
- filters.ts：URL 选择解析、旧 month 链接兼容及 API 查询参数纯规则。
- ExpenseTrend.tsx：SVG 支出折线，触摸/鼠标点选、键盘切换和可展开数据表。
- ReportSummary.tsx：ReportSummary 组合与可单独排版的 IncomeComparison / CategoryBreakdown / MemberBreakdown、periodLabels。
- reports-common.css：折线坐标、数据表、收支对比、分类与付款人排名样式。

查询 GET /ledgers/:id/reports 全量聚合；日＝所选月份每天，月＝所选年份每月，年＝历年；汇总/分类/成员与折线同口径。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

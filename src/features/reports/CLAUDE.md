# src/features/reports/

> L2 | 父级: ../CLAUDE.md

- ReportsPage.tsx：/reports 日/月/年统计视图，维度/日期控件、支出折线、同范围收支与分类/付款人排名。
- ExpenseTrend.tsx：SVG 支出折线，触摸/鼠标点选、键盘日期选择和可展开数据表；不含 HTTP 和服务端依赖。
- runtime.ts：统计请求生命周期、过时请求取消、数据刷新和 URL 切换。
- filters.ts：URL 选择解析、旧 month 链接兼容及 API 查询参数纯规则。
- reports.css：大数字、折线坐标、维度切换和分类排名；手机自适应且遵循减少动态效果。
  逐日/月/年数据表通过 Collapse 状态展开，折叠时 inert；图表淡入使用全局动效令牌。

依赖：ReportsPage → runtime → ledger/api；runtime 同时消费 filters 与 shell 会话，ExpenseTrend 仅消费 shared 类型/日期/金额规则。查询 GET /ledgers/:id/reports，全量聚合且不拉取账单列表；统计不含录入表单、模板和邀请。日＝所选月份每天，月＝所选年份每月，年＝历年；汇总/分类/成员与折线同口径，明细链接携带对应起止日期。

- ReportSummary.tsx：同一范围的收支对比、分类排名及付款人分布，与图表/筛选编排解耦。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

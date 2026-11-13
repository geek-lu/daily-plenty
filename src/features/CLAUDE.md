# src/features/

> L2 | 父级: ../CLAUDE.md

- shell/：四页共用会话、登录/初始化、持久底部导航。
- home/：日常账本页面、录入与个人模板 runtime，首页独有样式。
- reports/：日/月/年支出趋势、同范围收支及排名；独立查询 runtime 与可点选 SVG 图表。
- records/：独立明细查询、高级筛选、分页、导出、编辑。
- together/：独立成员、邀请、账号页面及操作 runtime。
- ledger/：共用账本 API、月度查询、弹层视口及分类/账单/模板组件。

删除未实现的 auth/、user/ 空目录；认证 UI 已由 shell 管理，服务端 user/auth 仍各自独立。

四个页面通过 App Router 装配，不用 Screen 状态切换；只共用导航、会话、数据能力和必要 UI 元件，各页功能区独立。

- entry/：跨四页的「记一笔」抽屉与新建账单 runtime，由共享 Shell 装配。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

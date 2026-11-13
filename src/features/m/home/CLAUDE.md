# src/features/home/

> L2 | 父级: ../CLAUDE.md

- HomePage.tsx：/ 账本主页，结余和记账主区、个人模板、最近 8 笔；内部区分 HomeHeading / HomeBalance / RecentEntries，不包含统计与成员分支。
- runtime.ts：录入、编辑、原因删除、动态分类、个人模板动作，查询通过共用 useOverview。
- home.css：日常账本专属视觉，结余浅绿主区与一键记账，模板次之、记录再次。

依赖 UI → runtime → ledger/api + shared rules；会话来自 shell。

首页主「记一笔」与底栏中央按钮均打开 entry/EntryComposer 的同一个抽屉。runtime 继续管理模板和已有账单编辑；公共业务表单名为 EntryDrawer，容器为 BottomDrawer。
提示和编辑抽屉由 Presence 保留到退出完成；删除模板 runtime 仅执行操作和抛错，确认/错误由 ledger/ui/preferences/TemplateList 的声明式抽屉负责。

- runtime.ts 的公共表单校验、提交锁与写入已委托 ledger/editor；只协调首页打开、关闭、提示及刷新。

已有账单的列表项下方展示共用评论区，支持持续一级回复。

首页/明细统一使用纸色页面背景，账单列表容器使用全局暖白 surface；评论看板保留自身底色。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

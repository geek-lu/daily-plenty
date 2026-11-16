# src/features/common/

> L2 | 父级: ../CLAUDE.md

- api.ts：前端同源请求，携带状态码和首条字段校验消息；生成写入请求 ID。
- session/：会话 Provider、AuthView、AppShell 骨架、导航纯规则与 useTabLinks、设备断点 Adaptive。
- editor/：三个录入入口共用的纯表单规则、HTTP 写入与提交状态。
- entry/：全局「记一笔」上下文与抽屉，PC 侧边栏和手机底栏共同触发。
- ledger/：useOverview 月度查询、useDialogViewport 弹层视口。
- home/、together/：首页与我们页 runtime（together/ 另含共用头像样式）。
- records/、reports/：明细/统计的 runtime、URL 规则及两端共用组件。
- ui/：EntryDrawer、EntryRow、BottomDrawer、图标与 preferences/ 模板分类组件。

本目录不得导入 pc/ 或 m/；视图差异通过 props/注入（如 AppShell 的 nav）表达。

- comments/：每笔账单的评论和持续回复，主评论下一层平铺；独立查询与幂等发送。

- api-keys/：账本共享密钥管理 API、runtime、两端共享二级设置页与列表；完整密钥只留当前页面状态。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

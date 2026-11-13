# src/features/ledger/

> L2 | 父级: ../CLAUDE.md

ui/ 包含共用账单表单与 preferences/ 分类/个人模板组件；首页已迁到 features/home。模板按当前用户和账本加载，应用模板默认今天、编辑模板只保存模板。

- api.ts：前端同源请求，携带状态码和首条字段校验消息；生成写入请求 ID。
- ui/EntryDrawer.tsx、ui/EntryRow.tsx：首页与 records 独立页面复用的界面组件，表单类型在 shared/types。

- useDialogViewport.ts：订阅 VisualViewport/resize 并返回 React CSSProperties；仅读取尺寸，关闭时恢复滚动，不写 DOM 样式。背景滚动由 globals.css 的 :has(.mobile-dialog) 和 scrollbar-gutter 控制。

- useOverview.ts：账本/我们页共享月度查询 runtime；接收会话上下文、读取 URL 月份、取消过时请求，切页重新加载。统计使用 reports/runtime 的独立多维查询。

BottomDrawer 通过 React style 接收视口变量；必要的焦点/内部滚动留在浏览器适配组件，避免业务组件修改 DOM。useOverview 消费共享 dataVersion，新增账单后保持页面挂载并刷新查询。

- editor/：三个录入入口共用的纯表单规则、HTTP 写入与提交状态；失败重试复用请求身份。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

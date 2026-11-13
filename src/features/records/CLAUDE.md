# src/features/records/

> L2 | 父级: ../CLAUDE.md

- filters.ts：筛选 URL 序列化、人民币精确转换和月份快捷范围，纯函数。
- runtime.ts：查询/导航/刷新，导出只返回文件状态交由 ui/Download 渲染，不手工创建下载节点。
- useEntryEditor.ts：账单编辑、删除原因、动态分类和保存个人模板；通过刷新回调更新查询。
- filter-panel/：搜索与高级字段、草稿 runtime 分离；常用条件与 Collapse 高级条件，折叠时 inert 并保留草稿；提交后将焦点交回查询按钮。
- RecordsResults.tsx：筛选摘要、收支汇总、分页列表、只读详情与可编辑抽屉。
- RecordsPage.tsx：查询结果淡入、提示/详情通过 Presence 退出；只读和编辑统一 BottomDrawer，导出由 Download 渲染。

依赖：UI → runtime → HTTP API；runtime 消费 shell 会话；filters → shared types/validation。复用 ledger 的 api、EntryRow、EntryDrawer，禁止导入服务器模块。
日期默认不限，开始/结束均包含当天；金额显示元、传递整数分；分类多选取并集，各维度取交集。改变条件回第一页；地址保存已应用条件，浏览器返回/刷新可恢复。每页 30 笔，汇总和 CSV 包含全部匹配记录。

验证：独立查询功能已有 21 项测试通过；本轮手机布局的类型检查、生产构建、页面/API 路由检查通过。浏览器连接不可用，真实排版、旋转与手机键盘仍待实测。

- records.css：按实际 CSS 视口宽度适配；400px 起成对字段，480px 起阔屏分类四列，768px 起四项汇总并排；使用四边安全区和 48px 触控区。
  手机默认只展开搜索，筛选与排序按需打开，应用后收起；标题与账本选择在目标手机宽度并排。账单金额与备注分列，身份信息另起一行，分页按钮窄屏等宽。

页面不再自带返回账本导航或认证表单；共用 (main)/layout 的底部四栏。完整查询地址在跨页切换时按用户/账本保存，刷新仍可恢复 URL 条件。

修复筛选区与结果区同级 key 冲突：各自加 filters: / results: 前缀；仍随查询变化重置各自局部状态。加载提示占固定高度，刷新不插入/删除整行。读取共享 dataVersion 响应底部记账保存。

- useEntryEditor.ts 复用 ledger/editor，移除重复校验和请求拼装；账单编辑/删除失败重试沿用编号。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

# docs/review/

> L2 | 父级: ../CLAUDE.md

成员清单

- index.html：离线交互原型与快速录入流程。
- architecture.html：离线架构评审、表关系和服务边界，含动态共享分类及图标字段、个人模板和实际 API 路径（含必填删除原因）。
- schema.html：从架构页分出的数据模型、完整字段和扩展路线。
- styles.css：按顺序导入基础、组件、响应式样式。
- styles/：按职责拆分的离线评审样式。
- prototype.js：演示账单、筛选、统计、编辑和撤销。
- RESEARCH.md：产品参考的证据边界与设计提案。

这些文件只用于评审；真实数据路径是 src/app → src/server → SQLite。

architecture.html 同步独立 /records 页面分工、交互路径、真实目录与高级查询/CSV 接口；旧 index.html 仍是离线演示，不代表正式页面路由。

architecture.html 已同步四页路由组、独立 features 目录、共用 Shell 及各页信息主次；index.html 为历史离线原型，正式功能以 src 为准。

architecture.html 补充中央记账 → EntryComposer → EntryDrawer/BottomDrawer → 当前页数据刷新的组件链路。
architecture.html 同步日/月/年统计 API、ExpenseTrend 与统计日期规则；完整聚合及补零由服务端返回，不受账单分页影响。
architecture.html 同步独立 ui 公共动效/下载层；旧 prototype.js 仅作历史离线演示，不属于正式 React 产品。
architecture.html 的 deploy 目录描述已同步 Alibaba Cloud Linux 3 / SSH 隧道预览；原域名 HTTPS 方案作为后续公网访问方向。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

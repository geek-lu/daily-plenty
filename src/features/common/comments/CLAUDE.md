# src/features/common/comments/

> L2 | 父级: ../CLAUDE.md

- EntryComments.tsx：账单评论区，主评论下一级平铺回复，回复任意回复时展示对象；两端列表项共用，entry-discussion 样式由 common/ui/entry-item.css 提供，以浅底分区、同字体小字姓名/正文/时间和回复竖线区分账单，无评论且未打开输入时不渲染；onCountChange 回传查询成功后的评论总数；composing/onCompose 控制输入开关，点击回复打开并聚焦，单行高度输入框与发送按钮并排。
- useComments.ts：按账单查询、刷新、草稿和回复目标、同步提交锁与失败重试请求身份。

评论仅纯文本；editor 可发布，viewer 只读。回复层数固定，交流次数不限。组件以账本/账单身份为 key，避免切换后串用草稿。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

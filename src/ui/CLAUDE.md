# src/ui/

> L2 | 父级: ../CLAUDE.md

- motion.tsx：Presence 保留退出中的子树、Collapse 声明式展开；状态和动画完成事件控制挂载，关闭时 inert，减少动态效果时立即完成。
- motion.css：全局动效时长/曲线、淡入淡出与网格展开；不测量高度、不修改 DOM 样式。
- Download.tsx：React 渲染下载链接，集中管理 Blob URL 资源；仅用 ref 调用浏览器下载动作。
- TouchGestures.tsx：根布局挂载的触摸适配；拦截双指 touchmove 和 Safari gesture 缩放事件，保留单指滚动，按生命周期清理监听。

只依赖 React 和浏览器能力，不导入业务模块。业务组件通过 props 使用；Portal 抽屉通过 Presence 上下文同步退出状态。

- pwa/：横切安装 runtime 与安装指引，根布局保留浏览器安装事件。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

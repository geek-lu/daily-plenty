# src/ui/

> L2 | 父级: ../CLAUDE.md

- motion.tsx：Presence 保留退出中的子树、Collapse 声明式展开；状态和动画完成事件控制挂载，关闭时 inert，减少动态效果时立即完成。
- motion.css：全局动效时长/曲线、淡入淡出与网格展开；不测量高度、不修改 DOM 样式；独立按钮轻按位移 1px，减少动态效果时禁用。
- Download.tsx：React 渲染下载链接，集中管理 Blob URL 资源；仅用 ref 调用浏览器下载动作。
- TouchGestures.tsx：根布局挂载的触摸适配；拦截双指 touchmove 和 Safari gesture 缩放事件，保留单指滚动，按生命周期清理监听。

只依赖 React 和浏览器能力，不导入业务模块。业务组件通过 props 使用；Portal 抽屉通过 Presence 上下文同步退出状态。

- useMediaQuery.ts：useSyncExternalStore 订阅 matchMedia；服务端快照为 false，跨断点自动重渲染。

- pwa/：横切安装 runtime 与安装指引，根布局保留浏览器安装事件。

- SwipeReveal.tsx / swipe-reveal.css：Pointer Events 左滑展开右侧操作；零位移时用 hidden 完全隐藏操作层，避免红底从边缘透出，开始左拖才显示；操作层可见时前景加右侧轻投影和细边、继承圆角，红底内阴影呈现后层，收起恢复平面；鼠标按下由原元素捕获（保留点击目标）、横拖后容器接管；6px 起拖、28px 吸附开关，斜向起步等待明确方向，忽略子元素捕获转移的冒泡事件；禁用文字选取及原生拖放、显示抓取光标，方向锁保留纵向滚动，拖动后抑制点击，取消/禁用复位，键盘左右方向键与 Escape 操作；按钮点击才触发回调。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

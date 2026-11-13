# src/features/shell/

> L2 | 父级: ../CLAUDE.md

- AppShell.tsx：共用布局、底部导航、认证视图；仅会话 ready 的业务页显示底栏，登录/初始化/加载/认证错误不显示。
- runtime.tsx：会话 Provider、用户与账本清单、登录/初始化表单动作、退出；当前账本从 URL 读取。
- navigation.ts：四页路径与图标配置，按账本记忆导航目标的纯规则。
- AuthView.tsx：认证表单纯展示，状态和提交来自 runtime。
- shell.css：固定导航、安全区；data-ready=true 时才预留底栏空间；页面 180ms 从 0.92 到 1 的轻微淡入，无位移；关闭底栏原生点击高亮，记账按压颜色平滑过渡，尊重减少动态效果设置。

L0 shared/types → L1 navigation → L2 ledger/api → L4 shell runtime → L5 AppShell/AuthView。
导航记忆仅在本次会话内、按用户和账本隔离；切换页面不重建 layout。登录过期回到当前 URL 的认证表单，不丢失明细查询。

验证：四页初始 HTML 不包含业务底栏；共享布局回归覆盖加载、登录、初始化、错误、就绪及退出状态。浏览器点击/手机实际底栏位置未实测。

底栏顺序：账本、统计、中央记一笔动作、明细、我们；中央动作不是第五个路由。AppShell 挂载 entry/EntryComposerProvider；Suspense 加载仅显示状态，避免认证前闪出底栏。
runtime 提供 dataVersion / invalidateData，仅刷新账本数据而不重建认证或页面。当前导航重复点击不再触发跳转，选中字体不变宽。
页面过渡仅绑定主内容挂载，普通数据刷新不会重播；动画不使用 transform，避免视觉抖动与改变内部 fixed 定位。内容区至少占一屏，业务页 Suspense 单独处理加载，不替换外部底栏。
页面与认证表单使用 ui/motion.css 公共节奏；AuthView 渐入，底栏位置和字体保持稳定。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

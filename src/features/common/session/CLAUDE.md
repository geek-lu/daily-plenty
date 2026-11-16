# src/features/common/session/

> L2 | 父级: ../CLAUDE.md

- runtime.tsx：会话 Provider、用户与账本清单、登录/初始化表单动作、退出、dataVersion 刷新；当前账本从 URL 读取。
- AuthView.tsx：认证表单纯展示，状态和提交来自 runtime。
- AppShell.tsx：外壳骨架；仅 mode=ready 时渲染导航，按 useIsDesktop 选 nav.pc 或 nav.m；data-device 驱动布局。导航由 app/(main)/layout 注入，本目录不导入 pc/ m/。
- Adaptive.tsx：desktopQuery（≥1024px）、useIsDesktop、Adaptive 二选一渲染；全站唯一断点定义。
- navigation.ts：四页路径/图标与按账本记忆导航目标的纯规则。
- useTabLinks.ts：四页链接、选中态与会话内按用户/账本记忆的地址；stayOnActive 防当前页重复跳转。BottomBar 与 Sidebar 共用。
- shell.css：外壳、手机底栏留白（--app-bar-space）/ PC 侧边栏让位（--app-sidebar-width）、PC 明细页存在 pc-page-fixed 时锁定页面滚动、280ms 纯透明度页面淡入与公共页面原子类（不 transform 外壳和固定导航）。

验证：认证前两端均不渲染导航；ready 时每端只注入一套导航，见 tests/frontend/navigation.test.ts。

useTabLinks 将二级设置页归属「我们」高亮；再次点击「我们」返回一级页面，不覆盖一级页面的地址记忆。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

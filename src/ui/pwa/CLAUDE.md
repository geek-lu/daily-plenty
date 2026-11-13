# src/ui/pwa/

> L2 | 父级: ../CLAUDE.md

- runtime.tsx：全局安装事件、独立窗口识别、生产环境安全上下文的 Service Worker 注册；PwaProvider 包裹根布局。
- InstallCard.tsx：用户主动安装入口；不支持原生安装提示时展开 iPhone/通用浏览器指引。

UI → runtime → 浏览器安装能力。无业务依赖；安装事件在跨页前保留，不自动弹安装窗口、不强制刷新应用。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

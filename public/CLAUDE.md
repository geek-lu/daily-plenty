# public/

> L2 | 父级: ../CLAUDE.md

- icons/：桌面、Apple 和遮罩图标及矢量母版。
- sw.js：同源页面导航优先网络；仅缓存 offline.html，API/非 GET/跨域请求不拦截；旧缓存只清理本应用离线命名空间。
- offline.html：无账户数据的独立断网提示，提供重新打开账本链接。

Service Worker 只在生产和安全上下文注册。自然生命周期更新，不调用 skipWaiting 或自动刷新，不提供离线记账队列。ECS release.sh 已将 public 整体复制进 standalone 发布目录。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

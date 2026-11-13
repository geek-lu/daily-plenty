# PWA 桌面入口

## 结构

```text
src/app/manifest.ts           名称、作用域、独立窗口和本地图标
src/app/layout.tsx            清单链接、Apple 元数据、全局安装 Provider
src/ui/pwa/runtime.tsx        浏览器安装事件、窗口状态、生产 Worker 注册
src/ui/pwa/InstallCard.tsx    「我们」页的安装入口和手动步骤
public/icons/                SVG 母版和 192/512/Apple/遮罩 PNG
public/sw.js                 页面网络优先，仅公共离线说明进入 Cache Storage
public/offline.html          断网时的恢复入口
```

应用页面 UI → 安装 runtime → 浏览器 API。安装代码不依赖账本或用户模块。保持四页路由、现有底栏、抽屉和安全区布局。

## 访问条件

iPhone 在 Safari 分享菜单添加到主屏幕；支持的浏览器从「我们 → 添加到桌面」调用原生安装窗口。华为浏览器若未提供安装事件，显示通用菜单步骤，具体能力取决于版本。应用内浏览器应先转到系统浏览器。

完整安装和 Service Worker 要求可信 HTTPS 或本机 localhost。当前部署按用户选择支持 `http://<服务器IP>:3000` 登录与记账，HTTP 下不注册 Worker，普通桌面快捷方式取决于浏览器。电脑上的 SSH 隧道只供该电脑访问，手机 localhost 不指向电脑。脚本不修改 ECS 安全组、公网端口或证书配置。

## 数据与更新

- 安装身份和启动地址固定为 `/`，不保存账本筛选、邀请令牌等查询参数。
- Service Worker 只预缓存公共 offline.html；API、跨域、非 GET、Next RSC 请求均绕过。
- 正常导航直达网络，401/500 等 HTTP 响应原样返回，只在网络失败时回退离线说明。
- 不缓存账单响应、会话或 CSV，不实现离线记账；缓存清理只针对 daily-plenty-offline- 前缀。
- 不调用 skipWaiting，不自动刷新页面；更新等待浏览器自然切换，避免打断正在填写的表单。
- Worker 仅在 production 的安全上下文注册；/sw.js 禁止 HTTP 缓存并允许根作用域。ECS 现有 public 复制步骤已覆盖新增静态资产。

## 验证

自动回归覆盖安装清单/图标尺寸、Worker 安装/激活、只清理自身旧缓存、联网与断网导航及财务请求绕过；生产路由检查覆盖清单 MIME、图标 MIME/尺寸、Worker 响应头、离线页与页面 Apple 元数据。

2026-11-12：36 项应用测试、3 项脚本测试、类型/架构/格式检查、低内存生产构建及真实 Next 页面/API/PWA 资源检查均通过；清单、Worker、离线页、四张 PNG 均返回 200，通用与旧 Safari 独立窗口标记均已验证。

当前浏览器发现返回空列表，未完成 iPhone/鸿蒙实机添加、原生安装窗口、实际网络切换和跨版本 Worker 生命周期验证。自动测试不替代实机安装。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

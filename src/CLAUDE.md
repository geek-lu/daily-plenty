# src/

> L2 | 父级: ../CLAUDE.md

成员清单

- app/：Next.js 页面、布局、全局样式和 API 适配层。
- features/：按设备分 common/（逻辑与共用组件）、pc/（桌面 B 端视图）、m/（手机视图）；只通过 HTTP 使用服务端。
- server/：服务端 db、user、auth、ledger、跨域 flows 和 HTTP 路由。
- shared/：零框架业务类型、金额规则、Zod 输入和错误契约。
- ui/：跨业务声明式动效、下载组件与 useMediaQuery；业务状态通过 props 输入，不依赖 features/server。

依赖方向：app API → server/http → flows/services → repos → db；features UI → runtime → commands/api，纯规则依赖 shared。浏览器层不得导入 server-only 模块。

features/common/records 为全部账单逻辑；列表/汇总/导出共享 server/ledger/records/repo 的过滤规则。

app/(main) 装配四个独立路由，每页以 common/session/Adaptive 按 1024px 断点选择 pc/ 或 m/ 视图；layout 同时注入 PC 侧边栏与手机底栏。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

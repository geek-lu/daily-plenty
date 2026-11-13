# src/

> L2 | 父级: ../CLAUDE.md

成员清单

- app/：Next.js 页面、布局、全局样式和 API 适配层。
- features/：前端账本域 runtime 与 UI；只通过 HTTP 使用服务端。
- server/：服务端 db、user、auth、ledger、跨域 flows 和 HTTP 路由。
- shared/：零框架业务类型、金额规则、Zod 输入和错误契约。
- ui/：跨业务声明式动效和下载组件；业务状态通过 props 输入，不依赖 features/server。

依赖方向：app API → server/http → flows/services → repos → db；features UI → runtime → commands/api，纯规则依赖 shared。浏览器层不得导入 server-only 模块。

features/records 为独立全部账单域；app/(main)/records 仅负责装配，列表/汇总/导出共享 server/ledger/records/repo 的过滤规则。

app/(main) 装配四个独立路由；features/home、reports、records、together 各自维护页面，shell 为共享导航/认证，ledger 为复用数据和组件。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

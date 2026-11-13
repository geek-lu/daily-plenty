# deploy/

> L2 | 父级: ../CLAUDE.md

成员清单

- README.md：北京 ECS / Alibaba Cloud Linux 3 的公网 HTTP、SSH 预览、HTTPS、发布、更新及恢复流程。
- ecs.env.example：公网监听、外部数据库目录、显式 HTTP Cookie 开关；不含用户密码或手填密钥。
- config/：访问模式迁移与回归，更新现有 app.env 的网络字段并备份原配置。
- package.sh：本地打源码包，排除环境文件、数据和平台相关依赖。
- Caddyfile：将来启用域名 HTTPS 的可选反代模板，当前预览不安装 Caddy。
- scripts/：环境准备、低内存发布、一致性备份、健康检查与测试。
- systemd/：独立用户运行应用和每日备份单元。

当前目标：本机 deploy.local.mk 中的 SSH_HOST（不入库），Alibaba Cloud Linux 3，2 vCPU / 2 GiB / 40 GiB。默认公网 HTTP 监听 0.0.0.0:3000；用户在安全组/系统防火墙放行 TCP 3000，暂不使用 80/443。ACCESS_MODE=tunnel/https 可恢复本机监听。发布包与数据库分离，更新前停写并备份，不能只换代码自动回退数据库迁移。脚本仅在用户执行部署时修改系统，不修改防火墙。

PWA 的 public/ 图标、sw.js 和 offline.html 由 release.sh 现有 public 复制步骤带入发布目录；/sw.js 禁用 HTTP 缓存，手机完整安装需可信 HTTPS。

根 Makefile → scripts/remote.sh → 现有 package/bootstrap/release，目标 ECS 来自根目录 deploy.local.mk（模板 deploy.local.mk.example），未配置 SSH_HOST 时拒绝连接；连接参数也可由环境传入，不保存密码。deploy/update 均携带完整 migrations/（含 0007 评论表）；旧库先停写备份，新服务健康检查时自动迁移，失败不自动回滚数据，恢复边界见 README。

原生编译使用独立 Python 3.11 与 Node 安装包自带头文件；准备阶段安装/检查，发布阶段再次预检并向服务用户的构建进程显式传入，避免使用系统 Python 3.6 或再次下载头文件。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

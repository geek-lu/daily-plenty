# deploy/scripts/

> L2 | 父级: ../CLAUDE.md

- bootstrap.sh：Alibaba Cloud Linux 3 环境准备；独立 Node 22/pnpm、Python 3.11、本地头文件检查、服务用户、目录、systemd 和可选 2 GiB Swap；不开放端口、不启动网站。
- release.sh：固定 Python 3.11 和已安装 Node 头文件进行低内存构建，完整 standalone 装配，通过 ../config/access.mjs 更新访问配置、备份旧库、切换发布目录及健康检查；失败停止新进程，保留旧包与备份。
- backup.mjs：只读源库、在线 SQLite backup API、唯一文件名及完整性校验，不触发迁移。
- healthcheck.mjs：有限重试 setup/status，检查真实接口/数据库可用性。
- check.test.mjs：临时 SQLite WAL 备份/缺失源库与原生编译环境传递、缺失工具链预检回归，不接触生产数据。
- remote.sh：本机 Makefile 的 SSH 编排；传递 http/tunnel/https 模式，串行打包/上传/发布，复用登录、引用参数，失败中止并保留远端源码。
- remote.test.mjs：模拟 SSH/系统命令运行真实 Makefile、打包和解压，验证失败边界、密钥空格、端口、Swap 及部署顺序。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

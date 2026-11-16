# 日日有余 · 阿里云 ECS 部署

已按你的服务器准备：北京区、`<服务器IP>`、Alibaba Cloud Linux 3.2104 LTS 64 位、2 vCPU / 2 GiB、40 GiB 系统盘、3 Mbps 带宽。按你的选择，当前采用 **公网 IP + HTTP**，无需域名、Caddy、Docker、RDS 或证书。

## 推荐：在电脑上用 Makefile 部署

服务器地址只保存在本机 `deploy.local.mk`（已被 .gitignore 排除，也不进入源码包），首次复制模板并填写公网 IP：

```bash
cp deploy.local.mk.example deploy.local.mk   # 编辑 SSH_HOST / SSH_USER / SSH_KEY
make help                                    # 确认当前服务器
```

之后在项目根目录执行，连接 `deploy.local.mk` 中的服务器，默认私钥 `~/.ssh/daily-plenty-ecs`：

```bash
make deploy
```

`make deploy` 会自动打包最新源码、上传到唯一临时目录、准备 Node/pnpm 和 2 GiB Swap、构建发布并检查服务状态。SSH 登录在上传和发布之间复用；首次连接正常核对主机指纹，密码或私钥口令由 SSH 提示，不写入项目。

发布成功后打开 **http://<服务器IP>:3000/setup**。两台手机直接使用这个地址，无需保持电脑或 SSH 隧道开启。初始化后日常访问 **http://<服务器IP>:3000/**。

阿里云控制台 → ECS → 北京地域 → 该实例 → 安全组 → 入方向，添加允许 TCP `3000/3000` 的规则。需要手机 Wi-Fi/流量随时访问时，授权对象填 `0.0.0.0/0`；SSH 22 端口保持仅自己的管理来源可访问。无需开放 80/443/13000。

若服务器启用了 firewalld，在 ECS 执行 `sudo firewall-cmd --get-active-zones` 查看网卡所在区域，再对该区域运行 `sudo firewall-cmd --zone=实际区域 --permanent --add-port=3000/tcp` 和 `sudo firewall-cmd --reload`。未启用则不用安装或开启。脚本不自动修改安全组和防火墙。

HTTP 下密码、会话和账单传输不加密；登录仍使用 HttpOnly、SameSite=Lax Cookie。完整 PWA 的 Service Worker 仍需要 HTTPS，HTTP 下网页桌面快捷方式由浏览器决定。

后续常用命令：

```bash
make update    # 更新代码；备份/发布由现有 release.sh 完成
make status    # 查看服务状态
make logs      # 持续看日志，Ctrl+C 退出
make backup    # 生成服务器数据库备份并显示日志
make package   # 只打源码包，输出临时文件路径
make help      # 查看全部命令；直接 make 也只显示帮助
```

连接参数可以覆盖，例如使用 ecs-user、自定义 SSH 端口或密钥：

```bash
make deploy SSH_USER=ecs-user SSH_PORT=22 SSH_KEY="$HOME/.ssh/ecs.pem"
make tunnel SSH_USER=ecs-user SSH_KEY="$HOME/.ssh/ecs.pem"
```

非 root 用户需要 sudo 权限；远程终端会保留给 sudo 密码输入。若希望每次都使用同一连接配置，可在当前终端 `export SSH_USER=ecs-user`、`export SSH_KEY="$HOME/.ssh/ecs.pem"` 后直接执行 make。私钥文件保持在电脑上，不会上传。

可选：`WITH_SWAP=0` 跳过创建项目 Swap；`NPM_REGISTRY=https://registry.npmmirror.com` 指定包源；`LOCAL_PORT=14000` 修改 SSH 预览端口（与 `make tunnel` 配合使用）。首次 Node 下载仍走 nodejs.org。

`ACCESS_MODE` 默认 `http`。使用 `make deploy ACCESS_MODE=tunnel` 切回本机监听和隧道预览，`ACCESS_MODE=https` 切回本机监听和 Secure Cookie（需另配 HTTPS 反代）。之后更新也要传相同模式，或在终端 `export ACCESS_MODE=tunnel`；否则下次发布按默认 HTTP 配置。访问配置变更前自动备份原 app.env，保留数据库路径等其他配置。

上传或准备失败时不会继续发布；发布失败返回非零状态并保留远端源码目录方便排查。成功后删除本次上传目录，本地临时包/SSH socket 自动清理；独立的 `make package` 保留输出包。数据库位置、发布备份和回滚边界与下文一致。首次部署不会搬运电脑上的已有账单。

以下保留手工步骤，便于定位单个阶段的问题。

## 运行方式与目录

```text
手机/电脑 http://<服务器IP>:3000 → ECS 0.0.0.0:3000
                                      Node.js 单实例 → SQLite

/opt/daily-plenty-tools/     独立 Node 22 与 pnpm，不覆盖系统 Node
/opt/daily-plenty/releases/  每次发布的完整 standalone 包
/opt/daily-plenty/current    当前发布包软链接
/opt/daily-plenty/previous   上次发布包软链接
/opt/daily-plenty/builds/    构建目录，确认发布成功后可清理
/opt/daily-plenty/store/     pnpm 缓存
/etc/daily-plenty/app.env    服务配置（发布只更新访问字段，变更前备份）
/var/lib/daily-plenty/       数据库与 WAL，不在发布包内
/var/backups/daily-plenty/   每日及升级前的一致性备份
```

下文用 `root` 登录；若你使用 `ecs-user`，替换 SSH/scp 的用户名，服务器操作保留 `sudo`。SSH 私钥留在你本机，不需要发给任何人。安全组放行管理来源到 TCP 22，以及手机访问所需的 TCP 3000。隧道模式仅需 22；脚本不会修改安全组或防火墙。

## 1. 本机打包并上传

在项目根目录执行。源码包排除 `.env*`、本地账本、`node_modules`、构建缓存，不会把 Mac 的 SQLite 二进制传到 Linux。默认不迁移本机已有账单，ECS 首次启动为新账本；如需迁移旧数据，应单独用一致性备份导入。

```bash
bash deploy/package.sh /tmp/daily-plenty-source.tar.gz
scp /tmp/daily-plenty-source.tar.gz root@<服务器IP>:/tmp/
ssh root@<服务器IP>
```

已有同名源码包时，换一个文件名，脚本不会覆盖。使用 SSH 密钥可给 `ssh`/`scp` 添加 `-i 本机密钥路径`。

## 2. ECS 解压与准备环境

以下命令在服务器执行。使用一个新的源码目录，每次更新也可重新解压到新的目录。

```bash
mkdir -p ~/daily-plenty-source
tar -xzf /tmp/daily-plenty-source.tar.gz -C ~/daily-plenty-source
cd ~/daily-plenty-source
sudo bash deploy/scripts/bootstrap.sh --with-swap
```

`bootstrap.sh` 只支持 Alibaba Cloud Linux 3，需要 sudo 和出网能力。它会安装原生编译工具与 Python 3.11、下载官方 Node 22 最新补丁版并校验 SHA256、安装 pnpm 10.30.3、创建专用服务用户/目录和 systemd 单元。已有 `app.env` 保留；Python 3.11 独立安装，不替换系统 Python。

`--with-swap` 会创建 `/var/swap/daily-plenty.swap`（2 GiB）、激活并记录到 `/etc/fstab`，用于这台 2 GiB 机器的构建缓冲；不会覆盖已有文件。若你已配置足够 Swap，可省略此参数。构建限制为一个 worker 和 1280 MiB JS 堆；Swap 较慢，构建期间避免运行其他重负载任务。

脚本不启动应用、不安装公网反代。若 Node 官网或 npm 下载失败，会停止并输出错误；不要反复整机重装。npm 默认使用官方源，需要时可在准备与发布两步显式指定镜像：

```bash
sudo env DAILY_PLENTY_NPM_REGISTRY=https://registry.npmmirror.com bash deploy/scripts/bootstrap.sh --with-swap
sudo env DAILY_PLENTY_NPM_REGISTRY=https://registry.npmmirror.com bash deploy/scripts/release.sh
```

这只切换 npm 包源；首次安装 Node 仍使用 nodejs.org。原生 SQLite 在服务器本机编译，避免依赖 GitHub 上的预编译附件。编译显式使用 `/opt/daily-plenty-tools/node` 自带头文件和 `/usr/bin/python3.11`，不再额外下载 Node headers，也不使用系统默认 Python 3.6。

如果此前部署卡在 `node-v22.*-headers.tar.gz` 的 `ETIMEDOUT`，更新本机脚本后重新运行 `make deploy`，补装 Python 3.11 并使用本地头文件重试。此时应使用 `deploy`，因为 `update` 会跳过环境准备。

## 3. 发布应用

```bash
sudo bash deploy/scripts/release.sh
sudo systemctl status daily-plenty --no-pager
sudo journalctl -u daily-plenty -n 60 --no-pager
```

发布脚本以普通服务用户安装依赖和构建，然后将 standalone 服务、静态文件、迁移 SQL 和运维脚本装配到独立 release。构建/原生模块检查失败时，原服务继续运行。

切换前停止服务与备份任务、生成升级前备份，随后切换 `current` 并启动。启动检查访问 `/api/setup/status`，同时检查真实 API、SQLite 驱动和迁移。成功后开机自启，每日北京时间 03:30 左右备份。

配置位于 `/etc/daily-plenty/app.env`，当前默认值已经可用：

```dotenv
HOSTNAME=0.0.0.0
PORT=3000
DATABASE_PATH=/var/lib/daily-plenty/daily-plenty.db
BACKUP_DIRECTORY=/var/backups/daily-plenty
DAILY_PLENTY_LOCAL_PREVIEW=false
DAILY_PLENTY_ALLOW_HTTP=true
```

`DAILY_PLENTY_ALLOW_HTTP=true` 显式允许生产 HTTP 登录，设置与清除会话均不带 Secure 属性。未开启该选项时，生产 Cookie 默认 Secure；旧的 `DAILY_PLENTY_LOCAL_PREVIEW` 只对 127.0.0.1 生效。发布会自动迁移已有隧道配置，无需手工编辑。数据库路径、备份位置和其他配置保留；原配置备份在 app.env 同目录，以 `.before-access-` 为后缀前缀。

## 4. 初始化与可选 SSH 隧道

默认公网 HTTP：打开 **http://<服务器IP>:3000/setup**，设置第一个账号、至少 6 位密码和账本名称。无需填写初始化密钥。随后在「我们」生成邀请链接给另一位成员，链接会使用当前访问的公网地址。

只有选择 `ACCESS_MODE=tunnel` 或临时排查本机接口时，才需要在电脑新开终端执行并保持连接：

```bash
ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
  -L 127.0.0.1:13000:127.0.0.1:3000 root@<服务器IP>
```

隧道建立后浏览器打开 **http://localhost:13000/setup**。同一次登录保持使用相同主机名和协议；IP 地址与 localhost 的 Cookie 不共享。

关闭 SSH 连接只会关闭本机隧道，公网 HTTP 访问不受影响。通过 localhost 生成的邀请链接也只能在有相应隧道的设备使用，发给手机时应在公网地址页面生成邀请。

## 5. 后续更新

本机重新打包上传，在 ECS 解压到新的源码目录，再运行 `sudo bash deploy/scripts/release.sh`。更新短暂停机，数据库始终在外部目录，不会被源码覆盖。不要把 Mac 的 `.next-build` 或 `node_modules` 直接上传为运行版本。

确认新版本正常后，可删除脚本输出的**本次 builds 子目录**。发布包、缓存和备份不会自动清理；定期查看 `df -h`、`du -sh /opt/daily-plenty/* /var/backups/daily-plenty`，至少保留当前版本、一个已知可用旧版本和对应备份。不要删除 `current`/`previous` 指向的 releases 子目录。

### 账单评论表升级

本次新增 `migrations/0007_entry_comments.sql`，已有服务器运行 `make update` 即可（工具链尚未准备好时用 `make deploy`）。两者都会打包完整 `migrations/`；`release.sh` 将全部 SQL 复制到 standalone 发布目录，不需要另行上传 SQL、手工建表或重新初始化账本。

升级顺序为：构建及原生模块预检 → 停止旧服务和备份任务 → 对已有数据库生成一致性备份 → 切换 `current` → 新服务的健康检查访问 `/api/setup/status`，打开数据库并自动应用尚未执行的迁移。迁移按文件名排序、记录内容哈希，并在事务中执行；重复发布不会重复建评论表，已应用 SQL 不可修改。账单仍保留在原数据库，评论存入独立新表。首次部署没有旧库时跳过升级前备份，由新服务创建完整数据库。

备份失败会中止切换，已有旧版本会尝试重新启动；切换后若启动或健康检查（包括迁移）失败，新服务停止并返回失败，保留旧发布包及 `pre-release-backup.txt` 指向的备份，不自动回滚数据库。按下节恢复时应配对旧发布包与升级前备份；恢复会丢失备份时点之后的账单和评论，不能把仅切回旧代码当作数据库回滚。评论上线后的日常备份仍覆盖整个 SQLite 数据库，无需新增备份任务。

## 6. 备份与恢复

手工生成一致性备份：

```bash
sudo systemctl start daily-plenty-backup.service
sudo journalctl -u daily-plenty-backup.service -n 10 --no-pager
sudo systemctl list-timers daily-plenty-backup.timer
```

日志给出备份的完整路径。备份使用 SQLite backup API，包含 WAL 中已提交的数据；完整性检查通过才从 `.partial` 改名为 `.db`，不会覆盖旧文件。正常备份不创建源库、不运行迁移。磁盘上的备份不抵御整块云盘损坏，建议定期下载一份到你自己的电脑，无需额外付费服务：

```bash
# 在本机执行，把文件名换成日志中实际生成的备份名。
scp root@<服务器IP>:/var/backups/daily-plenty/实际备份文件名.db ~/Downloads/
```

恢复会把账单回退到备份时点；备份后的新增/修改不在该副本内。先确定匹配的旧发布目录和备份文件，尤其是更新包含迁移时，**不能仅切换旧代码**。

以下为恢复操作模板，请在 root shell 中执行，将两个占位路径换成实际路径后再运行：

```bash
sudo -i
RESTORE_BACKUP=/var/backups/daily-plenty/实际备份文件名.db
RESTORE_RELEASE=/opt/daily-plenty/releases/匹配这个备份的发布目录
test -f "$RESTORE_BACKUP" && test -f "$RESTORE_RELEASE/server.js" || exit 1
test "$(sqlite3 -readonly "$RESTORE_BACKUP" 'PRAGMA quick_check;')" = ok || exit 1
systemctl stop daily-plenty daily-plenty-backup.timer daily-plenty-backup.service
RESCUE_DIR=$(mktemp -d /var/lib/daily-plenty/before-restore.XXXXXX)
# 停止所有读写后保留整套旧文件（包括 WAL），不直接删除。
for file in /var/lib/daily-plenty/daily-plenty.db /var/lib/daily-plenty/daily-plenty.db-wal /var/lib/daily-plenty/daily-plenty.db-shm; do
  if test -f "$file"; then mv "$file" "$RESCUE_DIR/"; fi
done
install -o daily-plenty -g daily-plenty -m 600 "$RESTORE_BACKUP" /var/lib/daily-plenty/daily-plenty.db
ln -sfnT "$RESTORE_RELEASE" /opt/daily-plenty/restore.next
mv -Tf /opt/daily-plenty/restore.next /opt/daily-plenty/current
systemctl start daily-plenty && systemctl start daily-plenty-backup.timer
```

失败发布保留 `previous` 链接和新发布目录内的 `pre-release-backup.txt`。先看 `journalctl -u daily-plenty` 判断是配置/依赖问题还是迁移兼容问题；脚本不会擅自恢复备份、丢弃新记录。

## 7. 可选：以后切换 HTTPS

HTTP 已支持两台手机直接访问。若以后需要 HTTPS 与完整 PWA，可准备域名、北京 ECS 对应的 ICP 备案及 DNS 指向 `<服务器IP>`，再启用 HTTPS 反向代理：

1. 执行 `make deploy ACCESS_MODE=https`，恢复本机监听并关闭两个 HTTP Cookie 开关；后续更新保持相同 ACCESS_MODE。
2. 安装 Caddy 或配置已有反向代理；`deploy/Caddyfile` 是预留模板，需将 `{$DAILY_PLENTY_DOMAIN}` 替换为实际域名，或为 Caddy 服务设置该环境变量。
3. 安全组放行 80/443、移除公网 3000 规则，应用只监听 127.0.0.1:3000。
4. 验证 HTTPS 登录及邀请链接后，两个手机浏览器即可直接使用。

## PWA 发布与手机安装

现有 release.sh 会把 public/ 完整复制进 standalone 发布目录。安装清单由 Next 的 /manifest.webmanifest 生成；无需额外服务或依赖。

- 同源可访问：/manifest.webmanifest、/sw.js、/offline.html、/icons/ 下 PNG。
- /sw.js 返回 JavaScript 类型、Service-Worker-Allowed: / 和禁缓存响应头；反向代理不能将该路径改为登录页或统一 HTML 回退。
- 根页面包含 Apple 主屏幕图标、独立窗口元数据和安装清单链接。
- 完整 PWA 需可信 HTTPS；公网 HTTP 可正常记账，但不注册 Service Worker。能否添加普通桌面快捷方式由手机浏览器决定。电脑上的 SSH 本地转发不能作为手机桌面图标的长期访问入口。
- 浏览器支持原生安装时，「我们 → 添加到桌面」触发系统窗口；iPhone 使用 Safari 分享菜单，华为依实际浏览器菜单添加。
- 更新不强制接管尚未关闭的旧页面；账单保存不会因 Worker 更新被主动刷新。只缓存断网说明页，记账始终联网。

## 本地检查与当前验证边界

```bash
bash -n deploy/package.sh deploy/scripts/bootstrap.sh deploy/scripts/release.sh
node --test deploy/scripts/check.test.mjs
pnpm test
pnpm build
pnpm check:routes
```

公网 HTTP 改造已通过 37 项应用测试、9 项脚本测试、类型/架构/格式与 Shell 语法检查、生产构建，以及 HTTP/HTTPS 两种 Cookie 配置的真实 Next 路由检查（初始化、登录、邀请、记账与退出）。测试使用本机内存数据库或临时文件，不连接 ECS。

评论迁移部署检查：`pnpm test:scripts` 的 9 项测试通过；真实 Makefile 配合模拟 SSH 执行打包/解压，确认 `make deploy` 与 `make update` 上传包内的 `0007_entry_comments.sql` 与源码逐字一致，并验证上传、准备和发布失败中止。部署 Shell 语法及所改部署文件格式检查通过。发布内的停写、备份、切换与启动顺序已检查源码；未在真实 systemd/Linux 环境演练评论迁移失败及恢复。

本轮未登录你的 ECS，也没有执行 dnf、systemd、Swap 或公网配置。服务器部署、实际端口连通与两台手机访问仍需部署后确认。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

API 密钥迁移包含 `0008_api_keys.sql` 和 `0009_ledger_api_keys.sql`，最终密钥只归账本。0009 保留旧凭据元数据但将其撤销，避免静默扩大权限；若已用旧个人密钥，升级后在「我们 → API 密钥」重新生成并配置一次。沿用上述增量发布方式，部署前备份，不重新初始化已有账本，不修改已应用 SQL。

账单来源升级新增 `0010_entry_source.sql`：全部已有账单默认「人工记录」，升级后 API 新增才标记「AI 记录」。只新增来源列并补齐幂等响应，不改变原金额、归属和版本；无需人工逐笔处理。

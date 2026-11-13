#!/usr/bin/env bash
# [INPUT]: Alibaba Cloud Linux 3、root，可选 --with-swap。
# [OUTPUT]: 独立 Node/pnpm、Python 3.11、服务用户/配置目录和 systemd 单元。
# [POS]: 首次准备入口；不覆盖已有配置和 Swap。
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
[[ $(uname -s) == Linux && $EUID -eq 0 ]] || { echo '请在 ECS 上使用 sudo 运行'; exit 1; }
[[ ${1:-} == '' || ${1:-} == --with-swap ]] || { echo '用法：bootstrap.sh [--with-swap]'; exit 1; }
. /etc/os-release
[[ ${ID:-} == alinux && ${VERSION_ID:-} == 3* ]] || { echo '本脚本针对 Alibaba Cloud Linux 3；其他系统请按 README 手动安装'; exit 1; }
DEPLOY_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
TOOLS=/opt/daily-plenty-tools
export PATH="$TOOLS/node/bin:$TOOLS/pnpm/bin:$PATH"
REGISTRY=${DAILY_PLENTY_NPM_REGISTRY:-https://registry.npmjs.org}
[[ $REGISTRY == https://* ]] || { echo 'npm registry 必须使用 HTTPS'; exit 1; }
dnf install -y curl ca-certificates tar gzip xz gcc-c++ make python3.11 util-linux findutils procps-ng sqlite
/usr/bin/python3.11 -c 'import sys; assert sys.version_info >= (3, 11), "需要 Python 3.11 或更新版本"'
install -d -m 755 "$TOOLS" /opt/daily-plenty /opt/daily-plenty/releases
if [[ ! -x $TOOLS/node/bin/node ]]; then
  case $(uname -m) in x86_64) ARCH=x64 ;; aarch64) ARCH=arm64 ;; *) echo '不支持的 CPU 架构'; exit 1 ;; esac
  DOWNLOAD=$(mktemp -d)
  trap 'rm -rf -- "$DOWNLOAD"' EXIT
  curl -fSL --retry 3 https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$DOWNLOAD/SHASUMS256.txt"
  NODE_ARCHIVE=$(awk -v arch="$ARCH" '$2 ~ ("^node-v22\\.[0-9]+\\.[0-9]+-linux-" arch "\\.tar\\.xz$") {print $2}' "$DOWNLOAD/SHASUMS256.txt")
  [[ -n $NODE_ARCHIVE && $NODE_ARCHIVE != *$'\n'* ]] || { echo '无法确定 Node 22 发布文件'; exit 1; }
  curl -fSL --retry 3 "https://nodejs.org/dist/latest-v22.x/$NODE_ARCHIVE" -o "$DOWNLOAD/$NODE_ARCHIVE"
  (cd "$DOWNLOAD" && awk -v file="$NODE_ARCHIVE" '$2 == file' SHASUMS256.txt | sha256sum -c -)
  tar -xJf "$DOWNLOAD/$NODE_ARCHIVE" -C "$TOOLS"
  ln -s "$TOOLS/${NODE_ARCHIVE%.tar.xz}" "$TOOLS/node"
fi
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if(major!==22 || minor<13) throw Error("需要 Node 22.13 或更新的 22.x")'
[[ -r $TOOLS/node/include/node/node.h && -r $TOOLS/node/include/node/common.gypi && -r $TOOLS/node/include/node/config.gypi ]] || { echo 'Node 安装包缺少编译头文件，请检查 /opt/daily-plenty-tools/node'; exit 1; }
if [[ ! -x $TOOLS/pnpm/bin/pnpm ]]; then
  npm install --global --prefix "$TOOLS/pnpm" --registry "$REGISTRY" pnpm@10.30.3
fi
id daily-plenty >/dev/null 2>&1 || useradd --system --user-group --home-dir /var/lib/daily-plenty --shell /sbin/nologin daily-plenty
install -d -m 700 -o daily-plenty -g daily-plenty /var/lib/daily-plenty /var/backups/daily-plenty
install -d -m 755 -o daily-plenty -g daily-plenty /opt/daily-plenty/builds /opt/daily-plenty/store
install -d -m 750 -o root -g daily-plenty /etc/daily-plenty
if [[ ! -e /etc/daily-plenty/app.env ]]; then
  install -m 640 -o root -g daily-plenty "$DEPLOY_DIR/ecs.env.example" /etc/daily-plenty/app.env
fi
for unit in "$DEPLOY_DIR"/systemd/*.service "$DEPLOY_DIR"/systemd/*.timer; do
  install -m 644 "$unit" "/etc/systemd/system/$(basename "$unit")"
done
if [[ ${1:-} == --with-swap ]] && ! awk '$1=="/var/swap/daily-plenty.swap" {found=1} END {exit !found}' /proc/swaps; then
  [[ ! -e /var/swap/daily-plenty.swap ]] || { echo 'Swap 文件已存在但未激活，请先人工检查；未覆盖'; exit 1; }
  [[ $(df -Pk /var | awk 'NR==2 {print $4}') -gt 4194304 ]] || { echo '创建 Swap 前至少需要 4 GiB 可用磁盘'; exit 1; }
  install -d -m 700 /var/swap
  (umask 077; dd if=/dev/zero of=/var/swap/daily-plenty.swap bs=1M count=2048 status=progress)
  chmod 600 /var/swap/daily-plenty.swap
  mkswap /var/swap/daily-plenty.swap
  swapon /var/swap/daily-plenty.swap
  if ! awk '$1=="/var/swap/daily-plenty.swap" {found=1} END {exit !found}' /etc/fstab; then
    echo '/var/swap/daily-plenty.swap none swap sw 0 0' >> /etc/fstab
  fi
fi
systemctl daemon-reload
echo '环境准备完成。未启动应用、未安装公网代理、未修改防火墙。'
echo '下一步：sudo bash deploy/scripts/release.sh'

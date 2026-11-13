#!/usr/bin/env bash
# [INPUT]: Makefile 导出的连接参数/访问模式、现有打包/准备/发布脚本。
# [OUTPUT]: 从本机串行打包、上传、远程执行，或打开隧道/运维命令。
# [POS]: macOS Bash 3.2 / Linux 通用客户端，不保存密码，不复制本地账本。
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail

PROJECT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
ACTION=${1:-}
SSH_HOST=${SSH_HOST:-203.0.113.10}
SSH_USER=${SSH_USER:-root}
SSH_PORT=${SSH_PORT:-22}
SSH_KEY=${SSH_KEY:-}
LOCAL_PORT=${LOCAL_PORT:-13000}
WITH_SWAP=${WITH_SWAP:-1}
NPM_REGISTRY=${NPM_REGISTRY:-https://registry.npmjs.org}
ACCESS_MODE=${ACCESS_MODE:-http}
LOCAL_WORK=''
CONTROL_READY=false

fail() {
  echo "$*" >&2
  exit 1
}

# SSH 将远程命令交给 shell 解析；每个可配置参数必须独立引用。
quote() {
  local value=$1
  local replacement="'\"'\"'"
  value=${value//\'/$replacement}
  printf "'%s'" "$value"
}

valid_port() {
  [[ $1 =~ ^[0-9]{1,5}$ ]] && (( 10#$1 >= 1 && 10#$1 <= 65535 ))
}

make_package() {
  LOCAL_WORK=$(mktemp -d /tmp/daily-plenty-deploy.XXXXXX)
  bash "$PROJECT/deploy/package.sh" "$LOCAL_WORK/source.tar.gz"
}

if [[ $ACTION == package ]]; then
  make_package
  exit 0
fi
case "$ACTION" in
  deploy|update|tunnel|status|logs|backup) ;;
  *) fail '用法：remote.sh deploy|update|tunnel|status|logs|backup|package' ;;
esac
[[ $SSH_HOST =~ ^[[:alnum:]][[:alnum:].-]*$ ]] || fail 'SSH_HOST 请填写服务器 IP、主机名或 SSH 配置别名'
[[ $SSH_USER =~ ^[[:alnum:]_][[:alnum:]_.-]*$ ]] || fail 'SSH_USER 格式无效'
valid_port "$SSH_PORT" || fail 'SSH_PORT 必须是 1–65535 的端口'
valid_port "$LOCAL_PORT" || fail 'LOCAL_PORT 必须是 1–65535 的端口'
[[ $WITH_SWAP == 0 || $WITH_SWAP == 1 ]] || fail 'WITH_SWAP 只能是 0 或 1'
[[ $ACCESS_MODE == http || $ACCESS_MODE == tunnel || $ACCESS_MODE == https ]] || fail 'ACCESS_MODE 必须为 http、tunnel 或 https'
[[ $NPM_REGISTRY == https://* ]] || fail 'NPM_REGISTRY 必须使用 HTTPS'

TARGET="$SSH_USER@$SSH_HOST"
SSH_OPTIONS=(-p "$SSH_PORT" -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=3)
SCP_OPTIONS=(-P "$SSH_PORT" -o ConnectTimeout=15)
if [[ -n $SSH_KEY ]]; then
  [[ -f $SSH_KEY ]] || fail "SSH 密钥文件不存在：$SSH_KEY"
  SSH_OPTIONS+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
  SCP_OPTIONS+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
fi
PRIVILEGE=''
if [[ $SSH_USER != root ]]; then
  PRIVILEGE='sudo '
fi

case "$ACTION" in
  tunnel)
    echo "打开 http://localhost:$LOCAL_PORT/setup；保持此终端连接，Ctrl+C 关闭隧道。"
    exec ssh "${SSH_OPTIONS[@]}" -N -o ExitOnForwardFailure=yes \
      -L "127.0.0.1:$LOCAL_PORT:127.0.0.1:3000" "$TARGET"
    ;;
  status)
    exec ssh "${SSH_OPTIONS[@]}" -t "$TARGET" "${PRIVILEGE}systemctl status daily-plenty --no-pager"
    ;;
  logs)
    exec ssh "${SSH_OPTIONS[@]}" -t "$TARGET" "${PRIVILEGE}journalctl -u daily-plenty -n 80 -f --no-pager"
    ;;
  backup)
    exec ssh "${SSH_OPTIONS[@]}" -t "$TARGET" \
      "${PRIVILEGE}systemctl start daily-plenty-backup.service && ${PRIVILEGE}journalctl -u daily-plenty-backup.service -n 10 --no-pager"
    ;;
esac

cleanup() {
  if [[ -n $LOCAL_WORK ]]; then
    if [[ $CONTROL_READY == true ]]; then
      ssh "${SSH_OPTIONS[@]}" -O exit "$TARGET" >/dev/null 2>&1 || true
    fi
    rm -rf -- "$LOCAL_WORK"
  fi
}
trap cleanup EXIT
make_package

# 三次传输/执行复用一次 SSH 登录；socket 仅放在本次私有临时目录。
CONTROL_OPTIONS=(-o ControlMaster=auto -o ControlPersist=60 -o "ControlPath=$LOCAL_WORK/ssh-%C")
SSH_OPTIONS+=("${CONTROL_OPTIONS[@]}")
SCP_OPTIONS+=("${CONTROL_OPTIONS[@]}")
CONTROL_READY=true
REMOTE_WORK=$(ssh "${SSH_OPTIONS[@]}" "$TARGET" 'mktemp -d /tmp/daily-plenty-upload.XXXXXX')
[[ $REMOTE_WORK =~ ^/tmp/daily-plenty-upload\.[[:alnum:]]+$ ]] || fail '服务器未返回有效的上传临时目录'
echo "上传到 $TARGET:$REMOTE_WORK"
scp "${SCP_OPTIONS[@]}" "$LOCAL_WORK/source.tar.gz" "$TARGET:$REMOTE_WORK/source.tar.gz"

REMOTE_COMMAND="tar -xzf $(quote "$REMOTE_WORK/source.tar.gz") -C $(quote "$REMOTE_WORK") && cd $(quote "$REMOTE_WORK")"
REMOTE_ENV="${PRIVILEGE}env DAILY_PLENTY_NPM_REGISTRY=$(quote "$NPM_REGISTRY") DAILY_PLENTY_ACCESS_MODE=$(quote "$ACCESS_MODE")"
if [[ $ACTION == deploy ]]; then
  SWAP_OPTION=''
  if [[ $WITH_SWAP == 1 ]]; then
    SWAP_OPTION=' --with-swap'
  fi
  REMOTE_COMMAND+=" && $REMOTE_ENV bash deploy/scripts/bootstrap.sh$SWAP_OPTION"
fi
REMOTE_COMMAND+=" && $REMOTE_ENV bash deploy/scripts/release.sh"
REMOTE_COMMAND+=" && ${PRIVILEGE}systemctl status daily-plenty --no-pager"
REMOTE_COMMAND+=" && rm -rf -- $(quote "$REMOTE_WORK")"

# 保留终端供非 root 用户输入 sudo 密码；失败时保留远端上传目录便于排查。
if ! ssh "${SSH_OPTIONS[@]}" -t "$TARGET" "$REMOTE_COMMAND"; then
  fail "部署未完成。远端源码保留在 ${REMOTE_WORK}；可用 make logs 查看服务日志。"
fi
if [[ $ACCESS_MODE == http ]]; then
  echo "部署完成。安全组放行 TCP 3000 后，打开 http://${SSH_HOST}:3000/setup。"
else
  echo '部署完成。SSH 预览运行 make tunnel；HTTPS 模式请通过已配置的反向代理访问。'
fi

#!/usr/bin/env bash
# [INPUT]: 完整源码、Node 本地头文件/Python 3.11、app.env 与访问模式。
# [OUTPUT]: Linux 本机构建的独立发布包，健康后启用服务和每日备份。
# [POS]: 单机发布入口；构建失败不碰运行版本，切换前停服务并备份，失败不自动还原数据库。
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
[[ $(uname -s) == Linux && $EUID -eq 0 ]] || { echo '请在 ECS 上使用 sudo 运行'; exit 1; }
SOURCE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
APP_ROOT=/opt/daily-plenty
TOOLS=/opt/daily-plenty-tools
export PATH="$TOOLS/node/bin:$TOOLS/pnpm/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
[[ -x $TOOLS/pnpm/bin/pnpm && -r /etc/daily-plenty/app.env ]] || { echo '请先运行 bootstrap.sh'; exit 1; }
[[ -r $TOOLS/node/include/node/node.h && -r $TOOLS/node/include/node/common.gypi && -r $TOOLS/node/include/node/config.gypi ]] || { echo 'Node 本地编译头文件缺失，请运行 make deploy 检查工具链'; exit 1; }
[[ -x /usr/bin/python3.11 ]] || { echo '缺少 Python 3.11，请运行 make deploy 补齐环境'; exit 1; }
/usr/bin/python3.11 -c 'import sys; assert sys.version_info >= (3, 11), "需要 Python 3.11 或更新版本"'
ACCESS_MODE=${DAILY_PLENTY_ACCESS_MODE:-http}
[[ $ACCESS_MODE == http || $ACCESS_MODE == tunnel || $ACCESS_MODE == https ]] || { echo '访问模式必须为 http、tunnel 或 https'; exit 1; }
exec 9>/var/lock/daily-plenty-release.lock
flock -n 9 || { echo '另一个发布正在执行'; exit 1; }
RELEASE_ID=$(date -u +%Y%m%dT%H%M%SZ)-$$
BUILD_DIR="$APP_ROOT/builds/$RELEASE_ID"
RELEASE_DIR="$APP_ROOT/releases/$RELEASE_ID"
REGISTRY=${DAILY_PLENTY_NPM_REGISTRY:-https://registry.npmjs.org}
[[ $REGISTRY == https://* ]] || { echo 'npm registry 必须使用 HTTPS'; exit 1; }
install -d -m 755 "$BUILD_DIR" "$RELEASE_DIR"
tar -C "$SOURCE" --exclude='./node_modules' --exclude='./.next' --exclude='./.next-build' --exclude='./.git' --exclude='./.env*' --exclude='./.npmrc' --exclude='*.pem' --exclude='*.key' --exclude='*.db' --exclude='*.db-*' --exclude='*.sqlite*' --exclude='./data' --exclude='./backups' --exclude='./.cache' --exclude='./dist' --exclude='./*.tsbuildinfo' -cf - . | tar -C "$BUILD_DIR" -xf -
chown -R daily-plenty:daily-plenty "$BUILD_DIR"
build_as_app() {
  runuser -u daily-plenty -- env \
    PATH="$PATH" \
    NEXT_TELEMETRY_DISABLED=1 \
    DAILY_PLENTY_LOW_MEMORY_BUILD=true \
    NODE_OPTIONS=--max-old-space-size=1280 \
    npm_config_build_from_source=true \
    npm_config_nodedir="$TOOLS/node" \
    NODE_GYP_FORCE_PYTHON=/usr/bin/python3.11 \
    "$@"
}
cd "$BUILD_DIR"
build_as_app pnpm install --frozen-lockfile --store-dir "$APP_ROOT/store" --registry "$REGISTRY"
build_as_app pnpm build
cp -a .next-build/standalone/. "$RELEASE_DIR/"
mkdir -p "$RELEASE_DIR/.next-build/static" "$RELEASE_DIR/.next-build/cache" "$RELEASE_DIR/migrations"
cp -a .next-build/static/. "$RELEASE_DIR/.next-build/static/"
cp -a migrations/. "$RELEASE_DIR/migrations/"
if [[ -d public ]]; then cp -a public "$RELEASE_DIR/"; fi
cp deploy/scripts/backup.mjs deploy/scripts/healthcheck.mjs "$RELEASE_DIR/"
chown -R root:daily-plenty "$RELEASE_DIR"
chmod -R u=rwX,g=rX,o= "$RELEASE_DIR"
chown -R daily-plenty:daily-plenty "$RELEASE_DIR/.next-build/cache"
cd "$RELEASE_DIR"
runuser -u daily-plenty -- "$TOOLS/node/bin/node" -e 'const fs=require("fs"); for(const path of ["server.js",".next-build/BUILD_ID",".next-build/static","migrations/0001_initial.sql"]) fs.accessSync(path); const D=require("better-sqlite3"); const db=new D(":memory:"); db.prepare("SELECT 1").get(); db.close();'
# 校验数据路径；旧 app.env 不作为 shell 执行。
env -i PATH="$PATH" "$TOOLS/node/bin/node" --env-file=/etc/daily-plenty/app.env -e 'if(process.env.DATABASE_PATH!=="/var/lib/daily-plenty/daily-plenty.db" || process.env.BACKUP_DIRECTORY!=="/var/backups/daily-plenty") throw Error("请保留模板的数据库和备份路径");'
PREVIOUS=$(readlink -f "$APP_ROOT/current" || true)
SWITCHED=false
restore_before_switch() {
  local code=$?
  if [[ $code -ne 0 && $SWITCHED == false && -n $PREVIOUS && -d $PREVIOUS ]]; then
    systemctl start daily-plenty.service || true
    systemctl start daily-plenty-backup.timer || true
  fi
  exit "$code"
}
trap restore_before_switch EXIT
systemctl stop daily-plenty.service daily-plenty-backup.timer daily-plenty-backup.service
if [[ -f /var/lib/daily-plenty/daily-plenty.db ]]; then
  BACKUP=$(runuser -u daily-plenty -- env -i PATH="$PATH" "$TOOLS/node/bin/node" --env-file=/etc/daily-plenty/app.env "$RELEASE_DIR/backup.mjs")
  echo "升级前备份：$BACKUP"
  echo "$BACKUP" > "$RELEASE_DIR/pre-release-backup.txt"
fi
if [[ -n $PREVIOUS && -d $PREVIOUS ]]; then
  ln -sfnT "$PREVIOUS" "$APP_ROOT/previous.next"
  mv -Tf "$APP_ROOT/previous.next" "$APP_ROOT/previous"
fi
ln -sfnT "$RELEASE_DIR" "$APP_ROOT/current.next"
mv -Tf "$APP_ROOT/current.next" "$APP_ROOT/current"
SWITCHED=true
# 旧服务已停止且新包已切换，避免失败回启旧包时提前套用新网络模式。
"$TOOLS/node/bin/node" "$SOURCE/deploy/config/access.mjs" /etc/daily-plenty/app.env "$ACCESS_MODE"
if ! systemctl start daily-plenty.service; then
  systemctl stop daily-plenty.service
  echo '新版本启动失败，已停止。旧发布包和备份已保留；请查看日志及 deploy/README.md 的恢复步骤。'
  journalctl -u daily-plenty.service -n 40 --no-pager
  exit 1
fi
systemctl enable daily-plenty.service
systemctl enable --now daily-plenty-backup.timer
echo "发布成功：$RELEASE_DIR"
echo '访问方式见本次配置模式及 deploy/README.md；公网 HTTP 需安全组放行 TCP 3000。'
echo "本次构建目录可在确认运行正常后删除：$BUILD_DIR"

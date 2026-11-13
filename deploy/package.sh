#!/usr/bin/env bash
# [INPUT]: 本地项目源码，可选输出路径。[OUTPUT]: 可上传 ECS 的源码包，排除本地数据库、环境文件与平台依赖。
# [POS]: macOS/Linux 通用打包；在 ECS 上重新构建 SQLite 原生模块。
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
PROJECT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
TARGET=${1:-/tmp/daily-plenty-source.tar.gz}
[[ $TARGET == /* ]] || { echo '请使用绝对输出路径'; exit 1; }
case "$TARGET" in "$PROJECT"/*) echo '请把源码包输出到项目外，避免递归打包'; exit 1 ;; esac
[[ ! -e $TARGET ]] || { echo "文件已存在，未覆盖：$TARGET"; exit 1; }
umask 077
COPYFILE_DISABLE=1 tar -C "$PROJECT" --exclude='./node_modules' --exclude='./.next' --exclude='./.next-build' --exclude='./.git' --exclude='./.env*' --exclude='./deploy.local.mk' --exclude='./.npmrc' --exclude='*.pem' --exclude='*.key' --exclude='*.db' --exclude='*.db-*' --exclude='*.sqlite*' --exclude='./data' --exclude='./backups' --exclude='./.cache' --exclude='./dist' --exclude='./.DS_Store' --exclude='./*.tsbuildinfo' -czf "$TARGET" .
echo "源码包：$TARGET"

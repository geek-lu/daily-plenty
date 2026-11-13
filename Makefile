# [INPUT]: SSH 连接参数与现有 ECS 发布脚本。
# [OUTPUT]: 一条命令部署、更新、预览和查看服务状态。
# [POS]: 本机操作入口；默认 help，不在读取 Makefile 时连接服务器。
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
.DEFAULT_GOAL := help

SSH_HOST ?= 203.0.113.10
SSH_USER ?= root
SSH_PORT ?= 22
SSH_KEY ?= $(HOME)/.ssh/daily-plenty-ecs
LOCAL_PORT ?= 13000
WITH_SWAP ?= 1
NPM_REGISTRY ?= https://registry.npmjs.org
ACCESS_MODE ?= http

export SSH_HOST SSH_USER SSH_PORT SSH_KEY LOCAL_PORT WITH_SWAP NPM_REGISTRY ACCESS_MODE

.PHONY: help deploy update tunnel status logs backup package

help:
	@printf '%s\n' \
	  'make deploy   打包、上传、准备环境并发布（默认创建 2 GiB Swap）' \
	  'make update   打包、上传并更新应用，跳过环境准备' \
	  'make tunnel   打开 SSH 隧道，预览 http://localhost:13000/setup' \
	  'make status   查看 ECS 服务状态' \
	  'make logs     持续查看 ECS 服务日志，Ctrl+C 退出' \
	  'make backup   在 ECS 生成数据库备份并显示结果' \
	  'make package  仅打包源码，输出临时文件路径' \
	  '' \
	  '默认服务器：root@203.0.113.10:22' \
	  '默认密钥：~/.ssh/daily-plenty-ecs' \
	  '默认访问：http://203.0.113.10:3000（安全组需放行 TCP 3000）' \
	  '访问模式：ACCESS_MODE=http（公网 HTTP）/tunnel（SSH 预览）/https（HTTPS 反代）' \
	  '可覆盖：SSH_HOST SSH_USER SSH_PORT SSH_KEY LOCAL_PORT WITH_SWAP NPM_REGISTRY ACCESS_MODE' \
	  '例：make deploy SSH_USER=ecs-user SSH_KEY="/path/to/key.pem"'

deploy update tunnel status logs backup package:
	@bash deploy/scripts/remote.sh $@

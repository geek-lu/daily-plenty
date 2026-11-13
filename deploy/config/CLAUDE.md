# deploy/config/

> L2 | 父级: ../CLAUDE.md

- access.mjs：发布前设置 http/tunnel/https 的监听与 Cookie 参数；变更前备份现有配置，保留数据路径及其他设置。
- access.test.mjs：真实 CLI 验证旧配置迁移、重复执行、模式切换、权限保留及无效模式拒绝。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

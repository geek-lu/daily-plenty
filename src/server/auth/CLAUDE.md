# src/server/auth/

> L2 | 父级: ../CLAUDE.md

scrypt 密码、会话与限速。

- service.ts / repo.ts：scrypt 密码、30 天网页登录会话与登录限速；禁用用户的会话也被拒绝。
- api-keys.ts：256 位随机账本共享长期密钥，生成时返回一次明文；SHA-256 摘要鉴权，撤销或账本归档时拒绝；生成者仅审计。
- api-key-repo.ts：密钥元数据白名单、按当前 editor 可管理账本列出共享密钥；管理时验证成员资格，鉴权只检查密钥与账本状态，记录最近使用时间。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

# deploy/systemd/

> L2 | 父级: ../CLAUDE.md

- daily-plenty.service：单 Node 实例，独立用户、外部数据目录、启动健康检查与失败重启。
- daily-plenty-backup.service：运行发布包 backup.mjs，不迁移或创建源数据库。
- daily-plenty-backup.timer：UTC 19:30（北京时间次日 03:30），错过补跑，最多随机延迟 5 分钟。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

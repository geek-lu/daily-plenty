# daily-plenty-bookkeeping/

> L2 | 父级: ../CLAUDE.md

```text
daily-plenty-bookkeeping/
├── SKILL.md       简短入口、调用索引与模型判断边界
├── scripts/       Python 标准库可执行 CLI
├── references/    按需命令说明与 JSON 输入示例
├── HTTP.md        接口排查和账单查询参数
└── CLAUDE.md      技能维护地图
```

- SKILL.md：自动发现技能，按新增/修改/查询意图路由，模型匹配操作者和付款人；不重复描述脚本实现。
- scripts/：create.py 新增、update.py 按 ID 修改 AI 账单、query.py 上下文/单条/筛选/统计；共享实现 \_common.py 管理 HTTP、校验和幂等操作文件。
- references/：create.md / update.md / query.md 按操作加载；commands.md 为写操作共享恢复规则，局部地图见 references/CLAUDE.md。
- HTTP.md：仅排错或核对查询参数时读取，替代日常手写 curl。
- CLAUDE.md：维护地图，不参与业务调用。

契约来源：src/server/http/ledger-routes.ts、src/shared/validation.ts、src/server/ledger/{service,api-entries,access,repo}.ts。脚本依赖 Python 3.9+ 与系统时区数据，运行时无需 pip 包。新增只支持已有分类和成员；API 修改仅限 AI 来源，创建返回 entryId/version。

分发时复制整个目录。地址、密钥和操作文件保存在目录外；不携带部署目标或用户数据。状态文件使用私有权限，prepare 不写账，submit 先保存 pending 后发送；响应未知始终保留原请求编号。测试位于 tests/skills，运行 pnpm test:skill。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

# tests/skills/

> L2 | 父级: ../CLAUDE.md

- test_bookkeeping.py：Python 标准库 unittest；以 loopback HTTP 替身驱动真实 CLI 子进程，验证精确金额、候选与付款人分离、持久化后提交、丢响应重试、禁止重定向、目标隔离和状态判定；创建 ID→单条查询→部分修改完整链路，人工拒绝、版本冲突、改错 ID/操作文件拦截、PATCH 丢响应重试与查询单位/日期转换。

运行 `pnpm test:skill`；所有操作文件位于临时目录，不读取真实地址、密钥或账单。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

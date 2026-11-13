# src/server/ledger/records/

> L2 | 父级: ../CLAUDE.md

- index.ts：高级筛选分页及全量导出；同事务计算授权、总数和结果。
- repo.ts：高级筛选 SQL、稳定排序和汇总；复用 ledger/repo 的账单关联查询。

本目录属于 ledger 域内的查询实现，不是独立业务域；CSV 编码共用父目录 csv.ts。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

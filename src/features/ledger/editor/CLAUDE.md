# src/features/ledger/editor/

> L2 | 父级: ../CLAUDE.md

- form.ts：纯表单映射、金额/必填校验及连续录入，模板不携带账单日期与版本。
- commands.ts：账单/分类/模板 HTTP 写入；失败的相同操作复用请求编号，成功或打开另一笔后清除。
- useEntryForm.ts：共享表单、同步提交锁与错误状态；mutate 显示错误，run 向调用者抛错用于分类/模板确认。

依赖 UI → 页面 runtime → useEntryForm → commands → api；form 仅依赖 shared。刷新和开关抽屉由各入口决定。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

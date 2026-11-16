# scripts/

> L2 | 父级: ../CLAUDE.md

- create.py：新增 prepare/submit/status，精确金额、录入人与付款人分离，成功返回 entryId/version。
- update.py：按账单 ID 查询，仅 AI 来源可修改；合并用户指定字段，校验已知版本，保存带版本的 PATCH；传入已有账本给 context 避免重复请求；保留创建人和来源。
- query.py：context/get/list/reports，只发 GET；memberId/creatorId 用 member_or_all 校验（UUID 或 all）；reports 本地校验 granularity/period 组合；金额筛选以元字符串输入转整数分。
- recorders.py：独立获取当前账本有效记账人；仅发两个 GET（账本 + recorders），返回 memberId/userId/displayName。
- \_common.py：HTTP 外部鉴权/禁止重定向、字段校验（含 member_or_all）、context 可接受已有账本、resolve_recorder 返回录入/修改人 userId、私有操作文件、固定请求编号与提交状态；v2 指纹绑定操作/ID/版本，兼容旧 v1 创建操作文件。

先持久化后 POST/PATCH；同一操作反复 submit 始终重用请求编号和内容，响应核对 ID/版本/身份/字段后才成功。服务端是来源权限、账本隔离和幂等的最终边界。运行状态在技能目录外，不输出服务地址或密钥。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

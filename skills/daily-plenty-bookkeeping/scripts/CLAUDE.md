# scripts/

> L2 | 父级: ../CLAUDE.md

- create.py：新增 prepare/submit/status，精确金额、录入人与付款人分离，成功返回 entryId/version。
- update.py：按账单 ID 查询，仅 AI 来源可修改；合并用户指定字段，校验已知版本，保存带版本的 PATCH；保留创建人和来源。
- query.py：context/get/list/reports，只发 GET；金额筛选以元字符串输入转整数分，支持日期/成员/分类/关键词/分页/排序和日月年统计。
- \_common.py：HTTP 外部鉴权/禁止重定向、字段校验、私有操作文件、固定请求编号与提交状态；v2 指纹绑定操作/ID/版本，兼容旧 v1 创建操作文件。

先持久化后 POST/PATCH；同一操作反复 submit 始终重用请求编号和内容，响应核对 ID/版本/身份/字段后才成功。服务端是来源权限、账本隔离和幂等的最终边界。运行状态在技能目录外，不输出服务地址或密钥。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

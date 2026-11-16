<!--
[INPUT]: 分操作 CLI、外部运行环境及私有操作文件。
[OUTPUT]: 新增/修改共享的持久化、结果和失败恢复规则。
[POS]: 写操作分支共享参考；具体字段分别见 create.md / update.md。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 提交与重试

从技能目录执行示例命令，其他工作目录请用脚本的实际路径。Python 3.9+ 标准库；宿主注入 `DAILY_PLENTY_BASE_URL`（应用根地址，HTTP/HTTPS，不带 `/api`）、`DAILY_PLENTY_API_KEY`，可选 `DAILY_PLENTY_LEDGER_ID`。不把值写入技能或命令参数。

写操作按 `prepare → submit` 执行，创建用 create.py，修改用 update.py。每项新操作使用宿主持久化私有目录中的新 JSON 文件，父目录必须存在；不放在技能目录或临时目录。使用 JSON 序列化，不把用户原话拼入 shell。

`prepare` 仅读接口，以私有权限保存目标指纹、账本、操作类型、账单 ID、请求内容、版本、期望响应和固定 requestId；拒绝覆盖已有文件。`submit` 先保存 pending 才发 POST/PATCH，核对响应后保存 succeeded。保留操作文件路径、成功返回的 entryId/version。

创建操作的 `status` / `submit` 使用 create.py，修改用 update.py：

```bash
python3 scripts/update.py status --operation "$UPDATE_OPERATION_FILE"
python3 scripts/update.py submit --operation "$UPDATE_OPERATION_FILE"
```

| state             | 含义与下一步                                                   |
| ----------------- | -------------------------------------------------------------- |
| prepared          | 尚未提交，可以 submit                                          |
| pending / unknown | 可能已写入，用同一脚本和原文件重试；自动补试最多一次           |
| succeeded         | 已确认；重复 submit 返回保存的 entryId/version/entry，不再写入 |
| rejected          | 明确拒绝，先处理输入/版本冲突，不自动创建新请求                |

成功输出 `ok:true`；失败输出 `ok:false, code, error, httpStatus`，退出码 1。仅 succeeded 可以向用户说“已记/已修改”。网络失败、5xx、跳转、无法解析或响应不匹配均不会算成功。身份验证失败可在恢复有效凭据后使用原文件；权限拒绝、人工来源限制或 409 必须停止核对。此前结果未知，即便重试返回拒绝，也不能认定第一次未提交。

操作文件不可手改：金额、目标 ID、操作类型、版本或成员被改动会拒绝提交。同账本轮换密钥可重试；换服务器/账本会被拒绝。新脚本可读取旧版 v1 创建操作文件，仍用原请求编号恢复。文件丢失时用 [查询](query.md) 核对；不确定则询问，不能把重复新增当恢复。

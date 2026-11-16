<!--
[INPUT]: 已确认的账单 ID、用户指定修改字段与修改人。
[OUTPUT]: AI 来源校验、局部修改准备、版本冲突处理与 PATCH 结果。
[POS]: SKILL.md 的修改分支；只读取当前操作需要的规则。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 修改 AI 账单

用创建成功返回的 `entryId`，或 [查询](query.md) 确认的账单 ID。仅 `source=ai` 且未删除的记录可修改，人工记录应在网页编辑；服务端拒绝人工来源。API Key 属于账本，修改人由对话匹配有效 `recorders[].memberId`，不默认沿用创建人。已确认同一操作者时可复用成员 ID。

例如创建结果为 `entryId=<账单 UUID>, version=1`，用户说“刚才那笔改成 30 元”，仅传变更字段、修改人和已知版本：

```json
{
  "amount": "30.00",
  "updatedByMemberId": "<当前修改成员 UUID>",
  "version": 1
}
```

```bash
python3 scripts/update.py prepare --entry-id "$ENTRY_ID" --input "$INPUT_FILE" --operation "$UPDATE_OPERATION_FILE"
python3 scripts/update.py submit --operation "$UPDATE_OPERATION_FILE"
```

`UPDATE_OPERATION_FILE` 必须是新的私有文件，与创建操作分开。`prepare` 先按 ID 读取当前账单，检查 AI 来源，合并用户指定字段，再保存带当前版本和新 requestId 的完整 PATCH；尚未写账。`submit` 只提交这份固定请求，不重新读最新数据覆盖。

可改字段：`kind`、`amount`、`categoryId`、`paidByMemberId`、`occurredOn`、`note`。至少一项；格式同 [新增](create.md)。更改收支类型时选择相应分类；未改字段原样保留，原先已归档分类/已离开付款人可保留，但不能新选。`updatedByMemberId` 必填；不传 `recordedByMemberId`、`source`、`createdBy` 或额外字段。来源、最初录入人、ID 保持不变，修改人写入 updatedBy。

`version` 在上下文已知时应带上；与最新版本不符会在准备阶段停止。没有已知版本时脚本读取当前版本作为基线。准备后若有人修改，服务端返回 409；查询最新记录并与用户意图核对，不自动换版本/请求编号强行覆盖。

成功返回相同 `entryId` 和递增的 `version`，保留新版本供后续修改。超时/丢响应使用同一文件重试，见 [提交与重试](commands.md)。旧操作的缓存响应是当时提交结果；要查看当前值用 `query.py get`。

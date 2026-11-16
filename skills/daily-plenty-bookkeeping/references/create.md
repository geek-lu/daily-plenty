<!--
[INPUT]: 收支描述与 query.py context 候选。
[OUTPUT]: 新增账单输入、创建 ID 与版本的使用方式。
[POS]: SKILL.md 的新增分支；提交恢复见 commands.md。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 新增

先用 `python3 scripts/query.py context --date today` 取得账本、分类、付款成员和录入人；日期也可为 `yesterday` 或具体日期。用实际响应替换 JSON 占位符：

```json
{
  "kind": "expense",
  "amount": "28.50",
  "categoryId": "<餐饮分类 UUID>",
  "paidByMemberId": "<实际付款成员 UUID>",
  "recordedByMemberId": "<上下文确定的录入成员 UUID>",
  "occurredOn": "today",
  "note": "午饭·牛肉汤"
}
```

`kind` 为 expense/income；`amount` 为人民币元字符串，0.01–999999.99，最多两位小数；`occurredOn` 为 today/yesterday/2000–2099 年 YYYY-MM-DD，按账本时区计算。`note` 可省略，最多 120 个 UTF-16 字符；其余字段必填。分类用相同收支类型的未归档分类，付款人用未离开成员，录入人用有效 editor 的 `memberId`。

```bash
python3 scripts/create.py prepare --input "$INPUT_FILE" --operation "$CREATE_OPERATION_FILE"
python3 scripts/create.py submit --operation "$CREATE_OPERATION_FILE"
```

输入可由 `--input -` 从标准输入读取。`prepare` 成功才 `submit`；路径和重试规则见 [提交与重试](commands.md)。请求编号、整数分、来源由脚本/服务端负责，勿自行添加。

成功 JSON 明确包含 `state: "succeeded"`、`entryId`、`version`、完整 `entry` 与 `cached`。**把返回 ID 和版本保存到对话操作状态**，向用户反馈金额/用途与记录 ID；这就是后续“改刚才那笔”的目标。不要用 requestId 代替账单 ID。修改时转读 [修改](update.md)，不要重用创建操作文件。

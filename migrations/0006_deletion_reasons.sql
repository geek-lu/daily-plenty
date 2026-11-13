-- [INPUT]: 已有账单表。
-- [OUTPUT]: 删除原因和说明字段。[POS]: 增量迁移；历史删除记录保留 NULL，不虚构原因。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
ALTER TABLE entries ADD COLUMN delete_reason TEXT CHECK(delete_reason IS NULL OR delete_reason IN ('duplicate','wrong_amount','wrong_category','not_needed','other'));
ALTER TABLE entries ADD COLUMN delete_reason_note TEXT CHECK(delete_reason_note IS NULL OR length(delete_reason_note) <= 200);

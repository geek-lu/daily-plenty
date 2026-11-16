-- [INPUT]: entries 与会话/API 记账幂等响应。
-- [OUTPUT]: 不可由客户端指定的账单来源；全部历史账单默认人工记录。
-- [POS]: 增量迁移，保留金额、归属及版本，历史重试响应同步补齐来源。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
ALTER TABLE entries ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'ai'));

UPDATE mutation_requests
SET response_json = json_set(response_json, '$.source', 'manual')
WHERE json_type(response_json, '$.amountMinor') IS NOT NULL
  AND json_type(response_json, '$.source') IS NULL;

UPDATE ledger_api_requests
SET response_json = json_set(response_json, '$.source', 'manual')
WHERE json_type(response_json, '$.source') IS NULL;

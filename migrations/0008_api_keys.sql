-- [INPUT]: 已存在的 users、ledgers、memberships 表。
-- [OUTPUT]: 用户 + 账本绑定的 API 密钥摘要、展示前缀、使用时间与撤销状态。
-- [POS]: 0008 增量迁移，不改动既有会话和账单。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  ledger_id TEXT NOT NULL REFERENCES ledgers(id),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 30),
  token_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at INTEGER,
  FOREIGN KEY(ledger_id, user_id) REFERENCES memberships(ledger_id, user_id)
) STRICT;
CREATE INDEX api_keys_user_created ON api_keys(user_id, created_at);

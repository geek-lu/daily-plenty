-- [INPUT]: 0008 个人账本密钥、users、ledgers 与 entries。
-- [OUTPUT]: 账本共享密钥和账本级 API 记账幂等记录。
-- [POS]: 保留旧密钥审计，但撤销其旧授权，避免升级时自动扩大凭据权限。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
ALTER TABLE api_keys RENAME TO personal_api_keys;
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  ledger_id TEXT NOT NULL REFERENCES ledgers(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 30),
  token_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at INTEGER
) STRICT;
INSERT INTO api_keys
  (id, ledger_id, created_by, name, token_hash, prefix, created_at, last_used_at, revoked_at)
SELECT id, ledger_id, user_id, name, token_hash, prefix, created_at, last_used_at,
  COALESCE(revoked_at, CAST(strftime('%s','now') AS INTEGER) * 1000)
FROM personal_api_keys;
DROP TABLE personal_api_keys;
CREATE INDEX api_keys_ledger_created ON api_keys(ledger_id, created_at);

CREATE TABLE ledger_api_requests (
  ledger_id TEXT NOT NULL REFERENCES ledgers(id),
  request_id TEXT NOT NULL,
  api_key_id TEXT NOT NULL REFERENCES api_keys(id),
  payload_hash TEXT NOT NULL,
  result_entry_id TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(ledger_id, request_id),
  FOREIGN KEY(ledger_id, result_entry_id) REFERENCES entries(ledger_id, id)
) STRICT;

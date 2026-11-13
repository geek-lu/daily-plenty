-- [INPUT]: SQLite >= 3.37，foreign_keys 已开启。
-- [OUTPUT]: 严格类型、账本隔离、身份与幂等表。[POS]: 首次可重放迁移。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
CREATE TABLE users (
 id TEXT PRIMARY KEY, login_name TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
 password_hash TEXT NOT NULL, disabled_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE TABLE ledgers (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 base_currency_code TEXT NOT NULL DEFAULT 'CNY', timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai', archived_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(id, base_currency_code)
) STRICT;
CREATE TABLE memberships (
 id TEXT PRIMARY KEY, ledger_id TEXT NOT NULL REFERENCES ledgers(id) ON DELETE RESTRICT,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, role TEXT NOT NULL CHECK(role IN ('editor','viewer')),
 joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), left_at TEXT,
 UNIQUE(ledger_id, user_id), UNIQUE(ledger_id, id)
) STRICT;
CREATE INDEX membership_user ON memberships(user_id,left_at);
CREATE TABLE categories (
 id TEXT PRIMARY KEY, ledger_id TEXT NOT NULL REFERENCES ledgers(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN ('expense','income')), name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, archived_at TEXT,
 UNIQUE(ledger_id,kind,name), UNIQUE(ledger_id,id,kind)
) STRICT;
CREATE INDEX category_picker ON categories(ledger_id,kind,archived_at,sort_order);
CREATE TABLE entries (
 id TEXT PRIMARY KEY, ledger_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('expense','income')),
 amount_minor INTEGER NOT NULL CHECK(amount_minor BETWEEN 1 AND 99999999), currency_code TEXT NOT NULL DEFAULT 'CNY',
 category_id TEXT NOT NULL, paid_by_member_id TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', occurred_on TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), deleted_at TEXT,
 deleted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
 UNIQUE(ledger_id,id),
 FOREIGN KEY(ledger_id,currency_code) REFERENCES ledgers(id,base_currency_code) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_id,category_id,kind) REFERENCES categories(ledger_id,id,kind) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_id,paid_by_member_id) REFERENCES memberships(ledger_id,id) ON DELETE RESTRICT
) STRICT;
CREATE INDEX entry_timeline ON entries(ledger_id,occurred_on DESC,id DESC) WHERE deleted_at IS NULL;
CREATE TABLE mutation_requests (
 ledger_id TEXT NOT NULL REFERENCES ledgers(id) ON DELETE RESTRICT,
 actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id TEXT NOT NULL, operation TEXT NOT NULL, payload_hash TEXT NOT NULL,
 result_entry_id TEXT NOT NULL, response_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(ledger_id,actor_id,request_id),
 FOREIGN KEY(ledger_id,result_entry_id) REFERENCES entries(ledger_id,id) ON DELETE RESTRICT
) STRICT;
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX session_expiry ON sessions(expires_at);
CREATE TABLE invites (
 id TEXT PRIMARY KEY, ledger_id TEXT NOT NULL REFERENCES ledgers(id) ON DELETE RESTRICT,
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 token_hash TEXT NOT NULL UNIQUE, target_role TEXT NOT NULL DEFAULT 'editor' CHECK(target_role IN ('editor','viewer')),
 expires_at INTEGER NOT NULL, consumed_at INTEGER, consumed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
 revoked_at INTEGER, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE auth_limits (key TEXT PRIMARY KEY, started_at INTEGER NOT NULL, attempts INTEGER NOT NULL) STRICT;

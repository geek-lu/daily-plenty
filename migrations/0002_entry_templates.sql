-- [INPUT]: 已应用 0001_initial.sql 的数据库。
-- [OUTPUT]: 用户在账本内私有的记账模板。[POS]: 增量迁移，保留已有账单和分类。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
CREATE TABLE entry_templates (
 id TEXT PRIMARY KEY, ledger_id TEXT NOT NULL, user_id TEXT NOT NULL,
 name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 30),
 kind TEXT NOT NULL CHECK(kind IN ('expense','income')),
 amount_minor INTEGER NOT NULL CHECK(amount_minor BETWEEN 1 AND 99999999),
 currency_code TEXT NOT NULL DEFAULT 'CNY', category_id TEXT NOT NULL,
 paid_by_member_id TEXT NOT NULL, note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 120),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(ledger_id,user_id,name),
 FOREIGN KEY(ledger_id,user_id) REFERENCES memberships(ledger_id,user_id) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_id,category_id,kind) REFERENCES categories(ledger_id,id,kind) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_id,paid_by_member_id) REFERENCES memberships(ledger_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_id,currency_code) REFERENCES ledgers(id,base_currency_code) ON DELETE RESTRICT
) STRICT;

-- [INPUT]: 0001–0006 的账单、成员与用户表。
-- [OUTPUT]: 同账本/账单外键约束的评论及稳定时间索引。[POS]: 增量评论迁移，保留历史记录。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
CREATE TABLE entry_comments (
 id TEXT PRIMARY KEY,
 ledger_id TEXT NOT NULL,
 entry_id TEXT NOT NULL,
 author_id TEXT NOT NULL,
 root_id TEXT,
 reply_to_id TEXT,
 content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 1000),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(ledger_id,entry_id,id),
 CHECK((root_id IS NULL AND reply_to_id IS NULL) OR (root_id IS NOT NULL AND reply_to_id IS NOT NULL)),
 CHECK(root_id IS NULL OR root_id <> id),
 CHECK(reply_to_id IS NULL OR reply_to_id <> id),
 FOREIGN KEY(ledger_id,entry_id) REFERENCES entries(ledger_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_id,author_id) REFERENCES memberships(ledger_id,user_id) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_id,entry_id,root_id) REFERENCES entry_comments(ledger_id,entry_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_id,entry_id,reply_to_id) REFERENCES entry_comments(ledger_id,entry_id,id) ON DELETE RESTRICT
) STRICT;
CREATE INDEX entry_comments_timeline ON entry_comments(ledger_id,entry_id,created_at);

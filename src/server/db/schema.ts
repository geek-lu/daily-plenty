/** [INPUT]: Drizzle SQLite 列定义。[OUTPUT]: 类型化数据表（分类含持久化图标、账单含删除原因及评论回复关联）。[POS]: 仓储共享的数据定义，与 migrations 同步。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
const timestamp = (name: string) =>
  text(name)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  loginName: text('login_name').notNull(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  disabledAt: text('disabled_at'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});
export const ledgers = sqliteTable('ledgers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerUserId: text('owner_user_id').notNull(),
  baseCurrencyCode: text('base_currency_code').notNull().default('CNY'),
  timezone: text('timezone').notNull().default('Asia/Shanghai'),
  archivedAt: text('archived_at'),
  createdAt: timestamp('created_at'),
});
export const memberships = sqliteTable('memberships', {
  id: text('id').primaryKey(),
  ledgerId: text('ledger_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role', { enum: ['editor', 'viewer'] }).notNull(),
  joinedAt: timestamp('joined_at'),
  leftAt: text('left_at'),
});
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  ledgerId: text('ledger_id').notNull(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('tag'),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: text('archived_at'),
});
export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  ledgerId: text('ledger_id').notNull(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currencyCode: text('currency_code').notNull().default('CNY'),
  categoryId: text('category_id').notNull(),
  paidByMemberId: text('paid_by_member_id').notNull(),
  note: text('note').notNull().default(''),
  occurredOn: text('occurred_on').notNull(),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  deletedAt: text('deleted_at'),
  deletedBy: text('deleted_by'),
  deleteReason: text('delete_reason'),
  deleteReasonNote: text('delete_reason_note'),
});
export const entryComments = sqliteTable('entry_comments', {
  id: text('id').primaryKey(),
  ledgerId: text('ledger_id').notNull(),
  entryId: text('entry_id').notNull(),
  authorId: text('author_id').notNull(),
  rootId: text('root_id'),
  replyToId: text('reply_to_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at'),
});
export const entryTemplates = sqliteTable('entry_templates', {
  id: text('id').primaryKey(),
  ledgerId: text('ledger_id').notNull(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currencyCode: text('currency_code').notNull().default('CNY'),
  categoryId: text('category_id').notNull(),
  paidByMemberId: text('paid_by_member_id').notNull(),
  note: text('note').notNull().default(''),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});
export const mutationRequests = sqliteTable('mutation_requests', {
  ledgerId: text('ledger_id').notNull(),
  actorId: text('actor_id').notNull(),
  requestId: text('request_id').notNull(),
  operation: text('operation').notNull(),
  payloadHash: text('payload_hash').notNull(),
  resultEntryId: text('result_entry_id').notNull(),
  responseJson: text('response_json').notNull(),
  createdAt: timestamp('created_at'),
});
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const invites = sqliteTable('invites', {
  id: text('id').primaryKey(),
  ledgerId: text('ledger_id').notNull(),
  createdBy: text('created_by').notNull(),
  tokenHash: text('token_hash').notNull(),
  targetRole: text('target_role', { enum: ['editor', 'viewer'] })
    .notNull()
    .default('editor'),
  expiresAt: integer('expires_at').notNull(),
  consumedAt: integer('consumed_at'),
  consumedBy: text('consumed_by'),
  revokedAt: integer('revoked_at'),
  createdAt: integer('created_at').notNull(),
});

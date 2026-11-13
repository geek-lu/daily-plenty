/** [INPUT]: Drizzle、评论/用户表与 Store。[OUTPUT]: 限定账本及账单的评论读取和插入。
 * [POS]: ledger 评论仓储；名称实时关联，时间相同按 rowid 保持插入顺序。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { and, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { Store } from '../db/client';
import { entryComments, users } from '../db/schema';
import type { EntryComment } from '@/shared/types';

const target = alias(entryComments, 'reply_target');
const recipient = alias(users, 'reply_author');
function query(store: Store) {
  return store.db
    .select({
      id: entryComments.id,
      entryId: entryComments.entryId,
      authorId: entryComments.authorId,
      authorName: users.displayName,
      rootId: entryComments.rootId,
      replyToId: entryComments.replyToId,
      replyToName: recipient.displayName,
      content: entryComments.content,
      createdAt: entryComments.createdAt,
    })
    .from(entryComments)
    .innerJoin(users, eq(users.id, entryComments.authorId))
    .leftJoin(target, eq(target.id, entryComments.replyToId))
    .leftJoin(recipient, eq(recipient.id, target.authorId));
}
const scope = (ledgerId: string, entryId: string) =>
  and(eq(entryComments.ledgerId, ledgerId), eq(entryComments.entryId, entryId));
export function list(store: Store, ledgerId: string, entryId: string): EntryComment[] {
  return query(store)
    .where(scope(ledgerId, entryId))
    .orderBy(entryComments.createdAt, sql`${entryComments}.rowid`)
    .all();
}
export function find(
  store: Store,
  ledgerId: string,
  entryId: string,
  id: string,
): EntryComment | undefined {
  return query(store)
    .where(and(scope(ledgerId, entryId), eq(entryComments.id, id)))
    .get();
}
export function insert(store: Store, value: typeof entryComments.$inferInsert) {
  store.db.insert(entryComments).values(value).run();
}

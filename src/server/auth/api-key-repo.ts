/**
 * [INPUT]: Store、api_keys/users/ledgers/memberships 表及已校验的密钥数据。
 * [OUTPUT]: 账本共享密钥元数据、账本身份、编辑成员管理授权及撤销持久化。
 * [POS]: auth 仓储；列表和写入返回值始终不含 tokenHash。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Store } from '../db/client';
import { apiKeys, users, ledgers, memberships } from '../db/schema';

const metadata = {
  id: apiKeys.id,
  ledgerId: apiKeys.ledgerId,
  createdBy: apiKeys.createdBy,
  name: apiKeys.name,
  prefix: apiKeys.prefix,
  createdAt: apiKeys.createdAt,
  lastUsedAt: apiKeys.lastUsedAt,
  revokedAt: apiKeys.revokedAt,
};

export const list = (store: Store, userId: string) =>
  store.db
    .select({ ...metadata, ledgerName: ledgers.name, creatorName: users.displayName })
    .from(apiKeys)
    .innerJoin(ledgers, eq(ledgers.id, apiKeys.ledgerId))
    .innerJoin(users, eq(users.id, apiKeys.createdBy))
    .innerJoin(memberships, eq(memberships.ledgerId, apiKeys.ledgerId))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.role, 'editor'),
        isNull(memberships.leftAt),
      ),
    )
    .orderBy(desc(apiKeys.createdAt), apiKeys.id)
    .all();

export const insert = (store: Store, value: typeof apiKeys.$inferInsert) =>
  store.db.insert(apiKeys).values(value).returning(metadata).get();

export const active = (store: Store, tokenHash: string) =>
  store.db
    .select({ id: apiKeys.id, ledgerId: apiKeys.ledgerId })
    .from(apiKeys)
    .innerJoin(ledgers, eq(ledgers.id, apiKeys.ledgerId))
    .where(
      and(eq(apiKeys.tokenHash, tokenHash), isNull(apiKeys.revokedAt), isNull(ledgers.archivedAt)),
    )
    .get();

export const manageableLedger = (store: Store, userId: string, ledgerId: string) =>
  store.db
    .select({ name: ledgers.name, archivedAt: ledgers.archivedAt, creatorName: users.displayName })
    .from(memberships)
    .innerJoin(ledgers, eq(ledgers.id, memberships.ledgerId))
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.ledgerId, ledgerId),
        eq(memberships.role, 'editor'),
        isNull(memberships.leftAt),
        isNull(users.disabledAt),
      ),
    )
    .get();

export const touch = (store: Store, id: string) =>
  store.db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, id)).run();

export const revoke = (store: Store, id: string) =>
  store.db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
    .run();

export const find = (store: Store, id: string) =>
  store.db.select(metadata).from(apiKeys).where(eq(apiKeys.id, id)).get();

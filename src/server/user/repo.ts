/** [INPUT]: 数据库上下文、users 表。[OUTPUT]: 资料白名单与服务端凭据访问。[POS]: user L2 仓储。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import type { Store } from '../db/client';
export const byId = (store: Store, id: string) =>
  store.db.select().from(users).where(eq(users.id, id)).get();
export const byLogin = (store: Store, login: string) =>
  store.db.select().from(users).where(eq(users.loginName, login)).get();
export const exists = (store: Store) =>
  Boolean(store.db.select({ id: users.id }).from(users).limit(1).get());
export const insert = (store: Store, value: typeof users.$inferInsert) =>
  store.db.insert(users).values(value).run();
export const rename = (store: Store, id: string, displayName: string) =>
  store.db
    .update(users)
    .set({ displayName, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id))
    .run();

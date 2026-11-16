/** [INPUT]: 数据库、会话及用户状态。[OUTPUT]: 活跃用户会话持久化和持久限速计数。[POS]: auth L2。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { and, eq, lt, isNull } from 'drizzle-orm';
import type { Store } from '../db/client';
import { sessions, users } from '../db/schema';
export function saveSession(store: Store, tokenHash: string, userId: string, expiresAt: number) {
  store.db.delete(sessions).where(lt(sessions.expiresAt, Date.now())).run();
  store.db.insert(sessions).values({ tokenHash, userId, expiresAt, createdAt: Date.now() }).run();
}
export const findSession = (store: Store, token: string) =>
  store.db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, token), isNull(users.disabledAt)))
    .get();
export const removeSession = (store: Store, token: string) =>
  store.db.delete(sessions).where(eq(sessions.tokenHash, token)).run();
export function attempt(store: Store, key: string, period: number) {
  const now = Date.now();
  store.sqlite.prepare('DELETE FROM auth_limits WHERE started_at < ?').run(now - period);
  return (
    store.sqlite
      .prepare(
        `INSERT INTO auth_limits(key,started_at,attempts) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`,
      )
      .get(key, now) as { attempts: number }
  ).attempts;
}

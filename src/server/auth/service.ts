/** [INPUT]: Node crypto、本域会话仓储。[OUTPUT]: scrypt 密码处理、随机会话和限速。[POS]: auth 业务层，用户凭据由流程注入。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import type { Store } from '../db/client';
import { ensure } from '@/shared/errors';
import * as repo from './repo';
export const digest = (text: string) => createHash('sha256').update(text).digest('hex');
export const equalSecret = (a: string, b: string) =>
  timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 },
      (error, value) => (error ? reject(error) : resolve(value)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$65536$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, hash?: string) {
  const parts = (hash || 'scrypt$65536$00000000000000000000000000000000$' + '0'.repeat(128)).split(
    '$',
  );
  const computed = await derive(password, parts[2]);
  const expected = Buffer.from(parts[3], 'hex');
  return (
    expected.length === computed.length && timingSafeEqual(expected, computed) && Boolean(hash)
  );
}
export function createSession(store: Store, userId: string) {
  const token = randomBytes(32).toString('hex');
  repo.saveSession(store, digest(token), userId, Date.now() + 30 * 86400000);
  return token;
}
export function sessionUser(store: Store, token: string | null) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }
  const session = repo.findSession(store, digest(token));
  return session && session.expiresAt > Date.now() ? session.userId : null;
}
export function logout(store: Store, token: string | null) {
  if (token) {
    repo.removeSession(store, digest(token));
  }
}
export function rateLimit(store: Store, key: string, max = 15) {
  ensure(
    repo.attempt(store, digest(key), 15 * 60000) <= max,
    429,
    '尝试次数较多，请 15 分钟后再试',
  );
}

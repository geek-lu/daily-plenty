/** [INPUT]: 本域仓储、资料校验。[OUTPUT]: 用户创建、当前资料及更新。[POS]: user 业务服务，不依赖 auth。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { randomUUID } from 'node:crypto';
import type { Store } from '../db/client';
import type { User } from '@/shared/types';
import { ensure } from '@/shared/errors';
import { profileInput } from '@/shared/validation';
import * as repo from './repo';
export const initialized = repo.exists;
export const credential = repo.byLogin;
export function profile(store: Store, id: string): User {
  const user = repo.byId(store, id);
  ensure(user && !user.disabledAt, 401, '登录已失效，请重新登录', 'UNAUTHENTICATED');
  return { id: user.id, loginName: user.loginName, displayName: user.displayName };
}
export function create(
  store: Store,
  input: { loginName: string; displayName: string; passwordHash: string },
) {
  ensure(!repo.byLogin(store, input.loginName), 409, '这个账号已被使用');
  const id = randomUUID();
  repo.insert(store, { id, ...input });
  return profile(store, id);
}
export function updateProfile(store: Store, id: string, raw: unknown) {
  profile(store, id);
  repo.rename(store, id, profileInput.parse(raw).displayName);
  return profile(store, id);
}

/** [INPUT]: 账本授权与邀请仓储。[OUTPUT]: 一次性双人邀请与成员加入。[POS]: ledger 成员规则，不创建用户或会话。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { atomic, type Store } from '../db/client';
import { ensure } from '@/shared/errors';
import { authorize } from './service';
import * as repo from './repo';
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
export function createInvite(store: Store, actorId: string, ledgerId: string) {
  return atomic(store, () => {
    authorize(store, actorId, ledgerId, true, true);
    ensure(
      repo.members(store, ledgerId).filter((m) => !m.leftAt).length < 2,
      409,
      '这个小家已经有两位成员',
    );
    const token = randomBytes(32).toString('hex');
    const id = randomUUID();
    const expiresAt = Date.now() + 86400000;
    repo.insertInvite(store, {
      id,
      ledgerId,
      createdBy: actorId,
      tokenHash: hash(token),
      expiresAt,
      createdAt: Date.now(),
    });
    return { id, token, expiresAt };
  });
}
export function inspect(store: Store, token: string) {
  const invite = repo.inviteByHash(store, hash(token));
  ensure(
    invite && !invite.consumedAt && !invite.revokedAt && invite.expiresAt > Date.now(),
    410,
    '邀请已过期、撤销或使用，请让对方重新生成',
  );
  const access = authorize(store, invite.createdBy, invite.ledgerId, true, true);
  ensure(
    !access.ledger.archivedAt &&
      repo.members(store, invite.ledgerId).filter((m) => !m.leftAt).length < 2,
    409,
    '这个账本已无法加入',
  );
  return invite;
}
export function join(store: Store, userId: string, token: string) {
  const invite = inspect(store, token);
  ensure(
    !repo.members(store, invite.ledgerId).some((m) => m.userId === userId),
    409,
    '你已经是这个账本的成员',
  );
  repo.insertMember(store, {
    id: randomUUID(),
    ledgerId: invite.ledgerId,
    userId,
    role: invite.targetRole,
  });
  repo.consumeInvite(store, invite.id, userId);
  return invite.ledgerId;
}
export function list(store: Store, actorId: string, ledgerId: string) {
  authorize(store, actorId, ledgerId, true, true);
  return repo.inviteList(store, ledgerId);
}
export function revoke(store: Store, actorId: string, ledgerId: string, id: string) {
  authorize(store, actorId, ledgerId, true, true);
  ensure(repo.revokeInvite(store, ledgerId, id), 404, '邀请不存在或已被使用');
}

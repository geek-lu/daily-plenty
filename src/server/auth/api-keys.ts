/**
 * [INPUT]: Node crypto、Store、Zod、auth 摘要与密钥仓储。
 * [OUTPUT]: 账本共享密钥生成、编辑成员共同管理及独立于生成人的账本身份验证。
 * [POS]: auth 密钥服务；生成者仅为审计，归档或撤销后失效，256 位秘密仅生成时返回。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Store } from '../db/client';
import { ensure } from '@/shared/errors';
import { uuid } from '@/shared/validation';
import { digest } from './service';
import * as repo from './api-key-repo';

const input = z.object({ name: z.string().trim().min(1).max(30), ledgerId: uuid }).strict();
export const listKeys = repo.list;

export function createKey(store: Store, userId: string, raw: unknown) {
  const { name, ledgerId } = input.parse(raw);
  const ledger = repo.manageableLedger(store, userId, ledgerId);
  ensure(ledger && !ledger.archivedAt, 403, '只有账本的可记账成员可以生成共享密钥');
  const token = `dp_${randomBytes(32).toString('hex')}`;
  const key = repo.insert(store, {
    id: randomUUID(),
    createdBy: userId,
    ledgerId,
    name,
    tokenHash: digest(token),
    prefix: token.slice(0, 11),
    createdAt: Date.now(),
  });
  return { key: { ...key, ledgerName: ledger.name, creatorName: ledger.creatorName }, token };
}

export function revokeKey(store: Store, userId: string, id: string) {
  uuid.parse(id);
  const key = repo.find(store, id);
  ensure(key && repo.manageableLedger(store, userId, key.ledgerId), 404, '找不到可管理的 API 密钥');
  repo.revoke(store, id);
  return { ok: true };
}

export function keyIdentity(store: Store, token: string) {
  if (!/^dp_[a-f0-9]{64}$/.test(token)) {
    return null;
  }
  const key = repo.active(store, digest(token));
  if (!key) {
    return null;
  }
  repo.touch(store, key.id);
  return { keyId: key.id, ledgerId: key.ledgerId };
}

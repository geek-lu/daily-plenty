/**
 * [INPUT]: Store、账本/成员/共享密钥仓储与业务断言。
 * [OUTPUT]: 会话用户授权、共享账本身份与统一只读授权结果。
 * [POS]: ledger 权限边界；共享密钥不冒用生成人身份，也不访问个人模板。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Store } from '../db/client';
import { ensure } from '@/shared/errors';
import * as repo from './repo';

export type LedgerKey = { keyId: string; ledgerId: string };
export type LedgerPrincipal = string | LedgerKey;

export function authorize(
  store: Store,
  actorId: string,
  ledgerId: string,
  write = false,
  owner = false,
) {
  const access = repo.access(store, actorId, ledgerId);
  ensure(access && !access.ledger.archivedAt, 403, '你没有这个账本的访问权限');
  ensure(!write || access.member.role === 'editor', 403, '当前成员只能查看账单');
  ensure(!owner || access.ledger.ownerUserId === actorId, 403, '只有账本创建者可以管理邀请');
  return access;
}

export function authorizeRead(store: Store, principal: LedgerPrincipal, ledgerId: string) {
  if (typeof principal === 'string') {
    const access = authorize(store, principal, ledgerId);
    return { ...access.ledger, role: access.member.role };
  }
  ensure(
    principal.ledgerId === ledgerId,
    403,
    '这枚 API 密钥只能访问绑定的账本',
    'LEDGER_SCOPE_MISMATCH',
  );
  const ledger = repo.keyLedger(store, principal.keyId, ledgerId);
  ensure(ledger, 401, 'API 密钥无效、已撤销或账本已归档', 'UNAUTHENTICATED');
  return { ...ledger, role: 'editor' as const };
}

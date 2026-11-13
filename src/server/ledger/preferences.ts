/** [INPUT]: 当前用户、账本、分类/模板校验及本域仓储。
 * [OUTPUT]: 共享分类新增与个人模板增改删查。[POS]: ledger 业务层，身份由 HTTP 层传入。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { randomUUID } from 'node:crypto';
import { atomic, type Store } from '../db/client';
import { categoryInput, templateInput, uuid } from '@/shared/validation';
import { ensure } from '@/shared/errors';
import { authorize, validateLinks } from './service';
import * as repo from './repo';

export function addCategory(store: Store, actorId: string, ledgerId: string, raw: unknown) {
  const value = categoryInput.parse(raw);
  return atomic(store, () => {
    authorize(store, actorId, ledgerId, true);
    const existing = repo.categoryList(store, ledgerId);
    ensure(
      !existing.some((item) => item.kind === value.kind && item.name === value.name),
      409,
      '这个分类已存在，请直接选择',
    );
    const id = randomUUID();
    repo.insertCategories(store, [
      {
        ...value,
        id,
        ledgerId,
        sortOrder: Math.max(-1, ...existing.map((item) => item.sortOrder)) + 1,
      },
    ]);
    return repo.category(store, ledgerId, id)!;
  });
}

export function listTemplates(store: Store, actorId: string, ledgerId: string) {
  authorize(store, actorId, ledgerId);
  return repo.templateList(store, ledgerId, actorId);
}

export function saveTemplate(
  store: Store,
  actorId: string,
  ledgerId: string,
  raw: unknown,
  id?: string,
) {
  const value = templateInput.parse(raw);
  if (id) {
    uuid.parse(id);
  }
  return atomic(store, () => {
    authorize(store, actorId, ledgerId, true);
    if (id) {
      ensure(repo.template(store, ledgerId, actorId, id), 404, '找不到这个模板');
    }
    validateLinks(store, ledgerId, value);
    ensure(
      !repo
        .templateList(store, ledgerId, actorId)
        .some((item) => item.name === value.name && item.id !== id),
      409,
      '你已使用这个模板名称，请换一个名称',
    );
    return id
      ? repo.updateTemplate(store, ledgerId, actorId, id, value)!
      : repo.insertTemplate(store, { ...value, id: randomUUID(), ledgerId, userId: actorId });
  });
}

export function removeTemplate(store: Store, actorId: string, ledgerId: string, id: string) {
  uuid.parse(id);
  return atomic(store, () => {
    authorize(store, actorId, ledgerId, true);
    ensure(repo.deleteTemplate(store, ledgerId, actorId, id), 404, '找不到这个模板');
    return { ok: true };
  });
}

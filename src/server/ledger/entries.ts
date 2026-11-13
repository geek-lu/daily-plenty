/** [INPUT]: 账单规则、仓储、事务与请求校验。[OUTPUT]: 幂等新增/修改/带原因软删除/恢复。[POS]: ledger 写入流程。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { createHash, randomUUID } from 'node:crypto';
import { atomic, type Store } from '../db/client';
import { ensure } from '@/shared/errors';
import { createEntryInput, updateEntryInput, deleteInput, uuid } from '@/shared/validation';
import type { Entry } from '@/shared/types';
import { authorize, validateLinks } from './service';
import * as repo from './repo';
function mutate(
  store: Store,
  actorId: string,
  ledgerId: string,
  requestId: string,
  operation: string,
  payload: unknown,
  perform: () => Entry,
): Entry {
  return atomic(store, () => {
    authorize(store, actorId, ledgerId, true);
    const hash = createHash('sha256').update(JSON.stringify({ operation, payload })).digest('hex');
    const previous = repo.mutation(store, ledgerId, actorId, requestId);
    if (previous) {
      ensure(previous.payloadHash === hash, 409, '此请求标识已用于另一项操作，请重新确认');
      return JSON.parse(previous.responseJson) as Entry;
    }
    const result = perform();
    repo.saveMutation(store, {
      ledgerId,
      actorId,
      requestId,
      operation,
      payloadHash: hash,
      resultEntryId: result.id,
      responseJson: JSON.stringify(result),
    });
    return result;
  });
}
export function createEntry(store: Store, actorId: string, ledgerId: string, raw: unknown) {
  const { requestId, ...value } = createEntryInput.parse(raw);
  return mutate(store, actorId, ledgerId, requestId, 'create', value, () => {
    validateLinks(store, ledgerId, value);
    const id = randomUUID();
    repo.insertEntry(store, { ...value, id, ledgerId, createdBy: actorId, updatedBy: actorId });
    return repo.entry(store, ledgerId, id)!;
  });
}
export function editEntry(
  store: Store,
  actorId: string,
  ledgerId: string,
  id: string,
  raw: unknown,
) {
  uuid.parse(id);
  const { requestId, version, ...value } = updateEntryInput.parse(raw);
  return mutate(store, actorId, ledgerId, requestId, `edit:${id}`, { version, ...value }, () => {
    const previous = repo.entry(store, ledgerId, id);
    ensure(previous && !previous.deletedAt, 404, '这笔账单已不存在，请刷新');
    validateLinks(store, ledgerId, value, previous);
    ensure(
      repo.updateEntry(store, ledgerId, id, version, { ...value, updatedBy: actorId }),
      409,
      '对方已修改这笔账，请查看最新记录后再决定',
      'VERSION_CONFLICT',
    );
    return repo.entry(store, ledgerId, id)!;
  });
}
export function deleteOrRestore(
  store: Store,
  actorId: string,
  ledgerId: string,
  id: string,
  raw: unknown,
) {
  uuid.parse(id);
  const input = deleteInput.parse(raw);
  const { requestId, version, deleted } = input;
  const deleteReason = input.deleted ? input.reason : null;
  const deleteReasonNote = input.deleted ? input.reasonNote : null;
  return mutate(
    store,
    actorId,
    ledgerId,
    requestId,
    `delete:${id}`,
    { version, deleted, deleteReason, deleteReasonNote },
    () => {
      const previous = repo.entry(store, ledgerId, id);
      ensure(previous, 404, '找不到这笔账单');
      ensure(Boolean(previous.deletedAt) !== deleted, 409, '账单状态已改变，请刷新');
      ensure(
        repo.updateEntry(store, ledgerId, id, version, {
          deletedAt: deleted ? new Date().toISOString() : null,
          deletedBy: deleted ? actorId : null,
          deleteReason,
          deleteReasonNote,
          updatedBy: actorId,
        }),
        409,
        '对方已修改这笔账，请刷新',
        'VERSION_CONFLICT',
      );
      return repo.entry(store, ledgerId, id)!;
    },
  );
}

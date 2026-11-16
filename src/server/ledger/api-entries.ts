/**
 * [INPUT]: 账本共享密钥身份、显式录入/修改成员、账单字段、版本和 requestId。
 * [OUTPUT]: 创建 AI 账单及仅 AI 来源可修改；账本级幂等覆盖操作、目标和内容。
 * [POS]: ledger API 写入流程；授权、成员校验、来源限制、写账与审计同事务完成。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createHash, randomUUID } from 'node:crypto';
import { atomic, type Store } from '../db/client';
import { ensure } from '@/shared/errors';
import { createApiEntryInput, updateApiEntryInput, uuid } from '@/shared/validation';
import type { Entry } from '@/shared/types';
import { authorizeRead, type LedgerKey } from './access';
import { validateLinks } from './service';
import * as repo from './repo';

function mutateApiEntry(
  store: Store,
  key: LedgerKey,
  ledgerId: string,
  requestId: string,
  payload: unknown,
  perform: () => Entry,
) {
  return atomic(store, () => {
    authorizeRead(store, key, ledgerId);
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const previous = repo.apiMutation(store, ledgerId, requestId);
    if (previous) {
      ensure(
        previous.payloadHash === hash,
        409,
        '此请求标识已用于另一项操作，请核对成员及账单内容',
      );
      return JSON.parse(previous.responseJson) as Entry;
    }
    const entry = perform();
    repo.saveApiMutation(store, {
      ledgerId,
      requestId,
      apiKeyId: key.keyId,
      payloadHash: hash,
      resultEntryId: entry.id,
      responseJson: JSON.stringify(entry),
    });
    return entry;
  });
}

export function createApiEntry(store: Store, key: LedgerKey, ledgerId: string, raw: unknown) {
  const { requestId, ...payload } = createApiEntryInput.parse(raw);
  // 保留已发布创建请求的哈希结构，使升级前的请求仍能幂等重试。
  return mutateApiEntry(store, key, ledgerId, requestId, payload, () => {
    const { recordedByMemberId, ...value } = payload;
    const recorder = repo
      .recorders(store, ledgerId)
      .find((member) => member.memberId === recordedByMemberId);
    ensure(recorder, 400, '请选择此账本内有效的可记账成员作为录入人', 'INVALID_RECORDER');
    validateLinks(store, ledgerId, value);
    const id = randomUUID();
    repo.insertEntry(store, {
      ...value,
      id,
      ledgerId,
      source: 'ai',
      createdBy: recorder.userId,
      updatedBy: recorder.userId,
    });
    return repo.entry(store, ledgerId, id)!;
  });
}

export function editApiEntry(
  store: Store,
  key: LedgerKey,
  ledgerId: string,
  id: string,
  raw: unknown,
) {
  uuid.parse(id);
  const { requestId, ...payload } = updateApiEntryInput.parse(raw);
  return mutateApiEntry(
    store,
    key,
    ledgerId,
    requestId,
    { operation: `edit:${id}`, payload },
    () => {
      const previous = repo.entry(store, ledgerId, id);
      ensure(previous && !previous.deletedAt, 404, '这笔账单已不存在，请刷新');
      ensure(previous.source === 'ai', 403, 'API 密钥只能修改 AI 创建的账单', 'AI_ENTRY_REQUIRED');
      const { updatedByMemberId, version, ...value } = payload;
      const updater = repo
        .recorders(store, ledgerId)
        .find((member) => member.memberId === updatedByMemberId);
      ensure(updater, 400, '请选择此账本内有效的可记账成员作为修改人', 'INVALID_UPDATER');
      validateLinks(store, ledgerId, value, previous);
      ensure(
        repo.updateEntry(store, ledgerId, id, version, { ...value, updatedBy: updater.userId }),
        409,
        '对方已修改这笔账，请查看最新记录后再决定',
        'VERSION_CONFLICT',
      );
      return repo.entry(store, ledgerId, id)!;
    },
  );
}

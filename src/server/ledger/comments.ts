/** [INPUT]: 评论/账单仓储、账本授权、Zod 与立即事务。
 * [OUTPUT]: 评论全量查询与幂等创建；任意深度回复归于主评论。
 * [POS]: ledger 评论服务；已删除账单在幂等回放前拒绝访问。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { atomic, type Store } from '../db/client';
import { ensure } from '@/shared/errors';
import { uuid } from '@/shared/validation';
import type { EntryComment } from '@/shared/types';
import { authorize } from './service';
import * as repo from './repo';
import * as comments from './comments-repo';

const input = z.object({
  content: z.string().trim().min(1).max(1000),
  replyToId: uuid.optional(),
  requestId: uuid,
});
function requireEntry(
  store: Store,
  actorId: string,
  ledgerId: string,
  entryId: string,
  write = false,
) {
  uuid.parse(ledgerId);
  uuid.parse(entryId);
  authorize(store, actorId, ledgerId, write);
  const entry = repo.entry(store, ledgerId, entryId);
  ensure(entry && !entry.deletedAt, 404, '这笔账单已不存在，请刷新');
}
export function listComments(store: Store, actorId: string, ledgerId: string, entryId: string) {
  return store.sqlite.transaction(() => {
    requireEntry(store, actorId, ledgerId, entryId);
    return comments.list(store, ledgerId, entryId);
  })();
}
export function createComment(
  store: Store,
  actorId: string,
  ledgerId: string,
  entryId: string,
  raw: unknown,
): EntryComment {
  const { content, replyToId = null, requestId } = input.parse(raw);
  return atomic(store, () => {
    requireEntry(store, actorId, ledgerId, entryId, true);
    const operation = `comment:${entryId}`;
    const payloadHash = createHash('sha256')
      .update(JSON.stringify({ operation, payload: { content, replyToId } }))
      .digest('hex');
    const previous = repo.mutation(store, ledgerId, actorId, requestId);
    if (previous) {
      ensure(previous.payloadHash === payloadHash, 409, '此请求标识已用于另一项操作，请重新确认');
      return JSON.parse(previous.responseJson) as EntryComment;
    }
    const target = replyToId ? comments.find(store, ledgerId, entryId, replyToId) : undefined;
    ensure(!replyToId || target, 400, '请选择此账单内有效的回复对象');
    const id = randomUUID();
    comments.insert(store, {
      id,
      ledgerId,
      entryId,
      authorId: actorId,
      rootId: target ? (target.rootId ?? target.id) : null,
      replyToId,
      content,
    });
    const result = comments.find(store, ledgerId, entryId, id)!;
    repo.saveMutation(store, {
      ledgerId,
      actorId,
      requestId,
      operation,
      payloadHash,
      resultEntryId: entryId,
      responseJson: JSON.stringify(result),
    });
    return result;
  });
}

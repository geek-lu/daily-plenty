'use client';
/** [INPUT]: 评论 HTTP 接口、账本和账单身份。[OUTPUT]: useComments 查询、回复目标与幂等提交状态。
 * [POS]: common/comments 状态层；组件以账单身份为 key 隔离草稿。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useEffect, useRef, useState } from 'react';
import type { EntryComment } from '@/shared/types';
import { api, uid } from '../api';

export function useComments(ledgerId: string, entryId: string) {
  const path = `ledgers/${ledgerId}/entries/${entryId}/comments`;
  const [comments, setComments] = useState<EntryComment[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<EntryComment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  const requests = useRef(new Map<string, string>());
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api<{ comments: EntryComment[] }>(path)
      .then((data) => {
        if (active) {
          setComments(data.comments);
        }
      })
      .catch((reason: Error) => {
        if (active) {
          setError(reason.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [path, attempt]);

  async function submit() {
    if (lock.current || loading || !content.trim()) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    const payload = { content: content.trim(), replyToId: replyTo?.id };
    const fingerprint = JSON.stringify(payload);
    try {
      const requestId = requests.current.get(fingerprint) || uid();
      requests.current.set(fingerprint, requestId);
      const comment = await api<EntryComment>(path, {
        method: 'POST',
        body: JSON.stringify({ ...payload, requestId }),
      });
      setComments((items) =>
        items.some((item) => item.id === comment.id) ? items : [...items, comment],
      );
      requests.current.clear();
      setContent('');
      setReplyTo(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '发送失败，请重试');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    comments,
    content,
    setContent,
    replyTo,
    setReplyTo,
    loading,
    busy,
    error,
    submit,
    reload: () => setAttempt((value) => value + 1),
  };
}

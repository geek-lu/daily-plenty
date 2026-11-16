'use client';
/**
 * [INPUT]: React、会话 Provider 与密钥 API。
 * [OUTPUT]: 绑定账本选择/密钥列表/提交锁/一次性秘密、复制反馈与撤销确认状态。
 * [POS]: API 密钥页面 runtime；生成失败不自动重试，刷新列表以核对可能已生成的密钥。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiKey, CreatedApiKey } from '@/shared/types';
import { ApiError } from '../api';
import { useSession } from '../session/runtime';
import * as api from './api';

export function useApiKeys() {
  const { requireLogin, ledgerId, ledgers: availableLedgers } = useSession();
  const ledgers = availableLedgers.filter((ledger) => ledger.role === 'editor');
  const [targetLedgerId, setTargetLedgerId] = useState(
    ledgers.some((ledger) => ledger.id === ledgerId) ? ledgerId : ledgers[0]?.id || '',
  );
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const locked = useRef(false);
  const reload = () => setRevision((value) => value + 1);
  const fail = useCallback(
    (cause: unknown) => {
      if (cause instanceof ApiError && cause.status === 401) {
        requireLogin();
      }
      setError(cause instanceof Error ? cause.message : '操作失败，请重试');
    },
    [requireLogin],
  );

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    void api
      .listKeys(abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) {
          setKeys(result.keys);
        }
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted) {
          fail(cause);
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [revision, fail]);

  const mutate = async (action: () => Promise<void>) => {
    if (locked.current) {
      return;
    }
    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (cause) {
      fail(cause);
      setNotice('若生成结果未返回，请检查列表。无法取回的密钥可撤销后重新生成。');
    } finally {
      reload();
      locked.current = false;
      setBusy(false);
    }
  };

  const generate = (event: React.FormEvent) => {
    event.preventDefault();
    if (created || !name.trim() || !ledgers.some((ledger) => ledger.id === targetLedgerId)) {
      return;
    }
    void mutate(async () => {
      setCreated(await api.createKey(name.trim(), targetLedgerId));
      setName('');
    });
  };

  const revoke = (id: string) =>
    void mutate(async () => {
      await api.revokeKey(id);
      setCreated((value) => (value?.key.id === id ? null : value));
      setConfirmId(null);
      setNotice('密钥已撤销，使用它的连接已失效。');
    });

  const copy = async () => {
    if (!created) {
      return;
    }
    try {
      await navigator.clipboard.writeText(created.token);
      setNotice('密钥已复制，请保存在 agent 的私有配置中。');
    } catch {
      setNotice('当前浏览器无法自动复制，请选中上方完整密钥手动复制。');
    }
  };

  return {
    keys,
    ledgers,
    targetLedgerId,
    setTargetLedgerId,
    name,
    setName,
    created,
    dismiss: () => setCreated(null),
    confirmId,
    setConfirmId,
    loading,
    busy,
    error,
    notice,
    reload: () => {
      setError('');
      reload();
    },
    generate,
    revoke,
    copy,
  };
}

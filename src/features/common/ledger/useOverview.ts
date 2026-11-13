'use client';
/** [INPUT]: 共享会话、月份 URL 与账本查询 API。[OUTPUT]: 账本/我们页的授权月度数据与刷新动作。
 * [POS]: ledger runtime；拒绝旧请求覆盖新账本，切页重新读取真实数据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LedgerData } from '@/shared/types';
import { today } from '@/shared/money';
import { useSession } from '../session/runtime';
import { api, ApiError } from '../api';
export function useOverview() {
  const session = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const monthParam = params.get('month');
  const month =
    monthParam && /^20\d{2}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : today().slice(0, 7);
  const { ledgerId, requireLogin, dataVersion } = session;
  const key = `${ledgerId}:${month}`;
  const [result, setResult] = useState<{ key: string; data: LedgerData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    pending.current?.abort();
    const abort = new AbortController();
    pending.current = abort;
    if (!ledgerId) {
      setLoading(false);
      setError('暂无可用账本');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api<LedgerData>(
        `ledgers/${ledgerId}/data?${new URLSearchParams({ month })}`,
        { signal: abort.signal },
      );
      if (!abort.signal.aborted) {
        setResult({ key, data });
      }
    } catch (e) {
      if (abort.signal.aborted) {
        return;
      }
      setResult(null);
      setError(e instanceof Error ? e.message : '加载失败');
      if (e instanceof ApiError && e.status === 401) {
        requireLogin();
      }
    } finally {
      if (!abort.signal.aborted) {
        setLoading(false);
      }
    }
  }, [ledgerId, month, key, requireLogin]);
  useEffect(() => {
    void reload();
    return () => pending.current?.abort();
  }, [reload, dataVersion]);
  const setMonth = (value: string) => {
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(value)) {
      return;
    }
    router.push(`${pathname}?${new URLSearchParams({ ledger: ledgerId, month: value })}`, {
      scroll: false,
    });
  };
  return {
    ...session,
    data: result?.key === key ? result.data : null,
    month,
    setMonth,
    loading,
    error,
    reload,
  };
}

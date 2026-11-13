'use client';
/** [INPUT]: 会话 Provider、统计 URL 规则与 HTTP API。[OUTPUT]: 按日/月/年的统计数据、维度切换及刷新动作。
 * [POS]: reports runtime；取消过时请求，保存记账后刷新当前统计，切换条件时不显示旧口径数据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReportData, ReportGranularity } from '@/shared/types';
import { today } from '@/shared/money';
import { api, ApiError } from '../api';
import { useSession } from '../session/runtime';
import { reportQuery, reportSelection } from './filters';

export function useReports() {
  const session = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selection = reportSelection(params, today());
  const query = reportQuery(selection.filters);
  const { ledgerId, requireLogin, dataVersion } = session;
  const queryKey = `${ledgerId}:${query}`;
  const [result, setResult] = useState<{ key: string; data: ReportData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    pending.current?.abort();
    const abort = new AbortController();
    pending.current = abort;
    setLoading(true);
    setError('');
    if (!ledgerId) {
      setLoading(false);
      setError('暂无可用账本');
      return;
    }
    try {
      const data = await api<ReportData>(`ledgers/${ledgerId}/reports?${query}`, {
        signal: abort.signal,
      });
      if (!abort.signal.aborted) {
        setResult({ key: queryKey, data });
      }
    } catch (e) {
      if (abort.signal.aborted) {
        return;
      }
      setResult(null);
      setError(e instanceof Error ? e.message : '统计加载失败');
      if (e instanceof ApiError && e.status === 401) {
        requireLogin();
      }
    } finally {
      if (!abort.signal.aborted) {
        setLoading(false);
      }
    }
  }, [ledgerId, query, queryKey, requireLogin]);
  useEffect(() => {
    void reload();
    return () => pending.current?.abort();
  }, [reload, dataVersion]);
  const navigate = (changes: Record<string, string>) => {
    const next = new URLSearchParams({
      ledger: ledgerId,
      granularity: selection.granularity,
      month: selection.month,
      year: selection.year,
      ...changes,
    });
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const setGranularity = (granularity: ReportGranularity) => {
    if (granularity !== selection.granularity) {
      navigate({ granularity });
    }
  };
  const setMonth = (month: string) => {
    if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
      navigate({ month, year: month.slice(0, 4) });
    }
  };
  const setYear = (year: string) => {
    if (/^20\d{2}$/.test(year)) {
      navigate({ year, month: `${year}-${selection.month.slice(5)}` });
    }
  };
  return {
    ...session,
    ...selection,
    queryKey,
    data: result?.key === queryKey ? result.data : null,
    loading,
    error,
    reload,
    setGranularity,
    setMonth,
    setYear,
    selectLedger: (ledger: string) => navigate({ ledger }),
  };
}

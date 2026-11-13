'use client';
/** [INPUT]: 共享会话、URL、同源 API 与筛选规则。[OUTPUT]: 账单加载/导航/刷新和可交给 Download 渲染的导出文件。
 * [POS]: records runtime；取消旧请求，避免跨条件显示旧账单。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RecordsData, RecordsFilters } from '@/shared/types';
import { recordsInput } from '@/shared/validation';
import { useSession } from '../shell/runtime';
import { api, ApiError } from '../ledger/api';
import { emptyFilters, filterParams, recordsHref } from './filters';

export function useRecords() {
  const router = useRouter();
  const query = useSearchParams().toString();
  const parsed = useMemo(
    () => recordsInput.safeParse(Object.fromEntries(new URLSearchParams(query))),
    [query],
  );
  const filters = parsed.success ? parsed.data : emptyFilters;
  const { ledgers, ledgerId, requireLogin, dataVersion } = useSession();
  const [result, setResult] = useState<{ key: string; data: RecordsData } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [download, setDownload] = useState<{ content: string; name: string } | null>(null);
  const [notice, setNotice] = useState('');
  const key = `${ledgerId}:${query}`;
  const data = result?.key === key ? result.data : null;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!ledgerId || !parsed.success) {
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError('');
    api<RecordsData>(`ledgers/${ledgerId}/entries?${filterParams(parsed.data)}`, {
      signal: abort.signal,
    })
      .then((value) => {
        if (abort.signal.aborted) {
          return;
        }
        setResult({ key, data: value });
        if (value.page !== parsed.data.page) {
          router.replace(recordsHref(ledgerId, { ...parsed.data, page: value.page }), {
            scroll: false,
          });
        }
      })
      .catch((e) => {
        if (abort.signal.aborted) {
          return;
        }
        setResult(null);
        setError(e instanceof Error ? e.message : '账单加载失败');
        if (e instanceof ApiError && e.status === 401) {
          requireLogin();
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [ledgerId, key, parsed, revision, router, requireLogin, dataVersion]);

  const apply = (next: RecordsFilters, ledger = ledgerId) => {
    const href = recordsHref(ledger, next);
    if (href === `/records?${query}`) {
      refresh();
    } else {
      router.push(href, { scroll: false });
    }
  };
  const exportCsv = async () => {
    if (!data || !parsed.success) {
      return;
    }
    setExporting(true);
    setError('');
    try {
      const csv = await api<string>(`ledgers/${ledgerId}/entries/export?${filterParams(filters)}`);
      setDownload({
        content: csv,
        name: `日日有余-账单-${filters.start || '全部'}-${filters.end || '至今'}.csv`,
      });
      setNotice('已导出符合当前条件的全部账单');
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };
  return {
    query,
    filters,
    ledgerId,
    ledgers,
    data,
    loading,
    error: !parsed.success ? '地址中的筛选条件无效，请重置后查询。' : error,
    apply,
    refresh,
    exportCsv,
    exporting,
    download,
    notice,
    setNotice,
  };
}

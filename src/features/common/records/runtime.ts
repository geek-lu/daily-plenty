'use client';
/** [INPUT]: 共享会话、URL、同源 API 与筛选规则。[OUTPUT]: 账单加载、无限下拉累积、导航/刷新和可交给 Download 渲染的导出文件。
 * [POS]: records runtime；取消旧请求，避免跨条件显示旧账单；页码不进 URL，刷新重取已加载页。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RecordsData, RecordsFilters } from '@/shared/types';
import { recordsInput } from '@/shared/validation';
import { useSession } from '../session/runtime';
import { api, ApiError } from '../api';
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

  // ---- 无限下拉：首屏与刷新重取已加载的全部页，保持编辑后滚动位置 ----
  const loaded = useRef({ key: '', pages: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const fetchPage = useCallback(
    (filters: RecordsFilters, page: number, signal?: AbortSignal) =>
      api<RecordsData>(`ledgers/${ledgerId}/entries?${filterParams({ ...filters, page })}`, {
        signal,
      }),
    [ledgerId],
  );

  useEffect(() => {
    if (!ledgerId || !parsed.success) {
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    const pages = loaded.current.key === key ? loaded.current.pages : 1;
    setLoading(true);
    setError('');
    setMoreError('');
    Promise.all(
      Array.from({ length: pages }, (_, i) => fetchPage(parsed.data, i + 1, abort.signal)),
    )
      .then((values) => {
        if (abort.signal.aborted) {
          return;
        }
        const last = values[values.length - 1];
        loaded.current = { key, pages: last.page };
        setResult({ key, data: { ...last, entries: mergeEntries(values) } });
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
  }, [ledgerId, key, parsed, revision, requireLogin, dataVersion, fetchPage]);

  const loadMore = () => {
    if (!data || !parsed.success || loading || loadingMore || data.page >= data.totalPages) {
      return;
    }
    setLoadingMore(true);
    setMoreError('');
    fetchPage(parsed.data, data.page + 1)
      .then((next) => {
        setResult((prev) => {
          if (prev?.key !== key) {
            return prev;
          }
          loaded.current = { key, pages: next.page };
          return { key, data: { ...next, entries: mergeEntries([prev.data, next]) } };
        });
      })
      .catch((e) => {
        setMoreError(e instanceof Error ? e.message : '加载更多失败');
        if (e instanceof ApiError && e.status === 401) {
          requireLogin();
        }
      })
      .finally(() => setLoadingMore(false));
  };

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
    loadMore,
    loadingMore,
    moreError,
    hasMore: Boolean(data && data.page < data.totalPages),
    exportCsv,
    exporting,
    download,
    notice,
    setNotice,
  };
}

// 分页期间新增账单会让偏移后移，按 id 去重避免同一笔出现两次。
function mergeEntries(pages: RecordsData[]) {
  const seen = new Set<string>();
  return pages
    .flatMap((page) => page.entries)
    .filter((entry) => !seen.has(entry.id) && Boolean(seen.add(entry.id)));
}

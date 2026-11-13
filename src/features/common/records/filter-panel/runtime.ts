'use client';
/**
 * [INPUT]: 已应用筛选、提交回调与筛选纯规则。
 * [OUTPUT]: 筛选草稿、金额转换、错误反馈、提交/重置及查询按钮焦点。
 * [POS]: records/filter-panel runtime；草稿不直接触发请求。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useRef, useState } from 'react';
import type { RecordsFilters as Filters } from '@/shared/types';
import { recordsInput } from '@/shared/validation';
import { emptyFilters, filterAmount } from '../filters';

export function useFilterDraft(applied: Filters, onApply: (filters: Filters) => void) {
  const [draft, setDraft] = useState(applied);
  const [expanded, setExpanded] = useState(false);
  const searchButton = useRef<HTMLButtonElement>(null);
  const [min, setMin] = useState(
    applied.minAmount === undefined ? '' : (applied.minAmount / 100).toFixed(2),
  );
  const [max, setMax] = useState(
    applied.maxAmount === undefined ? '' : (applied.maxAmount / 100).toFixed(2),
  );
  const [error, setError] = useState('');
  const selectedCount =
    applied.categoryIds.length +
    Number(applied.memberId !== 'all') +
    Number(applied.creatorId !== 'all') +
    Number(applied.minAmount !== undefined || applied.maxAmount !== undefined) +
    Number(Boolean(applied.start || applied.end)) +
    Number(applied.kind !== 'all') +
    Number(applied.sort !== 'newest');
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!event.currentTarget.checkValidity()) {
      setExpanded(true);
      setError('请填写有效日期，范围为 2000 年至 2099 年');
      return;
    }
    try {
      const parsed = recordsInput.safeParse({
        ...draft,
        minAmount: filterAmount(min),
        maxAmount: filterAmount(max),
        page: 1,
      });
      if (!parsed.success) {
        setExpanded(true);
        setError(parsed.error.issues[0].message);
        return;
      }
      searchButton.current?.focus({ preventScroll: true });
      setExpanded(false);
      onApply(parsed.data);
    } catch (e) {
      setExpanded(true);
      setError(e instanceof Error ? e.message : '请检查筛选条件');
    }
  };
  const reset = () => {
    setDraft(emptyFilters);
    setMin('');
    setMax('');
    setError('');
    setExpanded(false);
    onApply(emptyFilters);
  };
  const toggleCategory = (id: string) =>
    setDraft({
      ...draft,
      categoryIds: draft.categoryIds.includes(id)
        ? draft.categoryIds.filter((value) => value !== id)
        : [...draft.categoryIds, id],
    });
  return {
    draft,
    setDraft,
    expanded,
    setExpanded,
    searchButton,
    min,
    setMin,
    max,
    setMax,
    error,
    selectedCount,
    submit,
    reset,
    toggleCategory,
  };
}

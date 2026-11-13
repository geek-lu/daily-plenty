/** [INPUT]: URL 参数、人民币文本及共享校验。[OUTPUT]: 账单筛选序列化与快捷日期范围。
 * [POS]: records 纯规则，UI 和 runtime 共用，不访问网络。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { RecordsFilters } from '@/shared/types';
import { parseAmount, today } from '@/shared/money';
export const emptyFilters: RecordsFilters = {
  kind: 'all',
  categoryIds: [],
  memberId: 'all',
  creatorId: 'all',
  search: '',
  sort: 'newest',
  page: 1,
};
export function filterParams(filters: RecordsFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    const text = Array.isArray(value) ? value.join(',') : value === undefined ? '' : String(value);
    if (text && text !== 'all') {
      params.set(key, text);
    }
  }
  return params;
}
export function recordsHref(ledger: string, filters: RecordsFilters) {
  const params = filterParams(filters);
  if (ledger) {
    params.set('ledger', ledger);
  }
  return `/records?${params}`;
}
export function filterAmount(text: string): number | undefined {
  if (!text.trim()) {
    return undefined;
  }
  if (/^0(?:\.0{1,2})?$/.test(text.trim())) {
    return 0;
  }
  const value = parseAmount(text);
  if (value === null) {
    throw new Error('金额请填写 0 至 999999.99，最多两位小数');
  }
  return value;
}
export function monthRange(offset: number) {
  const [year, month] = today().split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month + offset, 0)).toISOString().slice(0, 10);
  return { start, end };
}

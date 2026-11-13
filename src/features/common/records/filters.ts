/** [INPUT]: URL 参数、人民币文本及共享校验。[OUTPUT]: 账单筛选序列化、快捷日期范围与已应用条件中文摘要。
 * [POS]: records 纯规则，UI 和 runtime 共用，不访问网络。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { RecordsData, RecordsFilters } from '@/shared/types';
import { money, parseAmount, today } from '@/shared/money';
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
  // 无限下拉不在地址中记录页码。
  params.delete('page');
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

// 已应用条件的中文摘要；手机标签与 PC 工具栏共用。
export function appliedFilterLabels(
  filters: RecordsFilters,
  data: Pick<RecordsData, 'categories' | 'members'>,
) {
  return [
    filters.start || filters.end
      ? `${filters.start || '最早'} 至 ${filters.end || '不限结束日期'}`
      : '不限日期',
    filters.kind === 'all' ? '全部收支' : filters.kind === 'expense' ? '支出' : '收入',
    ...filters.categoryIds.map(
      (id) => data.categories.find((c) => c.id === id)?.name || '指定分类',
    ),
    filters.memberId !== 'all'
      ? `付款 / 收款：${data.members.find((m) => m.id === filters.memberId)?.displayName || '指定人员'}`
      : '',
    filters.creatorId !== 'all'
      ? `录入：${data.members.find((m) => m.userId === filters.creatorId)?.displayName || '指定人员'}`
      : '',
    filters.minAmount !== undefined || filters.maxAmount !== undefined
      ? `¥ ${money(filters.minAmount || 0)} 至 ${filters.maxAmount === undefined ? '不限' : money(filters.maxAmount)}`
      : '',
    filters.search ? `关键词：${filters.search}` : '',
  ].filter(Boolean);
}

/** [INPUT]: URL 查询参数与业务今天。[OUTPUT]: 有效统计选择、查询参数及对应明细链接。
 * [POS]: reports 纯规则；保留旧 month 链接，维度与日期存入 URL。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { ReportFilters, ReportGranularity } from '@/shared/types';

export function reportSelection(params: Pick<URLSearchParams, 'get'>, currentDate: string) {
  const rawMonth = params.get('month') || '';
  const month = /^20\d{2}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : currentDate.slice(0, 7);
  const rawYear = params.get('year') || '';
  const year = /^20\d{2}$/.test(rawYear) ? rawYear : month.slice(0, 4);
  const raw = params.get('granularity');
  const granularity: ReportGranularity = raw === 'month' || raw === 'year' ? raw : 'day';
  const filters: ReportFilters =
    granularity === 'year'
      ? { granularity }
      : { granularity, period: granularity === 'day' ? month : year };
  return { month, year, granularity, filters };
}
export function reportQuery(filters: ReportFilters) {
  const params = new URLSearchParams({ granularity: filters.granularity });
  if (filters.period) {
    params.set('period', filters.period);
  }
  return params.toString();
}

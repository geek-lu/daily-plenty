/** [INPUT]: 已校验统计维度、时间范围和聚合点。[OUTPUT]: 日期范围、补零时间序列与日期标签纯规则。
 * [POS]: 统计公共日期规则，按账单日期而非创建时间归组，所有日期运算使用 UTC。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { ReportFilters, ReportGranularity, ReportPoint } from './types';

export function reportRange(filters: ReportFilters) {
  if (filters.granularity === 'year') {
    return { start: '2000-01-01', end: '2099-12-31' };
  }
  if (filters.granularity === 'month') {
    return { start: `${filters.period}-01-01`, end: `${filters.period}-12-31` };
  }
  const [year, month] = filters.period!.split('-').map(Number);
  return {
    start: `${filters.period}-01`,
    end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}
export function completeReportPoints(
  filters: ReportFilters,
  rows: ReportPoint[],
  currentYear: number,
): ReportPoint[] {
  const range = reportRange(filters);
  const years = rows.map((row) => Number(row.period.slice(0, 4)));
  const firstYear = Math.min(currentYear, ...years);
  const lastYear = Math.max(currentYear, ...years);
  const lengths = { day: Number(range.end.slice(-2)), month: 12, year: lastYear - firstYear + 1 };
  const values = new Map(rows.map((row) => [row.period, row]));
  return Array.from({ length: lengths[filters.granularity] }, (_, index) => {
    const period =
      filters.granularity === 'year'
        ? String(firstYear + index)
        : `${filters.period}-${String(index + 1).padStart(2, '0')}`;
    return values.get(period) || { period, expense: 0, count: 0 };
  });
}
export function reportPointLabel(period: string, granularity: ReportGranularity) {
  if (granularity === 'year') {
    return `${period}年`;
  }
  if (granularity === 'month') {
    return `${period.slice(0, 4)}年${Number(period.slice(5))}月`;
  }
  return `${period.slice(0, 4)}年${Number(period.slice(5, 7))}月${Number(period.slice(8))}日`;
}

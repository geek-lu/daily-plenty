/**
 * [INPUT]: Entry 公共账单契约。
 * [OUTPUT]: 月度/高级筛选导出共用的列头和行编码，含原始数据来源。
 * [POS]: ledger 纯规则；统一引号转义、公式注入防护和人民币精度。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Entry } from '@/shared/types';

function cell(value: string) {
  const safe = /^\s*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const entryCsvHeader = [
  '日期',
  '收支',
  '分类',
  '金额（元）',
  '付款人/收款人',
  '录入人',
  '备注',
  '数据来源',
]
  .map(cell)
  .join(',');

export function entryCsvRow(entry: Entry) {
  return [
    entry.occurredOn,
    entry.kind === 'expense' ? '支出' : '收入',
    entry.categoryName,
    (entry.amountMinor / 100).toFixed(2),
    entry.payerName,
    entry.creatorName,
    entry.note,
    entry.source === 'ai' ? 'AI 记录' : '人工记录',
  ]
    .map(cell)
    .join(',');
}

/** [INPUT]: Entry、金额格式与语义图标。[OUTPUT]: EntryRow。
 * [POS]: 首页和独立明细共享的移动账单行，金额与身份信息分开排版。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { Entry } from '@/shared/types';
import { money } from '@/shared/money';
import { CategoryIcon } from './CategoryIcon';
import { InterfaceIcon as Icon } from './InterfaceIcon';
export function EntryRow({ entry, onEdit }: { entry: Entry; onEdit: (entry: Entry) => void }) {
  return (
    <button
      className="entry-row"
      onClick={() => onEdit(entry)}
    >
      <span className="entry-row-icon">
        <CategoryIcon
          name={entry.categoryIcon}
          size={22}
        />
      </span>
      <span className="entry-row-title">{entry.note || entry.categoryName}</span>
      <span className={`entry-row-amount num ${entry.kind === 'income' ? 'text-positive' : ''}`}>
        {entry.kind === 'expense' ? '−' : '+'}
        {money(entry.amountMinor)}
      </span>
      <span className="entry-row-meta">
        {entry.categoryName} · {entry.payerName}
        {entry.kind === 'income' ? '收款' : '付款'} · {entry.creatorName}记
      </span>
      <span className="entry-row-arrow">
        <Icon
          name="arrow"
          size={16}
        />
      </span>
    </button>
  );
}

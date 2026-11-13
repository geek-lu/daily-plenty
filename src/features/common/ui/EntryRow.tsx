'use client';
/** [INPUT]: Entry、金额/图标、评论组件、Collapse 与写权限。[OUTPUT]: EntryRow 列表项、底部折叠评论看板。
 * [POS]: PC/手机首页和明细共用；详情与评论按钮独立，首页评论默认展示、明细默认收起、后台查询数量，收起保留草稿。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useId, useState } from 'react';
import type { Entry } from '@/shared/types';
import { money } from '@/shared/money';
import { Collapse } from '@/ui/motion';
import { CategoryIcon } from './CategoryIcon';
import { EntryComments } from '../comments/EntryComments';
import './entry-item.css';
export function EntryRow({
  entry,
  onEdit,
  canWrite = false,
  disabled = false,
  defaultCommentsExpanded = true,
}: {
  entry: Entry;
  onEdit: (entry: Entry) => void;
  canWrite?: boolean;
  disabled?: boolean;
  defaultCommentsExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultCommentsExpanded);
  const [count, setCount] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const id = useId();
  return (
    <article className="entry-item">
      <div className="entry-item-heading">
        <button
          type="button"
          className="entry-item-main"
          disabled={disabled}
          onClick={() => onEdit(entry)}
        >
          <span className="entry-item-icon">
            <CategoryIcon
              name={entry.categoryIcon}
              size={22}
            />
          </span>
          <span className="entry-item-copy">
            <span className="entry-item-title">{entry.categoryName}</span>
            <span className="entry-item-meta">
              {entry.occurredOn} · {entry.kind === 'income' ? '收款人' : '付款人'} ·{' '}
              {entry.payerName}
            </span>
            <span className="entry-item-note">{entry.note?.trim() || '暂无备注'}</span>
          </span>
          <span className="entry-item-amount num">
            {entry.kind === 'expense' ? '−' : '+'}
            {money(entry.amountMinor)}
          </span>
        </button>
      </div>
      <div className="entry-comment-board">
        <div className="entry-comment-toolbar">
          <button
            type="button"
            className="entry-comment-toggle"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => {
              setExpanded(!expanded);
            }}
          >
            <span
              className="entry-comment-chevron"
              aria-hidden="true"
            />
            {expanded ? '收起评论' : '展开评论'}
            <span className="entry-comment-count">{count === null ? '· …' : `· ${count} 条`}</span>
          </button>
          {canWrite && (
            <button
              type="button"
              className="entry-item-comment"
              aria-expanded={expanded && composing}
              aria-controls={id}
              onClick={() => {
                setExpanded(true);
                setComposing(!expanded || !composing);
              }}
            >
              {expanded && composing ? '收起输入' : '写评论'}
            </button>
          )}
        </div>
        <Collapse
          id={id}
          open={expanded}
        >
          <div className="entry-item-comments">
            <EntryComments
              key={`${entry.ledgerId}:${entry.id}`}
              ledgerId={entry.ledgerId}
              entryId={entry.id}
              onCountChange={setCount}
              canWrite={canWrite}
              composing={composing}
              onCompose={() => setComposing(true)}
            />
          </div>
        </Collapse>
      </div>
    </article>
  );
}

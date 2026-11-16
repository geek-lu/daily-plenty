'use client';
/**
 * [INPUT]: 明细查询状态、账单编辑 runtime 和共用抽屉。
 * [OUTPUT]: 已应用条件、收支汇总、无限下拉账单及详情/编辑/左滑删除入口。
 * [POS]: m/records 手机结果区；条件摘要、详情抽屉与下拉加载来自 common/records。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { money } from '@/shared/money';
import { EntryRow } from '@/features/common/ui/EntryRow';
import type { useRecords } from '@/features/common/records/runtime';
import { useEntryEditor } from '@/features/common/records/useEntryEditor';
import { appliedFilterLabels, emptyFilters } from '@/features/common/records/filters';
import { EntryDetail } from '@/features/common/records/EntryDetail';
import { LoadMore } from '@/features/common/records/LoadMore';
export function RecordsResults({ state }: { state: ReturnType<typeof useRecords> }) {
  const { data, filters, ledgerId } = state;
  const editor = useEntryEditor(ledgerId, state.refresh, state.setNotice);
  if (!data) {
    return null;
  }
  const details = appliedFilterLabels(filters, data);
  return (
    <div
      className="motion-enter mt-5"
      aria-busy={state.loading}
    >
      <div
        className="records-applied"
        aria-label="已应用的筛选条件"
      >
        {details.map((text, index) => (
          <span key={index}>{text}</span>
        ))}
      </div>
      <section
        aria-label="筛选结果汇总"
        className="records-totals"
      >
        {[
          ['匹配账单', `${data.totals.count} 笔`],
          ['支出合计', `¥ ${money(data.totals.expense)}`],
          ['收入合计', `¥ ${money(data.totals.income)}`],
          ['收支差额', `¥ ${money(data.totals.income - data.totals.expense)}`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="records-total"
          >
            <p className="text-xs muted">{label}</p>
            <p className="records-total-value num">{value}</p>
          </div>
        ))}
      </section>
      <section className="records-list card">
        <div className="records-list-heading">
          <h2>账单明细</h2>
          <button
            className="btn text-sm"
            disabled={state.exporting || state.loading || !data.totals.count}
            onClick={state.exportCsv}
          >
            {state.exporting ? '导出中…' : '导出账单'}
          </button>
        </div>
        <p className="records-list-caption">汇总与导出包含全部匹配账单 · 下拉自动加载更多</p>
        <fieldset
          disabled={state.loading || editor.busy}
          className="min-w-0"
        >
          {data.entries.map((entry, index) => (
            <div key={entry.id}>
              {(index === 0 || data.entries[index - 1].occurredOn !== entry.occurredOn) && (
                <p className="border-b border-line py-2 text-xs muted">{entry.occurredOn}</p>
              )}
              <EntryRow
                defaultCommentsExpanded={false}
                entry={entry}
                canWrite={data.ledger.role === 'editor'}
                disabled={state.loading || editor.busy}
                onEdit={editor.open}
                onDelete={editor.openDelete}
              />
            </div>
          ))}
          {!data.entries.length && (
            <div className="py-14 text-center">
              <p className="serif text-xl">没有找到符合条件的账单</p>
              <p className="mt-3 text-sm muted">试试扩大日期范围，或减少筛选条件。</p>
              <button
                className="btn mt-5"
                onClick={() => state.apply(emptyFilters)}
              >
                查看全部账单
              </button>
            </div>
          )}
          {data.totals.count > 0 && (
            <LoadMore
              loaded={data.entries.length}
              total={data.totals.count}
              hasMore={state.hasMore}
              loading={state.loadingMore}
              error={state.moreError}
              onLoad={state.loadMore}
            />
          )}
        </fieldset>
      </section>
      <EntryDetail
        editor={editor}
        data={data}
      />
    </div>
  );
}

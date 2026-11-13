'use client';
/**
 * [INPUT]: 明细查询状态、账单编辑 runtime 和共用抽屉。
 * [OUTPUT]: 已应用条件、收支汇总、分页账单及详情/编辑入口。
 * [POS]: records 结果区；RecordsPage 只编排查询、反馈和下载。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { money } from '@/shared/money';
import { Presence } from '@/ui/motion';
import { BottomDrawer } from '../ledger/ui/BottomDrawer';
import { EntryRow } from '../ledger/ui/EntryRow';
import { EntryDrawer } from '../ledger/ui/EntryDrawer';
import type { useRecords } from './runtime';
import { useEntryEditor } from './useEntryEditor';
import { emptyFilters } from './filters';
export function RecordsResults({ state }: { state: ReturnType<typeof useRecords> }) {
  const { data, filters, ledgerId } = state;
  const editor = useEntryEditor(ledgerId, state.refresh, state.setNotice);
  if (!data) {
    return null;
  }
  const selected = editor.selected;
  const details = [
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
        <p className="records-list-caption">汇总与导出包含全部匹配账单 · 每页 {data.pageSize} 笔</p>
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
                entry={entry}
                onEdit={editor.open}
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
            <nav
              aria-label="账单分页"
              className="records-pagination"
            >
              <p className="text-xs muted">
                第 {data.page} / {data.totalPages} 页 · 共 {data.totals.count} 笔
              </p>
              <div className="records-page-buttons">
                <button
                  className="btn text-sm"
                  disabled={data.page <= 1}
                  onClick={() => state.apply({ ...filters, page: data.page - 1 })}
                >
                  上一页
                </button>
                <button
                  className="btn text-sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => state.apply({ ...filters, page: data.page + 1 })}
                >
                  下一页
                </button>
              </div>
            </nav>
          )}
        </fieldset>
      </section>
      <Presence show={Boolean(selected)}>
        {selected &&
          (data.ledger.role === 'editor' ? (
            <EntryDrawer
              key={selected.id}
              open
              form={editor.form}
              categories={data.categories}
              members={data.members}
              templateName={editor.templateName}
              editingTemplate={false}
              templateOnly={false}
              onTemplateName={editor.setTemplateName}
              onAddCategory={editor.addCategory}
              onSaveTemplate={editor.saveTemplate}
              onChange={editor.setForm}
              onClose={editor.close}
              onSave={editor.save}
              onDelete={editor.remove}
              deleteSummary={`${selected.occurredOn} · ${selected.categoryName} · ¥ ${money(selected.amountMinor)}`}
              busy={editor.busy}
              error={editor.error}
            />
          ) : (
            <BottomDrawer
              title="账单详情"
              onClose={editor.close}
              actions={(close) => (
                <button
                  className="btn flex-1"
                  onClick={close}
                >
                  返回账单
                </button>
              )}
            >
              <p className="num break-words text-3xl">
                {selected.kind === 'expense' ? '−' : '+'} ¥ {money(selected.amountMinor)}
              </p>
              <p className="mt-3 text-sm">
                {selected.categoryName} · {selected.occurredOn}
              </p>
              <p className="mt-3 break-words text-sm muted">
                {selected.payerName}
                {selected.kind === 'expense' ? '付款' : '收款'} · {selected.creatorName}录入
              </p>
              <p className="mt-5 break-words text-sm">{selected.note || '没有备注'}</p>
              <p className="mt-5 text-xs muted">当前为只读成员，可查看和导出账单。</p>
            </BottomDrawer>
          ))}
      </Presence>
    </div>
  );
}

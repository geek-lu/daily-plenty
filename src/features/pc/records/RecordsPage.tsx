'use client';
/** [INPUT]: common/records 的 runtime/筛选/详情/下拉加载，pc/shell 版式原子与 Download。
 * [OUTPUT]: PC 明细页：整屏两栏，筛选栏与账单列表各自内部滚动，列表滚到底自动加载，左滑直接进入删除确认。
 * [POS]: pc/records 桌面视图；查询逻辑与手机版完全共用，只重排信息密度。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useRef } from 'react';
import { money } from '@/shared/money';
import { Presence } from '@/ui/motion';
import { Download } from '@/ui/Download';
import { useRecords } from '@/features/common/records/runtime';
import { useEntryEditor } from '@/features/common/records/useEntryEditor';
import { appliedFilterLabels, emptyFilters } from '@/features/common/records/filters';
import { EntryDetail } from '@/features/common/records/EntryDetail';
import { LoadMore } from '@/features/common/records/LoadMore';
import { PcPage, PcPanel, PcStats, PcToast } from '../shell/PcPage';
import { FilterRail } from './FilterRail';
import { EntryRow } from '@/features/common/ui/EntryRow';
import './records.css';

export default function RecordsPage() {
  const state = useRecords();
  return (
    <PcPage
      fixed
      eyebrow="FIND EVERY DETAIL"
      title="全部账单"
      subtitle="按日期、分类和人员，找到想核对的那一笔。"
      status={state.loading ? '正在查询账单…' : ''}
      actions={
        <button
          className="btn"
          disabled={state.exporting || state.loading || !state.data?.totals.count}
          onClick={state.exportCsv}
        >
          {state.exporting ? '导出中…' : '导出 CSV'}
        </button>
      }
    >
      <div className="pc-records">
        <FilterRail
          key={`filters:${state.query}`}
          applied={state.filters}
          categories={state.data?.categories || []}
          members={state.data?.members || []}
          busy={state.loading}
          onApply={state.apply}
        />
        <div className="pc-records-main">
          {state.error && (
            <div
              className="page-error"
              role="alert"
            >
              {state.error}
              <button
                className="btn ml-3"
                onClick={state.refresh}
              >
                重新加载
              </button>
              <button
                className="btn ml-2"
                onClick={() => state.apply(emptyFilters)}
              >
                重置筛选
              </button>
            </div>
          )}
          {state.data && (
            <Results
              key={`results:${state.query}`}
              state={state}
            />
          )}
        </div>
      </div>
      <Presence show={Boolean(state.notice)}>
        {state.notice && <PcToast onClose={() => state.setNotice('')}>{state.notice}</PcToast>}
      </Presence>
      {state.download && <Download file={state.download} />}
    </PcPage>
  );
}

function Results({ state }: { state: ReturnType<typeof useRecords> }) {
  const data = state.data!;
  const editor = useEntryEditor(state.ledgerId, state.refresh, state.setNotice);
  const scroller = useRef<HTMLDivElement>(null);
  return (
    <div
      className="motion-enter pc-records-results"
      aria-busy={state.loading}
    >
      <PcStats
        items={[
          { label: '匹配账单', value: `${data.totals.count} 笔` },
          { label: '支出合计', value: `¥ ${money(data.totals.expense)}`, tone: 'accent' },
          { label: '收入合计', value: `¥ ${money(data.totals.income)}`, tone: 'positive' },
          { label: '收支差额', value: `¥ ${money(data.totals.income - data.totals.expense)}` },
        ]}
      />
      <PcPanel
        fill
        bodyRef={scroller}
        title="账单明细"
        extra={
          <div
            className="pc-records-applied"
            aria-label="已应用的筛选条件"
          >
            {appliedFilterLabels(state.filters, data).map((text, index) => (
              <span key={index}>{text}</span>
            ))}
          </div>
        }
      >
        {data.entries.length ? (
          <div aria-label="账单列表">
            {data.entries.map((entry) => (
              <EntryRow
                defaultCommentsExpanded={false}
                key={entry.id}
                entry={entry}
                canWrite={data.ledger.role === 'editor'}
                disabled={state.loading || editor.busy}
                onEdit={editor.open}
                onDelete={editor.openDelete}
              />
            ))}
          </div>
        ) : (
          <div className="pc-empty">
            <p className="serif text-xl text-ink">没有找到符合条件的账单</p>
            <p className="mt-3">试试扩大日期范围，或减少筛选条件。</p>
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
            root={scroller}
          />
        )}
      </PcPanel>
      <EntryDetail
        editor={editor}
        data={data}
      />
    </div>
  );
}

'use client';
/** [INPUT]: records runtime、Presence/Download、筛选表单与共用抽屉。[OUTPUT]: 独立账单页和声明式下载/详情。
 * [POS]: records UI；手机紧凑首屏、阔屏成对布局，展示完整汇总与无限下拉明细。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import './records.css';
import { Presence } from '@/ui/motion';
import { Download } from '@/ui/Download';
import { InterfaceIcon as Icon } from '@/features/common/ui/InterfaceIcon';
import { RecordsResults } from './RecordsResults';
import { RecordsFilters } from './RecordsFilters';
import { useRecords } from '@/features/common/records/runtime';
import { emptyFilters } from '@/features/common/records/filters';

export default function RecordsPage() {
  const state = useRecords();
  return (
    <main className="records-page paper">
      <div className="mx-auto max-w-6xl">
        <header className="records-heading">
          <div>
            <p className="mb-2 hidden text-[10px] tracking-[.18em] muted md:block">
              FIND EVERY DETAIL
            </p>
            <h1 className="serif flex items-center gap-2">
              <Icon
                name="list"
                size={28}
              />
              全部账单
            </h1>
            <p className="mt-2 hidden text-sm muted md:block">
              按日期、分类和人员，找到想核对的那一笔。
            </p>
          </div>
          {state.ledgers.length > 0 && (
            <label className="records-ledger">
              <span className="label">当前账本</span>
              <select
                className="field"
                value={state.ledgerId}
                onChange={(e) => state.apply(emptyFilters, e.target.value)}
              >
                {state.ledgers.map((ledger) => (
                  <option
                    key={ledger.id}
                    value={ledger.id}
                  >
                    {ledger.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </header>
        <RecordsFilters
          key={`filters:${state.query}`}
          applied={state.filters}
          categories={state.data?.categories || []}
          members={state.data?.members || []}
          busy={state.loading}
          onApply={state.apply}
        />
        {state.error && (
          <div
            className="my-4 rounded border border-accent/20 bg-accent-soft p-4 text-sm text-accent"
            role="alert"
          >
            <p>{state.error}</p>
            <div className="mt-3 flex gap-3">
              <button
                className="btn"
                onClick={state.refresh}
              >
                重新加载
              </button>
              <button
                className="btn"
                onClick={() => state.apply(emptyFilters)}
              >
                重置筛选
              </button>
            </div>
          </div>
        )}
        <p
          className="page-loading-status"
          role="status"
        >
          {state.loading ? '正在查询账单…' : '\u00a0'}
        </p>
        {state.data && (
          <RecordsResults
            key={`results:${state.query}`}
            state={state}
          />
        )}
        <Presence show={Boolean(state.notice)}>
          {state.notice && (
            <div
              className="mt-4 flex items-center justify-between gap-3 rounded bg-sage p-4 text-sm text-positive"
              role="status"
            >
              <p>{state.notice}</p>
              <button
                className="grid h-11 w-11 shrink-0 place-items-center"
                onClick={() => state.setNotice('')}
                aria-label="关闭提示"
              >
                <Icon
                  name="close"
                  size={18}
                />
              </button>
            </div>
          )}
        </Presence>
        {state.download && <Download file={state.download} />}
      </div>
    </main>
  );
}

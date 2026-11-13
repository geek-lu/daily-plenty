'use client';
/** [INPUT]: 首页 runtime、全局记账入口、Presence 与共用录入组件。[OUTPUT]: 日常账本和可淡出提示/抽屉。
 * [POS]: 只组合首页功能，不包含统计/成员页面或导航。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import Link from 'next/link';
import './home.css';
import type { Entry } from '@/shared/types';
import { money } from '@/shared/money';
import { Presence } from '@/ui/motion';
import { useEntryComposer } from '../entry/EntryComposer';
import { useHome } from './runtime';
import { useSession } from '../shell/runtime';
import { EntryDrawer } from '../ledger/ui/EntryDrawer';
import { EntryRow } from '../ledger/ui/EntryRow';
import { TemplateList } from '../ledger/ui/preferences/TemplateList';
import { InterfaceIcon as Icon } from '../ledger/ui/InterfaceIcon';
export default function HomePage() {
  const { ledgerId } = useSession();
  return <HomeContent key={ledgerId} />;
}
function HomeContent() {
  const state = useHome();
  const composer = useEntryComposer();
  const { data, form } = state;
  const entries = (data?.entries || []).slice(0, 8);
  const deletionEntry = entries.find((entry) => entry.id === form.id);
  const canEdit = data?.ledger.role === 'editor';
  return (
    <main className="main-page home-page">
      <HomeHeading state={state} />
      <p
        className="page-loading-status"
        role="status"
      >
        {state.loading ? '正在读取账本…' : '\u00a0'}
      </p>
      {state.error && !state.modal && (
        <div
          className="page-error"
          role="alert"
        >
          {state.error}
          <button
            className="btn ml-3"
            onClick={state.reload}
          >
            重试
          </button>
        </div>
      )}
      <HomeBalance
        state={state}
        onRecord={composer.openEntry}
      />
      <div className="home-sections">
        {canEdit && (
          <TemplateList
            templates={data?.templates || []}
            categories={data?.categories || []}
            members={data?.members || []}
            busy={state.busy}
            onUse={state.openTemplate}
            onEdit={state.openTemplateEdit}
            onDelete={state.deleteTemplate}
            onNew={() => {
              state.openNew();
              state.setTemplateOnly(true);
            }}
          />
        )}
        <RecentEntries
          state={state}
          entries={entries}
        />
      </div>
      <Presence show={Boolean(state.notice)}>
        {state.notice && (
          <div
            className="mt-5 flex items-center justify-between gap-3 rounded bg-sage p-4 text-sm"
            role="status"
          >
            <p>{state.notice}</p>
            <button
              className="min-h-12 min-w-12"
              aria-label="关闭提示"
              onClick={() => state.setNotice('')}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </Presence>
      <Presence show={state.modal}>
        <EntryDrawer
          key={form.id || 'new'}
          open={state.modal}
          form={form}
          categories={data?.categories || []}
          members={data?.members || []}
          templateName={state.templateName}
          editingTemplate={Boolean(state.templateId)}
          templateOnly={state.templateOnly}
          onTemplateName={state.setTemplateName}
          onAddCategory={state.addCategory}
          onSaveTemplate={state.saveTemplate}
          onChange={state.setForm}
          onClose={state.close}
          onSave={state.save}
          onDelete={form.id ? state.remove : undefined}
          deleteSummary={
            deletionEntry
              ? `${deletionEntry.occurredOn} · ${deletionEntry.categoryName} · ¥ ${money(deletionEntry.amountMinor)}`
              : '当前选中的账单'
          }
          busy={state.busy}
          error={state.error}
        />
      </Presence>
    </main>
  );
}

type HomeState = ReturnType<typeof useHome>;

function HomeHeading({ state }: { state: HomeState }) {
  return (
    <header className="home-heading">
      <div>
        <p className="page-eyebrow">DAILY PLENTY</p>
        <h1 className="serif text-3xl">日常账本</h1>
        <p className="mt-2 text-sm muted">一蔬一饭，认真记录。</p>
      </div>
      <label className="ledger-picker">
        <span className="label">当前账本</span>
        <select
          className="field"
          value={state.ledgerId}
          onChange={(e) => state.selectLedger(e.target.value)}
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
    </header>
  );
}

function HomeBalance({ state, onRecord }: { state: HomeState; onRecord: () => void }) {
  const { data } = state;
  const canEdit = data?.ledger.role === 'editor';
  return (
    <section
      className="home-balance"
      aria-label="月度账本概览"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-w-0 items-center gap-2 text-sm muted">
          <Icon
            name="calendar"
            size={18}
          />
          <input
            className="month-picker"
            type="month"
            aria-label="账本月份"
            value={state.month}
            onChange={(e) => state.setMonth(e.target.value)}
          />
        </label>
        <span className="text-xs muted">结余 / 元</span>
      </div>
      <p className="home-balance-value num">
        {data ? money(data.summary.income - data.summary.expense) : '—'}
      </p>
      <div className="home-balance-details">
        <p>
          <span className="label">收入</span>
          <span className="num">{data ? `¥ ${money(data.summary.income)}` : '—'}</span>
        </p>
        <p>
          <span className="label">支出</span>
          <span className="num">{data ? `¥ ${money(data.summary.expense)}` : '—'}</span>
        </p>
        <Link
          className="min-h-12 content-center text-sm text-positive"
          href={`/reports?ledger=${state.ledgerId}&month=${state.month}`}
        >
          查看统计 ↗
        </Link>
      </div>
      {canEdit && (
        <button
          className="btn btn-primary mt-5 min-h-14 w-full"
          disabled={state.busy}
          onClick={onRecord}
        >
          <Icon
            name="plus"
            size={24}
          />
          记一笔
        </button>
      )}
      {data && !canEdit && <p className="mt-5 text-sm muted">当前为只读账本，可查看统计与明细。</p>}
    </section>
  );
}

function RecentEntries({ state, entries }: { state: HomeState; entries: Entry[] }) {
  const { data } = state;
  const canEdit = data?.ledger.role === 'editor';
  return (
    <section className="home-recent">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2>最近的日常</h2>
        <Link
          className="inline-flex min-h-12 items-center text-sm muted"
          href={`/records?ledger=${state.ledgerId}`}
        >
          全部账单 ↗
        </Link>
      </div>
      {canEdit ? (
        entries.map((entry, index) => (
          <div key={entry.id}>
            {(index === 0 || entries[index - 1].occurredOn !== entry.occurredOn) && (
              <p className="border-b border-line py-2 text-xs muted">{entry.occurredOn}</p>
            )}
            <EntryRow
              entry={entry}
              onEdit={state.openEdit}
            />
          </div>
        ))
      ) : (
        <Link
          className="btn my-4 w-full"
          href={`/records?ledger=${state.ledgerId}`}
        >
          查看账单明细
        </Link>
      )}
      {data && !entries.length && (
        <p className="py-10 text-center text-sm muted">这个月还没有记录，记下第一笔吧。</p>
      )}
    </section>
  );
}

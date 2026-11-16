'use client';
/** [INPUT]: common/home runtime、全局记账入口、共用 EntryRow/EntryDrawer/TemplateList，pc/shell 版式与 共用列表项。
 * [OUTPUT]: PC 账本首页：整屏指标条 + 最近账单列表（左，内部滚动与左滑删除）与模板/分类侧栏（右，内部滚动）。
 * [POS]: pc/home 桌面视图；与手机首页共用 useHome，账本切换在侧边栏。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import Link from 'next/link';
import { money } from '@/shared/money';
import { Presence } from '@/ui/motion';
import { useHome } from '@/features/common/home/runtime';
import { useSession } from '@/features/common/session/runtime';
import { useEntryComposer } from '@/features/common/entry/EntryComposer';
import { EntryDrawer } from '@/features/common/ui/EntryDrawer';
import { TemplateList } from '@/features/common/ui/preferences/TemplateList';
import { PcPage, PcPanel, PcStats, PcToast } from '../shell/PcPage';
import { EntryRow } from '@/features/common/ui/EntryRow';
import './home.css';

export default function HomePage() {
  const { ledgerId } = useSession();
  return <HomeContent key={ledgerId} />;
}

function HomeContent() {
  const state = useHome();
  const composer = useEntryComposer();
  const { data, form } = state;
  const entries = (data?.entries || []).slice(0, 12);
  const canEdit = data?.ledger.role === 'editor';
  const editing = entries.find((entry) => entry.id === form.id);
  return (
    <PcPage
      eyebrow="DAILY PLENTY"
      title="日常账本"
      subtitle="一蔬一饭，认真记录。"
      status={state.loading ? '正在读取账本…' : ''}
      actions={
        <>
          <input
            className="field pc-home-month"
            type="month"
            aria-label="账本月份"
            value={state.month}
            onChange={(e) => state.setMonth(e.target.value)}
          />
          {canEdit && (
            <button
              className="btn btn-primary"
              disabled={state.busy}
              onClick={composer.openEntry}
            >
              记一笔
            </button>
          )}
        </>
      }
    >
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
      <PcStats
        items={[
          {
            label: '本月结余',
            value: data ? `¥ ${money(data.summary.income - data.summary.expense)}` : '—',
          },
          {
            label: '本月收入',
            value: data ? `¥ ${money(data.summary.income)}` : '—',
            tone: 'positive',
          },
          {
            label: '本月支出',
            value: data ? `¥ ${money(data.summary.expense)}` : '—',
            tone: 'accent',
          },
          { label: '支出笔数', value: data ? `${data.summary.count} 笔` : '—' },
        ]}
      />
      <div className="pc-home-grid">
        <PcPanel
          fill
          title="最近的日常"
          extra={
            <Link
              className="text-sm text-accent"
              href={`/records?ledger=${state.ledgerId}`}
            >
              全部账单 ↗
            </Link>
          }
        >
          {entries.length ? (
            <div aria-label="最近账单列表">
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  canWrite={canEdit}
                  disabled={state.busy || !canEdit}
                  onEdit={state.openEdit}
                  onDelete={state.openDelete}
                />
              ))}
            </div>
          ) : (
            <p className="pc-empty">{data ? '这个月还没有记录，记下第一笔吧。' : ' '}</p>
          )}
          {data && !canEdit && (
            <p className="mt-4 text-sm muted">当前为只读账本，可在明细页查看详情和导出。</p>
          )}
        </PcPanel>
        <div className="pc-home-side pc-scroll">
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
          <PcPanel title="支出分类 Top 5">
            {data?.summary.categories.length ? (
              <ol className="pc-home-categories">
                {data.summary.categories.slice(0, 5).map((category, index) => (
                  <li key={`${category.name}:${index}`}>
                    <span className="muted num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    <span className="num">¥ {money(category.amount)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm muted">本月暂无支出。</p>
            )}
            <Link
              className="mt-4 inline-block text-sm text-positive"
              href={`/reports?ledger=${state.ledgerId}&month=${state.month}`}
            >
              查看统计 ↗
            </Link>
          </PcPanel>
        </div>
      </div>
      <Presence show={Boolean(state.notice)}>
        {state.notice && <PcToast onClose={() => state.setNotice('')}>{state.notice}</PcToast>}
      </Presence>
      <Presence show={state.modal}>
        <EntryDrawer
          key={`${form.id || 'new'}:${state.deleteOnOpen}`}
          initialDeleting={state.deleteOnOpen}
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
            editing
              ? `${editing.occurredOn} · ${editing.categoryName} · ¥ ${money(editing.amountMinor)}`
              : '当前选中的账单'
          }
          busy={state.busy}
          error={state.error}
        />
      </Presence>
    </PcPage>
  );
}

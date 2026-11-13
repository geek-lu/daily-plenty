'use client';
/** [INPUT]: 已应用条件、分类/成员与右侧 BottomDrawer。[OUTPUT]: 状态驱动的右侧筛选浮层、提交和重置。
 * [POS]: records UI；金额以元输入、分提交，草稿不会触发查询。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useId } from 'react';
import { useFilterDraft } from '@/features/common/records/filter-panel/runtime';
import { AdvancedFields } from '@/features/common/records/filter-panel/AdvancedFields';
import { BottomDrawer } from '@/features/common/ui/BottomDrawer';
import type { Category, Member, RecordsFilters as Filters } from '@/shared/types';

export function RecordsFilters({
  applied,
  categories,
  members,
  busy,
  onApply,
}: {
  applied: Filters;
  categories: Category[];
  members: Member[];
  busy: boolean;
  onApply: (filters: Filters) => void;
}) {
  const optionsId = useId();
  const state = useFilterDraft(applied, onApply);
  const {
    draft,
    setDraft,
    expanded,
    setExpanded,
    searchButton,
    error,
    selectedCount,
    submit,
    reset,
  } = state;
  return (
    <>
      <section
        className="records-filter card"
        aria-label="筛选账单"
      >
        <form
          onSubmit={submit}
          noValidate
        >
          <fieldset
            className="min-w-0"
            disabled={busy}
          >
            <div className="records-search">
              <label className="min-w-0">
                <span className="label">搜索账单</span>
                <input
                  className="field"
                  type="search"
                  enterKeyHint="search"
                  placeholder="备注或分类，如晚饭、房贷"
                  maxLength={120}
                  value={draft.search}
                  onChange={(e) => setDraft({ ...draft, search: e.target.value })}
                />
              </label>
              <button
                ref={searchButton}
                className="btn btn-primary text-sm"
                type="submit"
              >
                {busy ? '查询中' : '查询'}
              </button>
            </div>
            <div className="records-filter-toolbar">
              <button
                type="button"
                className="flex min-h-12 items-center gap-2 text-sm text-accent"
                aria-expanded={expanded}
                aria-controls={optionsId}
                onClick={() => setExpanded(!expanded)}
              >
                <span
                  className="filter-toggle-icon"
                  aria-hidden="true"
                >
                  {expanded ? '−' : '+'}
                </span>
                {expanded ? '收起筛选' : '筛选与排序'}
                {selectedCount > 0 && (
                  <span className="rounded bg-accent-soft px-2 py-1 text-xs">
                    已选 {selectedCount} 项
                  </span>
                )}
              </button>
              <button
                className="min-h-12 px-2 text-sm muted"
                type="button"
                onClick={reset}
              >
                重置
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-3 text-sm text-accent"
              >
                {error}
              </p>
            )}
          </fieldset>
        </form>
      </section>
      {expanded && (
        <BottomDrawer
          side
          title="筛选与排序"
          onClose={() => setExpanded(false)}
          busy={busy}
          actions={() => (
            <>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={reset}
              >
                重置
              </button>
              <button
                type="submit"
                form={optionsId}
                className="btn btn-primary flex-1"
                disabled={busy}
              >
                {busy ? '查询中…' : '应用筛选'}
              </button>
            </>
          )}
        >
          <form
            id={optionsId}
            className="records-filter-drawer"
            onSubmit={submit}
            noValidate
          >
            <fieldset
              disabled={busy}
              className="min-w-0"
            >
              <p className="mb-5 text-xs muted">选择条件后应用，返回账单列表。</p>
              <AdvancedFields
                state={state}
                categories={categories}
                members={members}
              />
              {error && (
                <p
                  role="alert"
                  className="mt-4 text-sm text-accent"
                >
                  {error}
                </p>
              )}
            </fieldset>
          </form>
        </BottomDrawer>
      )}
    </>
  );
}

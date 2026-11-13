'use client';
/** [INPUT]: 已应用条件、分类/成员与 Collapse。[OUTPUT]: 状态驱动的平滑筛选展开、提交和重置。
 * [POS]: records UI；金额以元输入、分提交，草稿不会触发查询。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useId } from 'react';
import { useFilterDraft } from './runtime';
import { AdvancedFields } from './AdvancedFields';
import { Collapse } from '@/ui/motion';
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
          <Collapse
            id={optionsId}
            open={expanded}
          >
            <div className="records-filter-options">
              <p className="mb-4 text-xs muted">选好条件后，点击底部「应用筛选」。</p>
              <AdvancedFields
                state={state}
                categories={categories}
                members={members}
              />
              <div className="records-filter-actions">
                <button
                  className="btn btn-primary"
                  type="submit"
                >
                  {busy ? '查询中…' : '应用筛选'}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setExpanded(false)}
                >
                  收起
                </button>
              </div>
            </div>
          </Collapse>
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
  );
}

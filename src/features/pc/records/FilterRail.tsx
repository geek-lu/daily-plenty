'use client';
/** [INPUT]: 已应用条件、分类/成员与 common/records 的筛选草稿和字段。
 * [OUTPUT]: FilterRail 桌面常驻筛选栏：搜索固定在顶、字段区内部滚动、应用/重置与错误固定在底。
 * [POS]: pc/records 筛选区；与手机折叠面板共用草稿 runtime 和 AdvancedFields，仅改为常驻展开。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { Category, Member, RecordsFilters as Filters } from '@/shared/types';
import { useFilterDraft } from '@/features/common/records/filter-panel/runtime';
import { AdvancedFields } from '@/features/common/records/filter-panel/AdvancedFields';

export function FilterRail({
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
  const state = useFilterDraft(applied, onApply);
  return (
    <aside
      className="pc-filter-rail records-filter-narrow"
      aria-label="筛选账单"
    >
      <form
        onSubmit={state.submit}
        noValidate
      >
        <fieldset
          className="min-w-0"
          disabled={busy}
        >
          <div className="pc-filter-search">
            <div className="filter-panel-title">
              <h2>筛选账单</h2>
              <span>{state.selectedCount ? `${state.selectedCount} 项条件` : '全部记录'}</span>
            </div>
            <label className="block">
              <span className="label">搜索账单</span>
              <input
                className="field"
                type="search"
                placeholder="备注或分类"
                maxLength={120}
                value={state.draft.search}
                onChange={(e) => state.setDraft({ ...state.draft, search: e.target.value })}
              />
            </label>
          </div>
          <div className="pc-filter-fields">
            <AdvancedFields
              state={state}
              categories={categories}
              members={members}
            />
          </div>
          <div className="pc-filter-actions">
            {state.error && (
              <p
                role="alert"
                className="col-span-2 text-sm text-accent"
              >
                {state.error}
              </p>
            )}
            <button
              ref={state.searchButton}
              className="btn btn-primary"
              type="submit"
            >
              {busy ? '查询中…' : '应用筛选'}
            </button>
            <button
              className="btn"
              type="button"
              onClick={state.reset}
            >
              重置
            </button>
          </div>
        </fieldset>
      </form>
    </aside>
  );
}

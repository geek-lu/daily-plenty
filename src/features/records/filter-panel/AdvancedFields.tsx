/**
 * [INPUT]: 筛选草稿、分类和成员选项。
 * [OUTPUT]: 收支/日期/分类/人员/金额筛选字段。
 * [POS]: records/filter-panel 纯展示；通过 runtime 更新草稿。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Category, Member, RecordsFilters as Filters } from '@/shared/types';
import { CategoryIcon } from '../../ledger/ui/CategoryIcon';
import { monthRange } from '../filters';
import type { useFilterDraft } from './runtime';

export function AdvancedFields({
  state,
  categories,
  members,
}: {
  state: ReturnType<typeof useFilterDraft>;
  categories: Category[];
  members: Member[];
}) {
  const { draft, setDraft, min, setMin, max, setMax, toggleCategory } = state;
  return (
    <>
      <div className="records-filter-grid">
        <label>
          <span className="label">收支类型</span>
          <select
            className="field"
            value={draft.kind}
            onChange={(e) =>
              setDraft({
                ...draft,
                kind: e.target.value as Filters['kind'],
                categoryIds: [],
              })
            }
          >
            <option value="all">全部收支</option>
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
        </label>
        <label>
          <span className="label">排序方式</span>
          <select
            className="field"
            value={draft.sort}
            onChange={(e) => setDraft({ ...draft, sort: e.target.value as Filters['sort'] })}
          >
            <option value="newest">日期从新到旧</option>
            <option value="oldest">日期从旧到新</option>
            <option value="amount_desc">金额从高到低</option>
            <option value="amount_asc">金额从低到高</option>
          </select>
        </label>
        <label>
          <span className="label">开始日期 · 含当天</span>
          <input
            className="field"
            type="date"
            min="2000-01-01"
            max="2099-12-31"
            value={draft.start || ''}
            onChange={(e) => setDraft({ ...draft, start: e.target.value || undefined })}
          />
        </label>
        <label>
          <span className="label">结束日期 · 含当天</span>
          <input
            className="field"
            type="date"
            min="2000-01-01"
            max="2099-12-31"
            value={draft.end || ''}
            onChange={(e) => setDraft({ ...draft, end: e.target.value || undefined })}
          />
        </label>
      </div>
      <div
        className="mt-3 grid grid-cols-3 gap-2"
        role="group"
        aria-label="快捷日期"
      >
        <button
          type="button"
          className="btn px-2 text-sm"
          onClick={() => setDraft({ ...draft, ...monthRange(0) })}
        >
          本月
        </button>
        <button
          type="button"
          className="btn px-2 text-sm"
          onClick={() => setDraft({ ...draft, ...monthRange(-1) })}
        >
          上月
        </button>
        <button
          type="button"
          className="btn px-2 text-sm"
          onClick={() => setDraft({ ...draft, start: undefined, end: undefined })}
        >
          不限日期
        </button>
      </div>
      <fieldset className="mt-5 min-w-0">
        <legend className="label">分类 · 可多选，不选则不限</legend>
        <div className="records-category-grid">
          {categories
            .filter((c) => draft.kind === 'all' || c.kind === draft.kind)
            .map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                aria-pressed={draft.categoryIds.includes(category.id)}
                className="records-category-option"
              >
                <CategoryIcon
                  name={category.icon}
                  size={18}
                />
                <span>
                  {category.name}
                  {category.archivedAt ? '（已归档）' : ''}
                </span>
              </button>
            ))}
        </div>
      </fieldset>
      <div className="records-filter-grid mt-5">
        <label>
          <span className="label">付款人 / 收款人</span>
          <select
            className="field"
            value={draft.memberId}
            onChange={(e) => setDraft({ ...draft, memberId: e.target.value })}
          >
            <option value="all">全部人员</option>
            {members.map((member) => (
              <option
                key={member.id}
                value={member.id}
              >
                {member.displayName}
                {member.leftAt ? '（已退出）' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">录入人</span>
          <select
            className="field"
            value={draft.creatorId}
            onChange={(e) => setDraft({ ...draft, creatorId: e.target.value })}
          >
            <option value="all">全部录入人</option>
            {members.map((member) => (
              <option
                key={member.id}
                value={member.userId}
              >
                {member.displayName}
                {member.leftAt ? '（已退出）' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">最低金额 / 元</span>
          <input
            className="field"
            inputMode="decimal"
            placeholder="如：0.00"
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
        </label>
        <label>
          <span className="label">最高金额 / 元</span>
          <input
            className="field"
            inputMode="decimal"
            placeholder="不填则不限"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </label>
      </div>
    </>
  );
}

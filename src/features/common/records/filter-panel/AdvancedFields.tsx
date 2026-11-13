/**
 * [INPUT]: 筛选草稿、分类和成员选项。
 * [OUTPUT]: 分组收支/日期/分类/人员/金额字段及选中态。
 * [POS]: records/filter-panel 纯展示；通过 runtime 更新草稿。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Category, Member, RecordsFilters as Filters } from '@/shared/types';
import { CategoryIcon } from '@/features/common/ui/CategoryIcon';
import { monthRange } from '../filters';
import type { useFilterDraft } from './runtime';
import '../records-common.css';

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
      <section className="filter-section">
        <h3 className="filter-section-title">收支与排序</h3>
        <div
          className="filter-kind"
          role="group"
          aria-label="收支类型"
        >
          {(['all', 'expense', 'income'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={draft.kind === kind}
              onClick={() => setDraft({ ...draft, kind, categoryIds: [] })}
            >
              {{ all: '全部', expense: '支出', income: '收入' }[kind]}
            </button>
          ))}
        </div>
        <div className="records-filter-grid filter-single">
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
        </div>
      </section>
      <section className="filter-section">
        <h3 className="filter-section-title">
          日期范围 <span>含开始与结束当天</span>
        </h3>
        <div className="records-filter-grid">
          <label>
            <span className="label">开始日期</span>
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
            <span className="label">结束日期</span>
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
          className="filter-date-presets"
          role="group"
          aria-label="快捷日期"
        >
          <button
            type="button"
            className="btn px-2 text-sm"
            aria-pressed={draft.start === monthRange(0).start && draft.end === monthRange(0).end}
            onClick={() => setDraft({ ...draft, ...monthRange(0) })}
          >
            本月
          </button>
          <button
            type="button"
            className="btn px-2 text-sm"
            aria-pressed={draft.start === monthRange(-1).start && draft.end === monthRange(-1).end}
            onClick={() => setDraft({ ...draft, ...monthRange(-1) })}
          >
            上月
          </button>
          <button
            type="button"
            className="btn px-2 text-sm"
            aria-pressed={!draft.start && !draft.end}
            onClick={() => setDraft({ ...draft, start: undefined, end: undefined })}
          >
            不限日期
          </button>
        </div>
      </section>
      <fieldset className="filter-section min-w-0">
        <legend className="filter-section-title">
          账单分类{' '}
          <span>
            {draft.categoryIds.length ? `已选 ${draft.categoryIds.length} 项` : '多选 · 默认不限'}
          </span>
        </legend>
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
      <section className="filter-section">
        <h3 className="filter-section-title">相关人员</h3>
        <div className="records-filter-grid">
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
        </div>
      </section>
      <section className="filter-section">
        <h3 className="filter-section-title">
          金额范围 <span>人民币 / 元</span>
        </h3>
        <div className="records-filter-grid">
          <label>
            <span className="label">最低金额</span>
            <input
              className="field"
              inputMode="decimal"
              placeholder="如：0.00"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </label>
          <label>
            <span className="label">最高金额</span>
            <input
              className="field"
              inputMode="decimal"
              placeholder="不填则不限"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </label>
        </div>
      </section>
    </>
  );
}

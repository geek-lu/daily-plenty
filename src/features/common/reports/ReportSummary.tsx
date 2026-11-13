/**
 * [INPUT]: 统计汇总、当前时间维度与分类图标。
 * [OUTPUT]: ReportSummary 组合，以及可单独排版的 IncomeComparison / CategoryBreakdown / MemberBreakdown、periodLabels。
 * [POS]: reports 纯展示组件；所有金额来自同一服务端范围。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Summary, ReportGranularity } from '@/shared/types';
import { money } from '@/shared/money';
import { CategoryIcon } from '../ui/CategoryIcon';
import './reports-common.css';

export const periodLabels = { day: '所选月份', month: '所选年份', year: '历年累计' } as const;

export function ReportSummary({
  summary,
  granularity,
}: {
  summary: Summary;
  granularity: ReportGranularity;
}) {
  const periodLabel = periodLabels[granularity];
  return (
    <>
      <IncomeComparison
        summary={summary}
        periodLabel={periodLabel}
      />
      <div className="reports-breakdowns">
        <CategoryBreakdown summary={summary} />
        <MemberBreakdown summary={summary} />
      </div>
    </>
  );
}

export function IncomeComparison({
  summary,
  periodLabel,
}: {
  summary: Summary;
  periodLabel: string;
}) {
  const { expense, income } = summary;
  const scale = Math.max(expense, income, 1);
  return (
    <section
      className="reports-overview"
      aria-label="所选范围收支分析"
    >
      <div className="reports-main-number">
        <p className="text-sm muted">{periodLabel}支出 / 元</p>
        <p className="num">{money(expense)}</p>
        <span className="text-xs muted">共 {summary.count} 笔支出</span>
      </div>
      <div className="reports-comparison">
        <div>
          <div className="flex justify-between gap-3 text-sm">
            <span>收入</span>
            <span className="num text-positive">¥ {money(income)}</span>
          </div>
          <div className="reports-track">
            <span
              className="bg-positive"
              style={{ width: `${(income / scale) * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between gap-3 text-sm">
            <span>支出</span>
            <span className="num">¥ {money(expense)}</span>
          </div>
          <div className="reports-track">
            <span
              className="bg-accent"
              style={{ width: `${(expense / scale) * 100}%` }}
            />
          </div>
        </div>
        <p className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-sm">
          <span className="muted">收支结余</span>
          <span className="num">¥ {money(income - expense)}</span>
        </p>
      </div>
    </section>
  );
}

export function CategoryBreakdown({ summary }: { summary: Summary }) {
  const { expense } = summary;
  return (
    <section>
      <div className="mb-5 flex justify-between gap-3">
        <h2 className="text-lg">支出花在哪里</h2>
        <span className="self-center text-xs muted">分类占比</span>
      </div>
      {summary.categories.length ? (
        <ol className="grid gap-5">
          {summary.categories.map((category, index) => (
            <li key={`${category.name}:${index}`}>
              <div className="flex items-center gap-3">
                <span className="num w-5 text-xs muted">{String(index + 1).padStart(2, '0')}</span>
                <CategoryIcon
                  name={category.icon}
                  size={20}
                />
                <span className="min-w-0 flex-1 break-words text-sm">{category.name}</span>
                <span className="num text-sm">¥ {money(category.amount)}</span>
              </div>
              <div className="mt-2 flex items-center gap-3 pl-8">
                <div className="reports-track flex-1">
                  <span
                    className="bg-positive"
                    style={{ width: `${expense ? (category.amount / expense) * 100 : 0}%` }}
                  />
                </div>
                <span className="num w-12 text-right text-xs muted">
                  {expense ? ((category.amount / expense) * 100).toFixed(1) : '0'}%
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-10 text-center text-sm muted">这段时间还没有支出，记账后就能看到分布。</p>
      )}
    </section>
  );
}

export function MemberBreakdown({ summary }: { summary: Summary }) {
  const { expense } = summary;
  return (
    <section className="reports-members">
      <h2 className="mb-5 text-lg">谁为小家付了款</h2>
      {summary.members.map((member, index) => (
        <div
          className="mb-5 border-b border-line pb-5"
          key={`${member.name}:${index}`}
        >
          <div className="flex justify-between gap-3">
            <span className="break-words text-sm">{member.name}</span>
            <span className="num text-sm">¥ {money(member.amount)}</span>
          </div>
          <p className="mt-2 text-xs muted">
            占所选范围支出 {expense ? ((member.amount / expense) * 100).toFixed(1) : 0}%
          </p>
        </div>
      ))}
      <p className="text-xs leading-6 muted">按付款人统计，不代表录入人，也不计算彼此欠款。</p>
    </section>
  );
}

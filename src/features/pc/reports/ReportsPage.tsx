'use client';
/** [INPUT]: common/reports 的 runtime、ExpenseTrend 与汇总分区，pc/shell 版式原子。
 * [OUTPUT]: PC 统计页整屏：标题栏维度/周期切换，指标条，折线卡与下方三栏按比例分高，排名等长内容在卡内滚动。
 * [POS]: pc/reports 桌面视图；数据口径与手机版相同，只重排为一屏总览。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import Link from 'next/link';
import { money } from '@/shared/money';
import { useReports } from '@/features/common/reports/runtime';
import { ExpenseTrend } from '@/features/common/reports/ExpenseTrend';
import {
  CategoryBreakdown,
  IncomeComparison,
  MemberBreakdown,
  periodLabels,
} from '@/features/common/reports/ReportSummary';
import { PcPage, PcPanel, PcStats } from '../shell/PcPage';
import './reports.css';

const granularities = [
  ['day', '日'],
  ['month', '月'],
  ['year', '年'],
] as const;

export default function ReportsPage() {
  const state = useReports();
  const summary = state.data?.summary;
  const recordsHref = state.data
    ? `/records?${new URLSearchParams({ ledger: state.ledgerId, start: state.data.start, end: state.data.end })}`
    : '';
  return (
    <PcPage
      eyebrow="A CLEARER PICTURE"
      title="收支统计"
      subtitle="钱花在哪里，日子就在哪里。"
      status={state.loading ? '正在计算收支趋势…' : ''}
      actions={<PeriodControls state={state} />}
    >
      {state.error && (
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
            label: `${periodLabels[state.granularity]}支出`,
            value: summary ? `¥ ${money(summary.expense)}` : '—',
            tone: 'accent',
          },
          {
            label: '收入',
            value: summary ? `¥ ${money(summary.income)}` : '—',
            tone: 'positive',
          },
          { label: '结余', value: summary ? `¥ ${money(summary.income - summary.expense)}` : '—' },
          { label: '支出笔数', value: summary ? `${summary.count} 笔` : '—' },
        ]}
      />
      <PcPanel
        className="pc-reports-trend"
        title={{ day: '每天的支出', month: '每月的支出', year: '每年的支出' }[state.granularity]}
        extra={
          recordsHref && (
            <Link
              className="text-sm text-accent"
              href={recordsHref}
            >
              查看这段明细 ↗
            </Link>
          )
        }
      >
        {state.data ? (
          <ExpenseTrend
            key={state.queryKey}
            points={state.data.points}
            granularity={state.granularity}
          />
        ) : (
          <div className="reports-chart-placeholder">
            {state.error ? '趋势暂时无法显示，请重试' : '正在整理这段日子的记录…'}
          </div>
        )}
      </PcPanel>
      {summary && (
        <div className="pc-reports-grid">
          <PcPanel
            fill
            title="收支对比"
          >
            <IncomeComparison
              summary={summary}
              periodLabel={periodLabels[state.granularity]}
            />
          </PcPanel>
          <PcPanel fill>
            <CategoryBreakdown summary={summary} />
          </PcPanel>
          <div className="pc-reports-members pc-scroll">
            <MemberBreakdown summary={summary} />
          </div>
        </div>
      )}
    </PcPage>
  );
}

function PeriodControls({ state }: { state: ReturnType<typeof useReports> }) {
  return (
    <>
      {state.granularity === 'day' && (
        <input
          className="field pc-reports-period"
          type="month"
          aria-label="统计月份"
          min="2000-01"
          max="2099-12"
          value={state.month}
          onChange={(e) => state.setMonth(e.target.value)}
        />
      )}
      {state.granularity === 'month' && (
        <select
          className="field pc-reports-period"
          aria-label="统计年份"
          value={state.year}
          onChange={(e) => state.setYear(e.target.value)}
        >
          {Array.from({ length: 100 }, (_, index) => 2099 - index).map((year) => (
            <option
              key={year}
              value={year}
            >
              {year}年
            </option>
          ))}
        </select>
      )}
      <div
        className="pc-segmented"
        role="group"
        aria-label="统计维度"
      >
        {granularities.map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={state.granularity === value}
            onClick={() => state.setGranularity(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

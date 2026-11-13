'use client';
/** [INPUT]: 日/月/年统计 runtime、支出折线、金额和分类图标。[OUTPUT]: 同范围趋势、收支、分类及付款人分析。
 * [POS]: reports 独立页面；仅展示真实聚合，不放记账表单和成员管理。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import Link from 'next/link';
import { useReports } from '@/features/common/reports/runtime';
import { ExpenseTrend } from '@/features/common/reports/ExpenseTrend';
import { ReportSummary } from '@/features/common/reports/ReportSummary';
import './reports.css';

export default function ReportsPage() {
  const state = useReports();
  const summary = state.data?.summary;
  const recordsHref = state.data
    ? `/records?${new URLSearchParams({ ledger: state.ledgerId, start: state.data.start, end: state.data.end })}`
    : '';
  return (
    <main className="main-page reports-page">
      <header className="reports-heading">
        <div>
          <p className="page-eyebrow">A CLEARER PICTURE</p>
          <h1 className="serif text-3xl">收支统计</h1>
          <p className="mt-2 text-sm muted">钱花在哪里，日子就在哪里。</p>
        </div>
        {state.granularity === 'day' && (
          <label>
            <span className="label">统计月份</span>
            <input
              className="field"
              type="month"
              min="2000-01"
              max="2099-12"
              value={state.month}
              onChange={(e) => state.setMonth(e.target.value)}
            />
          </label>
        )}
        {state.granularity === 'month' && (
          <label>
            <span className="label">统计年份</span>
            <select
              className="field"
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
          </label>
        )}
        {state.granularity === 'year' && (
          <p className="reports-period-caption">按年份汇总全部记录。</p>
        )}
      </header>
      <div className="reports-ledger">
        <label className="min-w-0">
          <span className="sr-only">统计账本</span>
          <select
            className="bg-transparent py-3 text-sm"
            value={state.ledgerId}
            onChange={(e) => state.selectLedger(e.target.value)}
          >
            {state.ledgers.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {recordsHref && (
          <Link
            className="inline-flex min-h-12 items-center text-sm text-accent"
            href={recordsHref}
          >
            查看明细 ↗
          </Link>
        )}
      </div>
      <ReportTrend state={state} />
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
      {summary && (
        <ReportSummary
          summary={summary}
          granularity={state.granularity}
        />
      )}
    </main>
  );
}

function ReportTrend({ state }: { state: ReturnType<typeof useReports> }) {
  return (
    <section
      className="reports-trend"
      aria-labelledby="expense-trend-title"
      aria-busy={state.loading}
    >
      <div className="reports-trend-heading">
        <div>
          <h2
            id="expense-trend-title"
            className="serif text-xl"
          >
            支出的起伏
          </h2>
          <p className="mt-1 text-xs muted">
            {
              {
                day: '所选月份 · 每天的支出',
                month: '所选年份 · 每月的支出',
                year: '历年 · 每年的支出',
              }[state.granularity]
            }
          </p>
        </div>
        <div
          className="reports-granularity"
          role="group"
          aria-label="统计维度"
        >
          {(['day', 'month', 'year'] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={state.granularity === value}
              onClick={() => state.setGranularity(value)}
            >
              {{ day: '日', month: '月', year: '年' }[value]}
            </button>
          ))}
        </div>
      </div>
      <p
        className="page-loading-status"
        role="status"
      >
        {state.loading ? '正在计算收支趋势…' : '\u00a0'}
      </p>
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
    </section>
  );
}

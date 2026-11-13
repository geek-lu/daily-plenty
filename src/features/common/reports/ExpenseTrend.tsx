'use client';
/** [INPUT]: 已补零支出序列、维度与 Collapse。[OUTPUT]: 可点选/键盘选择和声明式展开数据表的折线图。
 * [POS]: reports 纯展示组件；整数分作为数据源，SVG 不依赖图表库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useId, useState } from 'react';
import { Collapse } from '@/ui/motion';
import type { ReportGranularity, ReportPoint } from '@/shared/types';
import { money } from '@/shared/money';
import { reportPointLabel } from '@/shared/report';
import './reports-common.css';

export function ExpenseTrend({
  points,
  granularity,
}: {
  points: ReportPoint[];
  granularity: ReportGranularity;
}) {
  const [selected, setSelected] = useState(() =>
    Math.max(
      0,
      points.findIndex((point) => point.expense > 0),
    ),
  );
  const helpId = useId();
  const tableId = useId();
  const [tableOpen, setTableOpen] = useState(false);
  const index = Math.min(selected, points.length - 1);
  const point = points[index];
  const peak = Math.max(100, ...points.map((item) => item.expense));
  const unit = 10 ** Math.floor(Math.log10(peak));
  const ceiling = [1, 2, 5, 10].find((step) => step * unit >= peak)! * unit;
  const x = (i: number) => (points.length === 1 ? 300 : 12 + (i / (points.length - 1)) * 576);
  const y = (amount: number) => 164 - (amount / ceiling) * 148;
  const path = points.map((item, i) => `${i ? 'L' : 'M'}${x(i)},${y(item.expense)}`).join(' ');
  const ticks = Array.from(
    new Set(
      Array.from({ length: Math.min(5, points.length) }, (_, i) =>
        Math.round((i * (points.length - 1)) / Math.max(1, Math.min(5, points.length) - 1)),
      ),
    ),
  );
  const compact = (period: string) =>
    granularity === 'day'
      ? `${Number(period.slice(-2))}日`
      : granularity === 'month'
        ? `${Number(period.slice(-2))}月`
        : `${period}年`;
  const selectAt = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (((event.clientX - rect.left) / rect.width) * 600 - 12) / 576;
    setSelected(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
  };
  if (!point) {
    return <p className="reports-chart-placeholder">暂无统计数据</p>;
  }
  return (
    <div className="reports-trend-content">
      <div
        className="reports-point"
        aria-live="polite"
        aria-atomic="true"
      >
        <span>{reportPointLabel(point.period, granularity)}</span>
        <strong className="num">¥ {money(point.expense)}</strong>
        <span>{point.count} 笔支出</span>
      </div>
      <div className="reports-chart">
        <div
          className="reports-y-axis"
          aria-hidden="true"
        >
          {[ceiling, ceiling / 2, 0].map((value) => (
            <span key={value}>
              {(value / 100).toLocaleString('zh-CN', { maximumFractionDigits: 3 })}
            </span>
          ))}
        </div>
        <div
          className="reports-plot"
          role="slider"
          tabIndex={0}
          aria-label="选择支出统计日期"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={points.length - 1}
          aria-valuenow={index}
          aria-valuetext={`${reportPointLabel(point.period, granularity)}，支出 ${money(point.expense)} 元，${point.count} 笔`}
          aria-describedby={helpId}
          onPointerDown={selectAt}
          onPointerMove={(event) => {
            if (event.pointerType === 'mouse' || event.buttons === 1) {
              selectAt(event);
            }
          }}
          onKeyDown={(event) => {
            const positions: Record<string, number> = {
              ArrowLeft: index - 1,
              ArrowDown: index - 1,
              ArrowRight: index + 1,
              ArrowUp: index + 1,
              Home: 0,
              End: points.length - 1,
            };
            if (!(event.key in positions)) {
              return;
            }
            event.preventDefault();
            setSelected(Math.max(0, Math.min(points.length - 1, positions[event.key])));
          }}
        >
          <svg
            viewBox="0 0 600 180"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {[0, ceiling / 2, ceiling].map((value) => (
              <line
                key={value}
                className="reports-gridline"
                x1="12"
                x2="588"
                y1={y(value)}
                y2={y(value)}
              />
            ))}
            <path
              className="reports-line"
              d={path}
            />
            {points.length === 1 && (
              <line
                className="reports-line"
                x1="294"
                x2="306"
                y1={y(point.expense)}
                y2={y(point.expense)}
              />
            )}
            <line
              className="reports-guide"
              x1={x(index)}
              x2={x(index)}
              y1="10"
              y2="164"
            />
          </svg>
          <span
            className="reports-dot"
            style={{ left: `${x(index) / 6}%`, top: `${y(point.expense) / 1.8}%` }}
          />
          <div
            className="reports-x-axis"
            aria-hidden="true"
          >
            {ticks.map((i) => (
              <span
                key={points[i].period}
                style={{ left: `${x(i) / 6}%` }}
              >
                {compact(points[i].period)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p
        id={helpId}
        className="reports-chart-hint"
      >
        单位：元 · 点选折线查看金额，也可用方向键切换
      </p>
      {!points.some((item) => item.count > 0) && (
        <p className="reports-chart-empty">这段时间还没有支出，记下一笔后就能看到变化。</p>
      )}
      <div className="reports-chart-table">
        <button
          type="button"
          aria-expanded={tableOpen}
          aria-controls={tableId}
          onClick={() => setTableOpen(!tableOpen)}
        >
          {tableOpen ? '收起' : '查看'}逐{{ day: '日', month: '月', year: '年' }[granularity]}数据
        </button>
        <Collapse
          id={tableId}
          open={tableOpen}
        >
          <div className="reports-table-scroll">
            <table>
              <caption className="sr-only">支出趋势数据</caption>
              <thead>
                <tr>
                  <th scope="col">日期</th>
                  <th scope="col">支出（元）</th>
                  <th scope="col">笔数</th>
                </tr>
              </thead>
              <tbody>
                {points.map((item) => (
                  <tr key={item.period}>
                    <th scope="row">{reportPointLabel(item.period, granularity)}</th>
                    <td className="num">{money(item.expense)}</td>
                    <td className="num">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Collapse>
      </div>
    </div>
  );
}

/** [INPUT]: TableSummary[]、TableData 由 page.tsx 传入。[OUTPUT]: DataGrip 风格 + MUJI 配色的数据库行数据浏览器，仅 PC（≥1024px）可访问。
 * [POS]: /config 路由的纯展示层；切换表通过 URL ?table= 导航，无数据写入。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
'use client';
import { useRouter, usePathname } from 'next/navigation';
import type { TableSummary, TableData } from './page';

interface Props {
  tables: TableSummary[];
  active: string;
  tableData: TableData | null;
  limit: number;
}

function cellText(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  return String(val);
}

function isNull(val: unknown): boolean {
  return val === null || val === undefined;
}

export default function ConfigView({ tables, active, tableData, limit }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function select(name: string) {
    router.push(`${pathname}?table=${name}`);
  }

  return (
    <>
      <div className="config-mobile-only">
        <p>仅支持桌面端（≥ 1024 px）访问</p>
      </div>

      <div className="config-shell">
        {/* ── left: table list ───────────────────── */}
        <aside className="config-sidebar">
          <div className="config-sidebar-head">Tables</div>
          <ul className="config-table-list">
            {tables.map((t) => (
              <li
                key={t.name}
                className={`config-table-item${t.name === active ? ' config-table-item--active' : ''}`}
                onClick={() => select(t.name)}
              >
                <span className="config-table-name">{t.name}</span>
                <span className="config-table-count num">{t.rowCount.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* ── right: data grid ───────────────────── */}
        <main className="config-main">
          {tableData ? (
            <>
              <header className="config-grid-head">
                <span className="config-grid-title">{tableData.name}</span>
                <span className="config-grid-meta num">
                  {tableData.total > limit
                    ? `前 ${limit} 行 / 共 ${tableData.total.toLocaleString()} 行`
                    : `${tableData.total.toLocaleString()} 行`}
                </span>
              </header>

              <div className="config-grid-wrap">
                <table className="config-grid">
                  <thead>
                    <tr>
                      <th className="config-rownum-head">#</th>
                      {tableData.columns.map((col) => (
                        <th
                          key={col.name}
                          className={col.pk ? 'config-th-pk' : ''}
                        >
                          <span className="config-col-name">{col.name}</span>
                          <span className="config-col-type">{col.type}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={tableData.columns.length + 1}
                          className="config-empty-row"
                        >
                          （空表）
                        </td>
                      </tr>
                    ) : (
                      tableData.rows.map((row, i) => (
                        <tr key={i}>
                          <td className="config-rownum">{i + 1}</td>
                          {tableData.columns.map((col) => {
                            const val = row[col.name];
                            return (
                              <td
                                key={col.name}
                                className={`config-cell${isNull(val) ? ' config-cell-null' : ''}`}
                                title={cellText(val)}
                              >
                                {isNull(val) ? 'NULL' : cellText(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="config-empty">选择左侧表查看数据</div>
          )}
        </main>
      </div>

      <style>{`
        .config-mobile-only { display: none; }
        @media (max-width: 1023px) {
          .config-shell { display: none !important; }
          .config-mobile-only {
            display: flex; align-items: center; justify-content: center;
            height: 100dvh; color: var(--color-muted); font-size: 14px;
          }
        }

        .config-shell {
          display: flex; height: 100dvh; overflow: hidden;
          background: var(--color-paper);
          font-size: 12px;
          font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
          color: var(--color-ink);
        }

        /* sidebar */
        .config-sidebar {
          width: 196px; flex-shrink: 0;
          border-right: 1px solid var(--color-line);
          background: var(--color-surface);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .config-sidebar-head {
          padding: 9px 12px 8px;
          font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--color-muted); border-bottom: 1px solid var(--color-line);
          flex-shrink: 0;
        }
        .config-table-list {
          list-style: none; margin: 0; padding: 3px 0;
          overflow-y: auto; flex: 1;
        }
        .config-table-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 5px 10px; cursor: pointer; gap: 6px;
          transition: background 0.1s; user-select: none;
        }
        .config-table-item:hover { background: var(--color-paper); }
        .config-table-item--active { background: var(--color-sage); }
        .config-table-name {
          flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .config-table-count {
          font-size: 10px; color: var(--color-muted); flex-shrink: 0;
        }

        /* main pane */
        .config-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

        .config-grid-head {
          display: flex; align-items: baseline; gap: 10px;
          padding: 10px 16px 9px;
          border-bottom: 1px solid var(--color-line);
          background: var(--color-paper);
          flex-shrink: 0;
        }
        .config-grid-title { font-size: 13px; font-weight: 500; }
        .config-grid-meta  { font-size: 11px; color: var(--color-muted); }

        .config-grid-wrap {
          flex: 1; overflow: auto;
        }

        /* grid table */
        .config-grid {
          border-collapse: collapse; min-width: 100%;
          white-space: nowrap;
        }
        .config-grid thead {
          position: sticky; top: 0; z-index: 2;
          background: var(--color-surface);
        }
        .config-grid th {
          padding: 5px 10px 5px 8px;
          border-bottom: 2px solid var(--color-line);
          border-right: 1px solid var(--color-line);
          text-align: left; font-weight: 500;
          font-size: 11px;
          white-space: nowrap;
        }
        .config-grid th:last-child { border-right: none; }
        .config-th-pk { background: var(--color-accent-soft); }
        .config-rownum-head {
          width: 36px; text-align: right; color: var(--color-muted);
          background: var(--color-surface);
        }
        .config-col-name { display: block; }
        .config-col-type {
          display: block; font-size: 9px;
          color: var(--color-muted); letter-spacing: 0.04em; margin-top: 1px;
        }

        .config-grid td {
          padding: 3px 10px 3px 8px;
          border-bottom: 1px solid var(--color-line);
          border-right: 1px solid var(--color-line);
          max-width: 320px; overflow: hidden; text-overflow: ellipsis;
          vertical-align: middle;
        }
        .config-grid td:last-child { border-right: none; }
        .config-grid tr:hover td { background: var(--color-sage); }

        .config-rownum {
          text-align: right; color: var(--color-muted);
          background: var(--color-surface); width: 36px;
          user-select: none;
        }
        .config-grid tr:hover .config-rownum { background: var(--color-sage); }

        .config-cell-null { color: var(--color-muted); font-style: italic; }

        .config-empty-row {
          text-align: center; padding: 32px; color: var(--color-muted);
          font-style: italic;
        }
        .config-empty {
          padding: 48px 20px; color: var(--color-muted); font-size: 13px;
        }
      `}</style>
    </>
  );
}

/** [INPUT]: server/http/context optionalActor 会话、server/db/client getStore()、SQLite PRAGMA 与 SELECT。
 * [OUTPUT]: /config 数据库数据浏览页，仅登录用户可见、凭据列打码，仅 PC 端渲染。
 * [POS]: 调试工具路由，不在导航菜单内；未登录返回 404，直接调用 getStore 读取表数据，不走 HTTP 层。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { notFound } from 'next/navigation';
import { getStore } from '@/server/db/client';
import { optionalActor } from '@/server/http/context';
import ConfigView from './ConfigView';

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export interface TableSummary {
  name: string;
  rowCount: number;
}

export interface TableData {
  name: string;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  total: number;
}

const ROW_LIMIT = 200;
// 密码与会话/邀请令牌的哈希即使登录也不展示，避免离线破解或冒用。
const SECRET_COLUMNS = new Set(['password_hash', 'token_hash']);

function redact(row: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...row };
  for (const key of Object.keys(safe)) {
    if (SECRET_COLUMNS.has(key) && safe[key] !== null) {
      safe[key] = '••••••';
    }
  }
  return safe;
}

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  if (!(await optionalActor()).userId) {
    notFound();
  }
  const { sqlite } = getStore();

  const tableSummaries: TableSummary[] = (
    sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map((r) => {
    const n = (sqlite.prepare(`SELECT COUNT(*) as n FROM "${r.name}"`).get() as { n: number }).n;
    return { name: r.name, rowCount: n };
  });

  const requested = (await searchParams).table ?? '';
  const active = tableSummaries.some((t) => t.name === requested)
    ? requested
    : (tableSummaries[0]?.name ?? '');

  let tableData: TableData | null = null;
  if (active) {
    const columns = sqlite.prepare(`PRAGMA table_info("${active}")`).all() as ColumnInfo[];
    const rows = (
      sqlite.prepare(`SELECT * FROM "${active}" LIMIT ${ROW_LIMIT}`).all() as Record<
        string,
        unknown
      >[]
    ).map(redact);
    const total = (sqlite.prepare(`SELECT COUNT(*) as n FROM "${active}"`).get() as { n: number })
      .n;
    tableData = { name: active, columns, rows, total };
  }

  return (
    <ConfigView
      tables={tableSummaries}
      active={active}
      tableData={tableData}
      limit={ROW_LIMIT}
    />
  );
}

/** [INPUT]: better-sqlite3、Drizzle、版本化 SQL。[OUTPUT]: 延迟初始化数据库与立即事务。
 * [POS]: 仅供服务端及 CLI 使用的数据基础设施；无导入时副作用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync, readdirSync, readFileSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import * as schema from './schema';
export type Store = { db: BetterSQLite3Database<typeof schema>; sqlite: Database.Database };
export function migrate(sqlite: Database.Database, directory = resolve('migrations')) {
  sqlite.exec(
    'CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL) STRICT',
  );
  sqlite
    .transaction(() => {
      for (const name of readdirSync(directory)
        .filter((file) => file.endsWith('.sql'))
        .sort()) {
        const source = readFileSync(resolve(directory, name), 'utf8');
        const hash = createHash('sha256').update(source).digest('hex');
        const previous = sqlite.prepare('SELECT hash FROM _migrations WHERE name = ?').get(name) as
          | { hash: string }
          | undefined;
        if (previous && previous.hash !== hash) {
          throw new Error(`已应用迁移被修改：${name}`);
        }
        if (previous) {
          continue;
        }
        sqlite.exec(source);
        sqlite.prepare('INSERT INTO _migrations VALUES (?, ?)').run(name, hash);
      }
    })
    .immediate();
}
export function createStore(
  filename = process.env.DATABASE_PATH || './data/daily-plenty.db',
): Store {
  if (filename !== ':memory:') {
    mkdirSync(dirname(resolve(filename)), { recursive: true, mode: 0o700 });
  }
  const sqlite = new Database(filename);
  if (filename !== ':memory:') {
    chmodSync(filename, 0o600);
  }
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  migrate(sqlite);
  return { sqlite, db: drizzle(sqlite, { schema }) };
}
export function atomic<T>(store: Store, action: () => T): T {
  return store.sqlite.transaction(action).immediate();
}
const globalStore = globalThis as typeof globalThis & { dailyPlenty?: Store };
export function getStore() {
  return (globalStore.dailyPlenty ??= createStore());
}

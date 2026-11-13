/** [INPUT]: DATABASE_PATH、BACKUP_DIRECTORY 与当前发布包的 SQLite 驱动。[OUTPUT]: 经 quick_check 的唯一备份路径。
 * [POS]: 只读源库的运维工具，不调用应用迁移；保留 WAL 中已提交数据，不覆盖旧备份。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync, existsSync, unlinkSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
const Database = createRequire(import.meta.url)('better-sqlite3');
process.umask(0o077);
const source = resolve(process.env.DATABASE_PATH || '/var/lib/daily-plenty/daily-plenty.db');
const directory = resolve(process.env.BACKUP_DIRECTORY || '/var/backups/daily-plenty');
if (!existsSync(source)) throw new Error('数据库尚不存在，未创建空备份');
mkdirSync(directory, { recursive: true, mode: 0o700 });
const target = resolve(
  directory,
  `daily-plenty-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.db`,
);
const partial = `${target}.partial`;
const database = new Database(source, { readonly: true, fileMustExist: true });
try {
  await database.backup(partial);
  chmodSync(partial, 0o600);
  const copy = new Database(partial, { fileMustExist: true });
  try {
    // 仅调整备份副本，确保下载单个 .db 即可恢复，不依赖 WAL/SHM 文件。
    copy.pragma('journal_mode = DELETE');
    if (copy.pragma('quick_check', { simple: true }) !== 'ok')
      throw new Error('备份完整性检查失败');
  } finally {
    copy.close();
  }
  renameSync(partial, target);
  console.log(target);
} catch (error) {
  if (existsSync(partial)) unlinkSync(partial);
  throw error;
} finally {
  database.close();
}

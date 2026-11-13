/** [INPUT]: 已迁移 SQLite 数据库。[OUTPUT]: 一致性备份文件。[POS]: 运维脚本，不覆盖源数据库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getStore } from '@/server/db/client';
const store = getStore();
const target = resolve(
  process.env.BACKUP_PATH ||
    `./backups/daily-plenty-${new Date().toISOString().replace(/[:.]/g, '-')}.db`,
);
mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
await store.sqlite.backup(target);
chmodSync(target, 0o600);
store.sqlite.close();
console.log(`备份完成：${target}`);

/** [INPUT]: DATABASE_PATH、迁移 SQL。[OUTPUT]: 可重复执行的 SQLite 迁移。[POS]: 运维脚本。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { getStore } from '@/server/db/client';
const store = getStore();
store.sqlite.close();
console.log('数据库迁移完成。');

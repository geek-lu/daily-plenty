#!/usr/bin/env node
/* [INPUT]: 可选 .env.local。[OUTPUT]: 补全初始化密钥与数据库路径，保留已存在的配置。
 * [POS]: 可选配置入口；会话独立随机生成，不需要 SESSION_SECRET。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const file = '.env.local';
const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
const defaults = {
  DAILY_PLENTY_SETUP_TOKEN: randomBytes(32).toString('hex'),
  DATABASE_PATH: './data/daily-plenty.db',
};
const missing = Object.entries(defaults)
  .filter(([key]) => !new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`, 'm').test(existing))
  .map(([key, value]) => `${key}=${value}\n`)
  .join('');
const separator = existing && !existing.endsWith('\n') && missing ? '\n' : '';
writeFileSync(file, existing + separator + missing, { mode: 0o600 });
chmodSync(file, 0o600);
console.log(`已补全 ${file}，保留已有配置。应用也可无配置启动。`);
console.log('请执行 pnpm dev，然后打开 /setup 完成首次初始化。');

/**
 * [INPUT]: 现有 app.env 路径和 http/tunnel/https 访问模式。
 * [OUTPUT]: 保留其他配置的监听/Cookie 设置，修改前创建独立备份。
 * [POS]: release 的访问配置迁移；只处理配置，不重启服务、不改数据库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { copyFileSync, constants, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const [path, mode] = process.argv.slice(2);
const modes = new Map([
  [
    'http',
    { HOSTNAME: '0.0.0.0', DAILY_PLENTY_ALLOW_HTTP: 'true', DAILY_PLENTY_LOCAL_PREVIEW: 'false' },
  ],
  [
    'tunnel',
    { HOSTNAME: '127.0.0.1', DAILY_PLENTY_ALLOW_HTTP: 'false', DAILY_PLENTY_LOCAL_PREVIEW: 'true' },
  ],
  [
    'https',
    {
      HOSTNAME: '127.0.0.1',
      DAILY_PLENTY_ALLOW_HTTP: 'false',
      DAILY_PLENTY_LOCAL_PREVIEW: 'false',
    },
  ],
]);
if (!path || !modes.has(mode)) {
  throw new Error('用法：node access.mjs <app.env> <http|tunnel|https>');
}
const settings = { ...modes.get(mode), PORT: '3000' };
const source = readFileSync(path, 'utf8');
// 去掉网络字段的全部旧定义，避免重复字段覆盖；其余内容逐行保留。
const lines = source.split(/\r?\n/).filter((line) => {
  const key = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=/)?.[1];
  return !Object.hasOwn(settings, key);
});
while (lines.at(-1) === '') {
  lines.pop();
}
const output = [
  ...lines,
  ...Object.entries(settings).map(([key, value]) => `${key}=${value}`),
  '',
].join('\n');
if (output !== source) {
  const backup = `${path}.before-access-${randomUUID()}`;
  copyFileSync(path, backup, constants.COPYFILE_EXCL);
  writeFileSync(path, output);
  console.log(`访问配置已更新：${mode}；原配置备份：${backup}`);
} else {
  console.log(`访问配置已是 ${mode}，无需修改。`);
}

/**
 * [INPUT]: 临时配置文件和真实 configure CLI。
 * [OUTPUT]: 已有数据库路径/密钥不被覆盖，重复配置幂等。
 * [POS]: 脚本回归，只在临时目录执行，不读取项目环境文件。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('./configure.mjs', import.meta.url));
test('configure preserves existing settings and only fills missing defaults', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'daily-plenty-config-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, '.env.local');
  const run = () => {
    const result = spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return readFileSync(file, 'utf8');
  };
  writeFileSync(
    file,
    '# custom\nexport DATABASE_PATH = /var/lib/custom.db\nDAILY_PLENTY_SETUP_TOKEN=kept',
  );
  const original = readFileSync(file, 'utf8');
  assert.equal(run(), original);
  assert.equal(run(), original);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  writeFileSync(file, '# fresh');
  const configured = run();
  assert.match(configured, /^DAILY_PLENTY_SETUP_TOKEN=[a-f0-9]{64}$/m);
  assert.match(configured, /^DATABASE_PATH=\.\/data\/daily-plenty.db$/m);
  assert.doesNotMatch(configured, /SESSION_SECRET/);
  assert.equal(run(), configured);
});

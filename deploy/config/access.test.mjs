/**
 * [INPUT]: 临时 app.env 与真实访问配置 CLI。
 * [OUTPUT]: 旧配置迁移、模式切换、幂等、权限保留与错误输入回归。
 * [POS]: 部署配置测试，不接触系统配置或用户账本。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';

test('existing tunnel config migrates to HTTP without losing data settings; modes are reversible', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'daily-plenty-access-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'app.env');
  const original =
    '# keep me\nDATABASE_PATH=/data/keep.db\nBACKUP_DIRECTORY=/backups/keep\nSESSION_CUSTOM=keep\nHOSTNAME=127.0.0.1\nPORT=3000\nDAILY_PLENTY_LOCAL_PREVIEW=true\nexport HOSTNAME="127.0.0.1"\n';
  writeFileSync(path, original, { mode: 0o640 });
  const run = (mode) =>
    spawnSync(
      process.execPath,
      [fileURLToPath(new URL('./access.mjs', import.meta.url)), path, mode],
      { encoding: 'utf8' },
    );
  const read = () => parseEnv(readFileSync(path, 'utf8'));
  const http = run('http');
  assert.equal(http.status, 0, http.stderr);
  assert.deepEqual(
    { ...read() },
    {
      DATABASE_PATH: '/data/keep.db',
      BACKUP_DIRECTORY: '/backups/keep',
      SESSION_CUSTOM: 'keep',
      HOSTNAME: '0.0.0.0',
      PORT: '3000',
      DAILY_PLENTY_ALLOW_HTTP: 'true',
      DAILY_PLENTY_LOCAL_PREVIEW: 'false',
    },
  );
  assert.equal(statSync(path).mode & 0o777, 0o640);
  const backup = readdirSync(directory).find((name) => name.startsWith('app.env.before-access-'));
  assert.equal(readFileSync(join(directory, backup), 'utf8'), original);
  assert.equal(statSync(join(directory, backup)).mode & 0o777, 0o640);
  assert.match(readFileSync(path, 'utf8'), /^# keep me/);
  const names = readdirSync(directory);
  assert.equal(run('http').status, 0);
  assert.deepEqual(readdirSync(directory), names);
  assert.equal(run('https').status, 0);
  assert.equal(read().HOSTNAME, '127.0.0.1');
  assert.equal(read().DAILY_PLENTY_ALLOW_HTTP, 'false');
  assert.equal(read().DAILY_PLENTY_LOCAL_PREVIEW, 'false');
  assert.equal(run('tunnel').status, 0);
  assert.equal(read().HOSTNAME, '127.0.0.1');
  assert.equal(read().DAILY_PLENTY_ALLOW_HTTP, 'false');
  assert.equal(read().DAILY_PLENTY_LOCAL_PREVIEW, 'true');
  const before = readFileSync(path, 'utf8');
  assert.notEqual(run('invalid').status, 0);
  assert.equal(readFileSync(path, 'utf8'), before);
});

/** [INPUT]: 临时 SQLite WAL 数据、部署备份工具与发布脚本。[OUTPUT]: 在线备份、缺失源库和编译环境回归。
 * [POS]: 部署自检，只使用临时目录，不连接 ECS、不读取用户账本。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  statSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const Database = createRequire(import.meta.url)('better-sqlite3');
const script = fileURLToPath(new URL('./backup.mjs', import.meta.url));

test('backup includes committed WAL, preserves source, and creates unique private verified files', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'daily-plenty-deploy-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const source = join(directory, 'source.db'),
    backups = join(directory, 'backups');
  const db = new Database(source);
  t.after(() => db.close());
  db.pragma('journal_mode = WAL');
  db.pragma('wal_autocheckpoint = 0');
  db.exec(
    'CREATE TABLE samples (amount INTEGER NOT NULL) STRICT; INSERT INTO samples VALUES (12345);',
  );
  assert.ok(existsSync(`${source}-wal`));
  const run = () =>
    spawnSync(process.execPath, [script], {
      env: { ...process.env, DATABASE_PATH: source, BACKUP_DIRECTORY: backups },
      encoding: 'utf8',
    });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const target = first.stdout.trim();
  const restored = new Database(target, { readonly: true });
  try {
    assert.equal(restored.prepare('SELECT amount FROM samples').get().amount, 12345);
    assert.equal(restored.pragma('quick_check', { simple: true }), 'ok');
    assert.equal(
      restored.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='_migrations'").get().n,
      0,
      'backup must not run application migrations',
    );
  } finally {
    restored.close();
  }
  assert.equal(statSync(target).mode & 0o777, 0o600);
  db.exec('INSERT INTO samples VALUES (99)');
  const second = run();
  assert.equal(second.status, 0, second.stderr);
  assert.notEqual(second.stdout.trim(), target);
  assert.equal(db.prepare('SELECT count(*) AS n FROM samples').get().n, 2);
  assert.equal(readdirSync(backups).length, 2);
  assert.ok(readdirSync(backups).every((file) => file.endsWith('.db')));
});

test('missing source is rejected without silently creating an empty database', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'daily-plenty-deploy-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const source = join(directory, 'missing.db');
  const result = spawnSync(process.execPath, [script], {
    env: { ...process.env, DATABASE_PATH: source, BACKUP_DIRECTORY: join(directory, 'backups') },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /数据库尚不存在/);
  assert.equal(existsSync(source), false);
});

test('native build passes local Node headers and explicit Python through the service-user environment', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'daily-plenty-toolchain-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const headers = join(directory, 'node/include/node');
  const python = join(directory, 'python3.11');
  const config = join(directory, 'app.env');
  mkdirSync(headers, { recursive: true });
  mkdirSync(join(directory, 'pnpm/bin'), { recursive: true });
  for (const name of ['node.h', 'common.gypi', 'config.gypi']) {
    writeFileSync(join(headers, name), 'fixture');
  }
  writeFileSync(config, '');
  writeFileSync(python, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  writeFileSync(
    join(directory, 'pnpm/bin/pnpm'),
    '#!/bin/sh\nprintf "%s\\n" "$npm_config_nodedir" "$NODE_GYP_FORCE_PYTHON" "$npm_config_build_from_source" "$@"\n',
    { mode: 0o755 },
  );
  const source = readFileSync(new URL('./release.sh', import.meta.url), 'utf8');
  // 运行真实预检和构建包装器，隔离 root 检查、系统目录写入与服务切换。
  const preflight = source.slice(source.indexOf('TOOLS='), source.indexOf('exec 9>'));
  const build = source.match(/build_as_app\(\) \{[\s\S]*?\n\}/)[0];
  const harness = [
    'set -euo pipefail',
    'runuser() { [[ $1 == -u && $2 == daily-plenty && $3 == -- ]] || return 91; shift 3; "$@"; }',
    preflight,
    build,
    'build_as_app pnpm install --frozen-lockfile',
  ]
    .join('\n')
    .replaceAll('/opt/daily-plenty-tools', directory)
    .replaceAll('/etc/daily-plenty/app.env', config)
    .replaceAll('/usr/bin/python3.11', python);
  const run = () => spawnSync('/bin/bash', ['-c', harness], { encoding: 'utf8' });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [
    join(directory, 'node'),
    python,
    'true',
    'install',
    '--frozen-lockfile',
  ]);
  rmSync(join(headers, 'config.gypi'));
  const missingHeaders = run();
  assert.notEqual(missingHeaders.status, 0);
  assert.match(missingHeaders.stdout, /本地编译头文件缺失/);
  writeFileSync(join(headers, 'config.gypi'), 'fixture');
  rmSync(python);
  const missingPython = run();
  assert.notEqual(missingPython.status, 0);
  assert.match(missingPython.stdout, /缺少 Python 3.11/);
});

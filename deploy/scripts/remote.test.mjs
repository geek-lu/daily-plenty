/**
 * [INPUT]: 真实 Makefile/remote.sh、临时目录与模拟 SSH/scp/系统命令。
 * [OUTPUT]: 部署顺序、参数引用、打包排除和失败中止回归。
 * [POS]: 本机执行真实打包/解压，不连接服务器，不执行 bootstrap/release 的系统操作。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../../', import.meta.url));
const shim = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const log = value => fs.appendFileSync(process.env.REMOTE_TEST_LOG, JSON.stringify(value) + '\\n');
log({ command, args, registry: process.env.DAILY_PLENTY_NPM_REGISTRY, accessMode: process.env.DAILY_PLENTY_ACCESS_MODE });
const run = (cmd, argv) => {
  const result = spawnSync(cmd, argv, { stdio: 'inherit' });
  process.exit(result.status === null ? 1 : result.status);
};
if (command === 'ssh') {
  if (args.includes('-O') || args.includes('-N')) process.exit(0);
  const script = args.at(-1);
  if (script.startsWith('mktemp ')) {
    const directory = fs.mkdtempSync('/tmp/daily-plenty-upload.');
    log({ command: 'remote-temp', directory });
    console.log(directory);
    process.exit(0);
  }
  run('/bin/bash', ['-c', script]);
}
if (command === 'scp') {
  if (process.env.REMOTE_TEST_SCP_FAIL === '1') process.exit(7);
  const source = args.at(-2);
  const destination = args.at(-1).split(':').slice(1).join(':');
  fs.copyFileSync(source, destination);
  fs.copyFileSync(source, process.env.REMOTE_TEST_PACKAGE);
  process.exit(0);
}
if (command === 'sudo') run(args[0], args.slice(1));
if (command === 'bash') {
  if (/deploy\\/scripts\\/(bootstrap|release)\\.sh$/.test(args[0])) {
    if (args[0].endsWith('bootstrap.sh') && process.env.REMOTE_TEST_BOOTSTRAP_FAIL === '1') process.exit(8);
    if (args[0].endsWith('release.sh') && process.env.REMOTE_TEST_RELEASE_FAIL === '1') process.exit(9);
    process.exit(0);
  }
  run('/bin/bash', args);
}
if (command === 'systemctl' || command === 'journalctl') process.exit(0);
process.exit(2);
`;

function fixture(t, extra = {}) {
  const directory = mkdtempSync('/tmp/daily-plenty-make-test.');
  const bin = join(directory, 'bin');
  const log = join(directory, 'commands.jsonl');
  const archive = join(directory, 'uploaded.tar.gz');
  const key = join(directory, "key with ' spaces.pem");
  mkdirSync(bin);
  writeFileSync(log, '');
  writeFileSync(key, 'fixture only');
  for (const name of ['ssh', 'scp', 'bash', 'sudo', 'systemctl', 'journalctl']) {
    writeFileSync(join(bin, name), shim, { mode: 0o755 });
  }
  const records = () =>
    readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  t.after(() => {
    for (const record of records().filter((item) => item.command === 'remote-temp')) {
      rmSync(record.directory, { recursive: true, force: true });
    }
    rmSync(directory, { recursive: true, force: true });
  });
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    REMOTE_TEST_LOG: log,
    REMOTE_TEST_PACKAGE: archive,
    SSH_HOST: 'fixture.invalid',
    SSH_USER: 'root',
    SSH_PORT: '22',
    SSH_KEY: '',
    LOCAL_PORT: '13000',
    WITH_SWAP: '1',
    NPM_REGISTRY: 'https://registry.npmjs.org',
    ACCESS_MODE: 'http',
    ...extra,
  };
  const run = (...args) => spawnSync('make', args, { cwd: project, env, encoding: 'utf8' });
  return { run, records, key, archive };
}

function steps(records) {
  return records.filter(
    (item) =>
      item.command === 'bash' && /deploy\/scripts\/(bootstrap|release)\.sh$/.test(item.args[0]),
  );
}

test('plain make is help only; deployment transports quoted options and includes PWA without local data', (t) => {
  const state = fixture(t);
  const help = state.run();
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /make deploy/);
  assert.deepEqual(state.records(), []);
  const registry = "https://registry.example/pkg?note=it's-a-test&mode=fast";
  const result = state.run(
    'deploy',
    'SSH_USER=ecs-user',
    'SSH_PORT=2222',
    `SSH_KEY=${state.key}`,
    `NPM_REGISTRY=${registry}`,
  );
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const calls = state.records();
  const actions = steps(calls);
  assert.deepEqual(
    actions.map((item) => item.args[0]),
    ['deploy/scripts/bootstrap.sh', 'deploy/scripts/release.sh'],
    JSON.stringify(calls, null, 2),
  );
  assert.ok(actions[0].args.includes('--with-swap'));
  assert.ok(actions.every((item) => item.registry === registry));
  assert.ok(actions.every((item) => item.accessMode === 'http'));
  assert.match(result.stdout, /http:\/\/fixture.invalid:3000\/setup/);
  const upload = calls.find((item) => item.command === 'scp');
  assert.equal(upload.args[upload.args.indexOf('-P') + 1], '2222');
  assert.equal(upload.args[upload.args.indexOf('-i') + 1], state.key);
  assert.ok(calls.some((item) => item.command === 'sudo'));
  const remote = calls.find((item) => item.command === 'remote-temp').directory;
  assert.equal(existsSync(remote), false, 'successful upload directory is cleaned');
  const listing = spawnSync('tar', ['-tzf', state.archive], { encoding: 'utf8' });
  assert.equal(listing.status, 0, listing.stderr);
  assert.match(listing.stdout, /\.\/public\/sw\.js/);
  assert.match(listing.stdout, /\.\/Makefile/);
  assert.doesNotMatch(
    listing.stdout,
    /^\.\/(?:\.env[^/]*|node_modules|data|backups|\.next(?:-build)?)(?:\/|$)/m,
  );
});

test('updates skip bootstrap; first deployment can opt out of swap', (t) => {
  const update = fixture(t);
  const result = update.run('update');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.deepEqual(
    steps(update.records()).map((item) => item.args[0]),
    ['deploy/scripts/release.sh'],
  );
  const install = fixture(t);
  assert.equal(install.run('deploy', 'WITH_SWAP=0', 'ACCESS_MODE=tunnel').status, 0);
  assert.deepEqual(steps(install.records())[0].args, ['deploy/scripts/bootstrap.sh']);
  assert.ok(steps(install.records()).every((item) => item.accessMode === 'tunnel'));
});

test('upload/bootstrap failures stop deployment; release failure keeps source and reports failure', (t) => {
  const upload = fixture(t, { REMOTE_TEST_SCP_FAIL: '1' });
  assert.notEqual(upload.run('deploy').status, 0);
  assert.deepEqual(steps(upload.records()), []);
  const bootstrap = fixture(t, { REMOTE_TEST_BOOTSTRAP_FAIL: '1' });
  assert.notEqual(bootstrap.run('deploy').status, 0);
  assert.deepEqual(
    steps(bootstrap.records()).map((item) => item.args[0]),
    ['deploy/scripts/bootstrap.sh'],
  );
  const release = fixture(t, { REMOTE_TEST_RELEASE_FAIL: '1' });
  const result = release.run('update');
  assert.notEqual(result.status, 0, JSON.stringify({ result, calls: release.records() }, null, 2));
  assert.match(result.stderr, /部署未完成/);
  assert.equal(
    existsSync(release.records().find((item) => item.command === 'remote-temp').directory),
    true,
  );
  assert.equal(
    release.records().some((item) => item.command === 'systemctl'),
    false,
  );
});

test('tunnel is loopback-only with fail-fast forwarding; invalid ports never connect', (t) => {
  const state = fixture(t);
  const tunnel = state.run('tunnel', 'LOCAL_PORT=14000');
  assert.equal(tunnel.status, 0, tunnel.stderr);
  const ssh = state.records().find((item) => item.command === 'ssh');
  assert.ok(ssh.args.includes('-N'));
  assert.ok(ssh.args.includes('ExitOnForwardFailure=yes'));
  assert.equal(ssh.args[ssh.args.indexOf('-L') + 1], '127.0.0.1:14000:127.0.0.1:3000');
  const bad = fixture(t);
  assert.notEqual(bad.run('deploy', 'SSH_PORT=0').status, 0);
  assert.notEqual(bad.run('deploy', 'ACCESS_MODE=invalid').status, 0);
  assert.equal(
    bad.records().some((item) => item.command === 'ssh'),
    false,
  );
});

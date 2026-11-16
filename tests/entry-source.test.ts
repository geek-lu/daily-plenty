/**
 * [INPUT]: 真实账单服务、共享密钥、临时 SQLite 与增量迁移。
 * [OUTPUT]: 来源由渠道确定、不可伪造、人工可修正 AI 账单、历史数据统一人工及幂等迁移回归。
 * [POS]: 数据来源的服务/持久化边界测试，不访问用户数据库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { createStore, migrate } from '@/server/db/client';
import * as users from '@/server/user/service';
import * as ledger from '@/server/ledger/service';
import * as entries from '@/server/ledger/entries';
import { createApiEntry } from '@/server/ledger/api-entries';
import { createKey, keyIdentity } from '@/server/auth/api-keys';
import { entryForm, entryInput, nextForm } from '@/features/common/editor/form';

test('server assigns source, editors can correct AI entries and original provenance stays immutable', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const user = users.create(store, {
    loginName: 'owner',
    displayName: '我',
    passwordHash: 'fixture',
  });
  const ledgerId = ledger.createHome(store, user.id, '账本');
  const home = ledger.query(store, user.id, ledgerId, { month: '2026-11' });
  const input = {
    kind: 'expense',
    amountMinor: 2800,
    categoryId: home.categories.find((c) => c.kind === 'expense')!.id,
    paidByMemberId: home.members[0].id,
    note: '午饭',
    occurredOn: '2026-11-16',
    requestId: randomUUID(),
  };
  const manual = entries.createEntry(store, user.id, ledgerId, input);
  assert.equal(manual.source, 'manual');
  assert.throws(() => entries.createEntry(store, user.id, ledgerId, { ...input, source: 'ai' }));
  const credential = createKey(store, user.id, { name: 'Agent', ledgerId });
  const key = keyIdentity(store, credential.token)!;
  const aiInput = { ...input, requestId: randomUUID(), recordedByMemberId: home.members[0].id };
  assert.throws(() => createApiEntry(store, key, ledgerId, { ...aiInput, source: 'manual' }));
  const ai = createApiEntry(store, key, ledgerId, aiInput);
  assert.equal(ai.source, 'ai');
  assert.equal(createApiEntry(store, key, ledgerId, aiInput).source, 'ai');
  const form = entryForm(ai);
  assert.equal(form.source, 'ai');
  assert.equal('source' in entryInput(form), false);
  assert.equal(nextForm(form).source, undefined);
  const correction = { ...input, amountMinor: 2500, version: ai.version, requestId: randomUUID() };
  assert.throws(() =>
    entries.editEntry(store, user.id, ledgerId, ai.id, { ...correction, source: 'manual' }),
  );
  const edited = entries.editEntry(store, user.id, ledgerId, ai.id, correction);
  assert.equal(edited.amountMinor, 2500);
  assert.equal(edited.source, 'ai');
  assert.equal(edited.version, 2);
  assert.equal(edited.updatedBy, user.id);
  assert.equal(entries.editEntry(store, user.id, ledgerId, ai.id, correction).source, 'ai');
  const deleted = entries.deleteOrRestore(store, user.id, ledgerId, ai.id, {
    deleted: true,
    reason: 'duplicate',
    version: 2,
    requestId: randomUUID(),
  });
  const restored = entries.deleteOrRestore(store, user.id, ledgerId, ai.id, {
    deleted: false,
    version: deleted.version,
    requestId: randomUUID(),
  });
  assert.equal(restored.source, 'ai');
  const csv = ledger.exportCsv(store, user.id, ledgerId, { month: '2026-11' });
  assert.match(csv, /数据来源/);
  assert.match(csv, /AI 记录/);
  assert.match(csv, /人工记录/);
});

test('0010 treats every existing entry as manual and upgrades both retry caches without changing financial data', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'daily-plenty-source-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const name of readdirSync('migrations').filter((name) => /^000[1-9]_.*\.sql$/.test(name))) {
    copyFileSync(join('migrations', name), join(directory, name));
  }
  const file = join(directory, 'test.db');
  const old = new Database(file);
  old.pragma('foreign_keys = ON');
  migrate(old, directory);
  const [user, ledgerId, member, category, entry, key] = Array.from({ length: 6 }, () =>
    randomUUID(),
  );
  old
    .prepare('INSERT INTO users(id,login_name,display_name,password_hash) VALUES (?, ?, ?, ?)')
    .run(user, 'owner', '我', 'fixture');
  old
    .prepare('INSERT INTO ledgers(id,name,owner_user_id) VALUES (?, ?, ?)')
    .run(ledgerId, '旧账本', user);
  old
    .prepare("INSERT INTO memberships(id,ledger_id,user_id,role) VALUES (?, ?, ?, 'editor')")
    .run(member, ledgerId, user);
  old
    .prepare("INSERT INTO categories(id,ledger_id,kind,name) VALUES (?, ?, 'expense', '餐饮')")
    .run(category, ledgerId);
  old
    .prepare(
      `INSERT INTO entries(id,ledger_id,kind,amount_minor,category_id,paid_by_member_id,note,occurred_on,created_by,updated_by)
    VALUES (?, ?, 'expense', 2800, ?, ?, '旧账单', '2026-11-16', ?, ?)`,
    )
    .run(entry, ledgerId, category, member, user, user);
  old
    .prepare(
      'INSERT INTO api_keys(id,ledger_id,created_by,name,token_hash,prefix,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(key, ledgerId, user, '旧助手', 'fixture-hash', 'dp_fixture', 1);
  const response = { id: entry, amountMinor: 2800, note: '旧账单' };
  old
    .prepare(
      `INSERT INTO mutation_requests(ledger_id,actor_id,request_id,operation,payload_hash,result_entry_id,response_json)
    VALUES (?, ?, ?, 'create', 'hash', ?, ?)`,
    )
    .run(ledgerId, user, randomUUID(), entry, JSON.stringify(response));
  old
    .prepare(
      `INSERT INTO ledger_api_requests(ledger_id,request_id,api_key_id,payload_hash,result_entry_id,response_json)
    VALUES (?, ?, ?, 'hash', ?, ?)`,
    )
    .run(ledgerId, randomUUID(), key, entry, JSON.stringify(response));
  const before = old.prepare('SELECT * FROM entries').get() as Record<string, unknown>;
  old.close();
  const upgraded = createStore(file);
  assert.deepEqual(upgraded.sqlite.prepare('SELECT * FROM entries').get(), {
    ...before,
    source: 'manual',
  });
  for (const table of ['mutation_requests', 'ledger_api_requests']) {
    const row = upgraded.sqlite.prepare(`SELECT response_json FROM ${table}`).get() as {
      response_json: string;
    };
    assert.deepEqual(JSON.parse(row.response_json), { ...response, source: 'manual' });
  }
  assert.throws(() => upgraded.sqlite.prepare("UPDATE entries SET source = 'unknown'").run());
  assert.deepEqual(upgraded.sqlite.pragma('foreign_key_check'), []);
  upgraded.sqlite.close();
  const reopened = createStore(file);
  t.after(() => reopened.sqlite.close());
  assert.deepEqual(reopened.sqlite.prepare('SELECT * FROM entries').get(), {
    ...before,
    source: 'manual',
  });
});

/**
 * [INPUT]: 真实 HTTP router、内存/临时 SQLite、共享密钥与账本服务。
 * [OUTPUT]: 账本共享管理、候选录入人、显式归属、跨账本隔离、幂等与升级回归。
 * [POS]: API 密钥完整边界测试，不访问用户数据库或真实网络。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { NextRequest } from 'next/server';
import { createStore, migrate, type Store } from '@/server/db/client';
import { createSession, digest } from '@/server/auth/service';
import { createKey, keyIdentity, listKeys, revokeKey } from '@/server/auth/api-keys';
import * as users from '@/server/user/service';
import * as ledger from '@/server/ledger/service';
import { createApiEntry, editApiEntry } from '@/server/ledger/api-entries';
import { dispatch } from '@/server/http/router';
import { createEntry, editEntry, deleteOrRestore } from '@/server/ledger/entries';

function fixture(t: TestContext) {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const user = (name: string) =>
    users.create(store, { loginName: name, displayName: name, passwordHash: '$fixture$' });
  const owner = user('owner');
  const partner = user('partner');
  const stranger = user('stranger');
  const ledgerId = ledger.createHome(store, owner.id, '共享账本');
  const otherLedger = ledger.createHome(store, owner.id, '另外一本账');
  const partnerMemberId = randomUUID();
  store.sqlite
    .prepare('INSERT INTO memberships(id, ledger_id, user_id, role) VALUES (?, ?, ?, ?)')
    .run(partnerMemberId, ledgerId, partner.id, 'editor');
  const home = ledger.query(store, owner.id, ledgerId, { month: '2026-11' });
  const ownerMemberId = home.members.find((member) => member.userId === owner.id)!.id;
  const input = {
    kind: 'expense',
    amountMinor: 2800,
    categoryId: home.categories.find((category) => category.name === '餐饮')!.id,
    paidByMemberId: ownerMemberId,
    recordedByMemberId: partnerMemberId,
    note: '午饭·牛肉汤',
    occurredOn: '2026-11-16',
    requestId: randomUUID(),
  };
  return {
    store,
    owner,
    partner,
    stranger,
    ledgerId,
    otherLedger,
    partnerMemberId,
    ownerMemberId,
    input,
  };
}

test('shared keys store hashes, can be managed by either editor and do not inherit creator identity', (t) => {
  const f = fixture(t);
  const { store, owner, partner, stranger, ledgerId } = f;
  assert.throws(() => createKey(store, owner.id, { name: ' ' }));
  assert.throws(() => createKey(store, owner.id, { name: 'Missing ledger' }));
  assert.throws(() =>
    createKey(store, owner.id, { name: 'Forged', ledgerId, createdBy: partner.id }),
  );
  assert.throws(() => createKey(store, stranger.id, { name: 'Forbidden', ledgerId }), /可记账成员/);
  const created = createKey(store, owner.id, { name: ' Work Buddy ', ledgerId });
  assert.match(created.token, /^dp_[a-f0-9]{64}$/);
  assert.equal(created.key.createdBy, owner.id);
  assert.equal(created.key.name, 'Work Buddy');
  const row = store.sqlite
    .prepare('SELECT * FROM api_keys WHERE id = ?')
    .get(created.key.id) as Record<string, unknown>;
  assert.equal(row.token_hash, digest(created.token));
  assert.equal(row.user_id, undefined);
  assert.ok(!JSON.stringify(row).includes(created.token));
  assert.deepEqual(listKeys(store, partner.id), listKeys(store, owner.id));
  assert.deepEqual(listKeys(store, stranger.id), []);
  assert.throws(() => revokeKey(store, stranger.id, created.key.id), /找不到/);
  assert.ok(!JSON.stringify(listKeys(store, partner.id)).includes('token'));
  const identity = { keyId: created.key.id, ledgerId };
  assert.deepEqual(keyIdentity(store, created.token), identity);
  assert.ok(listKeys(store, partner.id)[0].lastUsedAt);
  for (const token of ['invalid', `dp_${'0'.repeat(64)}`, `${created.token.slice(0, -1)}z`]) {
    assert.equal(keyIdentity(store, token), null);
  }
  store.sqlite
    .prepare('UPDATE memberships SET left_at = ? WHERE user_id = ?')
    .run('2026-11-16', owner.id);
  store.sqlite.prepare('UPDATE users SET disabled_at = ? WHERE id = ?').run('2026-11-16', owner.id);
  assert.deepEqual(
    keyIdentity(store, created.token),
    identity,
    'creator departure/disable must not break a ledger credential',
  );
  assert.deepEqual(listKeys(store, owner.id), []);
  assert.throws(() => createKey(store, owner.id, { name: 'Departed', ledgerId }), /可记账成员/);
  const another = createKey(store, partner.id, { name: 'Another', ledgerId });
  revokeKey(store, partner.id, created.key.id);
  revokeKey(store, partner.id, created.key.id);
  assert.equal(keyIdentity(store, created.token), null);
  assert.ok(keyIdentity(store, another.token));
  store.sqlite
    .prepare('UPDATE ledgers SET archived_at = ? WHERE id = ?')
    .run('2026-11-16', ledgerId);
  assert.equal(keyIdentity(store, another.token), null);
  assert.throws(() => createKey(store, partner.id, { name: 'Archived', ledgerId }), /可记账成员/);
  revokeKey(store, partner.id, another.key.id);
});

test('recorders are active editors only and ledger idempotency includes the selected recorder', (t) => {
  const f = fixture(t);
  const { store, owner, partner, ledgerId, otherLedger, input } = f;
  const created = createKey(store, owner.id, { name: 'Agent', ledgerId });
  const key = keyIdentity(store, created.token)!;
  const recorders = ledger.listRecorders(store, key, ledgerId);
  assert.deepEqual(
    new Set(recorders.map((member) => member.userId)),
    new Set([owner.id, partner.id]),
  );
  assert.deepEqual(Object.keys(recorders[0]).sort(), ['displayName', 'memberId', 'userId']);
  assert.throws(() => ledger.listRecorders(store, key, otherLedger), /绑定的账本/);
  assert.throws(() =>
    createApiEntry(store, key, ledgerId, { ...input, recordedByMemberId: undefined }),
  );
  const foreignMember = ledger.listRecorders(store, owner.id, otherLedger)[0].memberId;
  for (const recordedByMemberId of [owner.id, foreignMember, randomUUID()]) {
    assert.throws(
      () => createApiEntry(store, key, ledgerId, { ...input, recordedByMemberId }),
      /录入人/,
    );
  }
  assert.throws(
    () => createApiEntry(store, key, ledgerId, { ...input, paidByMemberId: foreignMember }),
    /付款人/,
  );
  const entry = createApiEntry(store, key, ledgerId, input);
  assert.equal(entry.createdBy, partner.id);
  assert.equal(entry.source, 'ai');
  assert.equal(entry.updatedBy, partner.id);
  assert.equal(entry.paidByMemberId, f.ownerMemberId);
  assert.equal(createApiEntry(store, key, ledgerId, input).id, entry.id);
  const another = createKey(store, partner.id, { name: 'Another agent', ledgerId });
  const anotherKey = keyIdentity(store, another.token)!;
  assert.equal(createApiEntry(store, anotherKey, ledgerId, input).id, entry.id);
  assert.throws(
    () => createApiEntry(store, key, ledgerId, { ...input, recordedByMemberId: f.ownerMemberId }),
    /请求标识/,
  );
  assert.throws(
    () => createApiEntry(store, key, ledgerId, { ...input, amountMinor: 3000 }),
    /请求标识/,
  );
  assert.equal(ledger.query(store, owner.id, ledgerId, { month: '2026-11' }).summary.expense, 2800);
  const audit = store.sqlite.prepare('SELECT api_key_id FROM ledger_api_requests').get() as {
    api_key_id: string;
  };
  assert.equal(audit.api_key_id, created.key.id);
  for (const statement of [
    "UPDATE memberships SET role = 'viewer' WHERE user_id = ?",
    "UPDATE memberships SET role = 'editor', left_at = '2026-11-16' WHERE user_id = ?",
  ]) {
    store.sqlite.prepare(statement).run(partner.id);
    assert.equal(
      ledger.listRecorders(store, key, ledgerId).some((member) => member.userId === partner.id),
      false,
    );
    assert.throws(
      () => createApiEntry(store, key, ledgerId, { ...input, requestId: randomUUID() }),
      /录入人/,
    );
  }
  store.sqlite.prepare('UPDATE memberships SET left_at = NULL WHERE user_id = ?').run(partner.id);
  store.sqlite.prepare("UPDATE users SET disabled_at = '2026-11-16' WHERE id = ?").run(partner.id);
  assert.equal(
    ledger.listRecorders(store, key, ledgerId).some((member) => member.userId === partner.id),
    false,
  );
  assert.throws(
    () => createApiEntry(store, key, ledgerId, { ...input, requestId: randomUUID() }),
    /录入人/,
  );
  revokeKey(store, owner.id, created.key.id);
  assert.throws(() => createApiEntry(store, key, ledgerId, input), /已撤销/);
});

test('HTTP exposes recorder candidates, shares management and isolates ledger credentials from accounts', async (t) => {
  const f = fixture(t);
  const { store, owner, partner, stranger, ledgerId, otherLedger, input } = f;
  const state = globalThis as typeof globalThis & { dailyPlenty?: Store };
  const previous = state.dailyPlenty;
  state.dailyPlenty = store;
  t.after(() => {
    state.dailyPlenty = previous;
  });
  const cookie = { cookie: `daily_plenty_session=${createSession(store, owner.id)}` };
  const partnerCookie = { cookie: `daily_plenty_session=${createSession(store, partner.id)}` };
  const strangerCookie = { cookie: `daily_plenty_session=${createSession(store, stranger.id)}` };
  async function request(
    method: string,
    path: string,
    headers: Record<string, string> = {},
    payload?: unknown,
  ) {
    const req = new NextRequest(`http://localhost/api/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    return dispatch(req, { params: Promise.resolve({ path: path.split('?')[0].split('/') }) });
  }
  const base = `ledgers/${ledgerId}`;
  assert.equal((await request('GET', `${base}/recorders`)).status, 401);
  assert.equal((await request('GET', `${base}/recorders`, strangerCookie)).status, 403);
  assert.equal((await request('POST', 'auth/api-keys', cookie, { name: 'No ledger' })).status, 400);
  const response = await request('POST', 'auth/api-keys', cookie, { name: 'Work Buddy', ledgerId });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  const created = await response.json();
  const bearer = { authorization: `Bearer ${created.token}` };
  const list = await (await request('GET', 'auth/api-keys', partnerCookie)).json();
  assert.deepEqual(list.keys, [created.key]);
  assert.ok(!JSON.stringify(list).includes(created.token));
  assert.deepEqual(await (await request('GET', 'auth/api-keys', strangerCookie)).json(), {
    keys: [],
  });
  assert.equal(
    (await request('DELETE', `auth/api-keys/${created.key.id}`, strangerCookie)).status,
    404,
  );
  const scoped = await (await request('GET', 'ledgers', bearer)).json();
  assert.deepEqual(
    scoped.ledgers.map((item: { id: string }) => item.id),
    [ledgerId],
  );
  const candidates = await (await request('GET', `${base}/recorders`, bearer)).json();
  assert.equal(candidates.recorders.length, 2);
  assert.deepEqual(candidates, await (await request('GET', `${base}/recorders`, cookie)).json());
  const selected = candidates.recorders.find(
    (member: { displayName: string }) => member.displayName === 'partner',
  );
  assert.equal(selected.memberId, input.recordedByMemberId);
  store.sqlite
    .prepare(
      `INSERT INTO entry_templates(id,ledger_id,user_id,name,kind,amount_minor,category_id,paid_by_member_id)
    VALUES (?, ?, ?, 'Private', 'expense', 100, ?, ?)`,
    )
    .run(randomUUID(), ledgerId, owner.id, input.categoryId, f.ownerMemberId);
  const sharedData = await (await request('GET', `${base}/data?month=2026-11`, bearer)).json();
  assert.deepEqual(sharedData.templates, [], 'shared credentials cannot read personal templates');
  assert.equal(
    (await (await request('GET', `${base}/data?month=2026-11`, cookie)).json()).templates.length,
    1,
  );
  assert.equal(
    (await request('POST', `${base}/entries`, bearer, { ...input, recordedByMemberId: undefined }))
      .status,
    400,
  );
  const written = await request('POST', `${base}/entries`, bearer, {
    ...input,
    recordedByMemberId: selected.memberId,
  });
  assert.equal(written.status, 201);
  const entry = await written.json();
  assert.equal(entry.createdBy, partner.id);
  assert.equal(entry.source, 'ai');
  assert.equal(entry.payerName, 'owner');
  assert.equal(
    (await (await request('POST', `${base}/entries`, bearer, input)).json()).id,
    entry.id,
  );
  assert.equal(
    (await request('POST', `${base}/entries`, cookie, input)).status,
    400,
    'web users cannot spoof a recorder',
  );
  const { recordedByMemberId: _recordedByMemberId, ...webInput } = input;
  assert.equal(
    (await request('POST', `${base}/entries`, cookie, { ...webInput, requestId: randomUUID() }))
      .status,
    201,
  );
  const corrected = await request('PATCH', `${base}/entries/${entry.id}`, cookie, {
    ...webInput,
    amountMinor: 2500,
    version: entry.version,
    requestId: randomUUID(),
  });
  assert.equal(corrected.status, 200);
  assert.equal((await corrected.json()).source, 'ai');
  const patch = {
    ...webInput,
    amountMinor: 3000,
    version: 2,
    updatedByMemberId: f.ownerMemberId,
    requestId: randomUUID(),
  };
  const apiUpdated = await request('PATCH', `${base}/entries/${entry.id}`, bearer, patch);
  assert.equal(apiUpdated.status, 200);
  const updated = await apiUpdated.json();
  assert.equal(updated.id, entry.id);
  assert.equal(updated.version, 3);
  assert.equal(updated.createdBy, partner.id);
  assert.equal(updated.updatedBy, owner.id);
  assert.equal(updated.source, 'ai');
  assert.deepEqual(
    await (await request('GET', `${base}/entries/${entry.id}`, bearer)).json(),
    updated,
  );
  assert.deepEqual(
    await (await request('PATCH', `${base}/entries/${entry.id}`, bearer, patch)).json(),
    updated,
  );
  assert.equal(
    (
      await request('PATCH', `${base}/entries/${entry.id}`, bearer, {
        ...patch,
        requestId: randomUUID(),
      })
    ).status,
    409,
  );
  assert.equal((await request('PATCH', `${base}/entries/${entry.id}`, bearer, {})).status, 400);
  const manual = createEntry(store, owner.id, ledgerId, { ...webInput, requestId: randomUUID() });
  const deniedManual = await request(
    'PATCH',
    `${base}/entries/${manual.id}`,
    { ...cookie, ...bearer },
    {
      ...patch,
      version: manual.version,
      requestId: randomUUID(),
    },
  );
  assert.equal(deniedManual.status, 403);
  assert.equal((await deniedManual.json()).code, 'AI_ENTRY_REQUIRED');
  assert.equal((await request('GET', `${base}/entries/${manual.id}`, bearer)).status, 200);
  assert.equal((await request('GET', `${base}/entries/${randomUUID()}`, bearer)).status, 404);
  assert.equal(
    (await request('GET', `ledgers/${otherLedger}/entries/${entry.id}`, bearer)).status,
    403,
  );
  assert.equal(
    (await request('PATCH', `ledgers/${otherLedger}/entries/${entry.id}`, bearer, patch)).status,
    403,
  );
  for (const suffix of ['entries', 'recorders', 'data?month=2026-11', 'reports?granularity=year']) {
    assert.equal((await request('GET', `${base}/${suffix}`, bearer)).status, 200);
    const denied = await request('GET', `ledgers/${otherLedger}/${suffix}`, bearer);
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).code, 'LEDGER_SCOPE_MISMATCH');
  }
  assert.equal(
    (await request('POST', `ledgers/${otherLedger}/entries`, bearer, input)).status,
    403,
  );
  for (const [method, path, body] of [
    ['GET', 'users/me', undefined],
    ['PATCH', 'users/me', {}],
    ['DELETE', 'auth/session', undefined],
    ['GET', 'auth/api-keys', undefined],
    ['POST', 'auth/api-keys', { name: 'Escalation', ledgerId }],
    ['DELETE', `auth/api-keys/${created.key.id}`, undefined],
    ['POST', 'invites/accept', {}],
    ['POST', 'ledgers', { name: 'new' }],
    ['GET', `${base}/templates`, undefined],
    ['POST', `${base}/invites`, undefined],
    ['DELETE', `${base}/entries/${entry.id}`, {}],
  ] as const) {
    assert.equal((await request(method, path, { ...cookie, ...bearer }, body)).status, 403, path);
  }
  assert.equal(
    (await request('GET', 'ledgers', { ...cookie, authorization: 'Bearer invalid' })).status,
    401,
  );
  store.sqlite.prepare("UPDATE memberships SET role = 'viewer' WHERE user_id = ?").run(partner.id);
  assert.equal(
    (await request('POST', 'auth/api-keys', partnerCookie, { name: 'Viewer', ledgerId })).status,
    403,
  );
  assert.equal(
    (await request('DELETE', `auth/api-keys/${created.key.id}`, partnerCookie)).status,
    404,
  );
  assert.deepEqual((await (await request('GET', 'auth/api-keys', partnerCookie)).json()).keys, []);
  assert.equal((await request('GET', `${base}/recorders`, bearer)).status, 200);
  assert.equal(
    (await request('POST', `${base}/entries`, bearer, { ...input, requestId: randomUUID() }))
      .status,
    400,
  );
  store.sqlite.prepare("UPDATE memberships SET role = 'editor' WHERE user_id = ?").run(partner.id);
  assert.equal(
    (await request('DELETE', `auth/api-keys/${created.key.id}`, partnerCookie)).status,
    200,
  );
  assert.equal((await request('GET', 'ledgers', { ...cookie, ...bearer })).status, 401);
  assert.equal((await request('GET', 'users/me', cookie)).status, 200);
});

test('0009 preserves data, revokes legacy personal credentials and shared keys survive reopening', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'daily-plenty-ledger-keys-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const name of readdirSync('migrations').filter((name) => /^000[1-8]_.*\.sql$/.test(name))) {
    copyFileSync(join('migrations', name), join(directory, name));
  }
  const file = join(directory, 'test.db');
  const old = new Database(file);
  old.pragma('foreign_keys = ON');
  migrate(old, directory);
  const userId = randomUUID();
  const ledgerId = randomUUID();
  const legacyId = randomUUID();
  const legacyToken = `dp_${'a'.repeat(64)}`;
  old
    .prepare('INSERT INTO users(id,login_name,display_name,password_hash) VALUES (?, ?, ?, ?)')
    .run(userId, 'owner', '原有用户', '$fixture$');
  old
    .prepare('INSERT INTO ledgers(id,name,owner_user_id) VALUES (?, ?, ?)')
    .run(ledgerId, '旧账本', userId);
  old
    .prepare("INSERT INTO memberships(id,ledger_id,user_id,role) VALUES (?, ?, ?, 'editor')")
    .run(randomUUID(), ledgerId, userId);
  old
    .prepare(
      'INSERT INTO api_keys(id,user_id,ledger_id,name,token_hash,prefix,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      legacyId,
      userId,
      ledgerId,
      '旧个人密钥',
      digest(legacyToken),
      legacyToken.slice(0, 11),
      1,
    );
  const before = old.prepare('SELECT * FROM users').all();
  old.close();
  const upgraded = createStore(file);
  assert.deepEqual(upgraded.sqlite.prepare('SELECT * FROM users').all(), before);
  assert.equal(keyIdentity(upgraded, legacyToken), null);
  const legacy = listKeys(upgraded, userId)[0];
  assert.equal(legacy.id, legacyId);
  assert.ok(legacy.revokedAt);
  assert.equal(legacy.createdBy, userId);
  const created = createKey(upgraded, userId, { name: 'Shared', ledgerId });
  upgraded.sqlite.close();
  const reopened = createStore(file);
  assert.deepEqual(keyIdentity(reopened, created.token), { keyId: created.key.id, ledgerId });
  revokeKey(reopened, userId, created.key.id);
  reopened.sqlite.close();
  const final = createStore(file);
  t.after(() => final.sqlite.close());
  assert.equal(keyIdentity(final, created.token), null);
  assert.deepEqual(final.sqlite.pragma('foreign_key_check'), []);
});

test('AI edits retain identity and provenance, reject manual entries, and bind retries to action and target', (t) => {
  const f = fixture(t);
  const { store, owner, partner, ledgerId, otherLedger, input } = f;
  const created = createKey(store, owner.id, { name: 'Assistant', ledgerId });
  const key = keyIdentity(store, created.token)!;
  const original = createApiEntry(store, key, ledgerId, input);
  const { recordedByMemberId: _recorder, ...value } = input;
  const patch = {
    ...value,
    amountMinor: 3050,
    version: original.version,
    updatedByMemberId: f.ownerMemberId,
    requestId: randomUUID(),
  };
  const updated = editApiEntry(store, key, ledgerId, original.id, patch);
  assert.equal(updated.id, original.id);
  assert.equal(updated.version, 2);
  assert.equal(updated.amountMinor, 3050);
  assert.equal(updated.createdBy, partner.id);
  assert.equal(updated.updatedBy, owner.id);
  assert.equal(updated.source, 'ai');
  const rotated = createKey(store, partner.id, { name: 'Rotated', ledgerId });
  const otherKey = keyIdentity(store, rotated.token)!;
  assert.deepEqual(editApiEntry(store, otherKey, ledgerId, original.id, patch), updated);
  assert.throws(
    () => editApiEntry(store, key, ledgerId, original.id, { ...patch, requestId: input.requestId }),
    /请求标识/,
  );
  assert.throws(
    () => createApiEntry(store, key, ledgerId, { ...input, requestId: patch.requestId }),
    /请求标识/,
  );
  assert.throws(
    () => editApiEntry(store, key, ledgerId, original.id, { ...patch, amountMinor: 1 }),
    /请求标识/,
  );
  assert.throws(
    () =>
      editApiEntry(store, key, ledgerId, original.id, {
        ...patch,
        updatedByMemberId: f.partnerMemberId,
      }),
    /请求标识/,
  );
  const second = createApiEntry(store, key, ledgerId, { ...input, requestId: randomUUID() });
  assert.throws(() => editApiEntry(store, key, ledgerId, second.id, patch), /请求标识/);
  const manual = createEntry(store, owner.id, ledgerId, { ...value, requestId: randomUUID() });
  const fresh = { ...patch, requestId: randomUUID() };
  assert.throws(() => editApiEntry(store, key, ledgerId, manual.id, fresh), /只能修改 AI/);
  assert.throws(() => editApiEntry(store, key, ledgerId, original.id, { ...fresh, source: 'ai' }));
  assert.throws(() => editApiEntry(store, key, ledgerId, original.id, fresh), /对方已修改/);
  assert.throws(() => editApiEntry(store, key, otherLedger, original.id, fresh), /绑定的账本/);
  assert.throws(() => editApiEntry(store, key, ledgerId, randomUUID(), fresh), /已不存在/);
  const corrected = editEntry(store, owner.id, ledgerId, original.id, {
    ...value,
    amountMinor: 4000,
    version: updated.version,
    requestId: randomUUID(),
  });
  assert.equal(corrected.source, 'ai');
  assert.deepEqual(
    editApiEntry(store, key, ledgerId, original.id, patch),
    updated,
    'replay cannot overwrite a newer human correction',
  );
  assert.equal(ledger.getEntry(store, key, ledgerId, original.id).amountMinor, 4000);
  deleteOrRestore(store, owner.id, ledgerId, original.id, {
    version: corrected.version,
    requestId: randomUUID(),
    deleted: true,
    reason: 'other',
    reasonNote: '测试清理',
  });
  assert.throws(() => ledger.getEntry(store, key, ledgerId, original.id), /已不存在/);
  assert.throws(() => editApiEntry(store, key, ledgerId, original.id, fresh), /已不存在/);
  assert.equal(ledger.getEntry(store, key, ledgerId, manual.id).amountMinor, manual.amountMinor);
});

test('AI edits validate active updater, links and revoked credentials', (t) => {
  const f = fixture(t);
  const { store, owner, partner, ledgerId, input } = f;
  const created = createKey(store, owner.id, { name: 'Assistant', ledgerId });
  const key = keyIdentity(store, created.token)!;
  const original = createApiEntry(store, key, ledgerId, input);
  const { recordedByMemberId: _recorder, ...value } = input;
  const patch = {
    ...value,
    version: 1,
    updatedByMemberId: f.partnerMemberId,
    requestId: randomUUID(),
  };
  for (const change of [
    { updatedByMemberId: randomUUID() },
    { categoryId: randomUUID() },
    { paidByMemberId: randomUUID() },
  ]) {
    assert.throws(() => editApiEntry(store, key, ledgerId, original.id, { ...patch, ...change }));
  }
  for (const sql of [
    "UPDATE memberships SET role = 'viewer' WHERE user_id = ?",
    "UPDATE memberships SET role = 'editor', left_at = '2026-11-16' WHERE user_id = ?",
  ]) {
    store.sqlite.prepare(sql).run(partner.id);
    assert.throws(() => editApiEntry(store, key, ledgerId, original.id, patch), /修改人/);
  }
  store.sqlite.prepare('UPDATE memberships SET left_at = NULL WHERE user_id = ?').run(partner.id);
  store.sqlite.prepare("UPDATE users SET disabled_at = '2026-11-16' WHERE id = ?").run(partner.id);
  assert.throws(() => editApiEntry(store, key, ledgerId, original.id, patch), /修改人/);
  assert.equal(ledger.getEntry(store, key, ledgerId, original.id).version, 1);
  revokeKey(store, owner.id, created.key.id);
  assert.throws(
    () =>
      editApiEntry(store, key, ledgerId, original.id, {
        ...patch,
        updatedByMemberId: f.ownerMemberId,
      }),
    /已撤销/,
  );
  assert.throws(() => ledger.getEntry(store, key, ledgerId, original.id), /已撤销/);
});

/** [INPUT]: 临时 SQLite、评论服务、真实 HTTP router 与 Next 请求上下文。
 * [OUTPUT]: 评论权限、回复平铺、输入/幂等、迁移与重开回归。
 * [POS]: 评论后端契约测试；不访问用户数据库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createStore, migrate, type Store } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import * as user from '@/server/user/service';
import * as ledger from '@/server/ledger/service';
import * as repo from '@/server/ledger/repo';
import { createEntry, deleteOrRestore } from '@/server/ledger/entries';
import { createComment, listComments } from '@/server/ledger/comments';
import { AppError } from '@/shared/errors';
import { ZodError } from 'zod';

function fixture(store: Store) {
  const owner = user.create(store, {
    loginName: randomUUID(),
    displayName: '我',
    passwordHash: 'test',
  });
  const ledgerId = ledger.createHome(store, owner.id, '小家');
  const entryInput = {
    requestId: randomUUID(),
    kind: 'expense',
    amountMinor: 100,
    categoryId: repo.categoryList(store, ledgerId).find((item) => item.kind === 'expense')!.id,
    paidByMemberId: repo.members(store, ledgerId)[0].id,
    occurredOn: '2026-11-13',
    note: '旧账单',
  };
  const entry = createEntry(store, owner.id, ledgerId, entryInput);
  const add = (content = '评论', replyToId?: string, requestId = randomUUID()) =>
    createComment(store, owner.id, ledgerId, entry.id, { content, replyToId, requestId });
  const list = () => listComments(store, owner.id, ledgerId, entry.id);
  return { owner, ledgerId, entry, entryInput, add, list };
}
const status = (expected: number) => (error: unknown) =>
  error instanceof AppError && error.status === expected;

test('comments trim input, flatten continuous replies and preserve creation order', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const f = fixture(store);
  assert.deepEqual(f.list(), []);
  const root = f.add('  主评论 \n');
  assert.equal(root.content, '主评论');
  assert.equal(root.rootId, null);
  assert.equal(root.replyToId, null);
  assert.equal(root.replyToName, null);
  assert.equal(root.authorId, f.owner.id);
  assert.equal(root.authorName, '我');
  assert.equal(root.entryId, f.entry.id);
  assert.ok(Number.isFinite(Date.parse(root.createdAt)));
  const other = user.create(store, { loginName: 'other', displayName: '你', passwordHash: 'test' });
  repo.insertMember(store, {
    id: randomUUID(),
    ledgerId: f.ledgerId,
    userId: other.id,
    role: 'editor',
  });
  const reply = createComment(store, other.id, f.ledgerId, f.entry.id, {
    content: '回复主评论',
    replyToId: root.id,
    requestId: randomUUID(),
  });
  let previous = reply;
  const expected = [root, reply];
  for (let i = 0; i < 8; i++) {
    const next = f.add(`持续回复 ${i}`, previous.id);
    assert.equal(next.rootId, root.id);
    assert.equal(next.replyToId, previous.id);
    assert.equal(next.replyToName, previous.authorName);
    expected.push(next);
    previous = next;
  }
  expected.push(f.add('另一个主评论'));
  // 强制相同时间戳，验证 tie-break 不是随机 UUID。
  store.sqlite.prepare("UPDATE entry_comments SET created_at = '2026-11-13T00:00:00.000Z'").run();
  assert.deepEqual(
    f.list().map((item) => item.id),
    expected.map((item) => item.id),
  );
});

test('comments enforce active membership, editor writes and ledger/entry isolation', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const f = fixture(store);
  const root = f.add();
  const outsider = fixture(store);
  assert.throws(() => listComments(store, outsider.owner.id, f.ledgerId, f.entry.id), status(403));
  assert.throws(
    () =>
      createComment(store, outsider.owner.id, f.ledgerId, f.entry.id, {
        content: '越权',
        requestId: randomUUID(),
      }),
    status(403),
  );
  const memberId = randomUUID();
  repo.insertMember(store, {
    id: memberId,
    ledgerId: f.ledgerId,
    userId: outsider.owner.id,
    role: 'viewer',
  });
  assert.deepEqual(listComments(store, outsider.owner.id, f.ledgerId, f.entry.id), [root]);
  assert.throws(
    () =>
      createComment(store, outsider.owner.id, f.ledgerId, f.entry.id, {
        content: '只读',
        requestId: randomUUID(),
      }),
    status(403),
  );
  store.sqlite
    .prepare("UPDATE memberships SET role = 'editor', left_at = '2026-11-13' WHERE id = ?")
    .run(memberId);
  assert.throws(() => listComments(store, outsider.owner.id, f.ledgerId, f.entry.id), status(403));
  assert.throws(
    () =>
      createComment(store, outsider.owner.id, f.ledgerId, f.entry.id, {
        content: '已退出',
        requestId: randomUUID(),
      }),
    status(403),
  );
  assert.throws(() => listComments(store, f.owner.id, f.ledgerId, outsider.entry.id), status(404));
  assert.throws(
    () =>
      createComment(store, f.owner.id, f.ledgerId, outsider.entry.id, {
        content: '跨账本账单',
        requestId: randomUUID(),
      }),
    status(404),
  );
  assert.throws(() => f.add('跨账本回复', outsider.add().id), status(400));
  const second = createEntry(store, f.owner.id, f.ledgerId, {
    ...f.entryInput,
    requestId: randomUUID(),
  });
  assert.throws(
    () =>
      createComment(store, f.owner.id, f.ledgerId, second.id, {
        content: '跨账单回复',
        replyToId: root.id,
        requestId: randomUUID(),
      }),
    status(400),
  );
  assert.throws(() => f.add('不存在', randomUUID()), status(400));
  const requestId = randomUUID();
  f.add('删除前', undefined, requestId);
  deleteOrRestore(store, f.owner.id, f.ledgerId, f.entry.id, {
    deleted: true,
    reason: 'duplicate',
    version: 1,
    requestId: randomUUID(),
  });
  assert.throws(f.list, status(404));
  assert.throws(() => f.add(), status(404));
  assert.throws(() => f.add('删除前', undefined, requestId), status(404));
  deleteOrRestore(store, f.owner.id, f.ledgerId, f.entry.id, {
    deleted: false,
    version: 2,
    requestId: randomUUID(),
  });
  assert.equal(f.list().length, 2);
  store.sqlite
    .prepare("UPDATE ledgers SET archived_at = '2026-11-13' WHERE id = ?")
    .run(f.ledgerId);
  assert.throws(f.list, status(403));
  assert.throws(() => f.add(), status(403));
});

test('comment validation and shared request identities prevent duplicate or conflicting mutations', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const f = fixture(store);
  for (const fields of [
    {},
    { content: '' },
    { content: ' \n\t ' },
    { content: '字'.repeat(1001) },
    { content: 1 },
    { content: null },
    { content: '有效', replyToId: '' },
    { content: '有效', replyToId: null },
    { content: '有效', requestId: 'invalid' },
  ]) {
    assert.throws(
      () =>
        createComment(store, f.owner.id, f.ledgerId, f.entry.id, {
          requestId: randomUUID(),
          ...fields,
        }),
      ZodError,
    );
  }
  assert.throws(
    () => createComment(store, f.owner.id, f.ledgerId, f.entry.id, { content: '无编号' }),
    ZodError,
  );
  assert.deepEqual(f.list(), []);
  assert.equal(f.add('字'.repeat(1000)).content.length, 1000);
  const requestId = randomUUID();
  const result = f.add(' 原文 ', undefined, requestId);
  assert.deepEqual(f.add('原文', undefined, requestId), result);
  assert.throws(() => f.add('不同内容', undefined, requestId), status(409));
  assert.throws(() => f.add('原文', result.id, requestId), status(409));
  const second = createEntry(store, f.owner.id, f.ledgerId, {
    ...f.entryInput,
    requestId: randomUUID(),
  });
  assert.throws(
    () => createComment(store, f.owner.id, f.ledgerId, second.id, { content: '原文', requestId }),
    status(409),
  );
  assert.throws(() => f.add('账单请求编号', undefined, f.entryInput.requestId), status(409));
  assert.throws(
    () => createEntry(store, f.owner.id, f.ledgerId, { ...f.entryInput, requestId }),
    status(409),
  );
  assert.equal(f.list().length, 2);
  // 插入与幂等结果必须一起回滚。
  store.sqlite.exec(
    "CREATE TRIGGER fail_mutation BEFORE INSERT ON mutation_requests BEGIN SELECT RAISE(ABORT, 'test rollback'); END",
  );
  assert.throws(() => f.add('回滚'), /test rollback/);
  assert.equal(f.list().length, 2);
});

test('0007 preserves existing entries and comments plus idempotency survive reopen', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'daily-plenty-comments-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const name of readdirSync('migrations').filter((name) => /^000[1-6]_.*\.sql$/.test(name))) {
    copyFileSync(join('migrations', name), join(dir, name));
  }
  const filename = join(dir, 'test.db');
  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  migrate(sqlite, dir);
  const old: Store = { sqlite, db: drizzle(sqlite, { schema }) };
  const f = fixture(old);
  const before = sqlite.prepare('SELECT * FROM entries').all();
  sqlite.close();
  const upgraded = createStore(filename);
  assert.deepEqual(upgraded.sqlite.prepare('SELECT * FROM entries').all(), before);
  const requestId = randomUUID();
  const root = createComment(upgraded, f.owner.id, f.ledgerId, f.entry.id, {
    content: '迁移后',
    requestId,
  });
  const reply = createComment(upgraded, f.owner.id, f.ledgerId, f.entry.id, {
    content: '回复',
    replyToId: root.id,
    requestId: randomUUID(),
  });
  upgraded.sqlite.close();
  const reopened = createStore(filename);
  t.after(() => reopened.sqlite.close());
  assert.deepEqual(reopened.sqlite.prepare('SELECT * FROM entries').all(), before);
  assert.deepEqual(listComments(reopened, f.owner.id, f.ledgerId, f.entry.id), [root, reply]);
  assert.deepEqual(
    createComment(reopened, f.owner.id, f.ledgerId, f.entry.id, { content: '迁移后', requestId }),
    root,
  );
  assert.deepEqual(reopened.sqlite.pragma('foreign_key_check'), []);
  assert.equal(
    (reopened.sqlite.prepare('SELECT count(*) AS n FROM _migrations').get() as { n: number }).n,
    7,
  );
});

test('HTTP comments routes return exact contracts and authorization/error statuses', async (t) => {
  // Next 在加载请求上下文前需要 Node AsyncLocalStorage 全局适配。
  await import('next/dist/server/node-environment');
  const { NextRequest } = await import('next/server');
  const { createRequestStoreForAPI } = await import('next/dist/server/async-storage/request-store');
  const { workUnitAsyncStorage } =
    await import('next/dist/server/app-render/work-unit-async-storage.external');
  const { workAsyncStorage } =
    await import('next/dist/server/app-render/work-async-storage.external');
  const { createWorkStore } = await import('next/dist/server/async-storage/work-store');
  const work = createWorkStore({
    page: '/api/[...path]/route',
    buildId: 'test',
    previouslyRevalidatedTags: [],
    renderOpts: {
      waitUntil: undefined,
      onClose: () => {},
      onAfterTaskError: undefined,
      supportsDynamicResponse: true,
      experimental: { isRoutePPREnabled: false, cacheComponents: false, authInterrupts: false },
    },
  });
  const { dispatch } = await import('@/server/http/router');
  const { createSession } = await import('@/server/auth/service');
  const state = globalThis as typeof globalThis & { dailyPlenty?: Store };
  const previous = state.dailyPlenty;
  const store = createStore(':memory:');
  state.dailyPlenty = store;
  t.after(() => {
    state.dailyPlenty = previous;
    store.sqlite.close();
  });
  const f = fixture(store);
  const token = createSession(store, f.owner.id);
  const path = `ledgers/${f.ledgerId}/entries/${f.entry.id}/comments`;
  async function request(method: string, payload?: unknown, session = token) {
    const req = new NextRequest(`http://localhost/api/${path}`, {
      method,
      headers: { cookie: `daily_plenty_session=${session}`, 'Content-Type': 'application/json' },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    const context = createRequestStoreForAPI(
      req,
      req.nextUrl,
      { tags: [], expirationsByCacheKind: new Map() },
      undefined,
      undefined,
    );
    return workAsyncStorage.run(work, () =>
      workUnitAsyncStorage.run(context, () =>
        dispatch(req, { params: Promise.resolve({ path: path.split('/') }) }),
      ),
    );
  }
  assert.equal((await request('GET', undefined, '')).status, 401);
  assert.deepEqual(await (await request('GET')).json(), { comments: [] });
  const payload = { content: ' HTTP ', requestId: randomUUID() };
  const response = await request('POST', payload);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  const comment = await response.json();
  assert.deepEqual(
    Object.keys(comment).sort(),
    [
      'id',
      'entryId',
      'authorId',
      'authorName',
      'rootId',
      'replyToId',
      'replyToName',
      'content',
      'createdAt',
    ].sort(),
  );
  assert.equal(comment.content, 'HTTP');
  assert.deepEqual(await (await request('POST', payload)).json(), comment);
  assert.deepEqual(await (await request('GET')).json(), { comments: [comment] });
  assert.equal((await request('POST', { ...payload, content: '冲突' })).status, 409);
  assert.equal((await request('POST', { content: ' ' })).status, 400);
  assert.equal((await request('POST', [])).status, 400);
  store.sqlite.prepare("UPDATE memberships SET role = 'viewer' WHERE user_id = ?").run(f.owner.id);
  assert.equal((await request('GET')).status, 200);
  assert.equal((await request('POST', payload)).status, 403);
  store.sqlite.prepare("UPDATE entries SET deleted_at = '2026-11-13' WHERE id = ?").run(f.entry.id);
  assert.equal((await request('GET')).status, 404);
});

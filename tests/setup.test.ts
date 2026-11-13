/** [INPUT]: NextRequest、真实初始化/登录 API、内存 SQLite。
 * [OUTPUT]: 初始化、密码、会话及生产 HTTP/HTTPS/SSH 预览 Cookie 的回归测试。
 * [POS]: HTTP 接口回归，不监听端口、不访问用户数据库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/[...path]/route';
import { createStore, type Store } from '@/server/db/client';
import { sessionUser } from '@/server/auth/service';
import { json, setSession, clearSession } from '@/server/http/context';

test('setup works without manual configuration and only initializes once', async () => {
  const state = globalThis as typeof globalThis & { dailyPlenty?: Store };
  const previousStore = state.dailyPlenty;
  const previousToken = process.env.DAILY_PLENTY_SETUP_TOKEN;
  delete process.env.DAILY_PLENTY_SETUP_TOKEN;
  const store = createStore(':memory:');
  state.dailyPlenty = store;
  const context = (path: string) => ({ params: Promise.resolve({ path: path.split('/') }) });
  const post = (path: string, payload: object) =>
    POST(
      new NextRequest(`http://localhost/api/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
      context(path),
    );
  const status = () =>
    GET(new NextRequest('http://localhost/api/setup/status'), context('setup/status'));
  const input = {
    loginName: 'first_user',
    password: '123456',
    displayName: '小余',
    ledgerName: '我们的小家',
  };
  try {
    assert.deepEqual(await (await status()).json(), { initialized: false, configured: true });
    assert.equal((await post('setup', { ...input, password: '12345' })).status, 400);
    assert.equal((await post('setup', { ...input, setupToken: 'x'.repeat(64) })).status, 403);
    const responses = await Promise.all([
      post('setup', input),
      post('setup', { ...input, loginName: 'another_user' }),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
    const success = responses.find((response) => response.status === 200)!;
    const result = await success.json();
    assert.equal(result.user.passwordHash, undefined);
    assert.equal(result.setupToken, undefined);
    const cookie = success.cookies.get('daily_plenty_session');
    assert.equal(sessionUser(store, cookie?.value || null), result.user.id);
    assert.equal(
      (store.sqlite.prepare('SELECT count(*) AS n FROM users').get() as { n: number }).n,
      1,
    );
    assert.equal(
      (store.sqlite.prepare('SELECT count(*) AS n FROM ledgers').get() as { n: number }).n,
      1,
    );
    assert.deepEqual(await (await status()).json(), { initialized: true, configured: true });
    assert.equal((await post('setup', input)).status, 409);
    assert.equal(
      (await post('auth/session', { loginName: result.user.loginName, password: input.password }))
        .status,
      200,
    );
  } finally {
    store.sqlite.close();
    state.dailyPlenty = previousStore;
    if (previousToken === undefined) {
      delete process.env.DAILY_PLENTY_SETUP_TOKEN;
    } else {
      process.env.DAILY_PLENTY_SETUP_TOKEN = previousToken;
    }
  }
});

test('production cookies require an explicit HTTP mode or loopback preview to disable Secure', () => {
  const env = process.env as Record<string, string | undefined>;
  const keys = [
    'NODE_ENV',
    'HOSTNAME',
    'DAILY_PLENTY_LOCAL_PREVIEW',
    'DAILY_PLENTY_ALLOW_HTTP',
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, env[key]]));
  try {
    env.NODE_ENV = 'production';
    env.HOSTNAME = '127.0.0.1';
    delete env.DAILY_PLENTY_LOCAL_PREVIEW;
    delete env.DAILY_PLENTY_ALLOW_HTTP;
    const secure = () =>
      Boolean(setSession(json({}), 'test').cookies.get('daily_plenty_session')?.secure);
    assert.equal(secure(), true);
    env.DAILY_PLENTY_LOCAL_PREVIEW = 'true';
    assert.equal(secure(), false);
    assert.equal(
      Boolean(clearSession(json({})).cookies.get('daily_plenty_session')?.secure),
      false,
    );
    for (const hostname of ['0.0.0.0', '203.0.113.10', '::']) {
      env.HOSTNAME = hostname;
      assert.equal(secure(), true);
    }
    env.HOSTNAME = '127.0.0.1';
    env.DAILY_PLENTY_LOCAL_PREVIEW = 'false';
    assert.equal(secure(), true);
    env.HOSTNAME = '0.0.0.0';
    env.DAILY_PLENTY_ALLOW_HTTP = 'true';
    for (const response of [setSession(json({}), 'test'), clearSession(json({}))]) {
      const cookie = response.cookies.get('daily_plenty_session');
      assert.equal(Boolean(cookie?.secure), false);
      assert.equal(cookie?.httpOnly, true);
      assert.equal(cookie?.sameSite, 'lax');
      assert.equal(cookie?.path, '/');
    }
    assert.equal(clearSession(json({})).cookies.get('daily_plenty_session')?.maxAge, 0);
    for (const flag of ['false', '1', 'TRUE', '']) {
      env.DAILY_PLENTY_ALLOW_HTTP = flag;
      assert.equal(secure(), true);
    }
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete env[key];
      } else {
        env[key] = previous[key];
      }
    }
  }
});

test('router rejects unknown paths and non-object JSON without creating records', async () => {
  const state = globalThis as typeof globalThis & { dailyPlenty?: Store };
  const previous = state.dailyPlenty;
  const store = createStore(':memory:');
  state.dailyPlenty = store;
  const context = (path: string) => ({ params: Promise.resolve({ path: path.split('/') }) });
  try {
    for (const path of ['unknown', 'setup/status/extra', 'ledgers/id/entries/export/extra']) {
      const response = await GET(new NextRequest(`http://localhost/api/${path}`), context(path));
      assert.equal(response.status, 404);
      assert.equal((await response.json()).code, 'NOT_FOUND');
    }
    for (const body of ['null', '[]', '"text"', '{invalid']) {
      const request = new NextRequest('http://localhost/api/setup', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
      });
      assert.equal((await POST(request, context('setup'))).status, 400);
    }
    assert.equal(
      (store.sqlite.prepare('SELECT count(*) AS n FROM users').get() as { n: number }).n,
      0,
    );
  } finally {
    store.sqlite.close();
    state.dailyPlenty = previous;
  }
});

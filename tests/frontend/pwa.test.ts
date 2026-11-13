/**
 * [INPUT]: 安装清单、本地 PNG 和真实 Service Worker 脚本。
 * [OUTPUT]: 图标规格、网络优先/断网回退、财务请求绕过和缓存更新隔离回归。
 * [POS]: 无浏览器 Worker 事件测试；不访问网络或真实账单库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import manifest from '@/app/manifest';

test('installation uses a stable public launch URL and correctly sized local PNG icons', () => {
  const config = manifest();
  assert.equal(config.name, '日日有余');
  assert.equal(config.id, '/');
  assert.equal(config.start_url, '/');
  assert.equal(config.scope, '/');
  assert.equal(config.display, 'standalone');
  assert.ok(config.icons?.some((icon) => icon.purpose === 'maskable'));
  const icons = [...config.icons!, { src: '/icons/apple-touch-icon.png', sizes: '180x180' }];
  for (const icon of icons) {
    const bytes = readFileSync(new URL(`../../public${icon.src}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
  }
});

type WorkerRequest = { url: string; mode: string; method: string };
type WorkerEvent = {
  request?: WorkerRequest;
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith: (promise: Promise<Response>) => void;
};
function worker() {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const cached: string[] = [];
  const deleted: string[] = [];
  let network: Response | Error = new Response('live page');
  let claims = 0;
  const cache = {
    add: async (url: string) => {
      cached.push(url);
    },
    match: async (url: string) =>
      url === '/offline.html' ? new Response('offline explanation') : undefined,
  };
  runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    URL,
    Response,
    self: {
      location: { origin: 'https://ledger.example' },
      addEventListener: (name: string, listener: (event: WorkerEvent) => void) =>
        listeners.set(name, listener),
      clients: {
        claim: async () => {
          claims++;
        },
      },
      skipWaiting: () => {
        throw new Error('must not force an update over an active form');
      },
    },
    caches: {
      open: async () => cache,
      keys: async () => ['another-app-cache', 'daily-plenty-offline-v0', 'daily-plenty-offline-v1'],
      delete: async (name: string) => {
        deleted.push(name);
        return true;
      },
    },
    fetch: async () => {
      if (network instanceof Error) {
        throw network;
      }
      return network.clone();
    },
  });
  async function lifecycle(name: string) {
    let completion: Promise<unknown> | undefined;
    listeners.get(name)!({
      waitUntil: (promise) => {
        completion = promise;
      },
      respondWith: () => {},
    });
    await completion;
  }
  function request(path: string, mode = 'navigate', method = 'GET') {
    let response: Promise<Response> | undefined;
    listeners.get('fetch')!({
      request: { url: new URL(path, 'https://ledger.example').href, mode, method },
      waitUntil: () => {},
      respondWith: (promise) => {
        response = promise;
      },
    });
    return response;
  }
  return {
    cached,
    deleted,
    lifecycle,
    request,
    claims: () => claims,
    network: (result: Response | Error) => {
      network = result;
    },
  };
}

test('worker only precaches public offline explanation and retires its own old caches', async () => {
  const runtime = worker();
  await runtime.lifecycle('install');
  assert.deepEqual(runtime.cached, ['/offline.html']);
  await runtime.lifecycle('activate');
  assert.deepEqual(runtime.deleted, ['daily-plenty-offline-v0']);
  assert.equal(runtime.claims(), 1);
});

test('worker uses live navigation, falls back only on network failure, and bypasses financial traffic', async () => {
  const runtime = worker();
  assert.equal(await (await runtime.request('/records?ledger=private'))!.text(), 'live page');
  runtime.network(new Response('sign in', { status: 401 }));
  assert.equal((await runtime.request('/'))!.status, 401);
  runtime.network(new TypeError('offline'));
  assert.equal(await (await runtime.request('/join?token=private'))!.text(), 'offline explanation');
  assert.deepEqual(runtime.cached, [], 'navigation responses must never enter Cache Storage');
  for (const path of ['/api', '/api/users/me', '/api/ledgers/private/entries/export']) {
    assert.equal(runtime.request(path), undefined);
    assert.equal(runtime.request(path, 'cors', 'POST'), undefined);
  }
  assert.equal(
    runtime.request('/records', 'cors'),
    undefined,
    'Next RSC requests bypass the worker',
  );
  assert.equal(runtime.request('https://another.example/'), undefined);
  assert.equal(runtime.request('/records', 'navigate', 'POST'), undefined);
});

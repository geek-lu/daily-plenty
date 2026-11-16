/**
 * [INPUT]: 密钥页面/Hook、React SSR 与隔离的 HTTP/剪贴板替身。
 * [OUTPUT]: 绑定账本传递、并发生成锁、一次性秘密、HTTP 手动复制回退及撤销确认回归。
 * [POS]: 密钥前端行为测试，不访问真实浏览器或用户数据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as react from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError } from '@/features/common/api';

function load(file: string, imports: Record<string, unknown>) {
  const source = readFileSync(
    new URL(`../../src/features/common/${file}`, import.meta.url),
    'utf8',
  );
  const exports: Record<string, any> = {};
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => imports[name],
      AbortController,
      navigator: {},
      URLSearchParams,
    },
  );
  return exports;
}
const { InterfaceIcon } = load('ui/InterfaceIcon.tsx', { 'react/jsx-runtime': jsx });

const key = {
  id: 'key-a',
  name: 'Work Buddy',
  ledgerId: 'ledger-b',
  ledgerName: '旅行账本',
  createdBy: 'partner',
  creatorName: '另一位成员',
  prefix: 'dp_fixture',
  createdAt: 1,
  lastUsedAt: null,
  revokedAt: null,
};
const ledgers = [
  { id: 'ledger-a', name: '家庭账本', role: 'editor' },
  { id: 'ledger-b', name: '旅行账本', role: 'editor' },
  { id: 'ledger-c', name: '只读账本', role: 'viewer' },
];
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('generation sends chosen ledger, locks concurrent submits and only keeps a dismissible secret in state', async () => {
  const slots: any[] = [];
  let cursor = 0;
  let effect: (() => void) | undefined;
  let loseResponse = false;
  let loginRequired = false;
  const calls: { name: string; ledgerId: string }[] = [];
  const hooks = {
    useState(initial: any) {
      const i = cursor++;
      if (!(i in slots)) {
        slots[i] = initial;
      }
      return [
        slots[i],
        (value: any) => {
          slots[i] = typeof value === 'function' ? value(slots[i]) : value;
        },
      ];
    },
    useRef(initial: any) {
      const i = cursor++;
      if (!(i in slots)) {
        slots[i] = { current: initial };
      }
      return slots[i];
    },
    useEffect(callback: () => void) {
      effect ||= callback;
    },
    useCallback(callback: unknown) {
      return callback;
    },
  };
  const { useApiKeys } = load('api-keys/runtime.ts', {
    react: hooks,
    '../api': { ApiError },
    '../session/runtime': {
      useSession: () => ({
        ledgerId: 'ledger-a',
        ledgers,
        requireLogin: () => {
          loginRequired = true;
        },
      }),
    },
    './api': {
      listKeys: async () => ({ keys: [] }),
      createKey: async (name: string, ledgerId: string) => {
        calls.push({ name, ledgerId });
        if (loseResponse) {
          throw new Error('响应丢失');
        }
        return { key, token: 'dp_test_secret' };
      },
      revokeKey: async () => {
        throw new ApiError('请重新登录', 401);
      },
    },
  });
  const render = () => {
    cursor = 0;
    return useApiKeys();
  };
  let state = render();
  effect!();
  await tick();
  assert.equal(render().targetLedgerId, 'ledger-a');
  assert.equal(render().ledgers.length, 2);
  state.setTargetLedgerId('ledger-c');
  state.setName('Denied');
  render().generate({ preventDefault() {} });
  await tick();
  assert.equal(calls.length, 0, 'viewers cannot generate shared write credentials');
  state.setTargetLedgerId('ledger-b');
  state.setName(' Work Buddy ');
  state = render();
  state.generate({ preventDefault() {} });
  state.generate({ preventDefault() {} });
  await tick();
  assert.deepEqual(calls, [{ name: 'Work Buddy', ledgerId: 'ledger-b' }]);
  state = render();
  assert.equal(state.created.token, 'dp_test_secret');
  await state.copy();
  assert.match(render().notice, /手动复制/);
  state.dismiss();
  assert.equal(render().created, null);
  state.setName('Lost response');
  loseResponse = true;
  render().generate({ preventDefault() {} });
  await tick();
  assert.equal(calls.length, 2, 'lost responses must not automatically create another key');
  assert.equal(render().created, null);
  assert.match(render().notice, /撤销后重新生成/);
  render().revoke(key.id);
  await tick();
  assert.equal(loginRequired, true);
});

test('settings show the bound ledger and secret only at creation; revoke asks before executing', () => {
  const { KeyList } = load('api-keys/KeyList.tsx', {
    'react/jsx-runtime': jsx,
    '../ui/InterfaceIcon': { InterfaceIcon },
  });
  const state = {
    ledgers,
    targetLedgerId: 'ledger-b',
    name: '',
    keys: [key],
    loading: false,
    created: null as null | { key: typeof key; token: string },
    confirmId: null as string | null,
    setName() {},
    setTargetLedgerId() {},
    setConfirmId() {},
    revoke() {},
  };
  const { default: Page } = load('api-keys/ApiKeysPage.tsx', {
    'react/jsx-runtime': jsx,
    'next/link': { default: 'a', __esModule: true },
    '../session/runtime': { useSession: () => ({ ledgerId: 'ledger-a' }) },
    './runtime': { useApiKeys: () => state },
    './KeyList': { KeyList },
    '../ui/InterfaceIcon': { InterfaceIcon },
    './api-keys.css': {},
  });
  const render = () => renderToStaticMarkup(react.createElement(Page));
  let html = render();
  assert.match(html, /\/together\?ledger=ledger-a/);
  assert.match(html, /账本：.*旅行账本/);
  assert.match(html, /另一位成员/);
  assert.match(html, /账本共享密钥/);
  assert.match(html, /value="ledger-b" selected=""/);
  assert.doesNotMatch(html, /<textarea|确认撤销/);
  state.created = { key, token: 'dp_test_secret' };
  html = render();
  assert.match(html, /<textarea[^>]*readonly=""/i);
  assert.match(html, /dp_test_secret/);
  state.created = null;
  state.confirmId = key.id;
  html = render();
  assert.doesNotMatch(html, /dp_test_secret/);
  assert.match(html, /确认撤销/);
});

test('a secondary settings page highlights Together but navigates back to the primary page', () => {
  const { useTabLinks } = load('session/useTabLinks.ts', {
    react: { useEffect() {}, useState: () => [{ user: '', urls: {} }, () => {}] },
    'next/navigation': {
      usePathname: () => '/together/api-keys',
      useSearchParams: () => new URLSearchParams({ ledger: 'ledger-a' }),
    },
    './runtime': { useSession: () => ({ ledgerId: 'ledger-a', user: { id: 'owner' } }) },
    './navigation': { tabs: [{ path: '/together' }], tabHref: () => '/together?ledger=ledger-a' },
  });
  const [tab] = useTabLinks();
  assert.equal(tab.active, true);
  assert.equal(tab.currentPage, false);
  assert.equal(tab.href, '/together?ledger=ledger-a');
});

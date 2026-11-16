/** [INPUT]: 真实评论组件/Hook、React SSR 与隔离请求替身。[OUTPUT]: 一级回复、纯文本安全、只读权限和失败重试回归。
 * [POS]: 评论前端测试；不访问真实数据或网络。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as react from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import type { EntryComment } from '@/shared/types';

function load(file: string, imports: Record<string, unknown>) {
  const source = readFileSync(
    new URL(`../../src/features/common/comments/${file}`, import.meta.url),
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
    },
  );
  return exports;
}
const { Collapse } = load('../../../ui/motion.tsx', { react, 'react/jsx-runtime': jsx });

const { EntrySourceBadge } = load('../ui/EntrySourceBadge.tsx', {
  'react/jsx-runtime': jsx,
  './entry-source.css': {},
});

const comment = (id: string, rootId: string | null = null): EntryComment => ({
  id,
  entryId: 'entry',
  authorId: 'user',
  authorName: '小林',
  rootId,
  replyToId: rootId ? 'root' : null,
  replyToName: rootId ? '小余' : null,
  content: '<script>alert(1)</script>',
  createdAt: '2026-11-13T10:00:00.000Z',
});

test('comments render continued replies at one level, escape text and hide viewer actions', () => {
  const state = {
    comments: [
      comment('root'),
      comment('r1', 'root'),
      { ...comment('r2', 'root'), replyToId: 'r1' },
    ],
    content: '',
    replyTo: null,
    loading: false,
    busy: false,
    error: '',
  };
  const { EntryComments } = load('EntryComments.tsx', {
    react,
    'react/jsx-runtime': jsx,
    './useComments': { useComments: () => state },
  });
  const render = (canWrite: boolean) =>
    renderToStaticMarkup(
      react.createElement(EntryComments, {
        ledgerId: 'ledger',
        entryId: 'entry',
        canWrite,
        composing: true,
      }),
    );
  const editor = render(true);
  assert.ok(editor.includes('class="entry-discussion"'));
  assert.ok(editor.includes('账单评论'));
  assert.equal((editor.match(/class="entry-discussion-thread"/g) || []).length, 1);
  assert.equal((editor.match(/class="entry-discussion-replies"/g) || []).length, 1);
  assert.equal((editor.match(/<article/g) || []).length, 3);
  assert.ok(editor.includes('&lt;script&gt;'));
  assert.ok(!editor.includes('<script>'));
  assert.ok(editor.includes('发表评论'));
  assert.match(editor, /rows="1"/);
  const viewer = render(false);
  assert.ok(!viewer.includes('<textarea'));
  assert.ok(!viewer.includes('发表评论'));
  assert.ok(viewer.includes('账单评论'));
  state.comments = [];
  const empty = renderToStaticMarkup(
    react.createElement(EntryComments, { ledgerId: 'ledger', entryId: 'entry' }),
  );
  assert.equal(empty, '');
  assert.ok(render(true).includes('<textarea'));
  state.comments = [comment('root')];
  const reading = renderToStaticMarkup(
    react.createElement(EntryComments, { ledgerId: 'ledger', entryId: 'entry' }),
  );
  assert.ok(reading.includes('账单评论'));
  assert.ok(!reading.includes('<textarea'));
});

test('comment hook locks duplicate sends and reuses request ID after a lost response', async () => {
  let cursor = 0;
  const slots: any[] = [];
  let effect: (() => void) | undefined;
  const calls: string[] = [];
  let fail = true;
  let nextId = 0;
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
  };
  const { useComments } = load('useComments.ts', {
    react: hooks,
    '../api': {
      uid: () => `request-${++nextId}`,
      api: async (_path: string, init?: RequestInit) => {
        if (!init) {
          return { comments: [] };
        }
        const body = JSON.parse(init.body as string);
        calls.push(body.requestId);
        if (fail) {
          throw new Error('响应丢失');
        }
        return { ...comment(body.requestId), content: body.content };
      },
    },
  });
  const render = () => {
    cursor = 0;
    return useComments('ledger', 'entry');
  };
  let state = render();
  effect!();
  await new Promise((resolve) => setImmediate(resolve));
  state = render();
  state.setContent('第一条');
  state = render();
  await Promise.all([state.submit(), state.submit()]);
  assert.equal(calls.length, 1);
  state = render();
  assert.equal(state.content, '第一条');
  fail = false;
  await state.submit();
  assert.equal(calls[0], calls[1]);
  state = render();
  assert.equal(state.content, '');
  state.setContent('第一条');
  state = render();
  await state.submit();
  assert.notEqual(calls[1], calls[2]);
});

test('entry list keeps comment action separate and expands discussions by default', () => {
  const { EntryRow } = load('../ui/EntryRow.tsx', {
    react,
    'react/jsx-runtime': jsx,
    '@/shared/money': { money: () => '12.00' },
    './CategoryIcon': { CategoryIcon: () => null },
    './EntrySourceBadge': { EntrySourceBadge },
    '../comments/EntryComments': {
      EntryComments: () => react.createElement('section', null, '默认评论区'),
    },
    './entry-item.css': {},
    '@/ui/motion': { Collapse },
    '@/ui/SwipeReveal': { SwipeReveal: ({ children }: { children: react.ReactNode }) => children },
  });
  const html = renderToStaticMarkup(
    react.createElement(EntryRow, {
      entry: {
        id: 'entry',
        ledgerId: 'ledger',
        kind: 'expense',
        occurredOn: '2026-11-13',
        note: '午饭',
        categoryName: '餐饮',
        payerName: '甲',
        creatorName: '乙',
        source: 'ai',
      },
      onEdit: () => {},
      canWrite: true,
    }),
  );
  assert.equal((html.match(/<button/g) || []).length, 3);
  const heading = html.split('class="entry-comment-board"')[0];
  assert.equal((heading.match(/<button/g) || []).length, 1);
  assert.ok(!heading.includes('写评论'));
  assert.match(html, /写评论/);
  assert.equal((html.match(/餐饮/g) || []).length, 1);
  assert.match(html, /entry-item-note/);
  assert.match(html, /data-source="ai"/);
  assert.match(html, /AI 记录/);
  assert.match(html, /2026-11-13 · 付款人 · 甲/);
  assert.ok(html.indexOf('class="entry-item-meta"') < html.indexOf('class="entry-item-note"'));
  assert.doesNotMatch(html, /乙记/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /hidden=""/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /评论/);
});

test('records comments remain collapsed while mounted for the external count', () => {
  const { EntryRow } = load('../ui/EntryRow.tsx', {
    react,
    'react/jsx-runtime': jsx,
    '@/shared/money': { money: () => '12.00' },
    './CategoryIcon': { CategoryIcon: () => null },
    './EntrySourceBadge': { EntrySourceBadge },
    '../comments/EntryComments': {
      EntryComments: () => {
        return react.createElement('section', null, '已查询评论');
      },
    },
    './entry-item.css': {},
    '@/ui/motion': { Collapse },
    '@/ui/SwipeReveal': { SwipeReveal: ({ children }: { children: react.ReactNode }) => children },
  });
  const html = renderToStaticMarkup(
    react.createElement(EntryRow, {
      entry: { id: 'entry', ledgerId: 'ledger', kind: 'expense', note: '午饭' },
      onEdit: () => {},
      canWrite: false,
      defaultCommentsExpanded: false,
    }),
  );
  assert.match(html, /展开评论/);
  assert.doesNotMatch(html, /人工记录|entry-source-badge/);
  assert.match(html, /entry-comment-count/);
  assert.match(html, /已查询评论/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /inert=""/);
});

test('only AI has a visible badge; manual and legacy entries leave no label', () => {
  for (const source of ['manual', undefined]) {
    assert.equal(renderToStaticMarkup(react.createElement(EntrySourceBadge, { source })), '');
  }
  const html = renderToStaticMarkup(react.createElement(EntrySourceBadge, { source: 'ai' }));
  assert.match(html, />AI<\/span>/);
  assert.match(html, /aria-label="AI 记录"/);
});

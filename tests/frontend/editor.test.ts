/**
 * [INPUT]: 共用录入 commands/form、真实账单服务、内存 SQLite 与模拟断网传输。
 * [OUTPUT]: 已提交但响应丢失时不会重复记账，编辑/删除可安全重试，连续录入创建新账单。
 * [POS]: 前端副作用边界回归；不访问真实数据库或网络。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntryCommands } from '@/features/ledger/editor/commands';
import {
  emptyForm,
  entryForm,
  entryInput,
  templateForm,
  templateInput,
  nextForm,
} from '@/features/ledger/editor/form';
import { createStore, atomic } from '@/server/db/client';
import * as users from '@/server/user/service';
import * as ledgers from '@/server/ledger/service';
import * as entries from '@/server/ledger/entries';
import type { Entry } from '@/shared/types';
import { uid } from '@/features/ledger/api';

test('HTTP browsers without randomUUID can still create valid distinct request IDs', (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues },
  });
  t.after(() => Object.defineProperty(globalThis, 'crypto', descriptor));
  const ids = Array.from({ length: 10 }, () => uid());
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
});

test('form rules preserve exact cents and separate template, edit and continue state', () => {
  const form = {
    ...emptyForm('payer'),
    amount: '12.34',
    categoryId: 'category',
    note: ' 晚饭 ',
    occurredOn: '2026-11-12',
  };
  assert.deepEqual(entryInput(form), {
    kind: 'expense',
    amountMinor: 1234,
    categoryId: 'category',
    paidByMemberId: 'payer',
    occurredOn: '2026-11-12',
    note: '晚饭',
  });
  const template = templateInput(form, ' 午餐 ');
  assert.equal(template.name, '午餐');
  assert.equal('occurredOn' in template, false);
  assert.equal(templateForm(template).amount, '12.34');
  assert.deepEqual(nextForm({ ...form, id: 'entry', version: 3 }), {
    ...emptyForm('payer'),
    occurredOn: '2026-11-12',
  });
  for (const amount of ['0', '-1', '1.234', 'abc']) {
    assert.throws(() => entryInput({ ...form, amount }), /金额/);
  }
  assert.throws(() => entryInput({ ...form, categoryId: '' }), /分类和付款人/);
  assert.throws(() => templateInput(form, ' '), /模板名称/);
});

test('lost create/edit/delete responses reuse request identity against actual database mutations', async (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const user = users.create(store, {
    loginName: 'owner',
    displayName: '我',
    passwordHash: '$fixture$',
  });
  const ledgerId = atomic(store, () => ledgers.createHome(store, user.id, '小家'));
  const overview = ledgers.query(store, user.id, ledgerId, { month: '2026-11' });
  const form = {
    ...emptyForm(overview.members[0].id),
    categoryId: overview.categories.find((c) => c.kind === 'expense')!.id,
    amount: '12.34',
    occurredOn: '2026-11-12',
  };
  const commands = createEntryCommands(ledgerId);
  const calls: { method: string; requestId: string }[] = [];
  let loseResponse = true;
  let lastEntry: Entry;
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    const payload = JSON.parse(options.body as string);
    const method = options.method!;
    calls.push({ method, requestId: payload.requestId });
    const id = url.split('/').at(-1)!;
    switch (method) {
      case 'POST':
        lastEntry = entries.createEntry(store, user.id, ledgerId, payload);
        break;
      case 'PATCH':
        lastEntry = entries.editEntry(store, user.id, ledgerId, id, payload);
        break;
      case 'DELETE':
        lastEntry = entries.deleteOrRestore(store, user.id, ledgerId, id, {
          ...payload,
          deleted: true,
        });
        break;
      default:
        throw new Error(`Unexpected method: ${method}`);
    }
    if (loseResponse) {
      loseResponse = false;
      throw new TypeError('Network response lost');
    }
    return Response.json(lastEntry);
  });

  await assert.rejects(commands.save(form), /lost/);
  await commands.save(form);
  assert.equal(calls[0].requestId, calls[1].requestId);
  assert.equal(ledgers.query(store, user.id, ledgerId, { month: '2026-11' }).entries.length, 1);

  const editing = { ...entryForm(lastEntry!), amount: '20.00' };
  loseResponse = true;
  await assert.rejects(commands.save(editing), /lost/);
  await commands.save(editing);
  assert.equal(calls[2].requestId, calls[3].requestId);
  assert.equal(lastEntry!.version, 2);
  assert.equal(lastEntry!.amountMinor, 2000);

  const deleting = entryForm(lastEntry!);
  loseResponse = true;
  await assert.rejects(commands.remove(deleting, 'duplicate', ''), /lost/);
  await commands.remove(deleting, 'duplicate', '');
  assert.equal(calls[4].requestId, calls[5].requestId);
  assert.ok(lastEntry!.deletedAt);
  assert.equal(ledgers.query(store, user.id, ledgerId, { month: '2026-11' }).entries.length, 0);

  await commands.save(form);
  await commands.save(form);
  assert.notEqual(
    calls[6].requestId,
    calls[7].requestId,
    'successful save starts a new operation even with identical contents',
  );
  assert.equal(ledgers.query(store, user.id, ledgerId, { month: '2026-11' }).entries.length, 2);
});

test('failed requests remain identifiable when draft changes then changes back', async (t) => {
  const requests: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    requests.push(JSON.parse(options.body as string).requestId);
    throw new TypeError('offline');
  });
  const commands = createEntryCommands('ledger');
  const form = { ...emptyForm('payer'), amount: '1', categoryId: 'category' };
  await assert.rejects(commands.save(form));
  await assert.rejects(commands.save({ ...form, amount: '2' }));
  await assert.rejects(commands.save(form));
  assert.equal(requests[0], requests[2]);
  assert.notEqual(requests[0], requests[1]);
  commands.reset();
  await assert.rejects(commands.save(form));
  assert.notEqual(requests[0], requests[3], 'a new editor session has a fresh identity');
});

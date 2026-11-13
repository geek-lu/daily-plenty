/** [INPUT]: 临时 SQLite、账本/账单服务及共享删除原因校验。
 * [OUTPUT]: 必填原因、其他说明、幂等/版本/权限与持久化回归。[POS]: 删除流程数据边界测试。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '@/server/db/client';
import * as user from '@/server/user/service';
import * as ledger from '@/server/ledger/service';
import * as repo from '@/server/ledger/repo';
import { createEntry, deleteOrRestore } from '@/server/ledger/entries';
import { deleteInput } from '@/shared/validation';
import { deletionReasonIds } from '@/shared/deletion-reasons';

test('deletion requires a valid reason and explanation for other; invalid requests cannot mutate data', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const owner = user.create(store, { loginName: 'owner', displayName: '我', passwordHash: 'test' });
  const ledgerId = ledger.createHome(store, owner.id, '小家');
  const category = repo.categoryList(store, ledgerId).find((item) => item.kind === 'expense')!;
  const entry = createEntry(store, owner.id, ledgerId, {
    requestId: randomUUID(),
    kind: 'expense',
    amountMinor: 3600,
    categoryId: category.id,
    paidByMemberId: repo.members(store, ledgerId)[0].id,
    occurredOn: '2026-11-12',
    note: '晚餐',
  });
  const identity = { version: 1, requestId: randomUUID(), deleted: true };
  for (const fields of [
    {},
    { reason: '' },
    { reason: 'invalid' },
    { reason: 'other' },
    { reason: 'other', reasonNote: ' \n ' },
    { reason: 'duplicate', reasonNote: '字'.repeat(201) },
  ]) {
    assert.throws(() =>
      deleteOrRestore(store, owner.id, ledgerId, entry.id, { ...identity, ...fields }),
    );
    assert.deepEqual(repo.entry(store, ledgerId, entry.id), entry);
  }
  for (const reason of deletionReasonIds) {
    assert.equal(
      deleteInput.parse({
        ...identity,
        reason,
        reasonNote: reason === 'other' ? '记录用于测试' : '',
      }).deleted,
      true,
    );
  }
  const outsider = user.create(store, {
    loginName: 'outsider',
    displayName: '别人',
    passwordHash: 'test',
  });
  assert.throws(
    () =>
      deleteOrRestore(store, outsider.id, ledgerId, entry.id, { ...identity, reason: 'duplicate' }),
    /权限/,
  );
  assert.throws(
    () =>
      deleteOrRestore(store, owner.id, ledgerId, entry.id, {
        ...identity,
        version: 2,
        reason: 'duplicate',
      }),
    /修改/,
  );
  const payload = { ...identity, reason: 'other', reasonNote: '  这是测试记录  ' };
  const deleted = deleteOrRestore(store, owner.id, ledgerId, entry.id, payload);
  assert.equal(deleted.deleteReason, 'other');
  assert.equal(deleted.deleteReasonNote, '这是测试记录');
  assert.ok(deleted.deletedAt);
  assert.equal(ledger.query(store, owner.id, ledgerId, { month: '2026-11' }).summary.expense, 0);
  assert.deepEqual(deleteOrRestore(store, owner.id, ledgerId, entry.id, payload), deleted);
  assert.throws(
    () =>
      deleteOrRestore(store, owner.id, ledgerId, entry.id, { ...payload, reasonNote: '另一理由' }),
    /标识/,
  );
  const restored = deleteOrRestore(store, owner.id, ledgerId, entry.id, {
    requestId: randomUUID(),
    version: 2,
    deleted: false,
  });
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.deleteReason, null);
  assert.equal(restored.deleteReasonNote, null);
  assert.equal(ledger.query(store, owner.id, ledgerId, { month: '2026-11' }).summary.expense, 3600);
  const second = deleteOrRestore(store, owner.id, ledgerId, entry.id, {
    requestId: randomUUID(),
    version: 3,
    deleted: true,
    reason: 'duplicate',
  });
  assert.equal(second.deleteReason, 'duplicate');
  assert.equal(second.deleteReasonNote, '');
});

test('stored deletion reason survives database reopening', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'daily-plenty-deletion-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filename = join(dir, 'test.db');
  const store = createStore(filename);
  const owner = user.create(store, { loginName: 'owner', displayName: '我', passwordHash: 'test' });
  const ledgerId = ledger.createHome(store, owner.id, '小家');
  const category = repo.categoryList(store, ledgerId).find((item) => item.kind === 'expense')!;
  const entry = createEntry(store, owner.id, ledgerId, {
    requestId: randomUUID(),
    kind: 'expense',
    amountMinor: 100,
    categoryId: category.id,
    paidByMemberId: repo.members(store, ledgerId)[0].id,
    occurredOn: '2026-11-12',
    note: '',
  });
  deleteOrRestore(store, owner.id, ledgerId, entry.id, {
    requestId: randomUUID(),
    version: 1,
    deleted: true,
    reason: 'wrong_amount',
    reasonNote: '多记了一位数',
  });
  store.sqlite.close();
  const reopened = createStore(filename);
  try {
    const stored = repo.entry(reopened, ledgerId, entry.id)!;
    assert.equal(stored.deleteReason, 'wrong_amount');
    assert.equal(stored.deleteReasonNote, '多记了一位数');
    assert.equal(stored.amountMinor, 100);
  } finally {
    reopened.sqlite.close();
  }
});

/** [INPUT]: 内存 SQLite、user/auth/ledger 服务。[OUTPUT]: 可重复的账本核心回归测试。[POS]: 服务层验证，不依赖 HTTP 或浏览器。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createStore, atomic } from '@/server/db/client';
import * as user from '@/server/user/service';
import * as auth from '@/server/auth/service';
import * as ledger from '@/server/ledger/service';
import * as entryFlow from '@/server/ledger/entries';
import * as invitation from '@/server/ledger/invitations';
import type { Store } from '@/server/db/client';

function fixture() {
  const store = createStore(':memory:');
  const passwordHash = '$fixture$';
  const owner = user.create(store, { loginName: 'owner', displayName: '我', passwordHash });
  const ledgerId = atomic(store, () => ledger.createHome(store, owner.id, '我们的小家'));
  const categories = store.sqlite
    .prepare('SELECT id, name, kind FROM categories WHERE ledger_id = ?')
    .all(ledgerId) as { id: string; name: string; kind: string }[];
  const member = store.sqlite
    .prepare('SELECT id FROM memberships WHERE ledger_id = ?')
    .get(ledgerId) as { id: string };
  return { store, owner, ledgerId, categories, member };
}
function close(store: Store) {
  store.sqlite.close();
}

test('creates a ledger with independent members and categories', () => {
  const { store, ledgerId, categories, member } = fixture();
  assert.equal(
    (
      store.sqlite
        .prepare('SELECT count(*) n FROM memberships WHERE ledger_id = ?')
        .get(ledgerId) as { n: number }
    ).n,
    1,
  );
  assert.equal(categories.filter((item) => item.kind === 'expense').length, 12);
  assert.equal(categories.filter((item) => item.kind === 'income').length, 6);
  assert.ok(member.id);
  close(store);
});

test('stores exact cents and makes repeated mutation idempotent', () => {
  const { store, owner, ledgerId, categories, member } = fixture();
  const input = {
    requestId: randomUUID(),
    kind: 'expense' as const,
    amountMinor: 1234,
    categoryId: categories.find((item) => item.name === '餐饮' && item.kind === 'expense')!.id,
    paidByMemberId: member.id,
    note: '午餐',
    occurredOn: '2026-11-09',
  };
  const first = entryFlow.createEntry(store, owner.id, ledgerId, input);
  const second = entryFlow.createEntry(store, owner.id, ledgerId, input);
  assert.equal(first.id, second.id);
  assert.equal(
    ledger.query(store, owner.id, ledgerId, {
      month: '2026-11',
      kind: 'all',
      memberId: 'all',
      search: '',
    }).summary.expense,
    1234,
  );
  close(store);
});

test('rejects cross-ledger category and member references', () => {
  const first = fixture();
  const second = fixture();
  const category = first.categories.find(
    (item) => item.name === '餐饮' && item.kind === 'expense',
  )!;
  assert.throws(
    () =>
      entryFlow.createEntry(first.store, first.owner.id, first.ledgerId, {
        requestId: randomUUID(),
        kind: 'expense',
        amountMinor: 100,
        categoryId: second.categories.find(
          (item) => item.name === '餐饮' && item.kind === 'expense',
        )!.id,
        paidByMemberId: first.member.id,
        note: '',
        occurredOn: '2026-11-09',
      }),
    /有效的分类/,
  );
  assert.throws(
    () =>
      entryFlow.createEntry(second.store, second.owner.id, second.ledgerId, {
        requestId: randomUUID(),
        kind: 'expense',
        amountMinor: 100,
        categoryId: category.id,
        paidByMemberId: second.member.id,
        note: '',
        occurredOn: '2026-11-09',
      }),
    /有效的分类/,
  );
  close(first.store);
  close(second.store);
});

test('version prevents silent overwrite and soft delete changes summary', () => {
  const { store, owner, ledgerId, categories, member } = fixture();
  const created = entryFlow.createEntry(store, owner.id, ledgerId, {
    requestId: randomUUID(),
    kind: 'expense',
    amountMinor: 2000,
    categoryId: categories.find((item) => item.name === '餐饮' && item.kind === 'expense')!.id,
    paidByMemberId: member.id,
    note: '',
    occurredOn: '2026-11-09',
  });
  const updated = entryFlow.editEntry(store, owner.id, ledgerId, created.id, {
    requestId: randomUUID(),
    version: 1,
    amountMinor: 2100,
    kind: 'expense',
    categoryId: created.categoryId,
    paidByMemberId: member.id,
    note: '',
    occurredOn: '2026-11-09',
  });
  assert.equal(updated.amountMinor, 2100);
  assert.throws(
    () =>
      entryFlow.editEntry(store, owner.id, ledgerId, created.id, {
        requestId: randomUUID(),
        version: 1,
        amountMinor: 2200,
        kind: 'expense',
        categoryId: created.categoryId,
        paidByMemberId: member.id,
        note: '',
        occurredOn: '2026-11-09',
      }),
    /已修改/,
  );
  entryFlow.deleteOrRestore(store, owner.id, ledgerId, created.id, {
    requestId: randomUUID(),
    version: 2,
    deleted: true,
    reason: 'duplicate',
  });
  assert.equal(
    ledger.query(store, owner.id, ledgerId, {
      month: '2026-11',
      kind: 'all',
      memberId: 'all',
      search: '',
    }).summary.expense,
    0,
  );
  close(store);
});

test('password verification and invitation keep account and ledger boundaries', async () => {
  const { store, owner, ledgerId } = fixture();
  const password = await auth.hashPassword('correct horse battery staple');
  assert.equal(await auth.verifyPassword('correct horse battery staple', password), true);
  assert.equal(await auth.verifyPassword('wrong password', password), false);
  const created = invitation.createInvite(store, owner.id, ledgerId);
  assert.equal(created.token.length, 64);
  const partner = user.create(store, {
    loginName: 'partner',
    displayName: 'TA',
    passwordHash: '$fixture$',
  });
  assert.equal(invitation.join(store, partner.id, created.token), ledgerId);
  assert.throws(() => invitation.createInvite(store, owner.id, ledgerId), /两位成员/);
  close(store);
});

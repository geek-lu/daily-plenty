/** [INPUT]: 内存 SQLite、账单/统计服务、筛选与 URL 规则。[OUTPUT]: 分页、日/月/年统计、汇总及 CSV 一致性回归。
 * [POS]: 使用明确隔离的合成账单，不访问用户数据库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createStore, atomic } from '@/server/db/client';
import * as user from '@/server/user/service';
import * as ledger from '@/server/ledger/service';
import * as repo from '@/server/ledger/repo';
import { createInvite, join } from '@/server/ledger/invitations';
import { createEntry, deleteOrRestore } from '@/server/ledger/entries';
import { queryRecords, exportRecords } from '@/server/ledger/records';
import { recordsInput, reportInput } from '@/shared/validation';
import { completeReportPoints } from '@/shared/report';
import { reportQuery, reportSelection } from '@/features/reports/filters';
import { filterAmount, filterParams } from '@/features/records/filters';
import type { EntryInput } from '@/shared/types';

function fixture() {
  const store = createStore(':memory:');
  const owner = user.create(store, {
    loginName: 'owner',
    displayName: '甲',
    passwordHash: '$fixture$',
  });
  const partner = user.create(store, {
    loginName: 'partner',
    displayName: '乙',
    passwordHash: '$fixture$',
  });
  const ledgerId = atomic(store, () => ledger.createHome(store, owner.id, '合成测试账本'));
  join(store, partner.id, createInvite(store, owner.id, ledgerId).token);
  const members = repo.members(store, ledgerId);
  const ownerMember = members.find((m) => m.userId === owner.id)!;
  const partnerMember = members.find((m) => m.userId === partner.id)!;
  const categories = repo.categoryList(store, ledgerId);
  const food = categories.find((c) => c.name === '餐饮')!;
  const clothes = categories.find((c) => c.name === '服饰')!;
  const salary = categories.find((c) => c.name === '工资')!;
  const add = (overrides: Partial<EntryInput> = {}, actor = owner.id) =>
    createEntry(store, actor, ledgerId, {
      kind: 'expense',
      categoryId: food.id,
      amountMinor: 1000,
      paidByMemberId: ownerMember.id,
      occurredOn: '2026-11-01',
      note: '合成测试账单',
      ...overrides,
      requestId: randomUUID(),
    });
  const query = (filters: unknown = {}) => queryRecords(store, owner.id, ledgerId, filters);
  return {
    store,
    owner,
    partner,
    ledgerId,
    ownerMember,
    partnerMember,
    food,
    clothes,
    salary,
    add,
    query,
  };
}

test('records filters intersect dates, categories, payer, creator, keyword and exact cents', (t) => {
  const f = fixture();
  t.after(() => f.store.sqlite.close());
  f.add({ occurredOn: '2026-10-30', amountMinor: 1001 });
  const first = f.add({
    occurredOn: '2026-10-31',
    amountMinor: 1001,
    note: '晚饭 100%_A',
    paidByMemberId: f.partnerMember.id,
  });
  const last = f.add({
    occurredOn: '2026-11-01',
    categoryId: f.clothes.id,
    amountMinor: 1002,
    note: '晚饭 100%_a',
    paidByMemberId: f.partnerMember.id,
  });
  f.add({
    occurredOn: '2026-11-02',
    amountMinor: 1001,
    note: '晚饭 100%_A',
    paidByMemberId: f.partnerMember.id,
  });
  f.add({ amountMinor: 1003, note: '晚饭 100%_A', paidByMemberId: f.partnerMember.id });
  f.add(
    { amountMinor: 1001, note: '晚饭 100%_A', paidByMemberId: f.partnerMember.id },
    f.partner.id,
  );
  f.add({ amountMinor: 1001, note: '晚饭 100%_A' });
  const filters = {
    start: '2026-10-31',
    end: '2026-11-01',
    categoryIds: `${f.food.id},${f.clothes.id}`,
    memberId: f.partnerMember.id,
    creatorId: f.owner.id,
    minAmount: '1001',
    maxAmount: '1002',
    search: '100%_a',
    sort: 'oldest',
  };
  const result = f.query(filters);
  assert.deepEqual(
    result.entries.map((e) => e.id),
    [first.id, last.id],
  );
  assert.deepEqual(result.totals, { count: 2, expense: 2003, income: 0 });
  assert.equal(f.query({ ...filters, minAmount: 1002 }).totals.count, 1);
  assert.equal(f.query({ ...filters, kind: 'income' }).totals.count, 0);
  assert.equal(f.query({ search: '服饰' }).totals.count, 1);
  const csv = exportRecords(f.store, f.owner.id, f.ledgerId, filters);
  assert.equal(csv.split('\r\n').length, 3);
  assert.ok(csv.includes('"10.01"') && csv.includes('"10.02"'));
});

test('pagination is stable for all four orders; totals and export include every matching page', (t) => {
  const f = fixture();
  t.after(() => f.store.sqlite.close());
  const created = Array.from({ length: 65 }, (_, index) =>
    f.add({
      amountMinor: 100 + (index % 5),
      occurredOn: index < 32 ? '2026-10-31' : '2026-11-01',
      note: `分页合成 ${index}`,
    }),
  );
  f.add({ kind: 'income', categoryId: f.salary.id, amountMinor: 123456 });
  const all = f.query();
  assert.equal(all.totals.count, 66);
  assert.equal(all.totals.income, 123456);
  assert.equal(
    all.totals.expense,
    created.reduce((total, item) => total + item.amountMinor, 0),
  );
  for (const sort of ['newest', 'oldest', 'amount_desc', 'amount_asc'] as const) {
    const pages = [1, 2, 3].map((page) => f.query({ kind: 'expense', sort, page }));
    const entries = pages.flatMap((page) => page.entries);
    assert.deepEqual(
      pages.map((page) => page.entries.length),
      [30, 30, 5],
    );
    assert.equal(new Set(entries.map((e) => e.id)).size, 65);
    assert.ok(
      pages.every((page) => page.totals.count === 65 && page.totals.expense === all.totals.expense),
    );
    const expected = [...created].sort((a, b) => {
      if (sort === 'newest') {
        return created.indexOf(b) - created.indexOf(a);
      }
      const ascending = sort === 'oldest' || sort === 'amount_asc';
      const amount = sort.startsWith('amount') ? a.amountMinor - b.amountMinor : 0;
      const comparison =
        amount || a.occurredOn.localeCompare(b.occurredOn) || a.id.localeCompare(b.id);
      return ascending ? comparison : -comparison;
    });
    assert.deepEqual(
      entries.map((e) => e.id),
      expected.map((e) => e.id),
    );
    const csv = exportRecords(f.store, f.owner.id, f.ledgerId, { kind: 'expense', sort, page: 3 });
    const lines = csv.split('\r\n').slice(1);
    assert.equal(lines.length, 65);
    assert.deepEqual(
      lines.map((line) => line.split(',').at(-1)),
      expected.map((e) => `"${e.note}"`),
    );
  }
  assert.equal(f.query({ page: 999 }).page, 3);
  const empty = f.query({ search: '没有这条合成数据', page: 100 });
  assert.deepEqual(empty.totals, { count: 0, expense: 0, income: 0 });
  assert.equal(empty.page, 1);
  assert.equal(empty.totalPages, 1);
});

test('historical categories and departed members remain searchable; deleted entries stay excluded', (t) => {
  const f = fixture();
  t.after(() => f.store.sqlite.close());
  const retained = f.add(
    { categoryId: f.clothes.id, paidByMemberId: f.partnerMember.id },
    f.partner.id,
  );
  const removed = f.add({ categoryId: f.clothes.id, paidByMemberId: f.partnerMember.id });
  deleteOrRestore(f.store, f.owner.id, f.ledgerId, removed.id, {
    deleted: true,
    reason: 'duplicate',
    version: 1,
    requestId: randomUUID(),
  });
  f.store.sqlite
    .prepare('UPDATE categories SET archived_at = ? WHERE id = ?')
    .run('2026-11-02', f.clothes.id);
  f.store.sqlite
    .prepare('UPDATE memberships SET left_at = ? WHERE id = ?')
    .run('2026-11-02', f.partnerMember.id);
  const filters = {
    categoryIds: [f.clothes.id],
    memberId: f.partnerMember.id,
    creatorId: f.partner.id,
  };
  const result = f.query(filters);
  assert.deepEqual(
    result.entries.map((e) => e.id),
    [retained.id],
  );
  assert.equal(result.totals.count, 1);
  assert.ok(result.categories.find((c) => c.id === f.clothes.id)?.archivedAt);
  assert.ok(result.members.find((m) => m.id === f.partnerMember.id)?.leftAt);
  assert.equal(exportRecords(f.store, f.owner.id, f.ledgerId, filters).split('\r\n').length, 2);
});

test('records retain ledger membership boundaries and allow viewer reads and export', (t) => {
  const f = fixture();
  t.after(() => f.store.sqlite.close());
  f.add();
  const otherId = atomic(f.store, () => ledger.createHome(f.store, f.partner.id, '另一合成账本'));
  assert.throws(() => queryRecords(f.store, f.owner.id, otherId, {}), /访问权限/);
  assert.throws(() => exportRecords(f.store, f.owner.id, otherId, {}), /访问权限/);
  assert.equal(queryRecords(f.store, f.partner.id, otherId, {}).totals.count, 0);
  assert.equal(
    f.query({ categoryIds: [repo.categoryList(f.store, otherId)[0].id] }).totals.count,
    0,
  );
  f.store.sqlite
    .prepare("UPDATE memberships SET role = 'viewer' WHERE id = ?")
    .run(f.partnerMember.id);
  assert.equal(queryRecords(f.store, f.partner.id, f.ledgerId, {}).ledger.role, 'viewer');
  assert.equal(exportRecords(f.store, f.partner.id, f.ledgerId, {}).split('\r\n').length, 2);
});

test('filter validation and URL round trip preserve exact ranges, and reject invalid user inputs', () => {
  const filters = recordsInput.parse({
    start: '2024-02-29',
    end: '2026-11-30',
    kind: 'expense',
    categoryIds: [randomUUID(), randomUUID()],
    memberId: randomUUID(),
    creatorId: randomUUID(),
    minAmount: 0,
    maxAmount: 105,
    search: '晚饭 & 茶',
    sort: 'amount_asc',
    page: 4,
  });
  assert.deepEqual(recordsInput.parse(Object.fromEntries(filterParams(filters))), filters);
  assert.equal(filterAmount('0.00'), 0);
  assert.equal(filterAmount('1.05'), 105);
  assert.equal(filterAmount(''), undefined);
  assert.equal(filterAmount('999999.99'), 99_999_999);
  for (const value of ['-1', '1.001', '1e2', 'abc', '1000000']) {
    assert.throws(() => filterAmount(value));
  }
  for (const invalid of [
    { start: '2026-02-29' },
    { start: '2026-11-02', end: '2026-11-01' },
    { minAmount: 2, maxAmount: 1 },
    { minAmount: -1 },
    { maxAmount: 0.1 },
    { categoryIds: ['bad-id'] },
    { creatorId: 'someone' },
    { page: 0 },
    { page: 1.5 },
    { sort: 'wrong' },
  ]) {
    assert.equal(recordsInput.safeParse(invalid).success, false);
  }
  assert.deepEqual(
    recordsInput.parse({ start: '', end: '', minAmount: '', maxAmount: '' }).categoryIds,
    [],
  );
});

test('CSV preserves quoted notes and full exported income amounts', (t) => {
  const f = fixture();
  t.after(() => f.store.sqlite.close());
  f.add({
    kind: 'income',
    categoryId: f.salary.id,
    amountMinor: 10001,
    note: '合成备注：逗号,双引号"保留',
  });
  const csv = exportRecords(f.store, f.owner.id, f.ledgerId, { kind: 'income' });
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"100.01"'));
  assert.ok(csv.includes('"合成备注：逗号,双引号""保留"'));
});

test('daily reports aggregate all records with exact cents, leap days and zero-filled dates', (t) => {
  const f = fixture();
  t.after(() => f.store.sqlite.close());
  for (let index = 0; index < 65; index++) {
    f.add({ occurredOn: '2024-02-29', amountMinor: 101 });
  }
  f.add({ occurredOn: '2024-02-01', amountMinor: 302 });
  f.add({ occurredOn: '2024-01-31', amountMinor: 9000 });
  f.add({ occurredOn: '2024-03-01', amountMinor: 9000 });
  f.add({ occurredOn: '2024-02-29', kind: 'income', categoryId: f.salary.id, amountMinor: 12345 });
  const report = ledger.queryReport(f.store, f.owner.id, f.ledgerId, {
    granularity: 'day',
    period: '2024-02',
  });
  assert.equal(report.points.length, 29);
  assert.deepEqual(report.points[0], { period: '2024-02-01', expense: 302, count: 1 });
  assert.deepEqual(report.points[1], { period: '2024-02-02', expense: 0, count: 0 });
  assert.deepEqual(report.points[28], { period: '2024-02-29', expense: 6565, count: 65 });
  assert.equal(report.summary.expense, 6867);
  assert.equal(report.summary.income, 12345);
  assert.equal(report.summary.count, 66);
  assert.equal(
    report.points.reduce((sum, p) => sum + p.expense, 0),
    report.summary.expense,
  );
  assert.equal(
    report.summary.categories.reduce((sum, c) => sum + c.amount, 0),
    report.summary.expense,
  );
  assert.equal(
    report.summary.members.reduce((sum, m) => sum + m.amount, 0),
    report.summary.expense,
  );
  assert.equal(
    ledger.queryReport(f.store, f.owner.id, f.ledgerId, { granularity: 'day', period: '2025-02' })
      .points.length,
    28,
  );
  assert.equal(
    ledger.queryReport(f.store, f.owner.id, f.ledgerId, { granularity: 'day', period: '2026-12' })
      .end,
    '2026-12-31',
  );
});

test('monthly and yearly reports share their range with summaries and preserve empty years', (t) => {
  const f = fixture();
  t.after(() => f.store.sqlite.close());
  f.add({ occurredOn: '2024-12-31', amountMinor: 1001 });
  f.add({ occurredOn: '2026-01-01', amountMinor: 202 });
  f.add({ occurredOn: '2026-12-31', amountMinor: 303 });
  f.add({ occurredOn: '2027-01-01', amountMinor: 404 });
  const monthly = ledger.queryReport(f.store, f.owner.id, f.ledgerId, {
    granularity: 'month',
    period: '2026',
  });
  assert.equal(monthly.points.length, 12);
  assert.equal(monthly.summary.expense, 505);
  assert.deepEqual(monthly.points[0], { period: '2026-01', expense: 202, count: 1 });
  assert.deepEqual(monthly.points[1], { period: '2026-02', expense: 0, count: 0 });
  assert.deepEqual(monthly.points[11], { period: '2026-12', expense: 303, count: 1 });
  const yearly = ledger.queryReport(f.store, f.owner.id, f.ledgerId, { granularity: 'year' });
  assert.equal(yearly.summary.expense, 1910);
  assert.equal(yearly.summary.count, 4);
  assert.equal(yearly.start, '2024-01-01');
  assert.deepEqual(
    yearly.points.find((p) => p.period === '2025'),
    { period: '2025', expense: 0, count: 0 },
  );
  assert.deepEqual(
    yearly.points.find((p) => p.period === '2026'),
    { period: '2026', expense: 505, count: 2 },
  );
  assert.equal(
    yearly.points.reduce((sum, p) => sum + p.expense, 0),
    yearly.summary.expense,
  );
  assert.deepEqual(completeReportPoints({ granularity: 'year' }, [], 2026), [
    { period: '2026', expense: 0, count: 0 },
  ]);
  assert.deepEqual(
    completeReportPoints(
      { granularity: 'year' },
      [{ period: '2024', expense: 1, count: 1 }],
      2026,
    ).map((p) => p.period),
    ['2024', '2025', '2026'],
  );
});

test('reports enforce membership, include historical categories and exclude soft deletions', (t) => {
  const f = fixture();
  t.after(() => f.store.sqlite.close());
  const entry = f.add({ paidByMemberId: f.partnerMember.id, categoryId: f.clothes.id });
  f.store.sqlite
    .prepare('UPDATE categories SET archived_at = ? WHERE id = ?')
    .run('2026-11-02', f.clothes.id);
  const filters = { granularity: 'day', period: '2026-11' };
  assert.equal(ledger.queryReport(f.store, f.owner.id, f.ledgerId, filters).summary.expense, 1000);
  f.store.sqlite
    .prepare("UPDATE memberships SET role = 'viewer' WHERE id = ?")
    .run(f.partnerMember.id);
  assert.equal(
    ledger.queryReport(f.store, f.partner.id, f.ledgerId, filters).ledger.role,
    'viewer',
  );
  const other = atomic(f.store, () => ledger.createHome(f.store, f.partner.id, '另一本'));
  assert.throws(() => ledger.queryReport(f.store, f.owner.id, other, filters), /访问权限/);
  assert.equal(ledger.queryReport(f.store, f.partner.id, other, filters).summary.expense, 0);
  f.store.sqlite
    .prepare('UPDATE memberships SET left_at = ? WHERE id = ?')
    .run('2026-11-02', f.partnerMember.id);
  assert.throws(() => ledger.queryReport(f.store, f.partner.id, f.ledgerId, filters), /访问权限/);
  assert.equal(
    ledger.queryReport(f.store, f.owner.id, f.ledgerId, filters).summary.members[0].amount,
    1000,
  );
  deleteOrRestore(f.store, f.owner.id, f.ledgerId, entry.id, {
    deleted: true,
    reason: 'duplicate',
    version: 1,
    requestId: randomUUID(),
  });
  const report = ledger.queryReport(f.store, f.owner.id, f.ledgerId, filters);
  assert.equal(report.summary.expense, 0);
  assert.ok(report.points.every((p) => p.expense === 0 && p.count === 0));
});

test('report URLs retain old month links and validate all granularity boundaries', () => {
  const legacy = reportSelection(new URLSearchParams('ledger=test&month=2024-02'), '2026-11-12');
  assert.deepEqual(legacy.filters, { granularity: 'day', period: '2024-02' });
  for (const query of [
    'granularity=day&month=2024-02',
    'granularity=month&year=2025',
    'granularity=year',
  ]) {
    const selected = reportSelection(new URLSearchParams(query), '2026-11-12');
    assert.deepEqual(
      reportInput.parse(Object.fromEntries(new URLSearchParams(reportQuery(selected.filters)))),
      selected.filters,
    );
  }
  assert.deepEqual(
    reportSelection(new URLSearchParams('granularity=wrong&month=2024-13&year=oops'), '2026-11-12')
      .filters,
    { granularity: 'day', period: '2026-11' },
  );
  for (const invalid of [
    { granularity: 'week' },
    { granularity: 'day', period: '2026-13' },
    { granularity: 'month', period: '2026-01' },
    { granularity: 'month', period: '1999' },
    { granularity: 'year', period: '2026' },
    { granularity: 'day' },
  ]) {
    assert.equal(reportInput.safeParse(invalid).success, false);
  }
});

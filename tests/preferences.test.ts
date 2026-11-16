/** [INPUT]: 临时 SQLite、账本/分类/模板服务与版本化迁移。
 * [OUTPUT]: 分类共享、个人模板隔离、权限与升级持久化回归。[POS]: 服务和数据库边界验证。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/server/db/schema';
import { createStore, migrate, type Store } from '@/server/db/client';
import * as user from '@/server/user/service';
import * as ledger from '@/server/ledger/service';
import * as repo from '@/server/ledger/repo';
import * as preferences from '@/server/ledger/preferences';
import * as entries from '@/server/ledger/entries';
const filters = { month: '2026-11', kind: 'all', memberId: 'all', search: '' };

test('category replacement merges existing targets without losing entries or templates', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const { owner, ledgerId, input } = fixture(store);
  for (const [oldName, newName] of [
    ['房租', '房贷'],
    ['其他', '服饰'],
  ]) {
    const source = preferences.addCategory(store, owner.id, ledgerId, {
      name: oldName,
      kind: 'expense',
    });
    const target = repo.categoryList(store, ledgerId).find((item) => item.name === newName)!;
    const { name, ...value } = input;
    const entry = entries.createEntry(store, owner.id, ledgerId, {
      ...value,
      categoryId: source.id,
      occurredOn: '2026-11-10',
      requestId: randomUUID(),
    });
    const template = preferences.saveTemplate(store, owner.id, ledgerId, {
      ...input,
      name: oldName,
      categoryId: source.id,
    });
    store.sqlite.transaction(() =>
      store.sqlite.exec(readFileSync('migrations/0004_personal_categories.sql', 'utf8')),
    )();
    assert.equal(repo.category(store, ledgerId, source.id), undefined);
    assert.equal(repo.entry(store, ledgerId, entry.id)?.categoryId, target.id);
    assert.equal(repo.entry(store, ledgerId, entry.id)?.amountMinor, value.amountMinor);
    assert.equal(repo.entry(store, ledgerId, entry.id)?.version, 2);
    assert.equal(repo.template(store, ledgerId, owner.id, template.id)?.categoryId, target.id);
  }
  assert.ok(
    repo
      .categoryList(store, ledgerId)
      .some((item) => item.kind === 'income' && item.name === '其他收入'),
  );
  assert.deepEqual(store.sqlite.pragma('foreign_key_check'), []);
});

function fixture(store: Store) {
  const owner = user.create(store, { loginName: 'owner', displayName: '我', passwordHash: 'test' });
  const partner = user.create(store, {
    loginName: 'partner',
    displayName: '对象',
    passwordHash: 'test',
  });
  const outsider = user.create(store, {
    loginName: 'outsider',
    displayName: '其他人',
    passwordHash: 'test',
  });
  const ledgerId = ledger.createHome(store, owner.id, '小家');
  repo.insertMember(store, { id: randomUUID(), ledgerId, userId: partner.id, role: 'editor' });
  const category = repo.categoryList(store, ledgerId).find((item) => item.kind === 'expense')!;
  const member = repo.members(store, ledgerId).find((item) => item.userId === owner.id)!;
  const input = {
    name: '午餐',
    kind: 'expense' as const,
    amountMinor: 2500,
    categoryId: category.id,
    paidByMemberId: member.id,
    note: '工作日午饭',
  };
  return { owner, partner, outsider, ledgerId, input };
}

test('categories are shared by ledger, reject duplicates and can be used for entries', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const { owner, partner, outsider, ledgerId, input } = fixture(store);
  const category = preferences.addCategory(store, owner.id, ledgerId, {
    name: ' 宠物 ',
    kind: 'expense',
  });
  assert.equal(category.name, '宠物');
  assert.ok(
    ledger
      .query(store, partner.id, ledgerId, filters)
      .categories.some((item) => item.id === category.id),
  );
  assert.throws(
    () => preferences.addCategory(store, partner.id, ledgerId, { name: '宠物', kind: 'expense' }),
    /已存在/,
  );
  assert.equal(
    preferences.addCategory(store, partner.id, ledgerId, { name: '宠物', kind: 'income' }).kind,
    'income',
  );
  assert.throws(
    () => preferences.addCategory(store, outsider.id, ledgerId, { name: '房租', kind: 'expense' }),
    /权限/,
  );
  assert.throws(() =>
    preferences.addCategory(store, owner.id, ledgerId, { name: ' ', kind: 'expense' }),
  );
  assert.throws(() =>
    preferences.addCategory(store, owner.id, ledgerId, { name: '长'.repeat(31), kind: 'expense' }),
  );
  const { name, ...entryInput } = input;
  const entry = entries.createEntry(store, owner.id, ledgerId, {
    ...entryInput,
    categoryId: category.id,
    occurredOn: '2026-11-10',
    requestId: randomUUID(),
  });
  assert.equal(entry.categoryName, '宠物');
});

test('templates are private by user and ledger; edits/deletes never change existing entries', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const { owner, partner, outsider, ledgerId, input } = fixture(store);
  const created = preferences.saveTemplate(store, owner.id, ledgerId, input);
  assert.equal(preferences.listTemplates(store, partner.id, ledgerId).length, 0);
  assert.equal(ledger.query(store, partner.id, ledgerId, filters).templates.length, 0);
  assert.throws(() => preferences.listTemplates(store, outsider.id, ledgerId), /权限/);
  assert.throws(
    () => preferences.saveTemplate(store, partner.id, ledgerId, input, created.id),
    /找不到/,
  );
  assert.throws(
    () => preferences.removeTemplate(store, partner.id, ledgerId, created.id),
    /找不到/,
  );
  assert.throws(() => preferences.saveTemplate(store, owner.id, ledgerId, input), /名称/);
  assert.equal(preferences.saveTemplate(store, partner.id, ledgerId, input).name, input.name);
  const otherLedger = ledger.createHome(store, owner.id, '另一个账本');
  assert.equal(preferences.listTemplates(store, owner.id, otherLedger).length, 0);
  assert.throws(
    () => preferences.removeTemplate(store, owner.id, otherLedger, created.id),
    /找不到/,
  );
  assert.equal(ledger.query(store, owner.id, ledgerId, filters).entries.length, 0);
  const { name, ...entryInput } = input;
  const recorded = entries.createEntry(store, owner.id, ledgerId, {
    ...entryInput,
    occurredOn: '2026-11-10',
    requestId: randomUUID(),
  });
  const updated = preferences.saveTemplate(
    store,
    owner.id,
    ledgerId,
    { ...input, amountMinor: 3000 },
    created.id,
  );
  assert.equal(updated.amountMinor, 3000);
  preferences.removeTemplate(store, owner.id, ledgerId, created.id);
  assert.equal(preferences.listTemplates(store, owner.id, ledgerId).length, 0);
  assert.equal(repo.entry(store, ledgerId, recorded.id)?.amountMinor, 2500);
});

test('templates reject forged owners, invalid links, inactive links and readonly members', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const { owner, partner, ledgerId, input } = fixture(store);
  const otherLedger = ledger.createHome(store, partner.id, '别的账本');
  const foreignCategory = repo.categoryList(store, otherLedger)[0];
  const foreignMember = repo.members(store, otherLedger)[0];
  for (const patch of [
    { amountMinor: 0 },
    { amountMinor: 1.5 },
    { amountMinor: 100000000 },
    { name: ' ' },
    { userId: partner.id },
    { ledgerId: otherLedger },
  ]) {
    assert.throws(() =>
      preferences.saveTemplate(store, owner.id, ledgerId, { ...input, ...patch }),
    );
  }
  assert.throws(
    () =>
      preferences.saveTemplate(store, owner.id, ledgerId, {
        ...input,
        categoryId: foreignCategory.id,
      }),
    /分类/,
  );
  assert.throws(
    () =>
      preferences.saveTemplate(store, owner.id, ledgerId, {
        ...input,
        paidByMemberId: foreignMember.id,
      }),
    /付款人/,
  );
  assert.throws(
    () => preferences.saveTemplate(store, owner.id, ledgerId, { ...input, kind: 'income' }),
    /分类/,
  );
  store.sqlite
    .prepare('UPDATE categories SET archived_at = ? WHERE id = ?')
    .run('2026-11-10', input.categoryId);
  assert.throws(() => preferences.saveTemplate(store, owner.id, ledgerId, input), /分类/);
  store.sqlite
    .prepare('UPDATE categories SET archived_at = NULL WHERE id = ?')
    .run(input.categoryId);
  store.sqlite
    .prepare('UPDATE memberships SET left_at = ? WHERE id = ?')
    .run('2026-11-10', input.paidByMemberId);
  assert.throws(() => preferences.saveTemplate(store, partner.id, ledgerId, input), /付款人/);
  store.sqlite
    .prepare('UPDATE memberships SET left_at = NULL, role = ? WHERE id = ?')
    .run('viewer', input.paidByMemberId);
  assert.throws(() => preferences.saveTemplate(store, owner.id, ledgerId, input), /只能查看/);
  assert.throws(
    () => preferences.addCategory(store, owner.id, ledgerId, { name: '宠物', kind: 'expense' }),
    /只能查看/,
  );
});

test('migration upgrades existing data and templates survive database reopening', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'daily-plenty-upgrade-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, '0001_initial.sql'), readFileSync('migrations/0001_initial.sql'));
  const filename = join(dir, 'ledger.db');
  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  migrate(sqlite, dir);
  // 让当前仓储构造旧版夹具，升级前移除新字段以验证真实 ALTER。
  sqlite.exec(
    "ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'tag'; ALTER TABLE entries ADD COLUMN delete_reason TEXT; ALTER TABLE entries ADD COLUMN delete_reason_note TEXT; ALTER TABLE entries ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'",
  );
  const oldStore: Store = { sqlite, db: drizzle(sqlite, { schema }) };
  const { owner, ledgerId, input } = fixture(oldStore);
  const { name, ...entryInput } = input;
  const entry = entries.createEntry(oldStore, owner.id, ledgerId, {
    ...entryInput,
    occurredOn: '2026-11-10',
    requestId: randomUUID(),
  });
  // 模拟旧账本：缺少新默认分类，同时有自定义分类和已归档的同名分类。
  sqlite
    .prepare("DELETE FROM categories WHERE name IN ('水电','通讯','学习','兼职','理财','红包')")
    .run();
  sqlite
    .prepare("UPDATE categories SET name = '房租' WHERE kind = 'expense' AND name = '房贷'")
    .run();
  sqlite
    .prepare("UPDATE categories SET name = '其他' WHERE kind = 'expense' AND name = '服饰'")
    .run();
  const rent = repo.categoryList(oldStore, ledgerId).find((item) => item.name === '房租')!;
  sqlite
    .prepare('UPDATE categories SET archived_at = ?, sort_order = ? WHERE id = ?')
    .run('2026-11-01', 99, rent.id);
  const custom = preferences.addCategory(oldStore, owner.id, ledgerId, {
    name: '宠物',
    kind: 'expense',
  });
  sqlite.exec(
    'ALTER TABLE categories DROP COLUMN icon; ALTER TABLE entries DROP COLUMN delete_reason; ALTER TABLE entries DROP COLUMN delete_reason_note; ALTER TABLE entries DROP COLUMN source',
  );
  sqlite.prepare('UPDATE entries SET deleted_at = ? WHERE id = ?').run('2026-11-01', entry.id);
  sqlite.close();
  const upgraded = createStore(filename);
  assert.equal(repo.entry(upgraded, ledgerId, entry.id)?.amountMinor, 2500);
  assert.equal(repo.entry(upgraded, ledgerId, entry.id)?.deleteReason, null);
  assert.equal(repo.entry(upgraded, ledgerId, entry.id)?.deleteReasonNote, null);
  assert.equal(repo.category(upgraded, ledgerId, rent.id)?.archivedAt, '2026-11-01');
  assert.equal(repo.category(upgraded, ledgerId, rent.id)?.sortOrder, 99);
  assert.equal(repo.category(upgraded, ledgerId, rent.id)?.name, '房贷');
  assert.equal(repo.category(upgraded, ledgerId, custom.id)?.name, '宠物');
  const seeded = repo.categoryList(upgraded, ledgerId);
  assert.equal(seeded.filter((item) => item.kind === 'expense').length, 13);
  assert.equal(seeded.filter((item) => item.kind === 'income').length, 6);
  assert.ok(
    seeded.some(
      (item) =>
        item.name === '水电' &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/.test(item.id),
    ),
  );
  migrate(upgraded.sqlite);
  assert.deepEqual(repo.categoryList(upgraded, ledgerId), seeded);
  const template = preferences.saveTemplate(upgraded, owner.id, ledgerId, input);
  assert.throws(
    () =>
      repo.insertTemplate(upgraded, {
        ...template,
        id: randomUUID(),
        name: '非法关联',
        categoryId: randomUUID(),
      }),
    /FOREIGN KEY/,
  );
  upgraded.sqlite.close();
  const reopened = createStore(filename);
  try {
    assert.deepEqual(repo.categoryList(reopened, ledgerId), seeded);
    assert.equal(preferences.listTemplates(reopened, owner.id, ledgerId)[0].id, template.id);
    assert.equal(repo.entry(reopened, ledgerId, entry.id)?.amountMinor, 2500);
    assert.equal(
      (reopened.sqlite.prepare('SELECT count(*) n FROM _migrations').get() as { n: number }).n,
      10,
    );
  } finally {
    reopened.sqlite.close();
  }
});

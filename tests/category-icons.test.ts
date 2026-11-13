/** [INPUT]: 内存/临时 SQLite、分类服务与图标目录。
 * [OUTPUT]: 图标白名单、持久化、升级及账单/统计映射回归。[POS]: 分类图标功能边界测试。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { createStore, migrate } from '@/server/db/client';
import * as user from '@/server/user/service';
import * as ledger from '@/server/ledger/service';
import * as repo from '@/server/ledger/repo';
import { addCategory } from '@/server/ledger/preferences';
import { createEntry } from '@/server/ledger/entries';
import { categoryIconIds, defaultCategoryIcons } from '@/shared/category-icons';
import { categoryInput } from '@/shared/validation';

test('default and selected icons propagate to category, entry and report', (t) => {
  const store = createStore(':memory:');
  t.after(() => store.sqlite.close());
  const owner = user.create(store, {
    loginName: 'icons',
    displayName: '小余',
    passwordHash: 'test',
  });
  const ledgerId = ledger.createHome(store, owner.id, '小家');
  for (const category of repo.categoryList(store, ledgerId)) {
    assert.equal(category.icon, defaultCategoryIcons[category.name]);
    assert.ok(categoryIconIds.includes(category.icon as (typeof categoryIconIds)[number]));
  }
  const category = addCategory(store, owner.id, ledgerId, {
    name: '猫粮',
    kind: 'expense',
    icon: 'paw',
  });
  assert.equal(repo.category(store, ledgerId, category.id)?.icon, 'paw');
  const entry = createEntry(store, owner.id, ledgerId, {
    kind: 'expense',
    amountMinor: 5000,
    categoryId: category.id,
    paidByMemberId: repo.members(store, ledgerId)[0].id,
    note: '',
    occurredOn: '2026-11-12',
    requestId: randomUUID(),
  });
  assert.equal(entry.categoryIcon, 'paw');
  const data = ledger.query(store, owner.id, ledgerId, { month: '2026-11' });
  assert.equal(data.entries[0].categoryIcon, 'paw');
  assert.equal(data.summary.categories[0].icon, 'paw');
  assert.equal(
    addCategory(store, owner.id, ledgerId, { name: '未指定图标', kind: 'expense' }).icon,
    'tag',
  );
  for (const icon of ['unknown', '<svg onload=alert(1)>', 'constructor', '']) {
    assert.throws(
      () => addCategory(store, owner.id, ledgerId, { name: '无效图标', kind: 'expense', icon }),
      /图标/,
    );
  }
  for (const icon of categoryIconIds) {
    assert.equal(categoryInput.parse({ name: '可选图标', kind: 'expense', icon }).icon, icon);
  }
});

test('icon migration preserves category IDs and archived custom categories across reopen', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'daily-plenty-icons-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const name of [
    '0001_initial.sql',
    '0002_entry_templates.sql',
    '0003_default_categories.sql',
    '0004_personal_categories.sql',
  ]) {
    copyFileSync(`migrations/${name}`, join(dir, name));
  }
  const filename = join(dir, 'test.db');
  const old = new Database(filename);
  old.pragma('foreign_keys = ON');
  migrate(old, dir);
  old
    .prepare('INSERT INTO users (id,login_name,display_name,password_hash) VALUES (?,?,?,?)')
    .run('owner', 'owner', '小余', 'test');
  old
    .prepare('INSERT INTO ledgers (id,name,owner_user_id) VALUES (?,?,?)')
    .run('ledger', '小家', 'owner');
  for (const [name] of Object.entries(defaultCategoryIcons)) {
    old
      .prepare('INSERT INTO categories (id,ledger_id,kind,name) VALUES (?,?,?,?)')
      .run(name, 'ledger', 'expense', name);
  }
  old
    .prepare('INSERT INTO categories (id,ledger_id,kind,name,archived_at) VALUES (?,?,?,?,?)')
    .run('custom', 'ledger', 'expense', '自定义', '2026-11-01');
  old.close();
  const upgraded = createStore(filename);
  for (const [name, icon] of Object.entries(defaultCategoryIcons)) {
    assert.equal(repo.category(upgraded, 'ledger', name)?.icon, icon);
  }
  assert.equal(repo.category(upgraded, 'ledger', 'custom')?.icon, 'tag');
  assert.equal(repo.category(upgraded, 'ledger', 'custom')?.archivedAt, '2026-11-01');
  upgraded.sqlite.prepare("UPDATE categories SET icon = 'coffee' WHERE id = 'custom'").run();
  upgraded.sqlite.close();
  const reopened = createStore(filename);
  try {
    assert.equal(repo.category(reopened, 'ledger', 'custom')?.icon, 'coffee');
    assert.equal(
      repo.categoryList(reopened, 'ledger').length,
      Object.keys(defaultCategoryIcons).length + 1,
    );
  } finally {
    reopened.sqlite.close();
  }
});

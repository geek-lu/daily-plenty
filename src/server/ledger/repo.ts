/** [INPUT]: Store、Drizzle 表、已校验的过滤器。[OUTPUT]: 同账本查询写入、区间汇总、日/月/年分组及用户模板存取。[POS]: ledger 数据仓储。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { and, desc, eq, getTableColumns, gte, isNull, lt, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { Store } from '../db/client';
import {
  users,
  ledgers,
  memberships,
  categories,
  entries,
  mutationRequests,
  invites,
  entryTemplates,
} from '../db/schema';
import type {
  Entry,
  Filters,
  Ledger,
  Member,
  ReportGranularity,
  ReportPoint,
  Summary,
  TemplateInput,
} from '@/shared/types';
const payer = alias(users, 'payer');
const creator = alias(users, 'creator');
export function access(store: Store, userId: string, ledgerId: string) {
  return store.db
    .select({ ledger: ledgers, member: memberships })
    .from(memberships)
    .innerJoin(ledgers, eq(ledgers.id, memberships.ledgerId))
    .where(
      and(eq(memberships.userId, userId), eq(ledgers.id, ledgerId), isNull(memberships.leftAt)),
    )
    .get();
}
export function listLedgers(store: Store, userId: string): Ledger[] {
  return store.db
    .select({ ...getTableColumns(ledgers), role: memberships.role })
    .from(ledgers)
    .innerJoin(memberships, eq(memberships.ledgerId, ledgers.id))
    .where(
      and(eq(memberships.userId, userId), isNull(memberships.leftAt), isNull(ledgers.archivedAt)),
    )
    .all();
}
export function members(store: Store, ledgerId: string): Member[] {
  return store.db
    .select({
      id: memberships.id,
      userId: users.id,
      displayName: users.displayName,
      role: memberships.role,
      leftAt: memberships.leftAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.ledgerId, ledgerId))
    .all();
}
export const categoryList = (store: Store, ledgerId: string) =>
  store.db
    .select()
    .from(categories)
    .where(eq(categories.ledgerId, ledgerId))
    .orderBy(categories.sortOrder)
    .all();
const templateScope = (ledgerId: string, userId: string) =>
  and(eq(entryTemplates.ledgerId, ledgerId), eq(entryTemplates.userId, userId));
export const templateList = (store: Store, ledgerId: string, userId: string) =>
  store.db
    .select()
    .from(entryTemplates)
    .where(templateScope(ledgerId, userId))
    .orderBy(desc(entryTemplates.createdAt), entryTemplates.id)
    .all();
export const template = (store: Store, ledgerId: string, userId: string, id: string) =>
  store.db
    .select()
    .from(entryTemplates)
    .where(and(templateScope(ledgerId, userId), eq(entryTemplates.id, id)))
    .get();
export const insertTemplate = (store: Store, value: typeof entryTemplates.$inferInsert) =>
  store.db.insert(entryTemplates).values(value).returning().get();
export const updateTemplate = (
  store: Store,
  ledgerId: string,
  userId: string,
  id: string,
  value: TemplateInput,
) =>
  store.db
    .update(entryTemplates)
    .set({ ...value, updatedAt: new Date().toISOString() })
    .where(and(templateScope(ledgerId, userId), eq(entryTemplates.id, id)))
    .returning()
    .get();
export const deleteTemplate = (store: Store, ledgerId: string, userId: string, id: string) =>
  store.db
    .delete(entryTemplates)
    .where(and(templateScope(ledgerId, userId), eq(entryTemplates.id, id)))
    .run().changes;
export const member = (store: Store, ledgerId: string, id: string) =>
  store.db
    .select()
    .from(memberships)
    .where(and(eq(memberships.ledgerId, ledgerId), eq(memberships.id, id)))
    .get();
export const category = (store: Store, ledgerId: string, id: string) =>
  store.db
    .select()
    .from(categories)
    .where(and(eq(categories.ledgerId, ledgerId), eq(categories.id, id)))
    .get();
export function entryQuery(store: Store) {
  return store.db
    .select({
      ...getTableColumns(entries),
      rowid: sql<number>`${entries}.rowid`,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      payerName: payer.displayName,
      creatorName: creator.displayName,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .innerJoin(memberships, eq(memberships.id, entries.paidByMemberId))
    .innerJoin(payer, eq(payer.id, memberships.userId))
    .innerJoin(creator, eq(creator.id, entries.createdBy));
}
export const entry = (store: Store, ledgerId: string, id: string): Entry | undefined =>
  entryQuery(store)
    .where(and(eq(entries.ledgerId, ledgerId), eq(entries.id, id)))
    .get();
export function monthRange(month: string) {
  const [year, number] = month.split('-').map(Number);
  return {
    start: `${month}-01`,
    end: new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10),
  };
}
function monthWhere(ledgerId: string, month: string) {
  const range = monthRange(month);
  return and(
    eq(entries.ledgerId, ledgerId),
    isNull(entries.deletedAt),
    gte(entries.occurredOn, range.start),
    lt(entries.occurredOn, range.end),
  );
}
export function listEntries(
  store: Store,
  ledgerId: string,
  filters: Filters,
  cursor?: string,
  limit = 51,
) {
  const cursorRowid = cursor ? Number(cursor) : undefined;
  return entryQuery(store)
    .where(
      and(
        monthWhere(ledgerId, filters.month),
        filters.kind === 'all' ? undefined : eq(entries.kind, filters.kind),
        filters.memberId === 'all' ? undefined : eq(entries.paidByMemberId, filters.memberId),
        filters.search
          ? sql`instr(lower(${entries.note} || ' ' || ${categories.name}), lower(${filters.search})) > 0`
          : undefined,
        cursorRowid !== undefined
          ? sql`${entries}.rowid < ${cursorRowid}`
          : undefined,
      ),
    )
    .orderBy(sql`${entries}.rowid DESC`)
    .limit(limit)
    .all();
}
export function summary(store: Store, ledgerId: string, month: string): Summary {
  return aggregateSummary(store, monthWhere(ledgerId, month));
}
function rangeWhere(ledgerId: string, range: { start: string; end: string }) {
  return and(
    eq(entries.ledgerId, ledgerId),
    isNull(entries.deletedAt),
    gte(entries.occurredOn, range.start),
    lte(entries.occurredOn, range.end),
  );
}
export function reportPoints(
  store: Store,
  ledgerId: string,
  granularity: ReportGranularity,
  range: { start: string; end: string },
): ReportPoint[] {
  const period = sql<string>`substr(${entries.occurredOn}, 1, ${{ day: 10, month: 7, year: 4 }[granularity]})`;
  return store.db
    .select({
      period,
      expense: sql<number>`sum(case when ${entries.kind} = 'expense' then ${entries.amountMinor} else 0 end)`,
      count: sql<number>`sum(case when ${entries.kind} = 'expense' then 1 else 0 end)`,
    })
    .from(entries)
    .where(rangeWhere(ledgerId, range))
    .groupBy(period)
    .orderBy(period)
    .all();
}
export function summaryBetween(
  store: Store,
  ledgerId: string,
  range: { start: string; end: string },
): Summary {
  return aggregateSummary(store, rangeWhere(ledgerId, range));
}
function aggregateSummary(store: Store, base: ReturnType<typeof rangeWhere>): Summary {
  const totals = store.db
    .select({
      kind: entries.kind,
      amount: sql<number>`sum(${entries.amountMinor})`,
      count: sql<number>`count(*)`,
    })
    .from(entries)
    .where(base)
    .groupBy(entries.kind)
    .all();
  const expense = totals.find((row) => row.kind === 'expense');
  const grouped = store.db
    .select({
      name: categories.name,
      icon: categories.icon,
      amount: sql<number>`sum(${entries.amountMinor})`,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .where(and(base, eq(entries.kind, 'expense')))
    .groupBy(categories.id)
    .orderBy(sql`sum(${entries.amountMinor}) DESC`)
    .all();
  const people = store.db
    .select({ name: users.displayName, amount: sql<number>`sum(${entries.amountMinor})` })
    .from(entries)
    .innerJoin(memberships, eq(memberships.id, entries.paidByMemberId))
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(base, eq(entries.kind, 'expense')))
    .groupBy(memberships.id)
    .all();
  return {
    income: totals.find((row) => row.kind === 'income')?.amount || 0,
    expense: expense?.amount || 0,
    count: expense?.count || 0,
    categories: grouped,
    members: people,
  };
}
export const insertEntry = (store: Store, value: typeof entries.$inferInsert) =>
  store.db.insert(entries).values(value).run();
export function updateEntry(
  store: Store,
  ledgerId: string,
  id: string,
  version: number,
  value: Partial<typeof entries.$inferInsert>,
) {
  return store.db
    .update(entries)
    .set({ ...value, version: version + 1, updatedAt: new Date().toISOString() })
    .where(and(eq(entries.ledgerId, ledgerId), eq(entries.id, id), eq(entries.version, version)))
    .run().changes;
}
export const mutation = (store: Store, ledgerId: string, actorId: string, requestId: string) =>
  store.db
    .select()
    .from(mutationRequests)
    .where(
      and(
        eq(mutationRequests.ledgerId, ledgerId),
        eq(mutationRequests.actorId, actorId),
        eq(mutationRequests.requestId, requestId),
      ),
    )
    .get();
export const saveMutation = (store: Store, value: typeof mutationRequests.$inferInsert) =>
  store.db.insert(mutationRequests).values(value).run();
export const insertLedger = (store: Store, value: typeof ledgers.$inferInsert) =>
  store.db.insert(ledgers).values(value).run();
export const insertMember = (store: Store, value: typeof memberships.$inferInsert) =>
  store.db.insert(memberships).values(value).run();
export const insertCategories = (store: Store, value: (typeof categories.$inferInsert)[]) =>
  store.db.insert(categories).values(value).run();
export const insertInvite = (store: Store, value: typeof invites.$inferInsert) =>
  store.db.insert(invites).values(value).run();
export const inviteByHash = (store: Store, hash: string) =>
  store.db.select().from(invites).where(eq(invites.tokenHash, hash)).get();
export const inviteList = (store: Store, ledgerId: string) =>
  store.db
    .select({
      id: invites.id,
      expiresAt: invites.expiresAt,
      consumedAt: invites.consumedAt,
      revokedAt: invites.revokedAt,
    })
    .from(invites)
    .where(eq(invites.ledgerId, ledgerId))
    .orderBy(desc(invites.createdAt))
    .limit(20)
    .all();
export function consumeInvite(store: Store, id: string, userId: string) {
  store.db
    .update(invites)
    .set({ consumedAt: Date.now(), consumedBy: userId })
    .where(eq(invites.id, id))
    .run();
}
export function revokeInvite(store: Store, ledgerId: string, id: string) {
  return store.db
    .update(invites)
    .set({ revokedAt: Date.now() })
    .where(and(eq(invites.id, id), eq(invites.ledgerId, ledgerId), isNull(invites.consumedAt)))
    .run().changes;
}

/** [INPUT]: Store、已校验的高级筛选、账单关联查询。[OUTPUT]: 同一口径的列表、总数与金额汇总。
 * [POS]: ledger 数据仓储；所有条件由 SQL 执行，分页不影响汇总。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import type { Store } from '../../db/client';
import { categories, entries } from '../../db/schema';
import type { RecordsFilters } from '@/shared/types';
import { entryQuery } from '../repo';

function conditions(ledgerId: string, filters: RecordsFilters) {
  return and(
    eq(entries.ledgerId, ledgerId),
    isNull(entries.deletedAt),
    filters.start ? gte(entries.occurredOn, filters.start) : undefined,
    filters.end ? lte(entries.occurredOn, filters.end) : undefined,
    filters.kind === 'all' ? undefined : eq(entries.kind, filters.kind),
    filters.categoryIds.length ? inArray(entries.categoryId, filters.categoryIds) : undefined,
    filters.memberId === 'all' ? undefined : eq(entries.paidByMemberId, filters.memberId),
    filters.creatorId === 'all' ? undefined : eq(entries.createdBy, filters.creatorId),
    filters.minAmount === undefined ? undefined : gte(entries.amountMinor, filters.minAmount),
    filters.maxAmount === undefined ? undefined : lte(entries.amountMinor, filters.maxAmount),
    filters.search
      ? sql`instr(lower(${entries.note} || ' ' || ${categories.name}), lower(${filters.search})) > 0`
      : undefined,
  );
}
export function list(
  store: Store,
  ledgerId: string,
  filters: RecordsFilters,
  offset: number,
  limit: number,
) {
  const orders = {
    newest: [desc(entries.occurredOn), desc(entries.id)],
    oldest: [asc(entries.occurredOn), asc(entries.id)],
    amount_desc: [desc(entries.amountMinor), desc(entries.occurredOn), desc(entries.id)],
    amount_asc: [asc(entries.amountMinor), asc(entries.occurredOn), asc(entries.id)],
  };
  return entryQuery(store)
    .where(conditions(ledgerId, filters))
    .orderBy(...orders[filters.sort])
    .offset(offset)
    .limit(limit)
    .all();
}
export function totals(store: Store, ledgerId: string, filters: RecordsFilters) {
  return store.db
    .select({
      count: sql<number>`count(*)`,
      income: sql<number>`coalesce(sum(case when ${entries.kind} = 'income' then ${entries.amountMinor} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${entries.kind} = 'expense' then ${entries.amountMinor} else 0 end), 0)`,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .where(conditions(ledgerId, filters))
    .get()!;
}

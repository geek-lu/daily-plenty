/** [INPUT]: 本域仓储/CSV 编码、共享校验与日期规则、事务上下文。[OUTPUT]: 授权账本查询、日/月/年统计与初始化。[POS]: ledger 业务规则。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { randomUUID } from 'node:crypto';
import { defaultCategoryIcon } from '@/shared/category-icons';
import { entryCsvHeader, entryCsvRow } from './csv';
import type { Store } from '../db/client';
import { ensure } from '@/shared/errors';
import { filterInput, reportInput } from '@/shared/validation';
import { completeReportPoints, reportRange } from '@/shared/report';
import { today } from '@/shared/money';
import type { Entry, EntryInput, Filters, ReportData } from '@/shared/types';
import * as repo from './repo';
export function authorize(
  store: Store,
  actorId: string,
  ledgerId: string,
  write = false,
  owner = false,
) {
  const access = repo.access(store, actorId, ledgerId);
  ensure(access && !access.ledger.archivedAt, 403, '你没有这个账本的访问权限');
  ensure(!write || access.member.role === 'editor', 403, '当前成员只能查看账单');
  ensure(!owner || access.ledger.ownerUserId === actorId, 403, '只有账本创建者可以管理邀请');
  return access;
}
export const listLedgers = repo.listLedgers;
export function createHome(store: Store, userId: string, name: string) {
  const id = randomUUID();
  repo.insertLedger(store, { id, name, ownerUserId: userId });
  repo.insertMember(store, { id: randomUUID(), ledgerId: id, userId, role: 'editor' });
  const defaults = {
    expense: [
      '餐饮',
      '买菜',
      '交通',
      '购物',
      '居家',
      '娱乐',
      '健康',
      '服饰',
      '房贷',
      '水电',
      '通讯',
      '学习',
    ],
    income: ['工资', '奖金', '其他收入', '兼职', '理财', '红包'],
  } as const;
  for (const kind of ['expense', 'income'] as const) {
    repo.insertCategories(
      store,
      defaults[kind].map((name, sortOrder) => ({
        id: randomUUID(),
        ledgerId: id,
        kind,
        name,
        icon: defaultCategoryIcon(name),
        sortOrder,
      })),
    );
  }
  return id;
}
export function validateLinks(
  store: Store,
  ledgerId: string,
  value: Pick<EntryInput, 'kind' | 'categoryId' | 'paidByMemberId'>,
  previous?: Entry,
) {
  const category = repo.category(store, ledgerId, value.categoryId);
  const member = repo.member(store, ledgerId, value.paidByMemberId);
  ensure(
    category &&
      category.kind === value.kind &&
      (!category.archivedAt || previous?.categoryId === category.id),
    400,
    '请选择此账本内有效的分类',
  );
  ensure(
    member && (!member.leftAt || previous?.paidByMemberId === member.id),
    400,
    '请选择此账本内有效的付款人',
  );
}
export function query(store: Store, actorId: string, ledgerId: string, raw: unknown) {
  const access = authorize(store, actorId, ledgerId);
  const filters = filterInput.parse(raw);
  ensure(
    !filters.cursor || /^\d+$/.test(filters.cursor),
    400,
    '分页标识无效',
  );
  const rows = repo.listEntries(store, ledgerId, filters, filters.cursor);
  const entries = rows.slice(0, 50);
  const last = entries.at(-1);
  const summary = repo.summary(store, ledgerId, filters.month);
  ensure(
    Number.isSafeInteger(summary.income) && Number.isSafeInteger(summary.expense),
    422,
    '统计金额超出安全范围',
  );
  return {
    ledger: { ...access.ledger, role: access.member.role },
    entries,
    members: repo.members(store, ledgerId),
    categories: repo.categoryList(store, ledgerId),
    templates: repo.templateList(store, ledgerId, actorId),
    summary,
    nextCursor: rows.length > 50 && last ? `${last.rowid}` : null,
  };
}
export function queryReport(
  store: Store,
  actorId: string,
  ledgerId: string,
  raw: unknown,
): ReportData {
  const filters = reportInput.parse(raw);
  return store.sqlite.transaction(() => {
    const access = authorize(store, actorId, ledgerId);
    const range = reportRange(filters);
    const summary = repo.summaryBetween(store, ledgerId, range);
    const rows = repo.reportPoints(store, ledgerId, filters.granularity, range);
    ensure(
      [summary.income, summary.expense, ...rows.map((row) => row.expense)].every(
        Number.isSafeInteger,
      ),
      422,
      '统计金额超出安全范围',
    );
    const points = completeReportPoints(
      filters,
      rows,
      Number(today(access.ledger.timezone).slice(0, 4)),
    );
    const dates =
      filters.granularity === 'year'
        ? { start: `${points[0].period}-01-01`, end: `${points.at(-1)!.period}-12-31` }
        : range;
    return {
      ledger: { ...access.ledger, role: access.member.role },
      granularity: filters.granularity,
      ...dates,
      summary,
      points,
    };
  })();
}
export function exportCsv(store: Store, actorId: string, ledgerId: string, raw: unknown) {
  authorize(store, actorId, ledgerId);
  const filters: Filters = filterInput.parse(raw);
  const lines = [entryCsvHeader];
  let cursor: string | undefined;
  do {
    const batch = repo.listEntries(store, ledgerId, filters, cursor, 500);
    for (const entry of batch) {
      lines.push(entryCsvRow(entry));
    }
    const last = batch.at(-1);
    cursor = batch.length === 500 && last ? `${last.rowid}` : undefined;
  } while (cursor);
  return '\uFEFF' + lines.join('\r\n');
}

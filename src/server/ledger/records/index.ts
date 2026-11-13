/** [INPUT]: 当前会话用户、账本、原始筛选参数及共用 CSV 编码。[OUTPUT]: 授权的全部账单分页与同口径 CSV 导出。
 * [POS]: ledger 业务层，复用成员鉴权，独立于首页月度概览。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { entryCsvHeader, entryCsvRow } from '../csv';
import type { Store } from '../../db/client';
import { recordsInput } from '@/shared/validation';
import { ensure } from '@/shared/errors';
import { authorize } from '../service';
import * as repo from '../repo';
import * as recordsRepo from './repo';
const pageSize = 30;
export function queryRecords(store: Store, actorId: string, ledgerId: string, raw: unknown) {
  const filters = recordsInput.parse(raw);
  return store.sqlite.transaction(() => {
    const access = authorize(store, actorId, ledgerId);
    const totals = recordsRepo.totals(store, ledgerId, filters);
    ensure(
      Number.isSafeInteger(totals.income) && Number.isSafeInteger(totals.expense),
      422,
      '统计金额超出安全范围',
    );
    const totalPages = Math.max(1, Math.ceil(totals.count / pageSize));
    const page = Math.min(filters.page, totalPages);
    return {
      ledger: { ...access.ledger, role: access.member.role },
      members: repo.members(store, ledgerId),
      categories: repo.categoryList(store, ledgerId),
      entries: recordsRepo.list(store, ledgerId, filters, (page - 1) * pageSize, pageSize),
      totals,
      page,
      pageSize,
      totalPages,
    };
  })();
}
export function exportRecords(store: Store, actorId: string, ledgerId: string, raw: unknown) {
  const filters = recordsInput.parse(raw);
  return store.sqlite.transaction(() => {
    authorize(store, actorId, ledgerId);
    const lines = [entryCsvHeader];
    for (let offset = 0; ; offset += 500) {
      const batch = recordsRepo.list(store, ledgerId, filters, offset, 500);
      for (const entry of batch) {
        lines.push(entryCsvRow(entry));
      }
      if (batch.length < 500) {
        break;
      }
    }
    return '\uFEFF' + lines.join('\r\n');
  })();
}

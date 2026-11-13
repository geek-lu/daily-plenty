/**
 * [INPUT]: ledger 服务及 HTTP 解析/认证契约。
 * [OUTPUT]: 账本、查询、分类、模板、邀请和账单路由表。
 * [POS]: server/http 账本适配；会话只解析一次，权限统一由服务层校验。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { atomic } from '../db/client';
import { setupInput } from '@/shared/validation';
import * as ledger from '../ledger/service';
import * as entries from '../ledger/entries';
import * as invites from '../ledger/invitations';
import * as preferences from '../ledger/preferences';
import { queryRecords, exportRecords } from '../ledger/records';
import { json, text } from './context';
import { authenticated, body, type Route } from './request';

export const ledgerRoutes: Route[] = [
  {
    method: 'GET',
    path: 'ledgers',
    handle: authenticated(({ store, userId }) =>
      json({ ledgers: ledger.listLedgers(store, userId) }),
    ),
  },
  {
    method: 'POST',
    path: 'ledgers',
    handle: authenticated(async ({ store, userId, request }) => {
      const name = setupInput.shape.ledgerName.parse((await body(request)).name);
      return json({ ledgerId: atomic(store, () => ledger.createHome(store, userId, name)) }, 201);
    }),
  },
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/data',
    handle: authenticated(({ store, userId, params, request }) =>
      json(
        ledger.query(
          store,
          userId,
          params.ledgerId,
          Object.fromEntries(request.nextUrl.searchParams),
        ),
      ),
    ),
  },
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/reports',
    handle: authenticated(({ store, userId, params, request }) =>
      json(
        ledger.queryReport(
          store,
          userId,
          params.ledgerId,
          Object.fromEntries(request.nextUrl.searchParams),
        ),
      ),
    ),
  },
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/export',
    handle: authenticated(({ store, userId, params, request }) =>
      text(
        ledger.exportCsv(
          store,
          userId,
          params.ledgerId,
          Object.fromEntries(request.nextUrl.searchParams),
        ),
        'text/csv; charset=utf-8',
      ),
    ),
  },
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/entries',
    handle: authenticated(({ store, userId, params, request }) =>
      json(
        queryRecords(
          store,
          userId,
          params.ledgerId,
          Object.fromEntries(request.nextUrl.searchParams),
        ),
      ),
    ),
  },
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/entries/export',
    handle: authenticated(({ store, userId, params, request }) =>
      text(
        exportRecords(
          store,
          userId,
          params.ledgerId,
          Object.fromEntries(request.nextUrl.searchParams),
        ),
        'text/csv; charset=utf-8',
      ),
    ),
  },
  {
    method: 'POST',
    path: 'ledgers/:ledgerId/entries',
    handle: authenticated(async ({ store, userId, params, request }) =>
      json(entries.createEntry(store, userId, params.ledgerId, await body(request)), 201),
    ),
  },
  {
    method: 'PATCH',
    path: 'ledgers/:ledgerId/entries/:id',
    handle: authenticated(async ({ store, userId, params, request }) =>
      json(entries.editEntry(store, userId, params.ledgerId, params.id, await body(request))),
    ),
  },
  {
    method: 'DELETE',
    path: 'ledgers/:ledgerId/entries/:id',
    handle: authenticated(async ({ store, userId, params, request }) =>
      json(
        entries.deleteOrRestore(store, userId, params.ledgerId, params.id, {
          ...(await body(request)),
          deleted: true,
        }),
      ),
    ),
  },
  {
    method: 'POST',
    path: 'ledgers/:ledgerId/categories',
    handle: authenticated(async ({ store, userId, params, request }) =>
      json(preferences.addCategory(store, userId, params.ledgerId, await body(request)), 201),
    ),
  },
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/templates',
    handle: authenticated(({ store, userId, params }) =>
      json({ templates: preferences.listTemplates(store, userId, params.ledgerId) }),
    ),
  },
  {
    method: 'POST',
    path: 'ledgers/:ledgerId/templates',
    handle: authenticated(async ({ store, userId, params, request }) =>
      json(preferences.saveTemplate(store, userId, params.ledgerId, await body(request)), 201),
    ),
  },
  {
    method: 'PATCH',
    path: 'ledgers/:ledgerId/templates/:id',
    handle: authenticated(async ({ store, userId, params, request }) =>
      json(
        preferences.saveTemplate(store, userId, params.ledgerId, await body(request), params.id),
      ),
    ),
  },
  {
    method: 'DELETE',
    path: 'ledgers/:ledgerId/templates/:id',
    handle: authenticated(({ store, userId, params }) =>
      json(preferences.removeTemplate(store, userId, params.ledgerId, params.id)),
    ),
  },
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/invites',
    handle: authenticated(({ store, userId, params }) =>
      json({ invites: invites.list(store, userId, params.ledgerId) }),
    ),
  },
  {
    method: 'POST',
    path: 'ledgers/:ledgerId/invites',
    handle: authenticated(({ store, userId, params }) =>
      json(invites.createInvite(store, userId, params.ledgerId), 201),
    ),
  },
  {
    method: 'DELETE',
    path: 'ledgers/:ledgerId/invites/:id',
    handle: authenticated(({ store, userId, params }) => {
      invites.revoke(store, userId, params.ledgerId, params.id);
      return json({ ok: true });
    }),
  },
];

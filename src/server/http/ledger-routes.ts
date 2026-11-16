/**
 * [INPUT]: ledger 服务及 HTTP 解析/认证契约。
 * [OUTPUT]: 账本、查询、分类、模板、邀请、账单和评论路由表。
 * [POS]: server/http 账本适配；密钥可查询/新增及修改 AI 账单，权限与来源限制由服务校验。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { atomic } from '../db/client';
import { setupInput } from '@/shared/validation';
import * as ledger from '../ledger/service';
import * as entries from '../ledger/entries';
import { createApiEntry, editApiEntry } from '../ledger/api-entries';
import * as comments from '../ledger/comments';
import * as invites from '../ledger/invitations';
import * as preferences from '../ledger/preferences';
import { queryRecords, exportRecords } from '../ledger/records';
import { json, text } from './context';
import { authenticated, ledgerAuthenticated, body, type Route } from './request';

export const ledgerRoutes: Route[] = [
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/recorders',
    handle: ledgerAuthenticated(({ store, principal, params }) =>
      json({ recorders: ledger.listRecorders(store, principal, params.ledgerId) }),
    ),
  },
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/entries/:id/comments',
    handle: authenticated(({ store, userId, params }) =>
      json({ comments: comments.listComments(store, userId, params.ledgerId, params.id) }),
    ),
  },
  {
    method: 'POST',
    path: 'ledgers/:ledgerId/entries/:id/comments',
    handle: authenticated(async ({ store, userId, params, request }) =>
      json(
        comments.createComment(store, userId, params.ledgerId, params.id, await body(request)),
        201,
      ),
    ),
  },
  {
    method: 'GET',
    path: 'ledgers',
    handle: ledgerAuthenticated(({ store, principal }) =>
      json({ ledgers: ledger.listLedgers(store, principal) }),
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
    handle: ledgerAuthenticated(({ store, principal, params, request }) =>
      json(
        ledger.query(
          store,
          principal,
          params.ledgerId,
          Object.fromEntries(request.nextUrl.searchParams),
        ),
      ),
    ),
  },
  {
    method: 'GET',
    path: 'ledgers/:ledgerId/reports',
    handle: ledgerAuthenticated(({ store, principal, params, request }) =>
      json(
        ledger.queryReport(
          store,
          principal,
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
    handle: ledgerAuthenticated(({ store, principal, params, request }) =>
      json(
        queryRecords(
          store,
          principal,
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
    method: 'GET',
    path: 'ledgers/:ledgerId/entries/:id',
    handle: ledgerAuthenticated(({ store, principal, params }) =>
      json(ledger.getEntry(store, principal, params.ledgerId, params.id)),
    ),
  },
  {
    method: 'POST',
    path: 'ledgers/:ledgerId/entries',
    handle: ledgerAuthenticated(async ({ store, principal, params, request }) => {
      const input = await body(request);
      const entry =
        typeof principal === 'string'
          ? entries.createEntry(store, principal, params.ledgerId, input)
          : createApiEntry(store, principal, params.ledgerId, input);
      return json(entry, 201);
    }),
  },
  {
    method: 'PATCH',
    path: 'ledgers/:ledgerId/entries/:id',
    handle: ledgerAuthenticated(async ({ store, principal, params, request }) => {
      const input = await body(request);
      return json(
        typeof principal === 'string'
          ? entries.editEntry(store, principal, params.ledgerId, params.id, input)
          : editApiEntry(store, principal, params.ledgerId, params.id, input),
      );
    }),
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

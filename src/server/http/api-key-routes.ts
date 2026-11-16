/**
 * [INPUT]: auth 密钥服务、仅网页登录的 authenticated 包装与 JSON 解析。
 * [OUTPUT]: /auth/api-keys 的账本共享列表、按账本生成与撤销路由。
 * [POS]: HTTP 密钥管理适配，禁止使用 API Key 管理密钥，用户身份取会话。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as keys from '../auth/api-keys';
import { json } from './context';
import { authenticated, body, type Route } from './request';

export const apiKeyRoutes: Route[] = [
  {
    method: 'GET',
    path: 'auth/api-keys',
    handle: authenticated(({ store, userId }) => json({ keys: keys.listKeys(store, userId) })),
  },
  {
    method: 'POST',
    path: 'auth/api-keys',
    handle: authenticated(async ({ store, userId, request }) =>
      json(keys.createKey(store, userId, await body(request)), 201),
    ),
  },
  {
    method: 'DELETE',
    path: 'auth/api-keys/:id',
    handle: authenticated(({ store, userId, params }) =>
      json(keys.revokeKey(store, userId, params.id)),
    ),
  },
];

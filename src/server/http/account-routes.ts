/**
 * [INPUT]: 账户跨域流程、用户服务和 HTTP 契约。
 * [OUTPUT]: 初始化、登录/退出、当前用户和邀请接受路由；账户操作仅接受网页登录。
 * [POS]: server/http 账户适配；仅解析请求、调用流程、设置响应 Cookie。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as accounts from '../flows/accounts';
import * as users from '../user/service';
import * as auth from '../auth/service';
import { json, setSession, clearSession, optionalActor, actor } from './context';
import { authenticated, body, type Route } from './request';

export const accountRoutes: Route[] = [
  { method: 'GET', path: 'setup/status', handle: ({ store }) => json(accounts.setupStatus(store)) },
  {
    method: 'POST',
    path: 'setup',
    handle: async ({ request, store }) => {
      const result = await accounts.setup(store, await body(request));
      return setSession(json(result.data), result.sessionToken);
    },
  },
  {
    method: 'POST',
    path: 'auth/session',
    handle: async ({ request, store }) => {
      const result = await accounts.login(
        store,
        await body(request),
        request.headers.get('x-forwarded-for') || 'local',
      );
      return setSession(json(result.data), result.sessionToken);
    },
  },
  {
    method: 'DELETE',
    path: 'auth/session',
    handle: authenticated(({ store, token }) => {
      auth.logout(store, token);
      return clearSession(json({ ok: true }));
    }),
  },
  {
    method: 'GET',
    path: 'users/me',
    handle: authenticated(({ store, userId }) => json({ user: users.profile(store, userId) })),
  },
  {
    method: 'PATCH',
    path: 'users/me',
    handle: authenticated(async ({ store, userId, request }) =>
      json({ user: users.updateProfile(store, userId, await body(request)) }),
    ),
  },
  {
    method: 'POST',
    path: 'invites/accept',
    handle: async ({ store, request }) => {
      if (request.headers.has('authorization')) {
        actor(request, store);
      }
      const current = await optionalActor();
      const result = await accounts.acceptInvite(store, await body(request), current.userId);
      const response = json(result.data);
      return result.sessionToken ? setSession(response, result.sessionToken) : response;
    },
  },
];

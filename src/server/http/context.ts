/** [INPUT]: Next Cookie/Request、Store、会话与 API 密钥服务、HTTP 开关。[OUTPUT]: 页面会话、含绑定账本的 Bearer 鉴权与响应。[POS]: L4 HTTP 运行时。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getStore, type Store } from '@/server/db/client';
import { sessionUser } from '@/server/auth/service';
import { keyIdentity } from '@/server/auth/api-keys';
import type { LedgerPrincipal } from '@/server/ledger/access';
import { ensure } from '@/shared/errors';
export const SESSION_COOKIE = 'daily_plenty_session';
function secureCookie() {
  const preview =
    process.env.DAILY_PLENTY_LOCAL_PREVIEW === 'true' && process.env.HOSTNAME === '127.0.0.1';
  const allowHttp = process.env.DAILY_PLENTY_ALLOW_HTTP === 'true';
  return process.env.NODE_ENV === 'production' && !preview && !allowHttp;
}
export async function optionalActor() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value || null;
  return { userId: sessionUser(getStore(), token), token };
}
export function ledgerActor(request: NextRequest, store: Store): LedgerPrincipal {
  const authorization = request.headers.get('authorization');
  if (authorization !== null) {
    const match = /^Bearer (\S+)$/i.exec(authorization);
    const identity = match ? keyIdentity(store, match[1]) : null;
    ensure(identity, 401, 'API 密钥无效、已撤销或账本访问已失效', 'UNAUTHENTICATED');
    return identity;
  }
  return actor(request, store).userId;
}
export function actor(request: NextRequest, store: Store) {
  ensure(!request.headers.has('authorization'), 403, '此操作需要网页登录', 'SESSION_REQUIRED');
  const token = request.cookies.get(SESSION_COOKIE)?.value || null;
  const userId = sessionUser(store, token);
  ensure(userId, 401, '请先登录', 'UNAUTHENTICATED');
  return { userId, token };
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export function text(data: string, contentType = 'text/plain; charset=utf-8') {
  return new NextResponse(data, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'private, no-store' },
  });
}
export function setSession(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie(),
    path: '/',
    maxAge: 30 * 86400,
  });
  return response;
}
export function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie(),
    path: '/',
    maxAge: 0,
  });
  return response;
}

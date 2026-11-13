/** [INPUT]: Next Cookie、Store、显式 HTTP/本机预览开关。[OUTPUT]: 可选/必需会话及响应；生产默认 Secure Cookie。[POS]: L4 HTTP 运行时。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStore } from '@/server/db/client';
import { sessionUser } from '@/server/auth/service';
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
export async function actor() {
  const current = await optionalActor();
  ensure(current.userId, 401, '请先登录', 'UNAUTHENTICATED');
  return { userId: current.userId, token: current.token };
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

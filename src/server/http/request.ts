/**
 * [INPUT]: NextRequest、数据库/会话上下文及公共错误类型。
 * [OUTPUT]: HTTP handler 契约、JSON 解析、默认仅会话/显式开放密钥的认证包装、绑定账本约束与统一错误响应。
 * [POS]: server/http 边界基础；不承载账户或账单业务。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { Store } from '../db/client';
import { AppError, ensure } from '@/shared/errors';
import { actor, ledgerActor, json } from './context';
import type { LedgerPrincipal } from '../ledger/access';

export type RequestContext = { request: NextRequest; store: Store; params: Record<string, string> };
export type Handler = (context: RequestContext) => NextResponse | Promise<NextResponse>;
export type Route = { method: string; path: string; handle: Handler };
type SessionContext = RequestContext & {
  userId: string;
  token: string | null;
};

export function authenticated(handle: (context: SessionContext) => ReturnType<Handler>): Handler {
  return (context) => handle({ ...context, ...actor(context.request, context.store) });
}

export function ledgerAuthenticated(
  handle: (context: RequestContext & { principal: LedgerPrincipal }) => ReturnType<Handler>,
): Handler {
  return (context) => {
    const principal = ledgerActor(context.request, context.store);
    ensure(
      typeof principal === 'string' ||
        !context.params.ledgerId ||
        principal.ledgerId === context.params.ledgerId,
      403,
      '这枚 API 密钥只能访问绑定的账本',
      'LEDGER_SCOPE_MISMATCH',
    );
    return handle({ ...context, principal });
  };
}

export async function body(request: NextRequest): Promise<Record<string, unknown>> {
  const input: unknown = await request.json().catch(() => {
    throw new AppError(400, '请求内容不是有效 JSON');
  });
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError(400, '请求内容必须是 JSON 对象');
  }
  return input as Record<string, unknown>;
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof ZodError) {
    return json({ error: '请求字段不符合要求', code: 'INVALID_INPUT', details: error.issues }, 400);
  }
  console.error(error);
  return json({ error: '服务暂时不可用，请稍后重试', code: 'INTERNAL_ERROR' }, 500);
}

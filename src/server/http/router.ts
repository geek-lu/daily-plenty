/**
 * [INPUT]: 账户/账本/API 密钥管理路由表、HTTP 请求与延迟数据库连接。
 * [OUTPUT]: 唯一 API dispatch；精确匹配方法/段数，未知接口返回 404。
 * [POS]: server/http 路由入口；不包含业务规则或重复异常捕获。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { NextRequest } from 'next/server';
import { getStore } from '../db/client';
import { AppError } from '@/shared/errors';
import { accountRoutes } from './account-routes';
import { ledgerRoutes } from './ledger-routes';
import { apiKeyRoutes } from './api-key-routes';
import { errorResponse } from './request';

const routes = [...accountRoutes, ...ledgerRoutes, ...apiKeyRoutes].map((route) => ({
  ...route,
  segments: route.path.split('/'),
}));

function matches(pattern: string[], path: string[]) {
  return (
    pattern.length === path.length &&
    pattern.every((part, index) => part.startsWith(':') || part === path[index])
  );
}

export async function dispatch(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path = [] } = await context.params;
    const route = routes.find(
      (route) => route.method === request.method && matches(route.segments, path),
    );
    if (!route) {
      throw new AppError(404, '找不到这个接口', 'NOT_FOUND');
    }
    const params = Object.fromEntries(
      route.segments.flatMap((part, index) =>
        part.startsWith(':') ? [[part.slice(1), path[index]]] : [],
      ),
    );
    return await route.handle({ request, params, store: getStore() });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * [INPUT]: server/http 的统一 dispatch。
 * [OUTPUT]: Next.js 支持的 GET/POST/PATCH/DELETE 请求入口。
 * [POS]: App Router 薄适配层；路由表、错误处理和业务协调位于服务端。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { dispatch } from '@/server/http/router';

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;

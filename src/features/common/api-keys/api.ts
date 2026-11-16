/**
 * [INPUT]: 同源 API 与共享密钥元数据类型。
 * [OUTPUT]: 当前用户密钥列表、指定账本生成与撤销请求。
 * [POS]: API 密钥前端数据边界；秘密不写入浏览器持久存储。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { api } from '../api';
import type { ApiKey, CreatedApiKey } from '@/shared/types';

export const listKeys = (signal?: AbortSignal) =>
  api<{ keys: ApiKey[] }>('auth/api-keys', { signal });
export const createKey = (name: string, ledgerId: string) =>
  api<CreatedApiKey>('auth/api-keys', { method: 'POST', body: JSON.stringify({ name, ledgerId }) });
export const revokeKey = (id: string) =>
  api<{ ok: boolean }>(`auth/api-keys/${id}`, { method: 'DELETE' });

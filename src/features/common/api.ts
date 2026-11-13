/** [INPUT]: 同源 HTTP API。[OUTPUT]: api、ApiError 与 uid。
 * [POS]: 前端请求边界，保留状态码和校验消息。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export const uid = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: '请求失败，请稍后重试' }));
    throw new ApiError(data.details?.[0]?.message || data.error || '请求失败', response.status);
  }
  return response.headers.get('content-type')?.includes('text/csv')
    ? ((await response.text()) as T)
    : response.json();
}

/** [INPUT]: 无。[OUTPUT]: 可安全返回的业务错误。[POS]: 跨端错误契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  status: number,
  message: string,
  code?: string,
): asserts condition {
  if (!condition) {
    throw new AppError(status, message, code);
  }
}

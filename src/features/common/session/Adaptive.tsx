'use client';
/** [INPUT]: ui/useMediaQuery。[OUTPUT]: desktopQuery 断点、useIsDesktop、按设备二选一渲染的 Adaptive。
 * [POS]: common/session 设备切换点；pc/ 与 m/ 视图只在这里分流，CSS 不复制断点判断。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { ReactNode } from 'react';
import { useMediaQuery } from '@/ui/useMediaQuery';

// 与 globals.css 中 PC 侧边抽屉的 @media (min-width: 1024px) 保持一致。
export const desktopQuery = '(min-width: 1024px)';

export function useIsDesktop() {
  return useMediaQuery(desktopQuery);
}

export function Adaptive({ pc, m }: { pc: ReactNode; m: ReactNode }) {
  return useIsDesktop() ? pc : m;
}

'use client';
/** [INPUT]: 浏览器 matchMedia。[OUTPUT]: useMediaQuery 订阅式布尔值。
 * [POS]: ui 浏览器适配；服务端快照固定为 false，水合后按真实视口更新，跨断点时自动重渲染。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

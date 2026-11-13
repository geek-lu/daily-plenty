'use client';
/** [INPUT]: 弹层打开状态与浏览器 VisualViewport。[OUTPUT]: React 可直接渲染的视口样式。
 * [POS]: 浏览器视口适配；只读取尺寸并订阅变化，滚动锁由 CSS 负责，卸载恢复滚动位置。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useLayoutEffect, useMemo, useState, type CSSProperties } from 'react';

type Viewport = { height: number; top: number; keyboard: boolean };
export function useDialogViewport(open: boolean): CSSProperties {
  const [size, setSize] = useState<Viewport | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const scrollY = window.scrollY;
    const viewport = window.visualViewport;
    const update = () => {
      if (viewport && viewport.scale > 1.05) {
        return;
      }
      const height = viewport?.height || window.innerHeight;
      const next = {
        height,
        top: viewport?.offsetTop || 0,
        keyboard: window.innerHeight - height > 120,
      };
      setSize((previous) =>
        previous?.height === next.height &&
        previous.top === next.top &&
        previous.keyboard === next.keyboard
          ? previous
          : next,
      );
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  }, [open]);
  return useMemo(
    () =>
      size
        ? ({
            '--dialog-height': `${size.height}px`,
            '--dialog-top': `${size.top}px`,
            '--dialog-bottom-inset': size.keyboard ? '0px' : 'env(safe-area-inset-bottom, 0px)',
          } as CSSProperties)
        : {},
    [size],
  );
}

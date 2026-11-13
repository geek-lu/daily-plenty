'use client';
/** [INPUT]: React 子树、显隐状态和系统动态效果偏好。[OUTPUT]: Presence、Collapse、useExiting。
 * [POS]: 公共声明式动效边界；不克隆 DOM、不改样式，退出完成后由 React 卸载。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const ExitingContext = createContext(false);
const preference = () => window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribe = (notify: () => void) => {
  const query = preference();
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
export const useExiting = () => useContext(ExitingContext);

export function Presence({ show, children }: { show: boolean; children: ReactNode }) {
  const reduced = useSyncExternalStore(
    subscribe,
    () => preference().matches,
    () => true,
  );
  const [retained, setRetained] = useState<ReactNode>(null);
  useLayoutEffect(() => {
    if (show) {
      setRetained(children);
    } else if (reduced) {
      setRetained(null);
    }
  }, [show, children, reduced]);
  if (!show && (!retained || reduced)) {
    return null;
  }
  return (
    <ExitingContext.Provider value={!show}>
      <div
        className="motion-presence"
        data-state={show ? 'visible' : 'exiting'}
        inert={!show}
        aria-hidden={!show || undefined}
        onAnimationEnd={(event) => {
          if (
            !show &&
            event.target === event.currentTarget &&
            event.animationName === 'ui-fade-out'
          ) {
            setRetained(null);
          }
        }}
      >
        {show ? children : retained}
      </div>
    </ExitingContext.Provider>
  );
}

export function Collapse({
  open,
  children,
  id,
}: {
  open: boolean;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="motion-collapse"
      data-open={open}
      inert={!open}
      aria-hidden={!open}
    >
      <div>{children}</div>
    </div>
  );
}

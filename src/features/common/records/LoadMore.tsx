'use client';
/** [INPUT]: 已加载/总数、是否还有更多、加载状态、回调与可选滚动根。[OUTPUT]: LoadMore 列表尾部哨兵与兜底按钮。
 * [POS]: common/records 无限下拉；手机列表与 PC 表格共用，IntersectionObserver 仅订阅不写 DOM。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useEffect, useRef, type RefObject } from 'react';
import './records-common.css';
// ---- 列表尾部哨兵：进入视口（或指定滚动容器）前 400px 预加载；按钮兜底失败重试与不支持观察器的浏览器 ----
export function LoadMore(props: {
  loaded: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string;
  onLoad: () => void;
  // 列表位于内部滚动容器时传入，否则以视口为根，提前量会被容器裁切而失效。
  root?: RefObject<HTMLElement | null>;
}) {
  const { hasMore, loading, error, onLoad, root } = props;
  const sentinel = useRef<HTMLDivElement>(null);
  const latest = useRef(onLoad);
  latest.current = onLoad;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || loading || error || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (items) => {
        if (items.some((item) => item.isIntersecting)) {
          latest.current();
        }
      },
      { root: root?.current ?? null, rootMargin: '0px 0px 400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, error, root]);
  return (
    <div
      ref={sentinel}
      className="records-load-more"
    >
      <p
        className="text-xs muted"
        role="status"
      >
        {loading
          ? '正在加载更多…'
          : hasMore
            ? `已显示 ${props.loaded} / ${props.total} 笔`
            : `已显示全部 ${props.total} 笔`}
      </p>
      {error && <p className="text-xs text-accent">{error}</p>}
      {hasMore && !loading && (
        <button
          type="button"
          className="btn text-sm"
          onClick={onLoad}
        >
          {error ? '重试' : '加载更多'}
        </button>
      )}
    </div>
  );
}

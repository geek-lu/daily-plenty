'use client';
/**
 * [INPUT]: React、Pointer Events、可用状态、操作标签与回调。
 * [OUTPUT]: 向左拖动展开右侧操作，零位移时完全隐藏操作层；鼠标按下捕获、28px 松手吸附，保留纵向滚动与点击确认。
 * [POS]: 无业务依赖的浏览器手势适配；位移通过 React style 渲染。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import './swipe-reveal.css';

const width = 88;
const threshold = 6;
const revealDistance = 28;
type Gesture = {
  id: number;
  x: number;
  y: number;
  start: number;
  axis: 'pending' | 'x' | 'y';
  offset: number;
};

export function SwipeReveal({
  children,
  enabled,
  actionLabel,
  onAction,
}: {
  children: ReactNode;
  enabled: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const opened = enabled && offset === -width && !dragging;

  const close = () => {
    gesture.current = null;
    setOffset(0);
    setDragging(false);
  };
  useEffect(() => {
    if (!enabled) {
      gesture.current = null;
      setOffset(0);
      setDragging(false);
    }
  }, [enabled]);

  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || !event.isPrimary || event.button !== 0) {
      close();
      return;
    }
    suppressClick.current = false;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: offset,
      offset,
      axis: 'pending',
    };
    if (event.pointerType === 'mouse') {
      // 先由按下的元素捕获，保留普通点击的按钮目标；横拖后再交给容器。
      (event.target as Element).setPointerCapture(event.pointerId);
    }
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || !enabled) {
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (current.axis === 'pending') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) {
        return;
      }
      suppressClick.current = true;
      // 斜向起拖先等待明确方向，不提前锁死为纵向滚动。
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= Math.min(Math.abs(dx), Math.abs(dy)) * 1.2) {
        return;
      }
      current.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      if (current.axis === 'x') {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }
    }
    if (current.axis === 'x') {
      current.offset = Math.min(0, Math.max(-width, current.start + dx));
      setOffset(current.offset);
    }
  };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) {
      return;
    }
    gesture.current = null;
    setDragging(false);
    if (current.axis === 'x') {
      const distance = current.offset - current.start;
      const target = distance < 0 ? -width : 0;
      setOffset(Math.abs(distance) >= revealDistance ? target : current.start);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const cancel = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.id === event.pointerId) {
      suppressClick.current = true;
      close();
    }
  };

  return (
    <div
      className="swipe-reveal"
      data-enabled={enabled}
      data-open={opened}
      onKeyDown={(event) => {
        if (!enabled) {
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          setOffset(-width);
        } else if (event.key === 'ArrowRight' || event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}
    >
      <div
        className="swipe-reveal-content"
        data-dragging={dragging}
        style={{ transform: `translateX(${enabled ? offset : 0}px)` }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={cancel}
        onLostPointerCapture={(event) => {
          // 子按钮把捕获权交给本容器时，冒泡的 lost 不是手势取消。
          if (event.target === event.currentTarget) {
            cancel(event);
          }
        }}
        onDragStart={(event) => {
          if (enabled) {
            event.preventDefault();
          }
        }}
        onClickCapture={(event) => {
          if (suppressClick.current && event.detail !== 0) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
            return;
          }
          if (opened) {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
      >
        {children}
      </div>
      {enabled && (
        <div
          className="swipe-reveal-action"
          hidden={offset === 0}
          inert={!opened}
          aria-hidden={!opened}
        >
          <button
            type="button"
            disabled={!opened}
            onClick={() => {
              close();
              onAction();
            }}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

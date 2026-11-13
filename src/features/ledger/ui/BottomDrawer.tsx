'use client';
/** [INPUT]: 标题、表单、Presence 退出状态及声明式视口样式。[OUTPUT]: Portal 底部抽屉组件。
 * [POS]: 共用抽屉壳；显隐由 React/CSS 管理，ref 仅用于焦点约束与恢复。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useExiting } from '@/ui/motion';
import { useDialogViewport } from '../useDialogViewport';
import { InterfaceIcon } from './InterfaceIcon';

export function BottomDrawer({
  title,
  children,
  actions,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  actions?: (close: () => void) => React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const closing = useExiting();
  const titleId = useId();
  const viewportStyle = useDialogViewport(mounted);
  const panel = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    setMounted(true);
  }, []);
  useLayoutEffect(() => {
    if (!mounted) {
      return;
    }
    const trigger = document.activeElement;
    panel.current?.focus({ preventScroll: true });
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [mounted]);
  useLayoutEffect(() => {
    // 浏览器适配：只调整表单内部滚动，所有可视样式仍由 React 声明。
    const field = document.activeElement;
    const scroller = scrollArea.current;
    if (!(field instanceof HTMLElement) || !scroller?.contains(field)) {
      return;
    }
    const area = scroller.getBoundingClientRect();
    const rect = field.getBoundingClientRect();
    if (rect.bottom > area.bottom - 16) {
      scroller.scrollBy({ top: rect.bottom - area.bottom + 16, behavior: 'instant' });
    } else if (rect.top < area.top + 16) {
      scroller.scrollBy({ top: rect.top - area.top - 16, behavior: 'instant' });
    }
  }, [viewportStyle]);
  const close = () => {
    if (!busy && !closing) {
      onClose();
    }
  };
  if (!mounted) {
    return null;
  }
  return createPortal(
    <div
      style={viewportStyle}
      className="mobile-dialog bottom-drawer"
      data-closing={closing}
      inert={closing}
      aria-hidden={closing || undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        ref={panel}
        className="mobile-dialog-panel bottom-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
          if (event.key !== 'Tab') {
            return;
          }
          const fields = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex="0"]',
            ) || [],
          ).filter((element) => !element.closest('[inert]') && element.getClientRects().length > 0);
          if (!fields.length) {
            event.preventDefault();
            return;
          }
          const first = fields[0];
          const last = fields[fields.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === panel.current)
          ) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last || document.activeElement === panel.current)
          ) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <span
          className="bottom-drawer-handle"
          aria-hidden="true"
        />
        <header className="mobile-dialog-header">
          <h2
            id={titleId}
            className="serif"
          >
            {title}
          </h2>
          <button
            type="button"
            className="grid h-12 w-12 shrink-0 place-items-center rounded border border-line muted"
            onClick={close}
            disabled={busy || closing}
            aria-label="关闭抽屉"
          >
            <InterfaceIcon
              name="close"
              size={20}
            />
          </button>
        </header>
        <div
          ref={scrollArea}
          className="mobile-dialog-scroll"
        >
          {children}
        </div>
        {actions && <footer className="mobile-dialog-actions">{actions(close)}</footer>}
      </div>
    </div>,
    document.body,
  );
}

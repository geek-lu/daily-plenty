/** [INPUT]: 页面标题、说明、右侧操作与内容。[OUTPUT]: PcPage 页面骨架（默认页面滚动，fixed 时整屏内滚动）、PcPanel 卡片（fill 时内部滚动）、PcToast 浮动提示、PcStats 指标条。
 * [POS]: pc/shell 公共版式原子；四个 PC 页面共用同一标题栏与卡片节奏，不含业务数据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { ReactNode, Ref } from 'react';
import './pc-page.css';

export function PcPage({
  fixed = false,
  eyebrow,
  title,
  subtitle,
  actions,
  status,
  children,
}: {
  fixed?: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={`pc-page${fixed ? ' pc-page-fixed' : ''}`}>
      <header className="pc-page-header">
        <div>
          <p className="page-eyebrow">{eyebrow}</p>
          <h1 className="serif">{title}</h1>
          {subtitle && <p className="pc-page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="pc-page-actions">{actions}</div>}
      </header>
      <p
        className="page-loading-status"
        role="status"
      >
        {status || ' '}
      </p>
      <div className="pc-page-body">{children}</div>
    </main>
  );
}

export function PcPanel({
  title,
  extra,
  className = '',
  fill = false,
  bodyRef,
  children,
}: {
  title?: string;
  extra?: ReactNode;
  className?: string;
  // fill：占满父级剩余高度，标题固定、内容区内部滚动。
  fill?: boolean;
  bodyRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <section className={`pc-panel ${fill ? 'pc-panel-fill' : ''} ${className}`}>
      {(title || extra) && (
        <div className="pc-panel-heading">
          {title && <h2>{title}</h2>}
          {extra}
        </div>
      )}
      {fill ? (
        <div
          ref={bodyRef}
          className="pc-panel-body"
        >
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// 浮动提示：固定在内容区右下角，出现/消失不挤压整屏布局。
export function PcToast({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div
      className="pc-toast"
      role="status"
    >
      <span>{children}</span>
      {onClose && (
        <button
          type="button"
          className="pc-toast-close"
          onClick={onClose}
          aria-label="关闭提示"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function PcStats({
  items,
}: {
  items: { label: string; value: string; tone?: 'positive' | 'accent' }[];
}) {
  return (
    <section
      className="pc-stats"
      aria-label="关键指标"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="pc-stat"
        >
          <p className="pc-stat-label">{item.label}</p>
          <p className={`pc-stat-value num ${item.tone ? `text-${item.tone}` : ''}`}>
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}

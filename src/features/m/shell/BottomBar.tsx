'use client';
/** [INPUT]: common/session 的 useTabLinks、记账上下文与界面图标。[OUTPUT]: 手机底部四页导航 + 中央记一笔。
 * [POS]: m/shell 手机导航；由 app/(main)/layout 注入 AppShell，PC 侧边栏见 pc/shell/Sidebar。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { Fragment } from 'react';
import Link from 'next/link';
import { InterfaceIcon } from '@/features/common/ui/InterfaceIcon';
import { useEntryComposer } from '@/features/common/entry/EntryComposer';
import { stayOnActive, useTabLinks } from '@/features/common/session/useTabLinks';
import './bottom-bar.css';

export function BottomBar() {
  const composer = useEntryComposer();
  const links = useTabLinks();
  return (
    <nav
      className="app-bottom-bar"
      aria-label="主导航"
    >
      <div className="app-bottom-items">
        {links.map((tab, index) => (
          <Fragment key={tab.path}>
            {index === 2 && (
              <button
                type="button"
                className="app-create-entry"
                onClick={composer.openEntry}
                disabled={!composer.canCreate}
                aria-label="记一笔"
                aria-haspopup="dialog"
                aria-expanded={composer.isOpen}
              >
                <span>
                  <InterfaceIcon
                    name="plus"
                    size={28}
                  />
                </span>
                <small>记一笔</small>
              </button>
            )}
            <Link
              href={tab.href}
              onClick={stayOnActive(tab.currentPage)}
              className="app-tab"
              aria-current={tab.active ? 'page' : undefined}
            >
              <InterfaceIcon
                name={tab.icon}
                size={24}
              />
              <span>{tab.label}</span>
            </Link>
          </Fragment>
        ))}
      </div>
    </nav>
  );
}

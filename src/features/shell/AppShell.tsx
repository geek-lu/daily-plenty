'use client';
/** [INPUT]: 会话 runtime、EntryComposer、路由与独立业务页面。[OUTPUT]: 仅认证就绪后显示的持久四页导航及记账动作、鉴权与安全区。
 * [POS]: 四个主页面共享布局；只统一导航，不统一业务内容排版。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { Fragment, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { InterfaceIcon } from '../ledger/ui/InterfaceIcon';
import { EntryComposerProvider, useEntryComposer } from '../entry/EntryComposer';
import { AuthView } from './AuthView';
import { SessionProvider, useSession } from './runtime';
import { tabs, tabHref } from './navigation';
import './shell.css';

export function BottomBar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const composer = useEntryComposer();
  const { ledgerId, user } = useSession();
  const [history, setHistory] = useState<{ user: string; urls: Record<string, string> }>({
    user: '',
    urls: {},
  });
  const query = params.toString();
  const current = `${pathname}${query ? `?${query}` : ''}`;
  useEffect(() => {
    if (!user) {
      setHistory({ user: '', urls: {} });
      return;
    }
    const url = new URL(current, 'http://localhost');
    if (ledgerId) {
      url.searchParams.set('ledger', ledgerId);
    }
    setHistory((previous) => ({
      user: user.id,
      urls: {
        ...(previous.user === user.id ? previous.urls : {}),
        [`${ledgerId}:${pathname}`]: `${url.pathname}${url.search}`,
      },
    }));
  }, [current, ledgerId, pathname, user]);
  return (
    <nav
      className="app-bottom-bar"
      aria-label="主导航"
    >
      <div className="app-bottom-items">
        {tabs.map((tab, index) => (
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
              href={
                tab.path === pathname
                  ? current
                  : tabHref(tab.path, ledgerId, history.user === user?.id ? history.urls : {})
              }
              onClick={(event) => {
                if (tab.path === pathname) {
                  event.preventDefault();
                }
              }}
              className="app-tab"
              aria-current={tab.path === pathname ? 'page' : undefined}
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
function ShellContent({ children }: { children: React.ReactNode }) {
  const session = useSession();
  return (
    <div
      className="app-shell"
      data-ready={session.mode === 'ready'}
    >
      <div className="app-page-area">
        {session.mode === 'loading' && (
          <div
            className="app-status"
            role="status"
          >
            正在打开日日有余…
          </div>
        )}
        {(session.mode === 'setup' || session.mode === 'login') && (
          <AuthView
            key={session.mode}
            setup={session.mode === 'setup'}
            onDone={session.boot}
          />
        )}
        {session.mode === 'error' && (
          <div className="app-status">
            <p role="alert">{session.error}</p>
            <button
              className="btn"
              onClick={session.boot}
            >
              重新加载
            </button>
          </div>
        )}
        {session.mode === 'ready' && (
          <Suspense
            fallback={
              <div
                className="app-status"
                role="status"
              >
                正在打开页面…
              </div>
            }
          >
            {children}
          </Suspense>
        )}
      </div>
      {session.mode === 'ready' && <BottomBar />}
    </div>
  );
}
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <EntryComposerProvider>
        <ShellContent>{children}</ShellContent>
      </EntryComposerProvider>
    </SessionProvider>
  );
}

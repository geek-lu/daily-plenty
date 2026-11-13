'use client';
/** [INPUT]: 会话 runtime、EntryComposer、AuthView、设备断点与上层传入的 pc/m 导航元素。
 * [OUTPUT]: 仅认证就绪后显示导航的共享外壳；data-device 区分 PC 侧边栏与手机底栏布局。
 * [POS]: common/session 布局骨架；不依赖 pc/、m/ 目录，导航由 app/(main)/layout 注入。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { Suspense, type ReactNode } from 'react';
import { EntryComposerProvider } from '../entry/EntryComposer';
import { AuthView } from './AuthView';
import { SessionProvider, useSession } from './runtime';
import { useIsDesktop } from './Adaptive';
import './shell.css';

type Navigation = { pc: ReactNode; m: ReactNode };

function ShellContent({ children, nav }: { children: ReactNode; nav: Navigation }) {
  const session = useSession();
  const desktop = useIsDesktop();
  const ready = session.mode === 'ready';
  return (
    <div
      className="app-shell"
      data-ready={ready}
      data-device={desktop ? 'pc' : 'm'}
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
        {ready && (
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
      {ready && (desktop ? nav.pc : nav.m)}
    </div>
  );
}

export default function AppShell({ children, nav }: { children: ReactNode; nav: Navigation }) {
  return (
    <SessionProvider>
      <EntryComposerProvider>
        <ShellContent nav={nav}>{children}</ShellContent>
      </EntryComposerProvider>
    </SessionProvider>
  );
}

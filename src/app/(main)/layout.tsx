/** [INPUT]: 四页路由与 AppShell。[OUTPUT]: 持久主布局与无底栏的加载占位。
 * [POS]: 路由组不改变 URL。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { Suspense } from 'react';
import AppShell from '@/features/shell/AppShell';
import '@/features/shell/shell.css';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <div
            className="app-status"
            role="status"
          >
            正在打开日日有余…
          </div>
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

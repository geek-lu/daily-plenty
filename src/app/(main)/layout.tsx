/** [INPUT]: 四页路由、AppShell 与两端导航。[OUTPUT]: 持久主布局，按断点注入 PC 侧边栏或手机底栏。
 * [POS]: 路由组不改变 URL；app 层是唯一同时装配 pc/ 与 m/ 的位置。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { Suspense } from 'react';
import AppShell from '@/features/common/session/AppShell';
import { Sidebar } from '@/features/pc/shell/Sidebar';
import { BottomBar } from '@/features/m/shell/BottomBar';
import '@/features/common/session/shell.css';
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
      <AppShell nav={{ pc: <Sidebar />, m: <BottomBar /> }}>{children}</AppShell>
    </Suspense>
  );
}

/**
 * [INPUT]: JoinView 邀请视图与 Suspense。
 * [OUTPUT]: /join 路由入口及加载占位。
 * [POS]: App Router 页面装配，无账号业务或请求实现。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Suspense } from 'react';
import { JoinView } from './JoinView';

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh paper grid place-items-center muted">正在打开邀请…</main>
      }
    >
      <JoinView />
    </Suspense>
  );
}

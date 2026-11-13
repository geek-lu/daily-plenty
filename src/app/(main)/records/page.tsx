/** [INPUT]: records 客户端页面及 Suspense。[OUTPUT]: /records 独立路由。
 * [POS]: App Router 装配层，不访问数据库或实现筛选逻辑。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { Suspense } from 'react';
import RecordsPage from '@/features/records/RecordsPage';
export const metadata = { title: '全部账单 · 日日有余' };
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh paper grid place-items-center muted">正在打开全部账单…</main>
      }
    >
      <RecordsPage />
    </Suspense>
  );
}

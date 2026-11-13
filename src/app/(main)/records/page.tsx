/** [INPUT]: records 客户端页面及 Suspense。[OUTPUT]: /records 独立路由。
 * [POS]: App Router 装配层，不访问数据库或实现筛选逻辑；Adaptive 按 1024px 断点选择 pc/ 或 m/ 视图。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { Suspense } from 'react';
import { Adaptive } from '@/features/common/session/Adaptive';
import PcRecords from '@/features/pc/records/RecordsPage';
import MRecords from '@/features/m/records/RecordsPage';
export const metadata = { title: '全部账单 · 日日有余' };
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh paper grid place-items-center muted">正在打开全部账单…</main>
      }
    >
      <Adaptive
        pc={<PcRecords />}
        m={<MRecords />}
      />
    </Suspense>
  );
}

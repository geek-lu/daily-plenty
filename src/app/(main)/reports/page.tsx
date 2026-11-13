/** [INPUT]: ReportsPage 客户端视图。[OUTPUT]: /reports 独立页面。
 * [POS]: 路由装配，与其他页面共用底部导航。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import ReportsPage from '@/features/reports/ReportsPage';
export const metadata = { title: '收支统计 · 日日有余' };
export default function Page() {
  return <ReportsPage />;
}

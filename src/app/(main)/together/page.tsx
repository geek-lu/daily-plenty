/** [INPUT]: TogetherPage 客户端视图。[OUTPUT]: /together 独立页面。
 * [POS]: 路由装配，与其他页面共用底部导航。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import TogetherPage from '@/features/together/TogetherPage';
export const metadata = { title: '我们的小家 · 日日有余' };
export default function Page() {
  return <TogetherPage />;
}

/** [INPUT]: home 独立客户端视图。[OUTPUT]: 日日有余入口页。[POS]: Next.js 根路由，仅负责装配。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import Home from '@/features/home/HomePage';
export default function HomePage() {
  return <Home />;
}

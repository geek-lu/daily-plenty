/** [INPUT]: home 独立客户端视图。[OUTPUT]: 日日有余入口页。[POS]: Next.js 根路由，仅负责装配；Adaptive 按 1024px 断点选择 pc/ 或 m/ 视图。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { Adaptive } from '@/features/common/session/Adaptive';
import PcHome from '@/features/pc/home/HomePage';
import MHome from '@/features/m/home/HomePage';
export default function HomePage() {
  return (
    <Adaptive
      pc={<PcHome />}
      m={<MHome />}
    />
  );
}

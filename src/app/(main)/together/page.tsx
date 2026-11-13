/** [INPUT]: TogetherPage 客户端视图。[OUTPUT]: /together 独立页面。
 * [POS]: 路由装配，与其他页面共用底部导航；Adaptive 按 1024px 断点选择 pc/ 或 m/ 视图。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { Adaptive } from '@/features/common/session/Adaptive';
import PcTogether from '@/features/pc/together/TogetherPage';
import MTogether from '@/features/m/together/TogetherPage';
export const metadata = { title: '我们的小家 · 日日有余' };
export default function Page() {
  return (
    <Adaptive
      pc={<PcTogether />}
      m={<MTogether />}
    />
  );
}

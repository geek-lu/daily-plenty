/** [INPUT]: 无。[OUTPUT]: 首次初始化的稳定入口，实际状态由根页面读取。[POS]: 安装引导路由。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { redirect } from 'next/navigation';
export default function SetupPage() {
  redirect('/');
}

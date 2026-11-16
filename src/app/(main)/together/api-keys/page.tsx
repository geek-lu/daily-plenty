/**
 * [INPUT]: common/api-keys 共享设置视图与主布局会话。
 * [OUTPUT]: /together/api-keys 账本共享密钥管理二级页面。
 * [POS]: 路由装配；从我们页进入，不增加一级导航项。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import ApiKeysPage from '@/features/common/api-keys/ApiKeysPage';

export const metadata = { title: 'API 密钥 · 日日有余' };
export default function Page() {
  return <ApiKeysPage />;
}

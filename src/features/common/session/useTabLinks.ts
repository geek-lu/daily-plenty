'use client';
/** [INPUT]: 当前路由、查询参数、会话用户/账本与导航纯规则。[OUTPUT]: useTabLinks 四页链接、选中态与按账本记忆的地址。
 * [POS]: common/session 导航 runtime；手机底栏与 PC 侧边栏共用，只渲染方式不同。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from './runtime';
import { tabs, tabHref } from './navigation';

export function useTabLinks() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { ledgerId, user } = useSession();
  const [history, setHistory] = useState<{ user: string; urls: Record<string, string> }>({
    user: '',
    urls: {},
  });
  const query = params.toString();
  const current = `${pathname}${query ? `?${query}` : ''}`;
  useEffect(() => {
    if (!user) {
      setHistory({ user: '', urls: {} });
      return;
    }
    const url = new URL(current, 'http://localhost');
    if (ledgerId) {
      url.searchParams.set('ledger', ledgerId);
    }
    setHistory((previous) => ({
      user: user.id,
      urls: {
        ...(previous.user === user.id ? previous.urls : {}),
        [`${ledgerId}:${pathname}`]: `${url.pathname}${url.search}`,
      },
    }));
  }, [current, ledgerId, pathname, user]);
  const remembered = history.user === user?.id ? history.urls : {};
  return tabs.map((tab) => {
    const active = tab.path === pathname;
    return { ...tab, active, href: active ? current : tabHref(tab.path, ledgerId, remembered) };
  });
}

// 当前页重复点击不触发跳转，保留查询与滚动位置。
export function stayOnActive(active: boolean) {
  return (event: React.MouseEvent) => {
    if (active) {
      event.preventDefault();
    }
  };
}

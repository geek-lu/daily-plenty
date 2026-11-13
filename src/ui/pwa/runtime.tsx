'use client';
/**
 * [INPUT]: 浏览器安装事件、独立窗口状态与 Service Worker API。
 * [OUTPUT]: 全局 PwaProvider/usePwa；保存安装机会并提供用户主动安装动作。
 * [POS]: 横切浏览器 runtime，无账本/账号依赖；组件挂载前的安装事件也可保留。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type Platform = 'ios' | 'other';

function useInstallation() {
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');
  const [canPrompt, setCanPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const deferred = useRef<InstallEvent | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const standalone = () =>
      displayMode.matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone());
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setPlatform(ios ? 'ios' : 'other');

    function beforeInstall(event: Event) {
      event.preventDefault();
      deferred.current = event as InstallEvent;
      setCanPrompt(true);
    }
    function onInstalled() {
      deferred.current = null;
      setCanPrompt(false);
      setInstalled(true);
      setNotice('已添加到桌面，下次点「日日有余」就能打开。');
    }
    function onDisplayChange() {
      setInstalled(standalone());
    }
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    displayMode.addEventListener('change', onDisplayChange);

    if (
      process.env.NODE_ENV === 'production' &&
      window.isSecureContext &&
      'serviceWorker' in navigator
    ) {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((error: unknown) => {
          console.warn('桌面应用的离线提示暂不可用', error);
        });
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      displayMode.removeEventListener('change', onDisplayChange);
    };
  }, []);

  async function install() {
    const event = deferred.current;
    if (!event || pending.current) {
      return;
    }
    pending.current = true;
    setBusy(true);
    setNotice('');
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setNotice(
        choice.outcome === 'accepted'
          ? '已确认添加，请到桌面查看「日日有余」。'
          : '已取消添加，之后仍可从浏览器菜单添加。',
      );
    } catch {
      setNotice('这次未能打开安装窗口，请使用浏览器菜单添加到桌面。');
    } finally {
      deferred.current = null;
      pending.current = false;
      setCanPrompt(false);
      setBusy(false);
    }
  }

  return { installed, platform, canPrompt, busy, notice, install };
}

const PwaContext = createContext<ReturnType<typeof useInstallation> | null>(null);
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const value = useInstallation();
  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}
export function usePwa() {
  const value = useContext(PwaContext);
  if (!value) {
    throw new Error('桌面安装入口需要 PwaProvider');
  }
  return value;
}

/** [INPUT]: 根页面、全局样式、触摸适配与桌面安装 runtime。[OUTPUT]: HTML 外壳、禁止页面缩放的 viewport、安装清单与 Apple 图标。[POS]: Next.js L5 应用布局。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaProvider } from '@/ui/pwa/runtime';
import { TouchGestures } from '@/ui/TouchGestures';
export const metadata: Metadata = {
  title: '日日有余 · Daily Plenty',
  description: '两个人，一本账。',
  applicationName: '日日有余',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '日日有余', statusBarStyle: 'default' },
  other: { 'apple-mobile-web-app-capable': 'yes' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f6f5f0',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <TouchGestures />
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}

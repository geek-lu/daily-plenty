/**
 * [INPUT]: 本地桌面图标与应用品牌。
 * [OUTPUT]: /manifest.webmanifest 安装清单。
 * [POS]: Next 元数据入口；启动地址不包含用户、账本或邀请参数。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '日日有余',
    short_name: '日日有余',
    description: '两个人，一本账。一起记下好日子。',
    lang: 'zh-CN',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6f5f0',
    theme_color: '#f6f5f0',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

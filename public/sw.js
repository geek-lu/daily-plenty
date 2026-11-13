/**
 * [INPUT]: 同源页面导航与离线说明页。
 * [OUTPUT]: 仅缓存公共离线说明，断网导航给出明确反馈。
 * [POS]: 根作用域 Service Worker；API、账单、会话、CSV 和页面响应不进缓存。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const CACHE_PREFIX = 'daily-plenty-offline-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  // 不强制激活更新，以免打断另一页尚未保存的记账表单。
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const isApi = url.pathname === '/api' || url.pathname.startsWith('/api/');
  if (
    request.method !== 'GET' ||
    request.mode !== 'navigate' ||
    url.origin !== self.location.origin ||
    isApi
  ) {
    return;
  }
  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(OFFLINE_URL)) || Response.error();
    }),
  );
});

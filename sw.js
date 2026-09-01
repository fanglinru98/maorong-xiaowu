/* 毛茸小屋 PWA Service Worker
 * 作用：① 让安卓/桌面浏览器出现「安装应用」入口 ② 离线也能玩
 * 发版规矩：每次发布新版，把下面的 CACHE_VER 版本号 +1（如 maoor-v1 → maoor-v2），
 *          玩家下次打开会自动丢弃旧缓存、拉取新文件。详见《PWA全屏使用说明.md》第六节。
 */
const CACHE_VER = 'maoor-v1';
const PRECACHE = [
  './index.html',
  './manifest.json',
  './V21 毛茸小屋-可交互原型.html',
  './V21 毛茸小屋-项目进度板.html',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

/* 安装：预缓存核心文件（单个文件 404 也不影响整体安装） */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VER).then((c) =>
      Promise.all(PRECACHE.map((u) =>
        c.add(new Request(encodeURI(u), { cache: 'reload' })).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

/* 激活：清掉旧版本缓存 */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  /* 页面导航走 network-first：发版后尽快拿到新页面，断网时退回缓存 */
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(e.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_VER).then((c) => c.put(e.request, copy));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  /* 其余资源（图片/字体等）走 stale-while-revalidate：先用缓存秒开，后台悄悄更新 */
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_VER).then((c) => c.put(e.request, copy));
        return resp;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

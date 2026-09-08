/* 毛茸小屋 PWA Service Worker
 * 作用：① 让安卓/桌面浏览器出现「安装应用」入口 ② 离线也能玩
 * 发版规矩：每次发布新版，把下面的 CACHE_VER 版本号 +1（如 maoor-v2 → maoor-v3），
 *          玩家下次打开会自动丢弃旧缓存、拉取新文件。详见《PWA全屏使用说明.md》第六节。
 */
const CACHE_VER = 'maoor-v5';
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './assets/bg-new.jpg',
  './assets/dress-bg.png',
  './assets/character/stand.png',
  /* 2.5d 家具 23 张 */
  './assets/2.5d/f270.png','./assets/2.5d/f271.png','./assets/2.5d/f272.png','./assets/2.5d/f273.png',
  './assets/2.5d/f274.png','./assets/2.5d/f275.png','./assets/2.5d/f276.png','./assets/2.5d/f277.png',
  './assets/2.5d/f278.png','./assets/2.5d/f279.png','./assets/2.5d/f280.png','./assets/2.5d/f281.png',
  './assets/2.5d/f282.png','./assets/2.5d/f283.png','./assets/2.5d/f284.png','./assets/2.5d/f285.png',
  './assets/2.5d/f286.png','./assets/2.5d/f287.png','./assets/2.5d/f288.png','./assets/2.5d/f289.png',
  './assets/2.5d/f290.png','./assets/2.5d/f291.png','./assets/2.5d/f292.png',
  /* HUD 图标 8 张 */
  './icon/头像框.png','./icon/相册.png','./icon/日历.png','./icon/日记.png',
  './icon/设置.png','./icon/装修.png','./icon/换装.png','./icon/拍照.png',
  /* UI 切图（日记/相册/日历/装修底板） */
  './assets/ui/deco-panel.png','./assets/ui/cal-panel.png',
  './assets/ui/diary-cover.png','./assets/ui/diary-page.png','./assets/ui/diary-card.png','./assets/ui/btn-diary-write.png',
  './assets/ui/album-panel.png','./assets/ui/album-add.png','./assets/ui/photo-frame.png',
  './assets/ui/arrow-l.png','./assets/ui/arrow-r.png','./assets/ui/arrow-al.png','./assets/ui/arrow-ar.png',
  './assets/ui/avatar-frame.png','./assets/ui/avatar-face.png'
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

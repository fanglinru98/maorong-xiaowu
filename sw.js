/* 毛茸小屋 PWA Service Worker
 * 作用：① 让安卓/桌面浏览器出现「安装应用」入口 ② 离线也能玩
 * 发版规矩：每次发布新版，把下面的 CACHE_VER 版本号 +1（如 maoor-v2 → maoor-v3），
 *          玩家下次打开会自动丢弃旧缓存、拉取新文件。详见《PWA全屏使用说明.md》第六节。
 */
const CACHE_VER = 'maoor-v61'; /* v61：图标铺满重导 + manifest 底色改深红 #922723 + 加载页最短 2.5s */ /* v59precache 预缓存清单瘦身只留外壳 */ /* v57fix 加载页兼容加固：进度条高度不再依赖 aspect-ratio */ /* v57boot 开机加载页并入主线 */ /* v52 四件+加载页 demo */
/* v59precache：清单不再手写——v57 起开机加载页会把家具/角色/贴图/UI 图全部请求一遍，
   fetch 处理器的 stale-while-revalidate 会把它们逐个存进 CACHE_VER 缓存，
   所以「玩过一次」之后离线资源自动齐全；手写清单反而是「以后加资源必漏」的源头。
   这里只留外壳（页面本体 + PWA 图标 + 首屏底图/立绘/点击音），保证首次打开就能全屏安装。 */
const PRECACHE = [
  './index.html',
  './manifest.json',
  './boss.html',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './assets/bg-new.webp',
  './assets/character/stand.webp',
  './assets/audio/click.wav'
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

/* v32sw：带超时的 fetch——手机 PWA「打开卡住」的主因就是导航请求网络优先时
   弱网下 fetch 迟迟不返回、页面一直白屏干等。给导航请求 3.5s、资源请求 8s 上限，
   超时立刻回退缓存，绝不让页面悬着。 */
function timeoutFetch(request, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('sw-timeout')), ms);
    fetch(request).then(
      (resp) => { clearTimeout(t); resolve(resp); },
      (err) => { clearTimeout(t); reject(err); }
    );
  });
}
/* v32sw：写缓存全程吞错——隐私模式/配额满时 caches.open 或 put 会 reject，
   不能让它变成未处理异常影响响应。 */
function putCache(request, resp) {
  try {
    const copy = resp.clone();
    caches.open(CACHE_VER).then((c) => c.put(request, copy)).catch(() => {});
  } catch (err) {}
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  let url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;

  /* 页面导航走 network-first（3.5s 上限）：发版后尽快拿到新页面；
     超时/断网退回缓存，缓存也没有再退到入口页 index.html，保证一定有东西可显示 */
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      timeoutFetch(e.request, 3500).then((resp) => {
        putCache(e.request, resp);
        return resp;
      }).catch(() =>
        caches.match(e.request)
          .then((hit) => hit || caches.match('./index.html'))
          .catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  /* 其余资源（图片/字体等）走 stale-while-revalidate：先用缓存秒开，后台悄悄更新；
     没有缓存时才等网络（8s 上限），任何异常都兜底，绝不让 respondWith 悬空 */
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) {
        timeoutFetch(e.request, 8000).then((resp) => { if (resp && resp.ok) putCache(e.request, resp); }).catch(() => {});
        return hit;
      }
      return timeoutFetch(e.request, 8000).then((resp) => {
        if (resp && resp.ok) putCache(e.request, resp);
        return resp;
      }).catch(() => Response.error());
    }).catch(() => fetch(e.request).catch(() => Response.error()))
  );
});

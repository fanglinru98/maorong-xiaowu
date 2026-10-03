/* 毛茸小屋 PWA Service Worker
 * 作用：① 让安卓/桌面浏览器出现「安装应用」入口 ② 离线也能玩
 * 发版规矩：每次发布新版，把下面的 CACHE_VER 版本号 +1（如 maoor-v2 → maoor-v3），
 *          玩家下次打开会自动丢弃旧缓存、拉取新文件。详见《PWA全屏使用说明.md》第六节。
 */
const CACHE_VER = 'maoor-v58'; /* v57fix 加载页兼容加固：进度条高度不再依赖 aspect-ratio */ /* v57boot 开机加载页并入主线 */ /* v52 四件+加载页 demo */
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './assets/bg-new.webp',
  './assets/character/stand.webp',
  './assets/audio/click.wav', /* v47snd：点击音效进 PRECACHE（bgm.mp3 3MB 不进：省首访流量，stale-while-revalidate 自然缓存） */ /* v46：旧 dress-bg.png 出 PRECACHE（换装层已改 assets/ui/dress-* 五件套） */
  /* 2.5d 家具 23 张 */
  './assets/2.5d/f270.webp','./assets/2.5d/f271.webp','./assets/2.5d/f272.webp','./assets/2.5d/f273.webp',
  './assets/2.5d/f274.webp','./assets/2.5d/f275.webp','./assets/2.5d/f276.webp','./assets/2.5d/f277.webp',
  './assets/2.5d/f278.webp','./assets/2.5d/f279.webp','./assets/2.5d/f280.webp','./assets/2.5d/f281.webp',
  './assets/2.5d/f282.webp','./assets/2.5d/f283.webp','./assets/2.5d/f284.webp','./assets/2.5d/f285.webp',
  './assets/2.5d/f286.webp','./assets/2.5d/f287.webp','./assets/2.5d/f288.webp','./assets/2.5d/f289.webp',
  './assets/2.5d/f290.webp','./assets/2.5d/f291.webp','./assets/2.5d/f292.webp',
  /* 2.5d 家具 v22pack 新增 19 张（f293-f311，工作台家具包上架） */
  './assets/2.5d/f293.webp','./assets/2.5d/f294.webp','./assets/2.5d/f295.webp','./assets/2.5d/f296.webp',
  './assets/2.5d/f297.webp','./assets/2.5d/f298.webp','./assets/2.5d/f299.webp','./assets/2.5d/f300.webp',
  './assets/2.5d/f301.webp','./assets/2.5d/f302.webp','./assets/2.5d/f303.webp','./assets/2.5d/f304.webp',
  './assets/2.5d/f305.webp','./assets/2.5d/f306.webp','./assets/2.5d/f307.webp','./assets/2.5d/f308.webp',
  './assets/2.5d/f309.webp','./assets/2.5d/f310.webp','./assets/2.5d/f311.webp', /* v22audit：补尾逗号（原缺逗号=整份 sw 语法错误，SW 从未注册） */
  './assets/2.5d/f312.webp','./assets/2.5d/f313.webp','./assets/2.5d/f314.webp', /* v27：工作台 09-23 同步新增两件家具 */
  './assets/2.5d/f315.webp','./assets/2.5d/f316.webp', /* v28：工作台 09-24 同步新增两件（宝石/摆件） */
  './assets/2.5d/f317.webp','./assets/2.5d/f318.webp', /* v36：09-29 新家具×2（同图两件，老板库里命名「新家具」） */
'./assets/2.5d/f319.webp','./assets/2.5d/f320.webp','./assets/2.5d/f321.webp', /* v46fix：v41 插入时带入字面 \n 致整份 sw 语法错误（SW 从未注册），修复 */ /* v36：09-29 家具包同步（鸦鸦公仔×2；f295-f316 同名换图随包更新） */
  './boss.html', /* v31gate：老板版跳板（?boss=1 全解锁入口） */
  './assets/tex/floor.webp',
'./assets/tex/wall.webp',
'./assets/tex/roof.webp','./assets/tex/border.webp', /* v35roof：屋顶/屋外装饰贴图（工作台同步覆盖写） */
  './assets/tex/tex-a32.webp','./assets/tex/tex-a33.webp', /* v47：extra 贴图首次写盘（浅棕色地板/红木墙纸，老板 10-01 同步） */
  /* 家具表（工作台「⬆ 同步到正式版」写出的那份，双击 file:// 打开也要能读） */
  './assets/furn-pack.js','./assets/furn-pack.json',
  /* HUD 图标 8 张 */
  './icon/头像框.webp','./icon/相册.webp','./icon/日历.webp','./icon/日记.webp',
  './icon/设置.webp','./icon/装修.webp','./icon/换装.webp','./icon/拍照.webp',
  /* UI 切图（日记/相册/日历/装修底板） */
  './assets/ui/deco-panel.webp','./assets/ui/cal-panel.webp',
  './assets/ui/dress-scene.webp','./assets/ui/dress-panel.webp','./assets/ui/dress-title.webp','./assets/ui/dress-back.webp','./assets/ui/dress-save.webp', /* v46：换装占位页切图五件套 */
  './assets/ui/diary-cover.webp','./assets/ui/diary-page.webp','./assets/ui/diary-card.webp','./assets/ui/btn-diary-write.webp',
  './assets/ui/diary-write-board.webp','./assets/ui/diary-write-editor.webp','./assets/ui/diary-write-deco.webp','./assets/ui/diary-write-save.webp', /* E-20260922-02 写日记页新美术 4 张 */
  './assets/ui/album-panel.webp','./assets/ui/album-add.webp','./assets/ui/photo-frame.webp',
  './assets/ui/arrow-l.webp','./assets/ui/arrow-r.webp','./assets/ui/arrow-al.webp','./assets/ui/arrow-ar.webp',
  './assets/ui/avatar-badge.webp', /* v43：头像成品图整块（frame/face 退役） */
  './assets/ui/heart-gold.webp', /* v42⑥：日历选中日金爱心 */
  './assets/ui/boot2-title.webp','./assets/ui/boot2-bar.webp','./assets/ui/boot2-fill.webp','./assets/ui/boot2-bear.webp','./assets/ui/boot2-bg.jpg', /* v57boot：开机加载页切图五件套（标题/外框/高亮条/小熊/背景） */
  /* UI 切图 v6：日历三模块/页签/备忘钮 */
  './assets/ui/btn-memo-add.webp',
  './assets/ui/cal-memo.webp',
  './assets/ui/cal-month.webp',
  './assets/ui/cal-tab-day.webp',
  './assets/ui/cal-tab-day-on.webp',
  './assets/ui/cal-tab-week.webp',
  './assets/ui/cal-tab-week-on.webp',
  './assets/ui/cal-tab-month.webp',
  './assets/ui/cal-tab-month-on.webp'
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

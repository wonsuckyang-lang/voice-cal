// 음성 캘린더 - 서비스워커 (v2: HTML은 항상 최신, 나머지는 캐시)
const CACHE = "voice-cal-v2";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // 구글 로그인/캘린더 API는 항상 네트워크로
  if (url.hostname.includes("google") || url.hostname.includes("googleapis")) return;

  const isHTML = e.request.mode === "navigate" ||
                 url.pathname.endsWith("/") ||
                 url.pathname.endsWith("index.html");

  if (isHTML) {
    // 네트워크 우선: 앱을 열 때마다 최신 index.html 을 받아온다
    e.respondWith(
      fetch(e.request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // 그 외 파일은 캐시 우선(속도), 없으면 네트워크
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});

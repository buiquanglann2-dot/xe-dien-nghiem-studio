const CACHE_NAME = "xdn-studio-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/fonts/BeVietnamPro-ExtraBold.ttf",
  "./assets/fonts/Montserrat-ExtraBold.ttf",
  "./assets/png/logo_xdn.png",
  "./assets/png/raincoat.png",
  "./assets/png/umbrella.png",
  "./assets/png/jacket.png",
  "./assets/audio/pop.mp3",
  "./assets/audio/whoosh.mp3",
  "./assets/audio/ding.mp3",
  "./assets/audio/impact.mp3"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});

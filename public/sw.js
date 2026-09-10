// Service Worker แบบเรียบง่าย: cache เฉพาะไฟล์ static
// หมายเหตุ: ยังไม่รองรับ offline สำหรับการบันทึกข้อมูล (อยู่ในแผน Phase 2)
const CACHE = 'sandwich-stock-v1';
const ASSETS = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (!/\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
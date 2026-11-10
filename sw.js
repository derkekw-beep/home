// Offline-Speicher für den App-Code. Einträge liegen NICHT hier, sondern im Gerätespeicher der App.
// Die App kommt immer komplett aus dem Cache EINER Version – nie halb alt, halb neu. Eine neue Version
// wird beim Installieren vollständig geladen, danach lädt sich die App selbst neu.
// Bei jeder Änderung an der App die Versionsnummer erhöhen (macht tools/deploy.mjs).
const VERSION = 'zweiplan-v12';
const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './ui.js',
  './texte.js',
  './model.js',
  './smart.js',
  './extra.js',
  './recipes.js',
  './rezeptbuch.js',
  './store.js',
  './config.js',
  './push.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-Schlüssel ohne ?… und #…
const keyOf = url => { const u = new URL(url); u.search = ''; u.hash = ''; return u.href; };

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // der Abgleich-Dienst geht immer ins Netz
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(keyOf(req.url));
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const page = await cache.match(new URL('./index.html', self.location).href);
      if (page) return page;
    }
    try { return await fetch(req); } catch { return Response.error(); }
  })());
});

// ---- Mitteilungen ----------------------------------------------------------------------------
// Der Dienst schickt Titel und Text verschlüsselt mit; hier werden sie nur angezeigt.
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = {}; }
  event.waitUntil(self.registration.showNotification(String(d.title || 'Home'), {
    body: String(d.body || 'Es gibt Neues – tippe zum Öffnen.'), tag: d.tag ? `zweiplan-${d.tag}` : undefined,
    icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { tab: String(d.tab || '') },
  }));
});
self.addEventListener('notificationclick', event => {
  const tab = (event.notification.data && event.notification.data.tab) || '';
  event.notification.close();
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) if ('focus' in c) { await c.focus(); c.postMessage({ zweiplanTab: tab }); return; }
    await self.clients.openWindow(tab ? `./?tab=${tab}` : './');
  })());
});

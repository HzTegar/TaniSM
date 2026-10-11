/**
 * TANIHUB Service Worker (PWA)
 * Caches core static assets and provides offline functionality.
 */

// Cache di-refresh setiap ada deploy. Naikkan nomor ini setiap kali
// mengirim perubahan ke server agar browser darsebut dan memakai cache baru.
const CACHE_NAME = 'tanihub-pwa-v4';

const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './login.html',
  './login-admin.html',
  './login-customer.html',
  './manifest.json',
  './img/logo-tani.png',
  './css/common.css',
  './css/customer.css',
  './css/admin.css',
  './css/print.css',
  './js/data.js',
  './js/store.js',
  './js/auth.js',
  './js/guard-admin.js',
  './js/customer.js',
  './js/admin.js',
  './js/pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './screenshots/desktop.png',
  './screenshots/mobile.png'
];

// Install: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-caching warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler
//
// Strategi sengaja dibedakan agar perubahan kode selalu langsung terlihat:
//
// - HTML / CSS / JS  -> Network-First. Online: selalu versi terbaru dari server.
//   Offline: jatuh ke cache. Submiti-format ini mencegah update "terbengkalai"
//   seperti dulu saat file JS masih dilayani dari cache.
// - Gambar / ikon    -> Cache-First + revalidate di latar. Aman, karena nama
//   file-nya jarang berubah dan ukurannya besar.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Abaikan non-GET / non-HTTP (mis. data: dan blob:)
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  const cacheable = url.origin === self.location.origin;
  const isCode = /\.(?:html?|css|js)(?:$|\?)/i.test(url.pathname);
  const isAsset = /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?)(?:$|\?)/i.test(url.pathname);

  // 1. Navigasi (dokumen HTML) -> Network-First, fallback ke cache.
  //    Fallback terakhir ke index.html supaya aplikasi tetap dibuka saat offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((netRes) => {
          if (cacheable && netRes && netRes.ok) {
            const clone = netRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return netRes;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('./index.html'))
        )
    );
    return;
  }

  // 2. Kode (JS/CSS) -> Network-First supaya update langsung terbaca.
  if (isCode && cacheable) {
    event.respondWith(
      fetch(req)
        .then((netRes) => {
          if (netRes && netRes.ok) {
            const clone = netRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return netRes;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3. Gambar/ikon -> Cache-First, perbarui diam-diam di belakang.
  if (isAsset && cacheable) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((netRes) => {
            if (netRes && netRes.ok) {
              const clone = netRes.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            }
            return netRes;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // 4. Sisanya: biarkan browser yang menangani.
});

// Listen for skipWaiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

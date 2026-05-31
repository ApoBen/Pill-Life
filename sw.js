const CACHE_NAME = 'pill-life-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './css/style.css',
  './js/app.js',
  './js/chart.js',
  './js/pharma.js',
  './js/store.js',
  './js/ui.js',
  './libs/chart.umd.js',
  './libs/moment.min.js',
  './libs/chartjs-adapter-moment.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

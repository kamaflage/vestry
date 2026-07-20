// Vestry Service Worker v2.50
// Caches the app shell for full offline use.

const CACHE = 'vestry-v2.50';

const APP_SHELL = [
  './',
  './index.html',
  './vestry_state.js',
  './vestry_logic.js',
  './vestry_ui.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,500;0,600;1,300;1,400&display=swap'
];

// INSTALL — cache all app shell files
self.addEventListener('install', function(e) {
  console.log('[Vestry SW] Installing...');
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(APP_SHELL).catch(function(err) {
        // Font CDN may fail offline on first install — cache what we can
        console.warn('[Vestry SW] Some files not cached on install:', err);
        return cache.addAll(['./index.html', './manifest.json']);
      });
    }).then(function() {
      console.log('[Vestry SW] Installed');
      return self.skipWaiting();
    })
  );
});

// ACTIVATE — clean up old caches
self.addEventListener('activate', function(e) {
  console.log('[Vestry SW] Activating...');
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE; })
          .map(function(key) {
            console.log('[Vestry SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(function() {
      console.log('[Vestry SW] Active');
      return self.clients.claim();
    })
  );
});

// FETCH — cache-first for app shell, network-first for everything else
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  var url = new URL(e.request.url);

  // Cache-first for our own files
  var isOwnFile = url.origin === self.location.origin;

  if (isOwnFile) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function() {
          // Offline fallback — return the main app
          return caches.match('./index.html');
        });
      })
    );
  } else {
    // Network-first for external resources (fonts etc)
    e.respondWith(
      fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
  }
});

const CACHE_NAME = 'gymerp-v2-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/member/dashboard',
  '/member/diet',
  '/member/exercise',
  '/member/plan',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install Event - Pre-cache essential offline routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching static skeleton offline views');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up stale cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Purging old cache data:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache-First fallback to Network strategy
self.addEventListener('fetch', (event) => {
  // Avoid intercepting API calls or Supabase requests
  if (
    event.request.url.includes('/api/') || 
    event.request.url.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // If response is valid, clone and cache it for future offline usage
          if (
            networkResponse && 
            networkResponse.status === 200 && 
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails (completely offline) and requested page is a route, return cached dashboard
          if (event.request.mode === 'navigate') {
            return caches.match('/member/dashboard');
          }
        });
    })
  );
});

// Push Event - Handle Web Push Notifications (Web Push API / VAPID)
self.addEventListener('push', (event) => {
  let data = { title: 'GymERP Alert', body: 'New workout schedule assigned!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'GymERP Alert', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/member/dashboard'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event - Redirect to corresponding page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const targetUrl = event.notification.data?.url || '/member/dashboard';
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

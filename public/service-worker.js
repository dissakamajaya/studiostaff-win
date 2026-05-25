'use strict';

const STATIC_CACHE_NAME = 'studiostaff-static-v9';
const RUNTIME_CACHE_NAME = 'studiostaff-runtime-v9';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/css/mobile.css',
  '/js/mobile.js',
  '/js/core.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/modals.js',
  '/js/saves.js',
  '/js/dashboard.js',
  '/js/clients.js',
  '/js/studio.js',
  '/js/rentals.js',
  '/js/invoices.js',
  '/js/finance.js',
  '/js/domestics.js',
  '/js/academy.js',
  '/js/merch.js',
  '/js/docs.js',
  '/js/settings.js',
  '/js/details.js',
  '/js/pdf.js',
  '/js/portal.js',
  '/js/journal.js',
  '/js/seed.js',
  '/js/csv.js',
  '/js/main.js',
  '/notification-handler.js',
  '/favico-exp.svg',
  '/favico-exp.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => cache.addAll(CACHE_ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== STATIC_CACHE_NAME && k !== RUNTIME_CACHE_NAME)
                    .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;

    const isNavigation =
        event.request.mode === 'navigate' ||
        event.request.destination === 'document';

    event.respondWith(
        (async () => {
            try {
                const networkResponse = await fetch(event.request, { cache: 'reload' });

                if (networkResponse && networkResponse.ok) {
                    const cache = await caches.open(
                        isNavigation ? STATIC_CACHE_NAME : RUNTIME_CACHE_NAME
                    );
                    cache.put(event.request, networkResponse.clone()).catch(() => {});
                }

                return networkResponse;
            } catch (err) {
                const cached = await caches.match(event.request);
                if (cached) return cached;

                if (isNavigation) {
                    const fallback = await caches.match('/index.html');
                    if (fallback) return fallback;
                }

                throw err;
            }
        })()
    );
});

// In-memory badge counter (persists across push events within SW lifetime)
let _badgeCount = 0;

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'STUDIOSTAFF';
    _badgeCount = (data.badge != null ? Number(data.badge) : _badgeCount + 1);
    const options = {
        body: data.body || '',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'studiostaff-notif',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' }
    };
    event.waitUntil(
        self.registration.showNotification(title, options).then(() => {
            if ('setAppBadge' in self.registration) {
                return self.registration.setAppBadge(_badgeCount).catch(() => {});
            }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return ('navigate' in client ? client.navigate(url) : Promise.resolve(client))
                        .then(c => c.focus());
                }
            }
            return clients.openWindow(url);
        })
    );
});

// Badge count set from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_BADGE') {
        const count = event.data.count || 0;
        _badgeCount = count;
        if ('setAppBadge' in self.registration) {
            count > 0
                ? self.registration.setAppBadge(count).catch(() => {})
                : self.registration.clearAppBadge().catch(() => {});
        }
    }
    if (event.data && event.data.type === 'CLEAR_BADGE') {
        _badgeCount = 0;
        if ('setAppBadge' in self.registration) {
            self.registration.clearAppBadge().catch(() => {});
        }
    }
});

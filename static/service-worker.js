self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('kiddo-cache').then((cache) => {
            return cache.addAll([
                '/',
                '/static/styles.css',
                '/static/icons/icon-192x192.png',
                '/static/icons/icon-512x512.png'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

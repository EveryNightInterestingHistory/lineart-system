// LineART Service Worker v1.0
const CACHE_NAME = 'lineart-v1';
const STATIC_CACHE = 'lineart-static-v1';
const DYNAMIC_CACHE = 'lineart-dynamic-v1';

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/style.css',
    '/chart.js',
    '/js/app.js',
    '/js/state.js',
    '/js/projects.js',
    '/js/analytics.js',
    '/lib/leaflet/leaflet.js',
    '/lib/leaflet/leaflet.css',
    '/map-markers.css'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.error('[SW] Cache error:', err))
    );
});

// Активация - очистка старых кэшей
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Стратегия для fetch запросов
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Пропускаем запросы к API - всегда сеть
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // Оффлайн ответ для API
                    return new Response(
                        JSON.stringify({ offline: true, message: 'Нет подключения к серверу' }),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                })
        );
        return;
    }

    // Для загруженных файлов (uploads) - сеть с кэшированием
    if (url.pathname.startsWith('/uploads/')) {
        event.respondWith(
            caches.open(DYNAMIC_CACHE).then((cache) => {
                return fetch(request)
                    .then((response) => {
                        cache.put(request, response.clone());
                        return response;
                    })
                    .catch(() => cache.match(request));
            })
        );
        return;
    }

    // Для статических ресурсов - кэш с фолбэком на сеть
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Обновляем кэш в фоне
                    fetch(request).then((response) => {
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, response);
                        });
                    }).catch(() => {});
                    return cachedResponse;
                }

                // Если нет в кэше - загружаем и кэшируем
                return fetch(request).then((response) => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
            .catch(() => {
                // Оффлайн страница для HTML
                if (request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
            })
    );
});

// Обработка push-уведомлений (для будущего Telegram)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        self.registration.showNotification(data.title || 'LineART', {
            body: data.body || 'Новое уведомление',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            data: data.url || '/'
        });
    }
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data)
    );
});

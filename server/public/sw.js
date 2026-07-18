// Service Worker: recibe las notificaciones push y gestiona el clic.
const CACHE = 'wellness-rpe-v6';
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/config.js', '/manifest.webmanifest', '/logo.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first para los archivos propios; el resto (formularios, API) va a la red.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(caches.match(event.request).then((r) => r || fetch(event.request)));
});

// Llega una notificación push.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'Wellness & RPE';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { type: data.type || 'wellness' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// El usuario toca la notificación: abrimos la app en el formulario correcto.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const type = event.notification.data && event.notification.data.type ? event.notification.data.type : 'wellness';
  const target = `/?form=${type}`;
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of list) {
        // App ya abierta: le mandamos un mensaje para que abra el formulario,
        // y la traemos al frente (más fiable que navigate en iOS).
        client.postMessage({ action: 'open-form', type });
        if ('focus' in client) return client.focus();
      }
      // App cerrada: la abrimos directamente en el formulario.
      return self.clients.openWindow(target);
    })()
  );
});

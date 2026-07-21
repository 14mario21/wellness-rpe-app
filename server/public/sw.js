// Service Worker: recibe las notificaciones push y gestiona el clic.
// Estrategia de red: RED PRIMERO, caché solo como respaldo sin conexión.
// (Cache-first nos envenenó la caché cuando el hosting sirvió páginas de error.)
const CACHE = 'wellness-rpe-v8';
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/config.js', '/manifest.webmanifest', '/logo.png'];

// ¿Es una respuesta válida para guardar como este recurso?
// Evita cachear páginas de error del hosting (HTML) en lugar de JS/CSS/imágenes.
function cacheable(reqUrl, res) {
  if (!res || !res.ok || res.redirected) return false;
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const path = new URL(reqUrl, self.location.origin).pathname;
  if (path.endsWith('.js')) return ct.includes('javascript');
  if (path.endsWith('.css')) return ct.includes('css');
  if (path.endsWith('.png')) return ct.includes('image');
  if (path.endsWith('.webmanifest')) return ct.includes('json') || ct.includes('manifest');
  return true;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(
        ASSETS.map(async (url) => {
          const res = await fetch(url, { cache: 'no-store' });
          if (cacheable(url, res)) await cache.put(url, res.clone());
        })
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Red primero; si no hay conexión, respaldo desde caché.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (cacheable(event.request.url, res)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((r) => {
          if (r) return r;
          if (event.request.mode === 'navigate') return caches.match('/');
          return Response.error();
        })
      )
  );
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

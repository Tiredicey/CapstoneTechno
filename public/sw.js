const CACHE_NAME = 'bloom-shell-v3';
const SHELL_ASSETS = [
  '/',
  '/css/vars.css',
  '/css/main.css',
  '/css/landing.css',
  '/js/core/Api.js',
  '/js/core/Store.js',
  '/js/core/Auth.js',
  '/img/hero-flowers.jpg',
  '/img/hero-bokeh.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/graphql')) return;
  if (url.pathname.startsWith('/socket.io/')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('sync', (e) => {
  if (e.tag === 'bloom-sync') {
    e.waitUntil(syncOfflineMutations());
  }
});

async function syncOfflineMutations() {
  try {
    const db = await openDB();
    const tx = db.transaction('offline_queue', 'readonly');
    const store = tx.objectStore('offline_queue');
    const all = await storeGetAll(store);
    for (const item of all) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body),
          credentials: 'include'
        });
        const delTx = db.transaction('offline_queue', 'readwrite');
        delTx.objectStore('offline_queue').delete(item.id);
      } catch { break; }
    }
  } catch {}
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('bloom_offline', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeGetAll(store) {
  return new Promise((resolve) => {
    const items = [];
    const cursor = store.openCursor();
    cursor.onsuccess = (e) => {
      const c = e.target.result;
      if (c) { items.push(c.value); c.continue(); }
      else resolve(items);
    };
    cursor.onerror = () => resolve([]);
  });
}

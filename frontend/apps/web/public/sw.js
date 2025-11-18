/**
 * QURI Protocol - Service Worker
 * 
 * Offline-first PWA with intelligent caching
 * 
 * Cache Strategy:
 * - App shell: Cache first
 * - API calls: Network first with cache fallback
 * - Static assets: Cache first with network fallback
 * - Images: Cache first, lazy load
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `quri-protocol-${CACHE_VERSION}`;

// Cache keys
const CACHE_KEYS = {
  STATIC: `${CACHE_NAME}-static`,
  DYNAMIC: `${CACHE_NAME}-dynamic`,
  API: `${CACHE_NAME}-api`,
  IMAGES: `${CACHE_NAME}-images`,
};

// Files to cache immediately (app shell)
const STATIC_CACHE = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/runes/,
  /\/api\/processes/,
  /\/api\/utxos/,
];

// Maximum cache sizes
const MAX_CACHE_SIZE = {
  DYNAMIC: 50,
  API: 100,
  IMAGES: 30,
};

// Maximum cache age (in milliseconds)
const MAX_CACHE_AGE = {
  STATIC: 7 * 24 * 60 * 60 * 1000,    // 7 days
  DYNAMIC: 24 * 60 * 60 * 1000,        // 24 hours
  API: 5 * 60 * 1000,                  // 5 minutes
  IMAGES: 30 * 24 * 60 * 60 * 1000,    // 30 days
};

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...', CACHE_VERSION);

  event.waitUntil(
    caches
      .open(CACHE_KEYS.STATIC)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(STATIC_CACHE);
      })
      .then(() => {
        console.log('[SW] App shell cached');
        return self.skipWaiting();
      })
  );
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...', CACHE_VERSION);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Remove old caches
              return name.startsWith('quri-protocol-') && name !== CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// ============================================================================
// FETCH EVENT
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Route to appropriate strategy
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_KEYS.STATIC));
  } else if (isImage(url)) {
    event.respondWith(cacheFirst(request, CACHE_KEYS.IMAGES));
  } else if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, CACHE_KEYS.API));
  } else {
    event.respondWith(networkFirst(request, CACHE_KEYS.DYNAMIC));
  }
});

// ============================================================================
// CACHE STRATEGIES
// ============================================================================

/**
 * Cache First Strategy
 * Used for static assets and images
 */
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      // Check cache age
      const cacheDate = cached.headers.get('sw-cache-date');
      if (cacheDate) {
        const age = Date.now() - parseInt(cacheDate, 10);
        const maxAge = MAX_CACHE_AGE[getCacheType(cacheName)];
        
        if (age > maxAge) {
          console.log('[SW] Cache expired, fetching fresh:', request.url);
          return fetchAndCache(request, cacheName);
        }
      }

      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }

    return await fetchAndCache(request, cacheName);
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return offlineFallback(request);
  }
}

/**
 * Network First Strategy
 * Used for API calls and dynamic content
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      await cacheResponse(request, response.clone(), cacheName);
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('[SW] Serving stale from cache:', request.url);
      return cached;
    }

    return offlineFallback(request);
  }
}

/**
 * Fetch and cache response
 */
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      await cacheResponse(request, response.clone(), cacheName);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return offlineFallback(request);
  }
}

/**
 * Cache response with metadata
 */
async function cacheResponse(request, response, cacheName) {
  const cache = await caches.open(cacheName);
  
  // Add cache date header
  const headers = new Headers(response.headers);
  headers.set('sw-cache-date', Date.now().toString());
  
  const modifiedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  
  await cache.put(request, modifiedResponse);
  
  // Trim cache if needed
  await trimCache(cacheName);
}

/**
 * Trim cache to max size
 */
async function trimCache(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  const cacheType = getCacheType(cacheName);
  const maxSize = MAX_CACHE_SIZE[cacheType];
  
  if (maxSize && keys.length > maxSize) {
    console.log(`[SW] Trimming cache ${cacheName}: ${keys.length} -> ${maxSize}`);
    await cache.delete(keys[0]);
  }
}

/**
 * Offline fallback
 */
async function offlineFallback(request) {
  const url = new URL(request.url);
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_KEYS.STATIC);
    return cache.match('/offline.html') || new Response('Offline');
  }
  
  // Return error for other requests
  return new Response('Network error', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if URL is static asset
 */
function isStaticAsset(url) {
  return (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname === '/' ||
    url.pathname === '/manifest.json'
  );
}

/**
 * Check if URL is image
 */
function isImage(url) {
  return (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico')
  );
}

/**
 * Check if URL is API request
 */
function isApiRequest(url) {
  return API_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

/**
 * Get cache type from cache name
 */
function getCacheType(cacheName) {
  if (cacheName.includes('static')) return 'STATIC';
  if (cacheName.includes('api')) return 'API';
  if (cacheName.includes('images')) return 'IMAGES';
  return 'DYNAMIC';
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name.startsWith('quri-protocol-')) {
              return caches.delete(name);
            }
          })
        );
      });
      break;

    case 'CACHE_URLS':
      if (payload && payload.urls) {
        caches.open(CACHE_KEYS.DYNAMIC).then((cache) => {
          cache.addAll(payload.urls);
        });
      }
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-processes') {
    event.waitUntil(syncProcesses());
  }
});

async function syncProcesses() {
  try {
    // Sync pending processes when back online
    const cache = await caches.open(CACHE_KEYS.API);
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.includes('/api/processes')) {
        try {
          await fetch(request);
          console.log('[SW] Synced:', request.url);
        } catch (error) {
          console.error('[SW] Sync failed:', request.url, error);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// ============================================================================
// PUSH NOTIFICATIONS (Future)
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'QURI Protocol';
  const options = {
    body: data.body || 'New update available',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  const url = event.notification.data || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

console.log('[SW] Service worker loaded:', CACHE_VERSION);

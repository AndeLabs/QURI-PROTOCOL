/**
 * QURI Protocol - Service Worker Registration
 * 
 * Handles SW lifecycle and updates
 */

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onWaiting?: (registration: ServiceWorkerRegistration) => void;
};

const isLocalhost = Boolean(
  typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/))
);

export function register(config?: Config) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    if (isLocalhost) {
      checkValidServiceWorker(swUrl, config);
      navigator.serviceWorker.ready.then(() => {
        console.log('[SW] App is being served from cache by a service worker.');
      });
    } else {
      registerValidSW(swUrl, config);
    }
  });
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[SW] Service worker registered:', registration);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[SW] New content available; please refresh.');
              
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log('[SW] Content cached for offline use.');
              
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };

      // Check for waiting worker
      if (registration.waiting && config?.onWaiting) {
        config.onWaiting(registration);
      }
    })
    .catch((error) => {
      console.error('[SW] Registration failed:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[SW] No internet connection. App running in offline mode.');
    });
}

export function unregister() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.unregister();
      console.log('[SW] Service worker unregistered');
    })
    .catch((error) => {
      console.error('[SW] Unregistration failed:', error);
    });
}

/**
 * Update service worker
 */
export function update() {
  if (!('serviceWorker' in navigator)) {
    return Promise.reject('Service workers not supported');
  }

  return navigator.serviceWorker.ready.then((registration) => {
    return registration.update();
  });
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });

  // Reload page when new SW takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

/**
 * Check if update is available
 */
export function checkForUpdates(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return Promise.resolve(false);
  }

  return navigator.serviceWorker.ready.then((registration) => {
    return registration.update().then(() => {
      return registration.waiting !== null;
    });
  });
}

/**
 * Clear all caches
 */
export function clearCaches(): Promise<void> {
  if (!('caches' in window)) {
    return Promise.resolve();
  }

  return caches.keys().then((cacheNames) => {
    return Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName.startsWith('quri-protocol-')) {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        }
      })
    ) as Promise<void[]>;
  }) as Promise<void>;
}

/**
 * Get cache status
 */
export async function getCacheStatus() {
  if (!('caches' in window)) {
    return { caches: [], totalSize: 0 };
  }

  const cacheNames = await caches.keys();
  const quriCaches = cacheNames.filter((name) => name.startsWith('quri-protocol-'));

  const cacheData = await Promise.all(
    quriCaches.map(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      let size = 0;
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          size += blob.size;
        }
      }

      return {
        name: cacheName,
        entries: keys.length,
        size,
      };
    })
  );

  const totalSize = cacheData.reduce((sum, cache) => sum + cache.size, 0);

  return {
    caches: cacheData,
    totalSize,
  };
}

/**
 * Hook for React components
 */
export function useServiceWorker(config?: Config) {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      isRegistered: false,
      hasUpdate: false,
      skipWaiting: () => {},
      update: () => Promise.resolve(),
      clearCaches: () => Promise.resolve(),
    };
  }

  const [isRegistered, setIsRegistered] = React.useState(false);
  const [hasUpdate, setHasUpdate] = React.useState(false);

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      register({
        onSuccess: (reg) => {
          setIsRegistered(true);
          config?.onSuccess?.(reg);
        },
        onUpdate: (reg) => {
          setHasUpdate(true);
          config?.onUpdate?.(reg);
        },
        onWaiting: (reg) => {
          setHasUpdate(true);
          config?.onWaiting?.(reg);
        },
      });
    }
  }, []);

  return {
    isSupported: 'serviceWorker' in navigator,
    isRegistered,
    hasUpdate,
    skipWaiting,
    update,
    clearCaches,
  };
}

// Auto-detect React
let React: any;
if (typeof window !== 'undefined') {
  try {
    React = require('react');
  } catch {
    // React not available, hooks won't work but other functions will
  }
}

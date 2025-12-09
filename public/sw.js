// Service Worker for Gemini Farm
const CACHE_NAME = 'gemini-farm-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('Cache install failed:', err);
      })
  );
  // Force activation of new service worker
  self.skipWaiting();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);
    
    // Skip service worker for development (localhost, 127.0.0.1, or any dev server)
    if (url.hostname === 'localhost' || 
        url.hostname === '127.0.0.1' || 
        url.port === '3000' ||
        url.port === '5173' ||
        url.port === '5500') {
      // In development, always fetch from network (don't intercept)
      return;
    }
    
    // Skip service worker for Vite HMR, TypeScript files, and other dev tools
    if (event.request.url.includes('?') || 
        event.request.url.endsWith('.tsx') || 
        event.request.url.endsWith('.ts') ||
        event.request.url.endsWith('.jsx') ||
        event.request.url.includes('/@vite/') ||
        event.request.url.includes('/node_modules/') ||
        event.request.url.includes('/src/') ||
        event.request.url.includes('/assets/') ||
        event.request.method !== 'GET') {
      return;
    }
    
    // Only intercept static assets in production (HTML, CSS, images, etc.)
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached version or fetch from network
          return response || fetch(event.request).catch(() => {
            // If fetch fails, return a basic response to prevent errors
            return new Response('', { status: 200, statusText: 'OK' });
          });
        })
        .catch(() => {
          // If cache match fails, try network
          return fetch(event.request).catch(() => {
            // If both fail, return empty response to prevent breaking the app
            return new Response('', { status: 200, statusText: 'OK' });
          });
        })
    );
  } catch (error) {
    // If anything goes wrong, just fetch normally
    return;
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


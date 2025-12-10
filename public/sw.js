// Service Worker for Gemini Farm
// Use timestamp-based cache version to force updates
const CACHE_VERSION = Date.now();
const CACHE_NAME = `gemini-farm-v${CACHE_VERSION}`;
const STATIC_CACHE = 'gemini-farm-static-v1';

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Force activation immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Opened static cache');
        // Don't cache HTML - always fetch fresh
        return cache.addAll([
          // Only cache static assets that don't change often
        ]);
      })
      .catch((err) => {
        console.log('Cache install failed:', err);
      })
  );
});

// Fetch event - Network First strategy for HTML, Cache First for static assets
self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);
    
    // Skip service worker for development
    if (url.hostname === 'localhost' || 
        url.hostname === '127.0.0.1' || 
        url.port === '3000' ||
        url.port === '5173' ||
        url.port === '5500') {
      return;
    }
    
    // Skip service worker for API calls
    if (url.pathname.startsWith('/api/') || 
        event.request.method !== 'GET' ||
        event.request.url.includes('/api/')) {
      return;
    }
    
    // Skip service worker for source files, dev tools, and Vite assets
    // Always fetch from network for JS/CSS files (Vite assets with hashes)
    if (event.request.url.includes('?') || 
        event.request.url.endsWith('.tsx') || 
        event.request.url.endsWith('.ts') ||
        event.request.url.endsWith('.jsx') ||
        event.request.url.includes('/@vite/') ||
        event.request.url.includes('/node_modules/') ||
        event.request.url.includes('/src/') ||
        event.request.url.includes('/assets/') ||
        event.request.url.match(/\.(js|css)$/)) {
      // For JS/CSS assets, always fetch from network (don't cache)
      // This ensures we always get the latest version
      event.respondWith(
        fetch(event.request, { cache: 'no-store' })
          .catch(() => {
            // Only use cache if network completely fails
            return caches.match(event.request);
          })
      );
      return;
    }
    
    // For images and fonts, use network first but allow caching
    if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/)) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request);
          })
      );
      return;
    }
    
    // Network First strategy for HTML - always try network first
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.endsWith('.html')) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // If network succeeds, update cache and return response
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // If network fails, try cache
            return caches.match(event.request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If no cache, return a basic HTML to prevent blank page
              return new Response('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/"></head><body>Loading...</body></html>', {
                headers: { 'Content-Type': 'text/html' }
              });
            });
          })
      );
      return;
    }
    
    
    // For everything else, just fetch normally (don't cache)
    return;
  } catch (error) {
    console.error('Service Worker fetch error:', error);
    // If anything goes wrong, just fetch normally
    return;
  }
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Take control of all pages immediately
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});


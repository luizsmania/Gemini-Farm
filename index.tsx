import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Clear any existing service workers in development
if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().then(() => {
        console.log('Service worker unregistered for development');
      });
    });
  });
}

// Register Service Worker for PWA (works in both dev and production for testing)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { 
      updateViaCache: 'none',
      scope: '/' 
    })
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates every time the page loads
        registration.update();
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, reload to use it
                console.log('New service worker available, reloading...');
                // Only auto-reload in production to avoid dev disruption
                if (import.meta.env.PROD) {
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
    
    // Check for updates periodically (only in production)
    if (import.meta.env.PROD) {
      setInterval(() => {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.update();
          }
        });
      }, 60000); // Check every minute
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  // Create root element if it doesn't exist
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  const root = ReactDOM.createRoot(newRoot);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
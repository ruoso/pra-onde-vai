// Registers the service worker that precaches the app, so it works offline
// after the first visit. An update waits until the app is opened again,
// so nothing changes under someone in the middle of a tune.

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {
      // No service worker: the app still works online.
    });
  });
}

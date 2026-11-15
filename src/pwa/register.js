// Registers the service worker that precaches the app, so it works offline
// after the first visit; src/pwa/pwa.js keeps what the screens show about it.
// An update waits until the learner reloads from the notice, so nothing
// changes under someone in the middle of a tune.

import { initPwa } from './pwa.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) && !('onbeforeinstallprompt' in window)) return;
  const start = () => initPwa({ base: import.meta.env.BASE_URL, register: import.meta.env.PROD });
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
}

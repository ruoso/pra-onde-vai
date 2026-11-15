// The installed app's state, for the screens: whether the browser offers to
// install it (and on iPhone and iPad, where it never does, how to add it),
// whether it is installed, ready to work offline, and whether an update is
// waiting. The browser's objects are passed in, so this is tested without one.

let state = { canInstall: false, installed: false, platform: 'other', offlineReady: false, updateReady: false };
const listeners = new Set();
let deferredPrompt = null;
let registration = null;
let env = null;

function set(patch) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

/** For tests: start again from nothing. */
export function resetPwa(patch = {}) {
  deferredPrompt = null;
  registration = null;
  env = null;
  state = { canInstall: false, installed: false, platform: 'other', offlineReady: false, updateReady: false, ...patch };
  for (const fn of listeners) fn();
}

/** iOS and iPadOS browsers have no install prompt: Share, then Add to Home Screen. */
export function platformOf(userAgent = '', maxTouchPoints = 0) {
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
  // iPadOS reports itself as a Mac, with a touch screen.
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return 'ios';
  return 'other';
}

function watch(reg, nav) {
  const settle = (worker) => {
    worker.addEventListener('statechange', () => {
      if (worker.state !== 'installed') return;
      // A worker installed while another controls the page is an update; the
      // first one means everything is cached for offline.
      if (nav.serviceWorker.controller) set({ updateReady: true });
      else set({ offlineReady: true });
    });
  };
  if (reg.waiting && nav.serviceWorker.controller) set({ updateReady: true });
  // An app already cached says nothing: "ready offline" is news once, when
  // the first visit has finished caching it.
  if (reg.installing) settle(reg.installing);
  reg.addEventListener('updatefound', () => settle(reg.installing));
}

/**
 * Starts it all: registers the service worker, listens for the browser's
 * offer to install, notices when the app runs installed, asks the browser to
 * keep the app's data (progress is kept on the device), and checks for an
 * update when the app comes back to the foreground.
 */
export async function initPwa({ win = window, nav = navigator, base = '/', register = true } = {}) {
  env = { win, nav };
  const standalone = win.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
  set({ platform: platformOf(nav.userAgent, nav.maxTouchPoints), installed: !!standalone });
  win.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    set({ canInstall: true });
  });
  win.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    set({ canInstall: false, installed: true });
  });
  nav.storage?.persist?.().catch(() => {});
  if (!register || !nav.serviceWorker) return;
  try {
    registration = await nav.serviceWorker.register(`${base}sw.js`, { scope: base });
  } catch {
    return; // No service worker: the app still works online.
  }
  watch(registration, nav);
  win.document?.addEventListener?.('visibilitychange', () => {
    if (win.document.visibilityState === 'visible') registration.update().catch(() => {});
  });
}

/** Opens the browser's install prompt; resolves to whether it was accepted. */
export async function install() {
  if (!deferredPrompt) return false;
  const e = deferredPrompt;
  deferredPrompt = null;
  set({ canInstall: false });
  e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === 'accepted') set({ installed: true });
  return outcome === 'accepted';
}

/** Moves to the waiting version: the new worker takes over, and the page reloads once it has. */
export function applyUpdate() {
  const waiting = registration?.waiting;
  if (!waiting || !env) return;
  env.nav.serviceWorker.addEventListener('controllerchange', () => env.win.location.reload(), { once: true });
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

export function dismissOffline() {
  set({ offlineReady: false });
}

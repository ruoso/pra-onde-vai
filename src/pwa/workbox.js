// The service worker's precache options, as a pure module (tested on its own).
// The tune file is JSON: it is precached with the code, so every tune is there
// offline after the first visit.

export const workbox = {
  globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: false,
};

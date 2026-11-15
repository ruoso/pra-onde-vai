import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { BASE, manifest } from './src/pwa/manifest.js';
import { workbox } from './src/pwa/workbox.js';

// GitHub Pages serves the app under the repository's path, so every URL the
// build writes (assets, the manifest, the service worker's scope) starts with
// BASE (docs/implementation-plan.md, "Hosting and deploying").
export default defineConfig({
  base: BASE,
  // Everything is precached on the first visit, so the size of a chunk costs
  // one download, not a delay on every screen; the tunes load on their own.
  build: { target: 'es2022', outDir: 'dist', chunkSizeWarningLimit: 1200 },
  plugins: [
    react({
      babel: { plugins: [['babel-plugin-react-compiler', { target: '19' }]] },
    }),
    VitePWA({
      // Everything is precached on the first visit, the tunes included, so the
      // app works with no network from then on.
      registerType: 'prompt',
      injectRegister: null,
      workbox,
      manifest,
      devOptions: { enabled: false },
    }),
  ],
  test: {
    testTimeout: 20000,
    projects: [
      {
        // The copy of cifra-md runs its own suite, in Node as it does upstream.
        extends: true,
        test: { name: 'cifra-md', environment: 'node', include: ['lib/cifra-md/js/test/**/*.test.js'] },
      },
      {
        // The data build and the core run in Node too: no DOM below the view.
        extends: true,
        test: { name: 'core', environment: 'node', include: ['scripts/**/*.test.js', 'src/core/**/*.test.js'] },
      },
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.js'],
          include: ['src/**/*.test.{js,jsx}'],
          exclude: ['src/core/**'],
        },
      },
    ],
  },
});

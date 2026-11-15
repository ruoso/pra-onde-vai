import { defineConfig, devices } from '@playwright/test';

// End to end, in a real browser, against the production build served under
// the GitHub Pages path (/pra-onde-vai/), so the base, the manifest and the
// service worker's scope are tested as they deploy. `npm run build` first.
// Chromium only: offline emulation is a Chromium capability.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173/pra-onde-vai/', trace: 'on-first-retry' },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/pra-onde-vai/',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 }, hasTouch: true } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});

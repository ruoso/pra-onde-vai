// The app in a real browser, as it deploys to GitHub Pages: it installs,
// works with no network, and a whole practice run goes through.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('installs: the manifest and icons live under the Pages path', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toMatch(/^\/pra-onde-vai\/manifest\.webmanifest$/);
  const manifest = await (await request.get(href)).json();
  expect(manifest).toMatchObject({ name: 'Pra Onde Vai', start_url: '/pra-onde-vai/', scope: '/pra-onde-vai/', display: 'standalone' });
  for (const icon of manifest.icons) {
    const res = await request.get(`/pra-onde-vai/${icon.src}`);
    expect(res.ok(), icon.src).toBe(true);
    expect(res.headers()['content-type']).toBe('image/png');
  }
});

test('works offline once loaded, tunes and all', async ({ page, context }) => {
  await page.goto('./');
  // The first visit fills the cache, and says so.
  await expect(page.getByText('Ready to work offline: every tune is on this device.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Screens' })).toBeVisible();
  // Wait for the service worker to take control, its precache filled.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    }
  });
  await context.setOffline(true);
  await page.goto('./#/tunes/cochichando');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cochichando' })).toBeVisible();
  await page.getByRole('button', { name: /Start/ }).click();
  await expect(page.getByText('Bar 2: after Dm, which chord is this?')).toBeVisible();
  await context.setOffline(false);
});

test('practises a tune from the first chord to how it went', async ({ page }) => {
  await page.goto('./#/tunes/cochichando');
  await page.getByRole('radio', { name: 'A, then B' }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  await page.getByRole('button', { name: /^A7\s*,\s*V\b/ }).click();
  await expect(page.getByText('Right: A7, the V.')).toBeVisible();
  for (let i = 0; i < 200; i += 1) {
    if (await page.getByRole('link', { name: 'See how it went' }).isVisible()) break;
    const move = page.getByRole('button', { name: /^Make .* home$/ });
    if (await move.isVisible()) await move.click();
    else await page.getByRole('button', { name: 'Show me' }).click();
  }
  await page.getByRole('link', { name: 'See how it went' }).click();
  await expect(page.getByRole('heading', { name: 'How it went' })).toBeVisible();
  await expect(page.getByText('Found')).toBeVisible();
});

test('keeps progress across a reload', async ({ page }) => {
  await page.goto('./#/tunes/cochichando');
  await page.getByRole('button', { name: /Start/ }).click();
  await page.getByRole('button', { name: /^A7\s*,\s*V\b/ }).click();
  await page.goto('./#/about');
  await expect(page.getByText('Kept on this device: 1 answer.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Kept on this device: 1 answer.')).toBeVisible();
});

for (const path of ['#/guide', '#/map', '#/tunes/cochichando', '#/levels', '#/listen', '#/about']) {
  test(`meets WCAG 2.1 AA: ${path}`, async ({ page }) => {
    await page.goto(`./${path}`);
    await expect(page.getByRole('navigation', { name: 'Screens' })).toBeVisible();
    await expect(page.getByText('Loading the tunes…')).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
  });
}

test('scrolls the 295 tunes inside their list, not the whole page', async ({ page }) => {
  await page.goto('./#/tunes');
  await expect(page.getByRole('option').first()).toBeVisible();
  const { page: h, list } = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    list: document.querySelector('[role="listbox"]').scrollHeight,
  }));
  expect(list).toBeGreaterThan(5000);
  expect(h).toBeLessThan(2500);
});

test('asks for home, then the board meets WCAG 2.1 AA', async ({ page }) => {
  await page.goto('./#/map');
  await expect(page.getByRole('heading', { name: 'Where is home?' })).toBeVisible();
  await page.getByRole('button', { name: /^Dm\s*,/ }).click();
  await expect(page.getByRole('group', { name: 'The board of chord functions' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

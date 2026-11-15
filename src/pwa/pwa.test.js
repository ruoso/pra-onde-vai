import { describe, it, expect } from 'vitest';
import { manifest, BASE, ICONS } from './manifest.js';
import { workbox } from './workbox.js';

describe('the install', () => {
  it('lives under the repository’s path on GitHub Pages', () => {
    expect(BASE).toBe('/pra-onde-vai/');
    expect(manifest).toMatchObject({ id: BASE, start_url: BASE, scope: BASE, display: 'standalone', name: 'Pra Onde Vai' });
  });

  it('has the icons a browser needs to offer installing, one of them maskable', () => {
    expect(ICONS.map((i) => i.sizes)).toEqual(['192x192', '512x512', '512x512']);
    expect(ICONS.some((i) => i.purpose === 'maskable')).toBe(true);
    expect(ICONS.every((i) => !i.src.startsWith('/'))).toBe(true);
  });

  it('precaches the tunes with the code, so they are there offline', () => {
    expect(workbox.globPatterns[0]).toMatch(/json/);
    expect(workbox.maximumFileSizeToCacheInBytes).toBeGreaterThan(2 * 1024 * 1024);
    expect(workbox.navigateFallback).toBe('index.html');
  });
});

// The web app manifest, as a pure module so it is tested without the plugin.
// The app lives under the repository's path on GitHub Pages; start_url, scope
// and id all carry it, so the installed app opens and works offline there.

export const BASE = '/pra-onde-vai/';

export const ICONS = [
  { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export const manifest = {
  name: 'Pra Onde Vai',
  short_name: 'Pra Onde Vai',
  description: 'Ear training for choro harmony: hear where a tune is going. Works offline.',
  id: BASE,
  start_url: BASE,
  scope: BASE,
  display: 'standalone',
  orientation: 'any',
  background_color: '#12161C',
  theme_color: '#12161C',
  categories: ['music', 'education'],
  icons: ICONS,
};

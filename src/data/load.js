// The tune file and the statistics, built by `npm run data` from the corpus.
// Loaded on demand, so the first screen paints before the tunes arrive; the
// service worker precaches both, so they load offline too.

export async function loadData() {
  const [tunes, stats] = await Promise.all([
    import('./generated/tunes.json'),
    import('./generated/stats.json'),
  ]);
  return { tunes: (tunes.default ?? tunes).tunes, stats: stats.default ?? stats };
}

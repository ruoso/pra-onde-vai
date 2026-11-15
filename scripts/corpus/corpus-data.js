// The real corpus, read once, for the tests that check the build against it.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { buildAll, LEFT_OUT } from './build.js';

export const CORPUS = fileURLToPath(new URL('../../vendor/dcml-choro/data/', import.meta.url));

let cache = null;
export function corpus() {
  if (cache) return cache;
  const transcriptions = new Map();
  for (const fn of readdirSync(join(CORPUS, 'transcriptions'))) {
    if (!LEFT_OUT.includes(fn)) transcriptions.set(fn, readFileSync(join(CORPUS, 'transcriptions', fn), 'utf8'));
  }
  const table = readFileSync(join(CORPUS, 'choro.tsv'), 'utf8');
  cache = { table, transcriptions, ...buildAll(table, transcriptions) };
  return cache;
}

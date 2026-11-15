// npm run data: build the app's tune file and statistics from the DCML Choro
// Songbooks Corpus (vendor/dcml-choro, at the commit scripts/corpus.json pins;
// `npm run corpus` fetches it). Writes src/data/generated/, which is not
// committed: the corpus and everything derived from it are CC BY-NC-SA 4.0.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { buildAll, LEFT_OUT } from './corpus/build.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const corpus = join(root, 'vendor/dcml-choro/data');
const out = join(root, 'src/data/generated');

if (!existsSync(join(corpus, 'choro.tsv'))) {
  console.error('The corpus is not in vendor/dcml-choro. Run `npm run corpus` first.');
  process.exit(1);
}

const transcriptions = new Map();
for (const fn of readdirSync(join(corpus, 'transcriptions'))) {
  if (LEFT_OUT.includes(fn)) continue;
  transcriptions.set(fn, readFileSync(join(corpus, 'transcriptions', fn), 'utf8'));
}
const { tunes, stats } = buildAll(readFileSync(join(corpus, 'choro.tsv'), 'utf8'), transcriptions);

mkdirSync(out, { recursive: true });
const licence = 'Derived from the DCML Choro Songbooks Corpus (github.com/DCMLab/choro), '
  + 'chord transcriptions of the Choro Songbook (Chediak, Sève, Souza & Dininho; Lumiar). '
  + 'Licensed CC BY-NC-SA 4.0.';
writeFileSync(join(out, 'tunes.json'), JSON.stringify({ licence, tunes }));
writeFileSync(join(out, 'stats.json'), JSON.stringify({ licence, ...stats }, null, 1));
console.log(`data: ${tunes.length} tunes, every one aligned with the table`);

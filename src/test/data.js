// The generated tune file and statistics, for tests (npm run data writes them).
import { readFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/generated/${name}`, import.meta.url), 'utf8'));

let tunes = null;
let stats = null;
export function realTunes() {
  tunes ??= read('tunes.json').tunes;
  return tunes;
}
export function realStats() {
  stats ??= read('stats.json');
  return stats;
}
export const tuneById = (id) => realTunes().find((t) => t.id === id);

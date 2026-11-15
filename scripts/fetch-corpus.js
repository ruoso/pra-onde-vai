// npm run corpus: fetch the DCML Choro Songbooks Corpus into vendor/dcml-choro,
// at the commit scripts/corpus.json pins, so every build reads the same data.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const { url, commit } = JSON.parse(readFileSync(join(root, 'scripts/corpus.json'), 'utf8'));
const dir = join(root, 'vendor/dcml-choro');
const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

if (!existsSync(join(dir, '.git'))) {
  mkdirSync(dir, { recursive: true });
  git('init', '--quiet');
  git('remote', 'add', 'origin', url);
}
let head = '';
try { head = git('rev-parse', 'HEAD'); } catch { /* an empty repository */ }
if (head !== commit) {
  git('fetch', '--quiet', '--depth', '1', 'origin', commit);
  git('checkout', '--quiet', '--detach', commit);
}
console.log(`corpus: vendor/dcml-choro at ${commit.slice(0, 12)}`);

// How the choro board covers jazz: the Jazz Harmony Treebank (DCML; 1,170
// standards from the iRealPro corpus, CC BY-NC-SA 4.0), read with the app's
// own labelling (src/core), measured as research/levels.py measures choro.
//
// usage: node research/jazz.mjs vendor/jht/treebank.json
//
// The treebank gives each tune one key: changes of key are not annotated.
// So besides coverage against the tune's key, it counts how much of what the
// board misses is a cadence into a chord the board has no destination for
// (a tonicization of a remote key), which a local key would recover.

import { readFileSync } from 'node:fs';
import { labelSymbol } from '../src/core/theory/functions.js';
import { chordInfo } from '../src/core/theory/chord.js';
import { chordDef, isOnBoard } from '../src/core/theory/board.js';
import { LEVELS, boardAt } from '../src/core/levels/levels.js';
import { parseKey, mod } from '../src/core/theory/pitch.js';

const tunes = JSON.parse(readFileSync(process.argv[2], 'utf8'));

// iRealPro's spelling, as the treebank writes it, into cifra.md's.
const SUFFIX = { '': '', '^': '', '^7': '7M', 7: '7', m: 'm', m7: 'm7', m6: 'm6', 'm^7': 'm(7M)', 6: '6', '%7': 'm7(b5)', o7: '°', sus: '7(4)', '+': '(#5)' };
export function cifra(sym) {
  const m = /^([A-G][#b]?)(.*)$/.exec(sym);
  if (!m || !(m[2] in SUFFIX)) throw new Error(`cannot read ${sym}`);
  return m[1] + SUFFIX[m[2]];
}
// Humdrum keys: upper case major, lower case minor, `-` a flat.
function keyOf(text) {
  const minor = text[0] === text[0].toLowerCase();
  const name = text[0].toUpperCase() + text.slice(1).replace('-', 'b');
  return parseKey(name + (minor ? 'm' : ''));
}

const ROMAN = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
function offName(info, key) {
  const deg = ROMAN[mod(info.root - key.pc, 12)];
  if (info.kind === 'dom') return `${deg}7`;
  if (info.kind === 'dim') return `${deg}°`;
  if (info.kind === 'min') return `${deg}${info.halfDiminished ? 'ø' : 'm'}`;
  return deg;
}

/** Labels for a tune: the board's ids, the ii of a secondary dominant read from what follows. */
function labels(chords, key) {
  const infos = chords.map((c) => chordInfo(c));
  const out = chords.map((c, i) => {
    const l = labelSymbol(c, key);
    return isOnBoard(key.mode, l) ? l : offName(infos[i], key);
  });
  for (let i = 0; i + 1 < chords.length; i += 1) {
    const a = infos[i];
    const b = infos[i + 1];
    if (isOnBoard(key.mode, out[i]) || a.kind !== 'min' || b.kind !== 'dom') continue;
    const root = chords[i].includes('m6') ? mod(a.root + 9, 12) : a.root;
    if (b.root !== mod(root + 5, 12)) continue;
    const to = /^V\/(.+)$/.exec(out[i + 1])?.[1];
    if (to && chordDef(key.mode, `ii/${to}`)) out[i] = `ii/${to}`;
  }
  return out;
}

/** A dominant (or its ii) resolving a fifth down onto a chord the board has no destination for. */
function remoteCadence(chords, i, key) {
  const infos = chords.map((c) => chordInfo(c));
  let j = i;
  if (infos[j].kind === 'min' && infos[j + 1]?.kind === 'dom' && infos[j + 1].root === mod(infos[j].root + 5, 12)) j += 1;
  if (infos[j].kind !== 'dom' || !infos[j + 1]) return false;
  const target = infos[j + 1];
  if (target.root !== mod(infos[j].root + 5, 12) || target.kind === 'dom' || target.kind === 'dim') return false;
  return !isOnBoard(key.mode, labelSymbol(chords[j + 1], key));
}

const freq = { maj: new Map(), min: new Map() };
const perTune = [];
let remote = 0;
let off = 0;
let tritone = 0;
let doms = 0;
const exits = { maj: new Map(), min: new Map() };
for (const t of tunes) {
  const key = keyOf(t.key);
  const chords = t.chords.map(cifra);
  const ls = labels(chords, key);
  const seq = [];
  ls.forEach((l, i) => {
    if (seq.length && seq[seq.length - 1].l === l) return;
    seq.push({ l, i });
  });
  for (const x of seq) {
    freq[key.mode].set(x.l, (freq[key.mode].get(x.l) ?? 0) + 1);
    if (!isOnBoard(key.mode, x.l)) {
      off += 1;
      if (remoteCadence(chords, x.i, key)) remote += 1;
    }
    const info = chordInfo(chords[x.i]);
    const next = chordInfo(chords[x.i + 1] ?? '');
    if (info.kind === 'dom' && next) {
      doms += 1;
      if (next.root === mod(info.root - 1, 12)) tritone += 1;
    }
  }
  for (let k = 0; k + 1 < seq.length; k += 1) {
    const m = exits[key.mode];
    if (!m.has(seq[k].l)) m.set(seq[k].l, new Map());
    m.get(seq[k].l).set(seq[k + 1].l, (m.get(seq[k].l).get(seq[k + 1].l) ?? 0) + 1);
  }
  perTune.push({ mode: key.mode, seq });
}

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const total = (m) => [...freq[m].values()].reduce((a, n) => a + n, 0);
console.log(`Jazz Harmony Treebank: ${tunes.length} tunes (${perTune.filter((x) => x.mode === 'maj').length} major, ${perTune.filter((x) => x.mode === 'min').length} minor), against each tune's one key`);
console.log('\nlevel  coverage maj/min  median tune  tunes >=80%  >=90%');
for (const lv of LEVELS) {
  const sets = { maj: boardAt(lv.n, 'maj'), min: boardAt(lv.n, 'min') };
  const cov = (m) => pct([...sets[m]].reduce((a, id) => a + (freq[m].get(id) ?? 0), 0), total(m));
  const tune = perTune.map((x) => x.seq.filter((s) => sets[x.mode].has(s.l)).length / x.seq.length).sort((a, b) => a - b);
  console.log(`L${lv.n}     ${cov('maj')}% / ${cov('min')}%        ${Math.round(100 * tune[Math.floor(tune.length / 2)])}%          ${tune.filter((c) => c >= 0.8).length}          ${tune.filter((c) => c >= 0.9).length}`);
}
for (const m of ['maj', 'min']) {
  const t = total(m);
  const offTop = [...freq[m].entries()].filter(([l]) => !isOnBoard(m, l)).sort((a, b) => b[1] - a[1]).slice(0, 14);
  console.log(`\n${m}: most frequent chords the board has no place for (share of all chord changes):`);
  console.log('  ' + offTop.map(([l, n]) => `${l} ${(100 * n / t).toFixed(1)}%`).join(', '));
  const top = [...freq[m].entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`${m}: most frequent overall: ` + top.map(([l, n]) => `${l} ${(100 * n / t).toFixed(1)}%`).join(', '));
  const home = m === 'maj' ? 'I' : 'i';
  const ex = exits[m].get(home);
  const exn = [...ex.values()].reduce((a, n) => a + n, 0);
  console.log(`${m}: moves out of ${home}: ` + [...ex.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l, n]) => `${l} ${pct(n, exn)}%`).join(', '));
}
console.log(`\nof the chord changes off the full board, ${pct(remote, off)}% are a V (or ii–V) resolving onto a chord the board has no destination for: a key the tune visits`);
console.log(`dominants resolving down a semitone (tritone substitutes): ${pct(tritone, doms)}% of dominants`);

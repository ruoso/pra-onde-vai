// Does the board's layout fit a repertoire? The board puts destinations in
// columns by fifths (iii vi ii V I IV, each a fifth below the one to its
// left), so a move a fifth down is one column to the right. This measures,
// for choro (the app's tune file) and jazz (the Jazz Harmony Treebank):
//
// - how roots move from chord to chord: a fifth down (one column right), a
//   half step down (a tritone substitute resolving), and the rest;
// - where the chords the board has no place for would sit on the same line
//   of fifths, counted from home: a column the board has, one beyond it on
//   the flat side (bVII, bIII, bVI, bII) or the sharp side (VII, #IV), or one
//   a tritone from the board's own (no place on the line).
//
// usage: node research/geometry.mjs src/data/generated/tunes.json vendor/jht/treebank.json

import { readFileSync } from 'node:fs';
import { chordInfo } from '../src/core/theory/chord.js';
import { isOnBoard, columns } from '../src/core/theory/board.js';
import { parseKey, mod } from '../src/core/theory/pitch.js';
import { cifra, keyOf, labels } from './jazz.mjs';

// A root's place on the line of fifths from home: 0 home, -1 IV, +1 V, ...
const FIFTHS = new Map([[0, 0], [7, 1], [2, 2], [9, 3], [4, 4], [11, 5], [6, 6], [5, -1], [10, -2], [3, -3], [8, -4], [1, -5]]);
// The board's columns, read from the board, by their destination's root.
const COLUMNS = Object.fromEntries(['maj', 'min'].map((m) => [m, new Set(columns(m).map((c) => FIFTHS.get(c.t.semis)))]));

function measure(name, tunes) {
  const motion = new Map();
  let moves = 0;
  const place = new Map();
  let off = 0;
  for (const { key, chords } of tunes) {
    const infos = chords.map(chordInfo);
    // The same labels as the coverage figures, the ii of a secondary dominant included.
    const ls = labels(chords, key);
    for (let i = 0; i < chords.length; i += 1) {
      const a = infos[i];
      if (!a) continue;
      const b = infos[i + 1];
      if (b && b.root !== a.root) {
        const iv = mod(a.root - b.root, 12);
        const k = iv === 7 ? 'a fifth down' : iv === 1 ? 'a half step down' : iv === 5 ? 'a fifth up' : iv === 2 ? 'a step down' : iv === 10 ? 'a step up' : iv === 11 ? 'a half step up' : 'by a third or a tritone';
        motion.set(k, (motion.get(k) ?? 0) + 1);
        moves += 1;
      }
      if (isOnBoard(key.mode, ls[i])) continue;
      off += 1;
      const f = FIFTHS.get(mod(a.root - key.pc, 12));
      const cols = COLUMNS[key.mode];
      const where = cols.has(f) ? 'a column the board has (another quality)'
        : f < Math.min(...cols) ? `beyond the flat end (${f})` : f > Math.max(...cols) ? `beyond the sharp end (+${f})` : 'between';
      place.set(where, (place.get(where) ?? 0) + 1);
    }
  }
  const pct = (n, d) => `${Math.round((100 * n) / d)}%`;
  console.log(`\n${name}: ${tunes.length} tunes`);
  console.log('  root motion: ' + [...motion.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${pct(n, moves)}`).join(', '));
  const flat = [...place.entries()].sort((x, y) => y[1] - x[1]);
  console.log(`  chords off the board (${pct(off, tunes.reduce((a, t) => a + t.chords.length, 0))} of all chords), by where their root sits on the line of fifths:`);
  for (const [k, n] of flat) console.log(`    ${pct(n, off)}  ${k}`);
}

const choro = JSON.parse(readFileSync(process.argv[2], 'utf8')).tunes.map((t) => {
  const chords = [];
  const keys = [];
  for (const s of t.sections) for (const p of s.phrases) for (const b of t.phrases[p].bars) for (const c of b ?? []) {
    if (c.k) { chords.push(c.s); keys.push(parseKey(c.k)); }
  }
  // Each chord against its own local key: split into runs of one key.
  const runs = [];
  chords.forEach((c, i) => {
    const last = runs[runs.length - 1];
    if (last && last.key.pc === keys[i].pc && last.key.mode === keys[i].mode) last.chords.push(c);
    else runs.push({ key: keys[i], chords: [c] });
  });
  return runs;
}).flat();
measure('choro (DCML, each chord against its local key)', choro);

const jazz = JSON.parse(readFileSync(process.argv[3], 'utf8')).map((t) => ({ key: keyOf(t.key), chords: t.chords.map(cifra) }));
measure('jazz (Jazz Harmony Treebank, against each tune’s one key)', jazz);

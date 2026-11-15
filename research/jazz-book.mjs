// The Jazz Harmony Treebank as a book of cifra.md charts, made the way the
// Choro Songbook book was (research/dcml2cifra.py): one `<slug>.cifra.md` per
// tune at the top level, a README with the credits, and .gitattributes.
//
// usage: node research/jazz-book.mjs <out-dir>
//
// Reads vendor/jht/treebank.json (git clone --depth 1
// https://github.com/DCMLab/JazzHarmonyTreebank.git vendor/jht). Writes every
// chart in canonical form, and stops before writing anything if a chart does
// not parse, is not canonical, or does not play the treebank's chords in order.
//
// What the treebank holds, and so what a chart has: a title, the composers, a
// year, a meter, one key, and the chords with the measure and beat each starts
// on. It has no sections and no form (each tune is its chords as played, once
// through), so a chart is one block of bars with no headings and no Form line.
//
// Chords: the treebank writes every chord as one of twelve forms, with no
// tensions, alterations or bass notes. `cifra` (research/jazz.mjs) spells them
// for cifra.md; here they are respelled in the American dialect, as Estante's
// own formatter writes it (so a transposed chart reads like the written one),
// and each respelling is checked to be the same chord. The treebank's `sus`
// is a suspended dominant seventh, as `cifra` reads it: in its source, the
// iRealPro corpus (iRb v1.0), about 725 of the 735 suspended chords are 7sus,
// 9sus or 13sus.
//
// Bars: a measure whose beats run past the meter (beat 5 in 4/4) holds the
// next bar too, where the source lost a bar line; it is written as the bars it
// spans. Beats before a bar's first chord, and measures the treebank skips,
// are rests in the source: N.C. The exceptions are in NOT_BARS and UNREAD.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { cifra, keyOf } from './jazz.mjs';
import { keyText } from '../src/core/theory/pitch.js';
import { parse, write, parseChord, unknownTokens } from '../lib/cifra-md/js/src/index.js';

const out = process.argv[2];
if (!out) {
  console.error('usage: node research/jazz-book.mjs <out-dir>');
  process.exit(2);
}
const tunes = JSON.parse(readFileSync(new URL('../vendor/jht/treebank.json', import.meta.url), 'utf8'));

// Measures the treebank skips that are not bars in its source but an empty
// measure of the encoding (a bar line with nothing before the next one, as
// `**jazz ==` or `= ==`): left out. Every other skipped measure is a bar of
// rest there (`1r`), as Cute's breaks are.
const NOT_BARS = {
  Bloomdido: [1],
  'When It Rains': [1],
  'St. Thomas': [1],
  'Make Someone Happy': [1, 17],
  'Love For Sale': [16, 32],
  "It's All Right With Me": [46],
  "I Don't Want To Miss Mississippi": [32],
};
// Skipped measures where the source has a chord the treebank could not read
// (`D-9` with no duration; `E*7+*`): the chord as the treebank reduces the
// rest, a ninth or an altered seventh to its seventh.
const UNREAD = {
  'Best Is Yet To Come 2': { 14: 'Db7' },
  'Miles Ahead': { 26: 'E7', 58: 'E7' },
};

// `cifra`'s spellings, which read in the Brazilian dialect, into the American
// one as Estante's formatter writes it.
const AMERICAN = {
  '': '', '7M': 'maj7', 7: '7', 6: '6', m: 'm', m7: 'm7', m6: 'm6', 'm(7M)': 'mmaj7',
  'm7(b5)': 'm7b5', '°': 'dim7', '7(4)': '7sus4', '(#5)': 'aug',
};
const NOTATION = 'american';
function american(sym) {
  const br = cifra(sym);
  const [, root, body] = /^([A-G][#b]?)(.*)$/.exec(br);
  if (!(body in AMERICAN)) throw new Error(`no American spelling for ${br}`);
  const am = root + AMERICAN[body];
  const a = parseChord(am, NOTATION).chord;
  if (!a || !isDeepStrictEqual(a, parseChord(br, 'brazilian').chord)) throw new Error(`${am} is not ${br}`);
  return am;
}

// "Night In Tunisia, A" is "A Night In Tunisia"; a stray trailing comma goes.
const TITLE_FIX = { 'Over The Rainbow (Somewhere)Arlen Harold': 'Over The Rainbow (Somewhere)' }; // the composer, run on
function title(t) {
  const s = (TITLE_FIX[t] ?? t).trim().replace(/,$/, '');
  const m = /^(.*), (The|A|An)$/.exec(s);
  return m ? `${m[2]} ${m[1]}` : s;
}
// "Strayhorn, Billy & Ellington, Duke" is "Billy Strayhorn; Duke Ellington":
// Estante lists a song under each author, split on `;` (and `,` and `/`).
const NAME_FIX = { 'Thelonious, Monk': 'Thelonious Monk' }; // the treebank's comma is misplaced
function artist(c) {
  return c.split(' & ').map((p) => {
    const n = p.trim();
    if (NAME_FIX[n]) return NAME_FIX[n];
    const m = /^([^,]+), ([^,]+)$/.exec(n);
    return m ? `${m[2]} ${m[1]}` : n;
  }).join('; ');
}
// As dcml2cifra.py: ASCII, lower case, runs of anything else one hyphen.
function slug(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
}

const stats = { rests: 0, restBars: 0, notBars: 0, unread: 0, spilled: 0, bars: 0, chords: 0 };

/** The tune's bars, each a list of [beat, chord] with its first item on beat 1. */
function bars(t) {
  const n = t.meter.numerator;
  const byMeasure = new Map();
  t.measures.forEach((m, i) => {
    if (!byMeasure.has(m)) byMeasure.set(m, []);
    byMeasure.get(m).push([t.beats[i], american(t.chords[i])]);
  });
  const skip = new Set(NOT_BARS[t.title] ?? []);
  const unread = UNREAD[t.title] ?? {};
  for (const m of [...skip, ...Object.keys(unread).map(Number)]) {
    if (byMeasure.has(m)) throw new Error(`${t.title}: measure ${m} is not skipped`);
  }
  const res = [];
  for (let m = 1; m <= t.measures[t.measures.length - 1]; m += 1) {
    if (skip.has(m)) { stats.notBars += 1; continue; }
    if (unread[m]) { stats.unread += 1; res.push([[1, unread[m]]]); continue; }
    const onsets = byMeasure.get(m);
    if (!onsets) { stats.restBars += 1; res.push([[1, 'N.C.']]); continue; }
    const span = Math.ceil(Math.max(...onsets.map(([b]) => b)) / n);
    stats.spilled += span - 1;
    for (let k = 0; k < span; k += 1) {
      const bar = onsets.filter(([b]) => b > k * n && b <= (k + 1) * n).map(([b, c]) => [b - k * n, c]);
      if (!bar.length || bar[0][0] !== 1) { stats.rests += 1; bar.unshift([1, 'N.C.']); }
      res.push(bar);
    }
  }
  return res;
}

/** A bar as chart text: equal shares as the chords alone, otherwise a `.` for each beat a chord holds on. */
function barText(bar, n) {
  const lengths = bar.map(([b], i) => (bar[i + 1]?.[0] ?? n + 1) - b);
  if (lengths.every((l) => l === lengths[0])) return bar.map(([, c]) => c).join(' ');
  return bar.map(([, c], i) => [c, ...Array(lengths[i] - 1).fill('.')].join(' ')).join(' ');
}

function chart(t) {
  const n = t.meter.numerator;
  const cells = [];
  let prev = null;
  for (const bar of bars(t)) {
    const text = barText(bar, n);
    cells.push(text === prev && !text.startsWith('N.C.') ? '%' : text);
    prev = text;
  }
  stats.bars += cells.length;
  const lines = [];
  for (let i = 0; i < cells.length; i += 4) lines.push(cells.slice(i, i + 4).join(' | '));
  const props = [
    ['artist', artist(t.composers)],
    ['key', keyText(keyOf(t.key))],
    ['time', `${t.meter.numerator}/${t.meter.denominator}`],
    ['notation', NOTATION],
    ['genre', 'Jazz'],
    ['year', String(t.year)],
    ['source', 'iRealPro corpus (Shanahan, Broze & Rodgers), via the Jazz Harmony Treebank '
      + "(Harasim, Finkensiep, Ericson, O'Donnell & Rohrmeier, DCML), CC BY-NC-SA 4.0"],
  ];
  return [`# ${title(t.title)}`, ...props.map(([k, v]) => `- ${k}: ${v}`), '', '```', ...lines, '```', ''].join('\n');
}

/** The chords the chart plays, in order, `%` read as the bar it repeats. */
function played(doc) {
  const seq = [];
  let last = [];
  for (const section of doc.sections) {
    for (const part of section.body) {
      if (part.type !== 'music') continue;
      for (const line of part.lines) {
        for (const measure of line.measures ?? []) {
          const items = measure.items.filter((it) => it.type === 'chord' || it.type === 'repeat');
          if (items.some((it) => it.type === 'repeat')) { seq.push(...last); continue; }
          last = items.map((it) => it.symbol);
          seq.push(...last);
        }
      }
    }
  }
  return seq;
}

const books = new Map();
for (const t of tunes) {
  const text = chart(t);
  const doc = parse(text);
  if (write(doc) !== text) throw new Error(`${t.title}: not in canonical form`);
  if (unknownTokens(text).length) throw new Error(`${t.title}: unknown tokens ${JSON.stringify(unknownTokens(text))}`);
  if (doc.properties.find((p) => p.key === 'notation')?.value !== NOTATION) throw new Error(`${t.title}: notation`);
  const want = t.chords.map(american);
  Object.entries(UNREAD[t.title] ?? {}).forEach(([m, c], k) => {
    want.splice(t.measures.filter((x) => x < Number(m)).length + k, 0, c);
  });
  if (!isDeepStrictEqual(played(doc), want)) throw new Error(`${t.title}: does not play the treebank's chords`);
  stats.chords += want.length;
  const base = slug(title(t.title));
  let name = base;
  for (let k = 2; books.has(name); k += 1) name = `${base}-${k}`;
  books.set(name, text);
}

const README = `# Jazz Standards

Chord charts for the ${tunes.length} jazz standards of the Jazz Harmony Treebank
(https://github.com/DCMLab/JazzHarmonyTreebank), by Daniel Harasim, Christoph
Finkensiep, Petter Ericson, Timothy J. O'Donnell and Martin Rohrmeier at the
Digital and Cognitive Musicology Lab, EPFL: "The Jazz Harmony Treebank",
Proceedings of the 21st International Society for Music Information Retrieval
Conference (ISMIR 2020), pp. 207-215, https://doi.org/10.5281/zenodo.4245406.
Its chord sequences come from the iRealPro corpus of jazz standards (Daniel
Shanahan, Yuri Broze and Richard Rodgers, 2012), charts written by the users
of the iReal Pro app.

The treebank is licensed CC BY-NC-SA 4.0
(https://creativecommons.org/licenses/by-nc-sa/4.0/), and so is this book: it
may be shared and adapted for non-commercial use, with attribution, under the
same licence.

Each song has the treebank's title, composers, year, meter and key (one key
for the whole tune, as the treebank gives it), and its chords bar by bar, the
form written out as played, once through. The treebank has no sections, so
neither do the songs. It writes every chord as a triad, a sixth or a seventh
chord, without tensions, alterations or bass notes, and so does this book, in
American notation (\`Cmaj7\`, \`Cm7b5\`, \`Cdim7\`); its suspended chord is
written \`C7sus4\`, as nearly every suspended chord of its source has the
seventh. Where the source has a rest, the chart has \`N.C.\`.
`;

mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (f.endsWith('.cifra.md')) rmSync(join(out, f));
for (const [name, text] of books) writeFileSync(join(out, `${name}.cifra.md`), text);
writeFileSync(join(out, 'README.md'), README);
writeFileSync(join(out, '.gitattributes'), '*.cifra.md merge=cifra\n*.setlist.md merge=cifra\n');

console.log(`${tunes.length} tunes, ${books.size} charts written to ${out}, ${stats.bars} bars, ${stats.chords} chords`);
console.log(`bars spilled from a measure past its meter: ${stats.spilled}; skipped measures written N.C.: ${stats.restBars}, left out: ${stats.notBars}, filled from the source: ${stats.unread}; bars opening on N.C. before their first chord: ${stats.rests}`);

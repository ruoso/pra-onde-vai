// The data build: the corpus's transcriptions and table in, the app's tune
// file and statistics out. Pure functions over the text of the corpus files;
// scripts/build-data.js reads and writes the files.

import { readTranscription, phrasesOf } from './transcription.js';
import { readTable, byPiece } from './table.js';
import { align } from './align.js';
import { labelPhrase, modeOf } from './labels.js';
import { roundHalfEven, median } from './numbers.js';
import { fromCorpus } from '../../src/core/theory/chord.js';
import { parseKey, keyText } from '../../src/core/theory/pitch.js';
import { chords, MODES } from '../../src/core/theory/board.js';
import { LEVELS, boardAt } from '../../src/core/levels/levels.js';

// The two transcriptions with no rows in the table (corpus-notes.md).
export const LEFT_OUT = ['2_chorinho_pra_voce_WF.txt', '3_um_chorinho_na_aldeia_WF.txt'];

export function slug(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
}

function keyOf(text, mode) {
  const k = parseKey(text.replace(/m$/, ''));
  if (!k) throw new Error(`cannot read key ${text}`);
  return keyText({ ...k, mode });
}

// What a part is called: a letter (PartA2 is `A2`), or one of the named kinds
// the view translates.
const NAMED = { Intro: 'intro', Coda: 'coda', Fadeout: 'fadeout', Impro: 'impro' };
function partName(name) {
  const m = /^Part([A-Z])(\d*)$/.exec(name);
  if (m) return { kind: 'part', name: m[1] + m[2] };
  if (NAMED[name]) return { kind: NAMED[name], name: null };
  return { kind: 'part', name };
}

/**
 * The form in play order, as sections: each part where the form names it,
 * and each run of bare phrases between parts as a section of its own, as
 * research/dcml2cifra.py reads them — a return to a part with a new ending
 * (`again`, or `end` as the last), an intro, a coda, or a link. A section
 * carries what it is (`kind`), its letter (`name`) when it is a part, the
 * part it returns to (`of`) when it is a return, and `n` when the same kind
 * recurs (a second intro).
 */
export function sectionsOf(t) {
  const refs = t.form.refs;
  const out = [];
  const counts = new Map();
  const numbered = (s) => {
    const key = `${s.kind}|${s.name}`;
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    return n === 1 ? s : { ...s, n };
  };
  const first = new Map();
  let i = 0;
  while (i < refs.length) {
    const ref = refs[i];
    if (t.parts[ref]) {
      if (!first.has(ref)) first.set(ref, numbered(partName(ref)));
      out.push({ ...first.get(ref), part: ref, phrases: phrasesOf(t, ref) });
      i += 1;
      continue;
    }
    let j = i;
    while (j < refs.length && !t.parts[refs[j]]) j += 1;
    const run = refs.slice(i, j);
    const owners = [];
    for (const ph of run) {
      const p = t.partOrder.find((name) => phrasesOf(t, name).includes(ph));
      if (p && !owners.includes(p)) owners.push(p);
    }
    const owner = owners[0];
    const of = owner ? (({ kind, name }) => ({ kind, name }))(first.get(owner) ?? partName(owner)) : null;
    let s;
    if (owner && run.join() === phrasesOf(t, owner).join()) s = { ...(first.get(owner) ?? partName(owner)) };
    else if (i === 0 && !owners.length) s = numbered({ kind: 'intro', name: null });
    else if (j === refs.length) s = owners.length ? { kind: 'end', name: null, of } : numbered({ kind: 'coda', name: null });
    else s = owners.length ? { kind: 'again', name: null, of } : numbered({ kind: 'link', name: null });
    out.push({ ...s, part: null, phrases: run });
    i = j;
  }
  return out;
}

/**
 * One tune: its metadata, its phrases with each chord's symbol, local key,
 * function and length, and its form as sections in play order.
 */
export function buildTune(filename, transcriptionText, rows) {
  const read = readTranscription(transcriptionText, filename);
  if (!read.form) throw new Error(`${filename}: no form line`);
  const al = align(read, rows);
  if (!al.ok) throw new Error(`${filename}: the transcription and the table do not align: ${al.error}`);
  const t = al.transcription;

  // The rows of each phrase's first playing, and the labels read from them.
  const firstRows = new Map();
  for (const tok of al.tokens) {
    if (tok.playing !== 0) continue;
    if (!firstRows.has(tok.phrase)) firstRows.set(tok.phrase, { toks: [] });
    firstRows.get(tok.phrase).toks.push(tok);
  }

  const phrases = {};
  const labelAt = new Map();
  for (const [id, entry] of firstRows) {
    const labels = labelPhrase(entry.toks.map((x) => x.row));
    entry.toks.forEach((x, k) => labelAt.set(`${id}:${x.bar}:${x.index}`, labels[k]));
    const def = t.phrases[id];
    const bars = def.bars.map((bar, b) => {
      if (bar === null) return null;
      const out = [];
      bar.forEach((tok, k) => {
        const x = entry.toks.find((e) => e.bar === b && e.index === k);
        const row = x.row;
        const dur = Number(row.duration);
        if (tok === '.' && out.length) {
          out[out.length - 1].d += dur;
          return;
        }
        const mode = modeOf(row);
        const chord = {
          s: tok === '.' ? fromCorpus(row.chord) : fromCorpus(tok),
          k: row.sd === 'NC' ? null : keyOf(row.local_key, mode),
          f: labelAt.get(`${id}:${b}:${k}`),
          d: dur,
        };
        if (row.chord === 'NC') { chord.s = 'NC'; chord.f = null; }
        out.push(chord);
      });
      return out;
    });
    phrases[id] = { key: def.key, bars };
  }

  const meta = rows[0];
  const gmode = meta.global_mode === 'major' ? 'maj' : 'min';
  const used = new Set(t.form.refs.flatMap((r) => phrasesOf(t, r)));
  for (const id of Object.keys(phrases)) if (!used.has(id)) delete phrases[id];

  // The tune as played, one entry per change of function, key or mode, as
  // research/levels.py and fit.py count it.
  const seq = [];
  for (const tok of al.tokens) {
    const l = labelAt.get(`${tok.phrase}:${tok.bar}:${tok.index}`);
    if (!l) continue;
    const item = { l, m: modeOf(tok.row), k: tok.row.local_key };
    const last = seq[seq.length - 1];
    if (!last || last.l !== item.l || last.m !== item.m || last.k !== item.k) seq.push(item);
  }
  const coverage = LEVELS.map((lv) => {
    const sets = { maj: boardAt(lv.n, 'maj'), min: boardAt(lv.n, 'min') };
    return seq.filter((x) => sets[x.m].has(x.l)).length / seq.length;
  });
  const keys = [];
  for (const x of seq) if (keys[keys.length - 1] !== x.k) keys.push(x.k);

  return {
    tune: {
      id: null,
      file: filename,
      title: meta.title,
      composers: meta.composer ? meta.composer.split(';').map((s) => s.trim()).filter(Boolean) : [],
      year: meta.year ? Math.trunc(Number(meta.year)) : null,
      genre: meta.sub_genre || null,
      songbook: Number(meta.songbook) || null,
      key: keyOf(meta.global_key, gmode),
      mode: gmode,
      meter: t.form.meter,
      phrases,
      sections: sectionsOf(t),
      coverage: coverage.map((c) => Math.round(c * 1000) / 1000),
      keys: new Set(keys).size,
      notes: [...read.notes, ...Object.entries(al.chosen).map(([id, i]) => `${id}: definition ${i + 1} is the one the table plays`)],
    },
    seq,
    tokens: al.tokens,
    labelAt,
  };
}

/** The moves out of each chord, from each phrase's first playing (research/tiers.py). */
function moveStats(rows, labelOf) {
  const seen = new Set();
  const runs = [];
  let cur = null;
  for (const r of rows) {
    const k = `${r.filename}|${r.phrase}|${r.path}`;
    const kk = `${r.filename}|${r.phrase}`;
    if (!cur || cur.k !== k) {
      if (seen.has(kk)) { cur = { k, skip: true }; continue; }
      seen.add(kk);
      cur = { k, skip: false, mode: modeOf(r), labels: [] };
      runs.push(cur);
    }
    if (!cur.skip) cur.labels.push(labelOf(r));
  }
  const out = {};
  for (const mode of MODES) {
    const board = chords(mode);
    const edges = new Map();
    const tot = new Map();
    for (const run of runs) {
      if (run.mode !== mode) continue;
      const s = run.labels.filter(Boolean).filter((x, i, a) => i === 0 || x !== a[i - 1]);
      for (let i = 0; i + 1 < s.length; i += 1) {
        const key = `${s[i]}>${s[i + 1]}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
        tot.set(s[i], (tot.get(s[i]) ?? 0) + 1);
      }
    }
    const exits = {};
    const totals = {};
    for (const a of board.keys()) {
      const n = tot.get(a) ?? 0;
      if (!n) continue;
      totals[a] = n;
      exits[a] = [...edges.entries()]
        .filter(([key]) => key.startsWith(`${a}>`) && board.has(key.slice(a.length + 1)))
        .map(([key, k]) => [key.slice(a.length + 1), roundHalfEven((100 * k) / n)])
        .filter(([, p]) => p >= 3)
        .sort((x, y) => y[1] - x[1]);
    }
    out[mode] = { exits, totals };
  }
  return out;
}

/** How sections open: the first chord of each part of each piece (research/tiers.py). */
function openStats(rows, labelOf) {
  const first = new Map();
  for (const r of rows) {
    const k = `${r.filename}|${r.part}`;
    if (r.part && !first.has(k) && labelOf(r)) first.set(k, { m: modeOf(r), l: labelOf(r) });
  }
  const out = {};
  for (const mode of MODES) {
    const board = chords(mode);
    const counts = {};
    let total = 0;
    for (const { m, l } of first.values()) {
      if (m !== mode) continue;
      total += 1;
      if (board.has(l)) counts[l] = (counts[l] ?? 0) + 1;
    }
    out[mode] = { counts, total };
  }
  return out;
}

/**
 * Builds every tune and the statistics.
 * @param {string} tableText data/choro.tsv
 * @param {Map<string,string>} transcriptions filename → text
 */
export function buildAll(tableText, transcriptions) {
  const rows = readTable(tableText);
  const pieces = byPiece(rows);
  const built = [];
  const errors = [];
  for (const [fn, prows] of pieces) {
    const text = transcriptions.get(fn);
    if (text === undefined) { errors.push(`${fn}: no transcription`); continue; }
    try {
      built.push(buildTune(fn, text, prows));
    } catch (e) {
      errors.push(e.message);
    }
  }
  if (errors.length) throw new Error(`the data build failed:\n${errors.join('\n')}`);

  const ids = new Set();
  for (const b of built) {
    const base = slug(b.tune.title);
    let id = base;
    for (let k = 2; ids.has(id); k += 1) id = `${base}-${k}`;
    ids.add(id);
    b.tune.id = id;
  }

  // Each row's label, by its place in its tune.
  const rowLabel = new Map();
  for (const b of built) {
    for (const tok of b.tokens) rowLabel.set(tok.row, b.labelAt.get(`${tok.phrase}:${tok.bar}:${tok.index}`) ?? null);
  }
  const labelOf = (r) => rowLabel.get(r) ?? null;

  const moves = moveStats(rows, labelOf);
  const opens = openStats(rows, labelOf);

  // Function frequencies and each level's coverage (research/levels.py).
  const freq = { maj: new Map(), min: new Map() };
  for (const b of built) for (const x of b.seq) freq[x.m].set(x.l, (freq[x.m].get(x.l) ?? 0) + 1);
  const totalOf = (m) => [...freq[m].values()].reduce((a, n) => a + n, 0);
  const levels = LEVELS.map((lv, i) => {
    const cover = {};
    for (const m of MODES) {
      const set = boardAt(lv.n, m);
      cover[m] = [...set].reduce((a, id) => a + (freq[m].get(id) ?? 0), 0) / totalOf(m);
    }
    const cov = built.map((b) => b.tune.coverage[i]);
    const exact = built.map((b) => {
      const sets = { maj: boardAt(lv.n, 'maj'), min: boardAt(lv.n, 'min') };
      return b.seq.filter((x) => sets[x.m].has(x.l)).length / b.seq.length;
    });
    return {
      level: lv.n,
      cover: { maj: roundHalfEven(100 * cover.maj), min: roundHalfEven(100 * cover.min) },
      median: roundHalfEven(100 * median(exact)),
      tunes80: exact.filter((c) => c >= 0.8).length,
      tunes90: exact.filter((c) => c >= 0.9).length,
      _cov: cov.length,
    };
  }).map(({ _cov, ...l }) => l);
  const frequencies = {};
  for (const m of MODES) {
    const t = totalOf(m);
    frequencies[m] = { total: t, top: [...freq[m].entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([l, n]) => [l, n, roundHalfEven((1000 * n) / t) / 10]) };
  }

  // Where the B section of a minor-key choro goes (design §1).
  const bMoves = { tunes: 0, relative: 0, parallel: 0, same: 0, other: 0 };
  for (const b of built) {
    if (b.tune.mode !== 'min') continue;
    const sec = b.tune.sections.find((s) => s.part === 'PartB');
    if (!sec) continue;
    bMoves.tunes += 1;
    const home = parseKey(b.tune.key);
    const firstChord = b.tune.phrases[sec.phrases[0]].bars.flat().find((c) => c && c.k);
    const bk = parseKey(firstChord.k);
    if (bk.mode === 'maj' && bk.pc === (home.pc + 3) % 12) bMoves.relative += 1;
    else if (bk.mode === 'maj' && bk.pc === home.pc) bMoves.parallel += 1;
    else if (bk.mode === 'min' && bk.pc === home.pc) bMoves.same += 1;
    else bMoves.other += 1;
  }

  const tunes = built.map((b) => b.tune).sort((a, b) => a.title.localeCompare(b.title, 'pt'));
  const stats = {
    tunes: tunes.length,
    exits: { maj: moves.maj.exits, min: moves.min.exits },
    exitTotals: { maj: moves.maj.totals, min: moves.min.totals },
    opens,
    levels,
    frequencies,
    bMoves,
    medianFit: roundHalfEven(median(tunes.map((t) => roundHalfEven(100 * t.coverage[5])))),
  };
  return { tunes, stats };
}

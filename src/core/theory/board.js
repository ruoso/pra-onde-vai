// The map's two boards (design §4): columns by fifths, so each dominant sits
// above its destination; rows for the ii of a secondary dominant (level 7),
// the dominant that leads in, the destination, and colour. Positions never
// move; a level only decides which buttons are shown (core/levels).
//
// Each chord: [id, letter step, semitones, suffix] from the home key's tonic.
// The suffix is how the button spells the chord; marking never looks at it.

const def = (id, step, semis, suffix) => ({ id, step, semis, suffix });

const MAJOR = [
  { t: def('iii', 2, 4, 'm'), a: def('V/iii', 6, 11, '7'), ii: def('ii/iii', 3, 6, 'm7(b5)'), c: [] },
  { t: def('vi', 5, 9, 'm'), a: def('V/vi', 2, 4, '7'), ii: def('ii/vi', 6, 11, 'm7(b5)'), c: [] },
  { t: def('ii', 1, 2, 'm'), a: def('V/ii', 5, 9, '7'), ii: def('ii/ii', 2, 4, 'm7(b5)'),
    c: [def('#I°', 0, 1, '°'), def('bIII°', 2, 3, '°')] },
  { t: def('V', 4, 7, '7'), a: def('V/V', 1, 2, '7'), ii: null, iiNote: 'vi', c: [def('#IV°', 3, 6, '°')] },
  { t: def('I', 0, 0, ''), a: null, aNote: 'V', ii: null, home: true, c: [def('bII', 1, 1, ''), def('bVII7', 6, 10, '7')] },
  { t: def('IV', 3, 5, ''), a: def('V/IV', 0, 0, '7'), ii: def('ii/IV', 4, 7, 'm7'), c: [def('iv', 3, 5, 'm6'), def('IV7', 3, 5, '7')] },
];

const MINOR = [
  { t: def('III', 2, 3, ''), a: def('V/III', 6, 10, '7'), ii: null, iiNote: 'iv', c: [] },
  { t: def('VI', 5, 8, ''), a: def('V/VI', 2, 3, '7'), ii: def('ii/VI', 6, 10, 'm7'), c: [def('bVI7', 5, 8, '7')] },
  { t: def('iiø', 1, 2, 'm7(b5)'), a: null, aNote: 'VI', ii: null, c: [def('bII', 1, 1, '')] },
  { t: def('V', 4, 7, '7'), a: def('V/V', 1, 2, '7'), ii: def('ii/V', 5, 9, 'm7(b5)'), c: [def('#IV°', 3, 6, '°')] },
  { t: def('i', 0, 0, 'm'), a: null, aNote: 'V', ii: null, home: true, c: [def('bII7', 1, 1, '7')] },
  { t: def('iv', 3, 5, 'm'), a: def('V/iv', 0, 0, '7'), ii: def('ii/iv', 4, 7, 'm7(b5)'), c: [def('IV7', 3, 5, '7')] },
];

export const MODES = ['maj', 'min'];

/** The board's columns, left to right. */
export function columns(mode) {
  return mode === 'maj' ? MAJOR : MINOR;
}

/** Every chord on the full board, by id. */
export function chords(mode) {
  const out = new Map();
  for (const col of columns(mode)) {
    for (const d of [col.ii, col.a, col.t, ...col.c]) if (d) out.set(d.id, d);
  }
  return out;
}

export function chordDef(mode, id) {
  return chords(mode).get(id) ?? null;
}

export function isOnBoard(mode, id) {
  return chords(mode).has(id);
}

export function homeId(mode) {
  return mode === 'maj' ? 'I' : 'i';
}

/** Where a function goes: `V/ii` and `ii/ii` both lead to `ii`; others to themselves. */
export function target(id) {
  const m = /^(?:V|ii)\/(.+)$/.exec(id);
  return m ? m[1] : null;
}

/**
 * How a function is read out: `V of ii` for a secondary dominant, `ii of IV`
 * for its ii, the numeral itself otherwise. The view translates the parts.
 */
export function functionParts(id) {
  const m = /^(V|ii)\/(.+)$/.exec(id);
  return m ? { of: m[1], to: m[2] } : { name: id };
}

/** Destinations that can become home: a major or minor triad, not the ø. */
export function canBeHome(mode, id) {
  const col = columns(mode).find((c) => c.t.id === id);
  return !!col && !col.home && col.t.suffix !== 'm7(b5)';
}

/** The key a destination becomes when it is made home. */
export function homeModeOf(mode, id) {
  const d = chordDef(mode, id);
  return d && d.suffix.startsWith('m') ? 'min' : 'maj';
}

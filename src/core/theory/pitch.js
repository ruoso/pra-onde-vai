// Pitch classes and letter-based spelling. A key centre is { L, pc, mode }:
// its letter (0 = C … 6 = B), its pitch class, and 'maj' or 'min'. Every
// chord on the board is spelled from the centre by a letter step and a number
// of semitones, so F# and Gb are different (the mockups' spell()).

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const NATURALS = [0, 2, 4, 5, 7, 9, 11];
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

export const mod = (n, m) => ((n % m) + m) % m;

export function scaleOf(mode) {
  return mode === 'maj' ? MAJOR_SCALE : MINOR_SCALE;
}

/** The accidental (−2…+2) that letter L needs to sound pitch class pc. */
export function accidentalOf(L, pc) {
  return mod(pc - NATURALS[L] + 6, 12) - 6;
}

export function accidentalText(acc) {
  return acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc);
}

export function noteName(L, pc) {
  return LETTERS[L] + accidentalText(accidentalOf(L, pc));
}

/** The note `step` letters and `semis` semitones above the centre's tonic. */
export function spell(centre, step, semis) {
  const L = mod(centre.L + step, 7);
  const pc = mod(centre.pc + semis, 12);
  return { L, pc, text: noteName(L, pc) };
}

/** Read a note name (`F#`, `Bb`, `C`) into { L, pc }, or null. */
export function parseNote(text) {
  const m = /^([A-G])(#{1,2}|b{1,2})?$/.exec(text);
  if (!m) return null;
  const L = LETTERS.indexOf(m[1]);
  const acc = !m[2] ? 0 : m[2][0] === '#' ? m[2].length : -m[2].length;
  return { L, pc: mod(NATURALS[L] + acc, 12) };
}

/** Read a key as the corpus and cifra.md write it (`Dm`, `F`, `F#m`, `Bb`). */
export function parseKey(text) {
  const m = /^([A-G](?:#{1,2}|b{1,2})?)(m?)$/.exec(String(text).trim());
  if (!m) return null;
  const note = parseNote(m[1]);
  return note && { L: note.L, pc: note.pc, mode: m[2] ? 'min' : 'maj' };
}

/** `Dm`, `F`: the key as a chord chart writes it. */
export function keyText(centre) {
  return noteName(centre.L, centre.pc) + (centre.mode === 'min' ? 'm' : '');
}

export function tonicText(centre) {
  return noteName(centre.L, centre.pc);
}

export function sameKey(a, b) {
  return !!a && !!b && a.pc === b.pc && a.mode === b.mode;
}

/**
 * How a pitch class is written in a key: by the key's scale degree when it is
 * in the key, else by the usual chromatic spelling for that mode (the raised
 * or lowered degree a chart would write). With no key, a neutral spelling.
 */
export function spellIn(key, pc) {
  if (!key) {
    const t = [[0, 0], [0, 1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [6, -1], [6, 0]][pc];
    return { L: t[0], pc, text: LETTERS[t[0]] + accidentalText(t[1]) };
  }
  const o = mod(pc - key.pc, 12);
  let deg = scaleOf(key.mode).indexOf(o);
  if (deg < 0) {
    deg = (key.mode === 'maj' ? { 1: 0, 3: 2, 6: 3, 8: 4, 10: 6 } : { 1: 1, 4: 2, 6: 3, 9: 5, 11: 6 })[o];
  }
  const L = mod(key.L + deg, 7);
  return { L, pc, text: noteName(L, pc) };
}

/**
 * Transpose a key centre by an interval given as letter steps and semitones,
 * so spelling stays letter-true.
 */
export function transposeCentre(centre, step, semis) {
  const { L, pc } = spell(centre, step, semis);
  return { L, pc, mode: centre.mode };
}

/** The number of sharps (positive) or flats (negative) in a key's signature. */
export function signature(centre) {
  let total = 0;
  scaleOf(centre.mode).forEach((o, d) => {
    total += accidentalOf(mod(centre.L + d, 7), mod(centre.pc + o, 12));
  });
  return total;
}

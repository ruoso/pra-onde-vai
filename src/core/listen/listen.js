// Listening help (design §5): from notes hummed or tapped, rank home keys
// (when home is not known) or the board's chords (when it is), as
// rankHomes and rankChords in mockups/Listen.dc.html do. Results carry codes
// and note names for the view to put into words.

import { scaleOf, spellIn, mod, keyText, LETTERS } from '../theory/pitch.js';
import { chords } from '../theory/board.js';
import { chordInfo } from '../theory/chord.js';
import { chordName } from '../drills/drills.js';
import { share, openShare } from '../stats/tiers.js';

const KEY_LETTERS = { min: [0, 0, 1, 2, 2, 3, 3, 4, 4, 5, 6, 6], maj: [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6] };

/** The 24 keys, spelled as charts usually spell them (no Gb minor, no D# major). */
export function allKeys() {
  const out = [];
  for (const mode of ['min', 'maj']) {
    for (let pc = 0; pc < 12; pc += 1) out.push({ L: KEY_LETTERS[mode][pc], pc, mode });
  }
  return out;
}

/** The notes a key holds: its scale, and the raised 7th a minor key uses in practice. */
export function keyNotes(key) {
  const set = scaleOf(key.mode).slice();
  if (key.mode === 'min') set.push(11);
  return set;
}

/**
 * Home not known: the keys that best fit the notes, by how many notes they
 * hold and by the note the phrase comes to rest on (tonic, then 3rd, 5th).
 * @param notes pitch classes, in the order entered
 */
export function rankHomes(notes, limit = 3) {
  if (!notes.length) return [];
  const out = [];
  allKeys().forEach((key, order) => {
    const set = keyNotes(key);
    let fit = 0;
    const missed = [];
    let hasThird = false;
    for (const p of notes) {
      const o = mod(p - key.pc, 12);
      if (o === 3 || o === 4) hasThird = true;
      if (set.includes(o)) fit += 1;
      else {
        const nm = spellIn(key, p).text;
        if (!missed.includes(nm)) missed.push(nm);
      }
    }
    const last = notes[notes.length - 1];
    const lastO = mod(last - key.pc, 12);
    let rest = 'none';
    let bonus = 0;
    if (lastO === 0) { rest = 'tonic'; bonus = 1; }
    else if (lastO === (key.mode === 'maj' ? 4 : 3)) { rest = 'third'; bonus = 0.4; }
    else if (lastO === 7) { rest = 'fifth'; bonus = 0.3; }
    const shareFit = fit / notes.length;
    out.push({
      key, name: keyText(key), fit, share: shareFit, score: shareFit + bonus, order,
      restsOn: { degree: rest, note: spellIn(key, last).text },
      leavesOut: missed, hasThird,
    });
  });
  out.sort((a, b) => b.score - a.score || a.order - b.order);
  return out.filter((r) => r.fit > 0).slice(0, limit);
}

/** How much a note supports a chord: a chord tone fully, the flat 9th over a dominant by half. */
function weight(info, interval) {
  if (info.tones.some((t) => mod(t - info.root, 12) === interval)) return 1;
  if (info.kind === 'dom' && interval === 1) return 0.5;
  return 0;
}

/** The role a note plays in a chord: root, 3rd, 5th, 6th, 7th or the flat 9th. */
export function roleOf(info, interval) {
  if (interval === 0) return 'root';
  if (interval === 1) return 'flat9';
  if (interval === 3 || interval === 4) return 'third';
  if (interval === 6 || interval === 7) return info.kind === 'dim' || info.halfDiminished || interval === 7 ? 'fifth' : 'tone';
  if (interval === 9) return info.kind === 'dim' ? 'seventh' : 'sixth';
  if (interval === 10 || interval === 11) return 'seventh';
  return 'tone';
}

/**
 * Home known: the board's chords that best explain the notes, the last note
 * counting double, nudged by the style — how sections open (coming from
 * nothing) or what follows the chord before — which only breaks ties. A note
 * outside the key is the strongest clue: a chord that cannot explain it loses
 * ground.
 * @param from null (coming from nothing) or the function of the chord before
 */
export function rankChords(notes, home, from, stats, { limit = 3, board = null } = {}) {
  if (!notes.length) return [];
  const scale = scaleOf(home.mode);
  const out = [];
  let order = 0;
  for (const id of chords(home.mode).keys()) {
    if (board && !board.has(id)) continue;
    const name = chordName(home, id);
    const info = chordInfo(name);
    const p = from === null ? openShare(stats, home.mode, id) : share(stats, home.mode, from, id);
    let sum = 0;
    let total = 0;
    let fit = 0;
    let clue = null;
    const missed = [];
    const strays = [];
    notes.forEach((pc, i) => {
      const interval = mod(pc - info.root, 12);
      const w = weight(info, interval);
      const k = i === notes.length - 1 ? 2 : 1;
      const outside = !scale.includes(mod(pc - home.pc, 12));
      const nm = spellIn(home, pc).text;
      sum += w * k;
      total += k;
      if (w > 0) fit += 1;
      else if (!missed.includes(nm)) missed.push(nm);
      if (w > 0 && outside && !clue) clue = { note: nm, role: roleOf(info, interval) };
      if (w === 0 && outside && !strays.includes(nm)) strays.push(nm);
    });
    const shareFit = sum / total;
    out.push({
      id, name, root: info.root, tones: info.tones, fit, share: shareFit, likely: p,
      score: shareFit * (1 + p / 400) - 0.15 * strays.length, order: order++, clue, leavesOut: missed,
    });
  }
  out.sort((a, b) => b.score - a.score || a.order - b.order);
  return out.filter((r) => r.fit > 0).slice(0, limit);
}

/** The key signature of a key, as the staff draws it: each letter's accidental. */
export function keySignature(key) {
  const acc = [0, 0, 0, 0, 0, 0, 0];
  if (!key) return acc;
  scaleOf(key.mode).forEach((o, d) => {
    const L = mod(key.L + d, 7);
    const pc = mod(key.pc + o, 12);
    const natural = [0, 2, 4, 5, 7, 9, 11][L];
    acc[L] = mod(pc - natural + 6, 12) - 6;
  });
  return acc;
}

export { LETTERS };

// What to play for a chord, and when: pure functions, so the sound is tested
// without a sound card. A chord is played as a 6-string accompanist would
// sound it: its bass (the written bass, so an inversion moves the bass line)
// in the guitar's low register, the chord tones above it in the middle.

import { chordInfo } from '../core/theory/chord.js';
import { mod } from '../core/theory/pitch.js';

const LOW_E = 40; // E2, the open sixth string
const MIDDLE = 55; // G3: the chord tones start here

export const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12);

/** MIDI notes for a chord symbol: the bass first, then up to four chord tones. */
export function voicing(symbol) {
  const info = chordInfo(symbol);
  if (!info) return [];
  const bass = LOW_E + mod(info.bass - 4, 12);
  const upper = [];
  for (const pc of info.tones.slice(0, 5)) {
    let m = MIDDLE + mod(pc - MIDDLE, 12);
    while (upper.includes(m)) m += 12;
    upper.push(m);
  }
  upper.sort((a, b) => a - b);
  // Leave out the 5th of a five-note chord, as a guitarist would.
  const tones = upper.length > 4 ? upper.filter((m) => mod(m - info.root, 12) !== 7).slice(0, 4) : upper;
  return [bass, ...tones];
}

/**
 * The notes of a run of chords in time. Each chord lasts its length in whole
 * notes (`d`, as the corpus gives it); a bar of 2/4 lasts `barSeconds`. The
 * pattern is the violão's: bass on the beat, the chord on the off-beat, the
 * bass alternating to the fifth on the second beat of a long chord.
 * @param chords [{ sym, d }]
 * @returns [{ time, midi, gain, length }]
 */
export function timeline(chords, { barSeconds = 1.6, pattern = true } = {}) {
  const out = [];
  let t = 0;
  const beat = barSeconds / 2; // a quarter note in 2/4
  let prevSym = null;
  for (const c of chords) {
    const sym = c.sym === '%' ? prevSym : c.sym;
    prevSym = sym;
    const len = (c.d ?? 0.5) * 2 * barSeconds;
    const notes = sym ? voicing(sym) : [];
    if (notes.length) {
      const [bass, ...upper] = notes;
      const strum = (at, gain) => upper.forEach((m, i) => out.push({ time: at + i * 0.018, midi: m, gain, length: Math.max(0.35, len - (at - t)) }));
      out.push({ time: t, midi: bass, gain: 0.5, length: len });
      if (!pattern || len < beat * 0.99) {
        strum(t + 0.01, 0.26);
      } else {
        for (let b = 0; b * beat < len - 0.001; b += 1) {
          const at = t + b * beat;
          if (b > 0) out.push({ time: at, midi: b % 2 ? fifthOf(bass, sym) : bass, gain: 0.42, length: beat * 1.5 });
          strum(at + beat / 2, b % 2 ? 0.2 : 0.24);
        }
      }
    }
    t += len;
  }
  return { notes: out, length: t };
}

/** The bass's alternate note: the chord's fifth below the bass, or above when too low. */
function fifthOf(bass, sym) {
  const info = chordInfo(sym);
  const five = info.kind === 'dim' || info.halfDiminished ? 6 : 7;
  const target = mod(info.root + five, 12);
  let m = bass - mod(bass - target, 12);
  if (m < LOW_E) m += 12;
  return m;
}

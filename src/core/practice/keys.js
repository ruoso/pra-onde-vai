// "Any key" (design §6): a new key each time, so the learner learns moves,
// not chord names. The tune moves by a letter-true interval to a key charts
// commonly use, and every key it visits on the way stays readable (six
// sharps or flats at most).

import { parseKey, signature, transposeCentre, mod, sameKey } from '../theory/pitch.js';
import { MAJOR_KEYS, MINOR_KEYS } from '../drills/drills.js';

/** The letter steps and semitones from one key's tonic to another's. */
export function intervalBetween(from, to) {
  return { step: mod(to.L - from.L, 7), semis: mod(to.pc - from.pc, 12) };
}

/** Every key a tune visits, as written. */
export function keysOf(tune) {
  const out = new Set();
  for (const p of Object.values(tune.phrases)) for (const b of p.bars) if (b) for (const c of b) if (c.k) out.add(c.k);
  return [...out].map(parseKey);
}

export function pickTransposition(tune, rng = Math.random) {
  const home = parseKey(tune.key);
  const visits = keysOf(tune);
  const list = (home.mode === 'maj' ? MAJOR_KEYS : MINOR_KEYS).map(parseKey).filter((k) => !sameKey(k, home));
  const order = list.map((k) => [k, rng()]).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  for (const k of order) {
    const iv = intervalBetween(home, k);
    if (visits.every((v) => Math.abs(signature(transposeCentre(v, iv.step, iv.semis))) <= 6)) return iv;
  }
  return { step: 0, semis: 0 };
}

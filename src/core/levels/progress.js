// Mastery and unlocking (design §8): each chord is mastered when it is right,
// or another way of the same move, 17 of its last 20 times, in at least 3
// keys. A level is done when every chord it adds is mastered in both modes;
// the learner's level is the first one not done. One question in five comes
// from earlier levels.

import { LEVELS, TOP_LEVEL, addedAt, boardAt, levelOf } from './levels.js';
import { MODES } from '../theory/board.js';

export const WINDOW = 20;
export const NEEDED = 17;
export const KEYS_NEEDED = 3;
export const REVIEW_SHARE = 0.2;

/**
 * An attempt: { mode, fn, ok, key, at } — the function asked, whether the
 * answer was right or another way of the same move, and the home key.
 */
export function attemptOf(mode, fn, kind, key, at = Date.now()) {
  return { mode, fn, ok: kind === 'right' || kind === 'another', key, at };
}

/** How a chord stands: its last attempts, how many went well, in how many keys. */
export function mastery(attempts, mode, fn) {
  const mine = attempts.filter((a) => a.mode === mode && a.fn === fn);
  const last = mine.slice(-WINDOW);
  const ok = last.filter((a) => a.ok).length;
  const keys = new Set(last.filter((a) => a.ok).map((a) => a.key)).size;
  return { tries: last.length, ok, keys, mastered: ok >= NEEDED && keys >= KEYS_NEEDED };
}

export function levelDone(attempts, level) {
  return MODES.every((mode) => addedAt(level, mode).every((fn) => mastery(attempts, mode, fn).mastered));
}

/** The learner's level: the first level not done (the top one when all are). */
export function currentLevel(attempts) {
  for (const l of LEVELS) if (!levelDone(attempts, l.n)) return l.n;
  return TOP_LEVEL;
}

/**
 * Where a level stands: each chord it adds, in both modes, with its mastery.
 * The level is done when every one is mastered.
 */
export function levelProgress(attempts, level) {
  return MODES.flatMap((mode) => addedAt(level, mode).map((fn) => ({ mode, fn, ...mastery(attempts, mode, fn) })));
}

/**
 * Which chord a drill progression should practise, as { mode, fn }: one of
 * the level's own chords, in either mode, four times in five, else one from
 * an earlier level. A chord not yet mastered comes up far more often, so a
 * drill goes where the level still needs work — the minor side as much as
 * the major.
 */
export function pickFocus(attempts, level, rng = Math.random) {
  const own = MODES.flatMap((mode) => addedAt(level, mode).map((fn) => ({ mode, fn })));
  const earlier = MODES.flatMap((mode) => [...boardAt(level - 1, mode)].map((fn) => ({ mode, fn })));
  const pool = level > 1 && rng() < REVIEW_SHARE ? earlier : own;
  const weights = pool.map(({ mode, fn }) => (mastery(attempts, mode, fn).mastered ? 1 : 6));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i += 1) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export { levelOf };

// Drills (design §8): short progressions that walk the corpus's usual moves,
// using only the learner's chords, in any key. Each starts at home, which is
// given, passes through the chord being practised, and comes back home, where
// it arrives (marked strictly). Below the top level a progression may pass
// through a chord not yet on the board, to be answered "Something else".

import { chordDef, chords, homeId } from '../theory/board.js';
import { spell, parseKey } from '../theory/pitch.js';
import { boardAt, TOP_LEVEL } from '../levels/levels.js';

export const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'];
export const MINOR_KEYS = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'Dm', 'Gm', 'Cm', 'Fm'];
const MAX_CHORDS = 7;
const OFF_BOARD_CHANCE = 0.15;

export function randomKey(mode, rng = Math.random, avoid = null) {
  const list = (mode === 'maj' ? MAJOR_KEYS : MINOR_KEYS).filter((k) => k !== avoid);
  return parseKey(list[Math.floor(rng() * list.length)]);
}

function pickWeighted(items, rng) {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [x, w] of items) {
    r -= w;
    if (r < 0) return x;
  }
  return items.length ? items[items.length - 1][0] : null;
}

/**
 * One walk from home back home through the corpus's moves. `board` is the
 * learner's set; one chord off it is allowed when `offBoard` is true.
 */
function walk(stats, mode, board, rng, offBoard) {
  const home = homeId(mode);
  const full = chords(mode);
  const out = [home];
  let usedOff = false;
  for (let step = 0; step < MAX_CHORDS + 2; step += 1) {
    const cur = out[out.length - 1];
    const options = (stats.exits[mode][cur] ?? []).filter(([id]) => {
      if (!full.has(id)) return false;
      if (board.has(id)) return true;
      return offBoard && !usedOff;
    }).map(([id, p]) => [id, board.has(id) ? p : p * 0.5]);
    if (!options.length) return null;
    const next = pickWeighted(options, rng);
    if (!board.has(next)) usedOff = true;
    out.push(next);
    if (next === home && out.length >= 4) return out;
    if (out.length > MAX_CHORDS) return null;
  }
  return null;
}

/** A progression through `focus` (or any, when null): a list of function ids. */
export function progression(stats, mode, level, focus, rng = Math.random) {
  const board = boardAt(level, mode);
  const offBoard = level < TOP_LEVEL && rng() < OFF_BOARD_CHANCE;
  for (let tries = 0; tries < 400; tries += 1) {
    const w = walk(stats, mode, board, rng, offBoard && tries < 200);
    if (w && (!focus || w.slice(1, -1).includes(focus) || (focus === homeId(mode) && w.length >= 4))) return w;
  }
  // The shortest likely way: home, to the chord, along its strongest moves home.
  return strongestPath(stats, mode, board, focus);
}

/** The most likely path home → focus → home on the board (product of shares). */
export function strongestPath(stats, mode, board, focus) {
  const home = homeId(mode);
  const best = (from, to) => {
    const dist = new Map([[from, 0]]);
    const prev = new Map();
    const todo = new Set([from]);
    while (todo.size) {
      let u = null;
      for (const x of todo) if (u === null || dist.get(x) < dist.get(u)) u = x;
      todo.delete(u);
      if (u === to) break;
      for (const [v, p] of stats.exits[mode][u] ?? []) {
        if (!board.has(v)) continue;
        const d = dist.get(u) - Math.log(p / 100);
        if (!dist.has(v) || d < dist.get(v)) { dist.set(v, d); prev.set(v, u); todo.add(v); }
      }
    }
    if (!dist.has(to)) return null;
    const path = [to];
    while (path[0] !== from) path.unshift(prev.get(path[0]));
    return path;
  };
  if (!focus || focus === home) return best(home, 'V')?.concat([home]) ?? [home, 'V', home];
  const there = best(home, focus);
  const back = best(focus, home);
  if (!there || !back) return [home, 'V', home];
  return [...there, ...back.slice(1)];
}

/**
 * A drill: progressions in random keys until it asks `questions` questions.
 * `focusOf(i)` picks the chord each progression practises (core/levels/
 * progress.js pickFocus for a level's drill; the misses for a review drill).
 */
export function drill({ stats, level, mode, focusOf = () => null, questions = 12, rng = Math.random, modeOf = () => mode }) {
  const out = [];
  let asked = 0;
  let lastKey = null;
  for (let i = 0; asked < questions && i < 50; i += 1) {
    const m = modeOf(i);
    const focus = focusOf(i, m);
    const ids = progression(stats, m, level, focus, rng);
    const key = randomKey(m, rng, lastKey);
    lastKey = key;
    out.push({ mode: m, key, ids, focus, board: boardAt(level, m) });
    asked += ids.length - 1;
  }
  return out;
}

/** The name of a function in a key: `V/ii` in F is D7. */
export function chordName(key, id) {
  const d = chordDef(key.mode, id);
  return d ? spell(key, d.step, d.semis).text + d.suffix : id;
}

/** A drill as practice events, for core/practice/session.js. */
export function drillSequence(progressions) {
  const events = [];
  progressions.forEach((p, s) => {
    p.ids.forEach((id, j) => {
      const onBoard = p.board.has(id);
      events.push({
        section: s, bar: j + 1, k: 0, repeat: false, firstInBar: true, drill: true,
        sym: chordName(p.key, id), key: p.key, inKey: p.key, fn: id, dur: 0.5,
        given: j === 0, change: true, moveTo: false, arrival: j === p.ids.length - 1,
        expected: onBoard ? id : 'something', asked: j > 0,
        prevFn: j > 0 ? p.ids[j - 1] : null,
        nextFn: j + 1 < p.ids.length ? p.ids[j + 1] : null,
        nextIndex: j + 1 < p.ids.length ? events.length + 1 : -1,
        nextAsked: j + 1 < p.ids.length, alts: [],
      });
    });
  });
  return events;
}

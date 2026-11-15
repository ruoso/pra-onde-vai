// A tune as practice plays it: every chord and held bar of the chosen
// sections in play order, each with what the marking needs to know (design
// §6, §7.2). Built once per run; the session only walks it.

import { parseKey, transposeCentre, sameKey } from '../theory/pitch.js';
import { transposeSymbol } from '../theory/chord.js';
import { labelSymbol } from '../theory/functions.js';
import { boardAt } from '../levels/levels.js';

/** The sections a run plays: `a` the first part, `ab` it and the next part, `all` the form. */
export function chosenSections(tune, which) {
  const idx = tune.sections.map((s, i) => [s, i]);
  if (which === 'all') return idx.map(([, i]) => i);
  const parts = idx.filter(([s]) => s.kind === 'part');
  const first = parts[0] ?? idx[0];
  if (which === 'a') return [first[1]];
  const next = parts.find(([s, i]) => i > first[1] && s.name !== first[0].name) ?? idx.find(([, i]) => i > first[1]);
  return next ? [first[1], next[1]] : [first[1]];
}

/** Whether a tune has a second part for `ab` to play. */
export function hasSecondPart(tune) {
  return chosenSections(tune, 'ab').length > 1;
}

/**
 * The events of a run.
 * @param tune       a tune from the tune file
 * @param options.sections  'a' | 'ab' | 'all'
 * @param options.transpose { step, semis } or null (as written)
 * @param options.level     the learner's level: chords off its board are played, not asked
 * @param options.alts      other versions: Map of `${section}:${bar}:${k}` → [function ids]
 */
export function buildSequence(tune, { sections = 'ab', transpose = null, level = 7, alts = null } = {}) {
  const t = transpose ?? { step: 0, semis: 0 };
  const moveKey = (text) => (text ? transposeCentre(parseKey(text), t.step, t.semis) : null);
  const events = [];
  for (const si of chosenSections(tune, sections)) {
    const section = tune.sections[si];
    let bar = 0;
    for (const pid of section.phrases) {
      for (const b of tune.phrases[pid].bars) {
        bar += 1;
        if (b === null) {
          events.push({ section: si, bar, repeat: true, sym: '%' });
          continue;
        }
        b.forEach((c, k) => {
          events.push({
            section: si, bar, k, repeat: false, firstInBar: k === 0,
            sym: transposeSymbol(c.s, t.step, t.semis), key: moveKey(c.k), fn: c.f, dur: c.d,
            alts: alts?.get(`${si}:${bar}:${k}`) ?? [],
          });
        });
      }
    }
  }
  return annotate(events, level);
}

const sounds = (e) => e && !e.repeat && e.sym !== 'NC' && e.key;

/**
 * What the marking needs at each chord: whether it is a change, a change of
 * home, an arrival; the function asked and the key it is asked in; the chord
 * before and after; whether it is asked at the learner's level.
 */
export function annotate(events, level) {
  const boards = { maj: boardAt(level, 'maj'), min: boardAt(level, 'min') };
  let prev = null;
  let firstDone = false;
  for (let i = 0; i < events.length; i += 1) {
    const e = events[i];
    if (!sounds(e)) { e.asked = false; continue; }
    if (!firstDone) {
      firstDone = true;
      Object.assign(e, { given: true, change: true, moveTo: false, arrival: true, asked: false, inKey: e.key, expected: e.fn, prevFn: null });
      prev = e;
      continue;
    }
    const moveTo = !sameKey(prev.key, e.key);
    const inKey = moveTo ? prev.key : e.key;
    const expected = moveTo ? labelSymbol(e.sym, prev.key) : e.fn;
    const change = moveTo || e.fn !== prev.fn;
    const sectionStart = events.findIndex((x) => x.section === e.section && sounds(x)) === i;
    const arrival = moveTo || sectionStart || (e.firstInBar && e.bar % 4 === 0);
    const onBoard = boards[inKey.mode].has(expected);
    Object.assign(e, {
      given: false, change, moveTo, arrival, inKey, expected,
      prevFn: prev.fn, asked: change && onBoard,
    });
    prev = e;
  }
  // The chord after each one: the next change, by its function in this
  // chord's key — for a change of home, the function it is asked as.
  for (let i = 0; i < events.length; i += 1) {
    const e = events[i];
    if (!sounds(e)) continue;
    let j = i + 1;
    while (j < events.length && (!sounds(events[j]) || !events[j].change)) j += 1;
    const n = events[j];
    e.nextIndex = n ? j : -1;
    e.nextFn = !n || e.moveTo ? null : n.moveTo ? (sameKey(n.inKey, e.key) ? n.expected : null) : sameKey(n.key, e.key) ? n.fn : null;
    e.nextAsked = !!n && n.asked;
  }
  return events;
}

/**
 * The question an event asks, for core/marking's mark(). The chord before is
 * always in the key the question is asked in: a chord in another key would
 * make this one a change of home, asked in the key being left.
 */
export function questionOf(e) {
  return {
    expected: e.expected, arrival: e.arrival, mode: e.inKey.mode,
    prev: e.prevFn, next: e.nextFn, nextAsked: e.nextAsked, alts: e.alts ?? [],
  };
}

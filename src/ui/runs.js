// Starting a practice run: a tune with its options, a level's drill, or a
// drill of the misses of the run before. A run keeps what the practice and
// review screens need to show it again.

import { buildSequence } from '../core/practice/sequence.js';
import { pickTransposition } from '../core/practice/keys.js';
import { start } from '../core/practice/session.js';
import { drill, drillSequence } from '../core/drills/drills.js';
import { pickFocus, attemptOf } from '../core/levels/progress.js';
import { missDrillPlan } from '../core/practice/review.js';
import { keyText, transposeCentre, parseKey } from '../core/theory/pitch.js';

export function tuneRun(tune, { sections = 'ab', key = 'original', play = 'name' }, level, rng = Math.random) {
  const transpose = key === 'random' ? pickTransposition(tune, rng) : null;
  const events = buildSequence(tune, { sections, transpose, level });
  const home = transpose ? transposeCentre(parseKey(tune.key), transpose.step, transpose.semis) : parseKey(tune.key);
  return {
    kind: 'tune', tuneId: tune.id, title: tune.title, options: { sections, key, play }, transpose, home,
    level, st: start(events, { mode: play === 'predict' ? 'predict' : 'name' }),
  };
}

/** A level's drill, both modes, each progression going for a chord the level still needs. */
export function levelDrillRun(stats, attempts, level, rng = Math.random) {
  const plan = Array.from({ length: 12 }, () => pickFocus(attempts, level, rng));
  const progressions = drill({
    stats, level, mode: plan[0].mode, rng,
    modeOf: (i) => plan[i % plan.length].mode,
    focusOf: (i) => plan[i % plan.length].fn,
  });
  return { kind: 'drill', title: null, level, mode: plan[0].mode, st: start(drillSequence(progressions), { mode: 'name' }) };
}

export function missDrillRun(stats, level, pattern, rng = Math.random) {
  const plan = missDrillPlan(pattern);
  const progressions = drill({
    stats, level: 7, mode: plan[0].mode, rng,
    modeOf: (i) => plan[i % plan.length].mode,
    focusOf: (i) => plan[i % plan.length].id,
  });
  return { kind: 'misses', title: null, level, mode: plan[0].mode, st: start(drillSequence(progressions), { mode: 'name' }) };
}

/** Run a run again: the same tune and options (a new key when it was any key), or a new drill like it. */
export function again(run, data, attempts, overrides = {}) {
  if (run.kind === 'tune') {
    const tune = data.tunes.find((x) => x.id === run.tuneId);
    return tuneRun(tune, { ...run.options, ...overrides }, run.level);
  }
  return levelDrillRun(data.stats, attempts, run.level);
}

/** The attempts an answer makes, for mastery: the function asked and how it went. */
export function attemptsOf(before, after) {
  const out = [];
  for (const [i, r] of Object.entries(after.results)) {
    if (before.results[i]) continue;
    const e = after.events[Number(i)];
    if (!e.expected || e.expected === 'something') continue;
    out.push(attemptOf(e.inKey.mode, e.expected, r.kind, keyText(e.inKey)));
  }
  return out;
}

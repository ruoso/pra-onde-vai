// A practice run in Predict mode (design §6): playback stops before each
// chord change and asks what comes next; no clock. A pure state machine over
// the events of core/practice/sequence.js. Each step says which events to
// play; the view plays them and shows the feedback, which comes as codes and
// values for the view to put into words.

import { mark, preparesDominant } from '../marking/marking.js';
import { questionOf } from './sequence.js';

/** The next place the run stops from index `from`: a question, or a change of home it plays for you. */
function nextStop(events, from) {
  let i = from;
  while (i < events.length && !events[i].asked && !events[i].moveTo) i += 1;
  return i;
}

export function start(events) {
  const at = nextStop(events, 0);
  const stoppedOnMove = at < events.length && !events[at].asked && events[at].moveTo;
  return {
    events, idx: stoppedOnMove ? at + 1 : at, results: {}, last: null,
    pendingMove: stoppedOnMove ? at : null, moves: [],
    play: range(events, 0, stoppedOnMove ? at + 1 : at),
  };
}

const range = (events, a, b) => {
  const out = [];
  for (let i = a; i < b && i < events.length; i += 1) out.push(i);
  return out;
};

/** Move on from event `answered` (answered, shown or played): to the next stop. */
function advance(st, answered, results, last, extra = {}) {
  const ev = st.events[answered];
  if (ev.moveTo) {
    return { ...st, results, last, idx: answered + 1, pendingMove: answered, play: range(st.events, st.idx, answered + 1), ...extra };
  }
  const at = nextStop(st.events, answered + 1);
  const stopsOnMove = at < st.events.length && !st.events[at].asked && st.events[at].moveTo;
  const end = stopsOnMove ? at + 1 : at;
  return {
    ...st, results, last, idx: stopsOnMove ? at + 1 : at,
    pendingMove: stopsOnMove ? at : null, play: range(st.events, st.idx, end), ...extra,
  };
}

export function current(st) {
  return st.pendingMove === null && st.idx < st.events.length ? st.events[st.idx] : null;
}

export function isDone(st) {
  return st.pendingMove === null && st.idx >= st.events.length;
}

/** Answer the current question with a function id (or 'something' for a chord off the board). */
export function answer(st, picked, stats) {
  const ev = current(st);
  if (!ev) return st;
  // A chord not yet on the board is answered "Something else"; noticing it is
  // part of the training (design §8).
  let m;
  if (ev.expected === 'something') m = { kind: picked === 'something' ? 'right' : 'miss' };
  else if (picked === 'something') m = { kind: 'miss' };
  else m = mark(questionOf(ev), picked, stats);
  const results = { ...st.results, [st.idx]: { kind: m.kind, reason: m.reason ?? null, picked } };
  let answered = st.idx;
  if (m.consumes) {
    results[ev.nextIndex] = { kind: 'right', reason: 'reached', picked };
    answered = ev.nextIndex;
  }
  const next = ev.nextIndex >= 0 ? st.events[ev.nextIndex] : null;
  const last = {
    kind: m.kind, reason: m.reason ?? null, picked, mode: ev.inKey.mode, key: ev.inKey,
    expected: ev.expected, sym: ev.sym, bar: ev.bar, nextSym: next?.sym ?? null,
    prepares: preparesDominant(ev.expected),
  };
  return advance(st, answered, results, last);
}

/** Reveal the chord and count it as a miss. */
export function showMe(st) {
  const ev = current(st);
  if (!ev) return st;
  const results = { ...st.results, [st.idx]: { kind: 'miss', reason: 'shown', picked: null } };
  const last = { kind: 'miss', reason: 'shown', picked: null, mode: ev.inKey.mode, key: ev.inKey, expected: ev.expected, sym: ev.sym, bar: ev.bar };
  return advance(st, st.idx, results, last);
}

/**
 * Answer "Has home moved?". Either way the run goes on in the new key, as
 * the tune does; the answer is kept for the review.
 */
export function resolveMove(st, moved) {
  if (st.pendingMove === null) return st;
  const ev = st.events[st.pendingMove];
  const moves = [...st.moves, { at: st.pendingMove, found: moved, from: ev.inKey, to: ev.key }];
  const at = nextStop(st.events, st.pendingMove + 1);
  const stopsOnMove = at < st.events.length && !st.events[at].asked && st.events[at].moveTo;
  return {
    ...st, moves, pendingMove: stopsOnMove ? at : null, idx: stopsOnMove ? at + 1 : at,
    last: { kind: moved ? 'right' : 'miss', reason: 'move', moved, key: ev.key, from: ev.inKey },
    play: range(st.events, st.pendingMove + 1, stopsOnMove ? at + 1 : at),
  };
}

/** The last `n` chords heard before the current place, as played (a held bar repeats the chord). */
export function heardBefore(st, n = 4) {
  const until = st.pendingMove !== null ? st.pendingMove + 1 : st.idx;
  const out = [];
  for (let i = 0; i < until && i < st.events.length; i += 1) {
    const e = st.events[i];
    if (e.repeat) { if (out.length) out.push(out[out.length - 1]); } else out.push(i);
  }
  return out.slice(-n);
}

/** The key in force: the key of the chord last heard (after a change of home is settled). */
export function homeOf(st) {
  const until = st.pendingMove !== null ? st.pendingMove : st.idx;
  for (let i = Math.min(until, st.events.length) - 1; i >= 0; i -= 1) {
    const e = st.events[i];
    if (!e.repeat && e.key && e.sym !== 'NC') return st.pendingMove !== null ? e.inKey : e.key;
  }
  const first = st.events.find((e) => e.key);
  return first ? first.key : null;
}

/** The chord the board lights next moves from: the last chord heard, in the key in force. */
export function lastHeard(st) {
  if (st.pendingMove !== null) return null;
  for (let i = Math.min(st.idx, st.events.length) - 1; i >= 0; i -= 1) {
    const e = st.events[i];
    if (e.repeat || e.sym === 'NC' || !e.key) continue;
    return e.fn;
  }
  return null;
}

export function counts(st) {
  const c = { right: 0, another: 0, miss: 0 };
  for (const r of Object.values(st.results)) c[r.kind] += 1;
  return c;
}

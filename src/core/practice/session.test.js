// The marking run of tests/practice-marking.test.mjs, on the real engine and
// the real tune data: Cochichando, A then B, as the songbook writes it. The
// mockup's bars 12–24 are the real run's bars 28–32 of A (its second time
// through) and bars 1–8 of B.

import { describe, it, expect } from 'vitest';
import { buildSequence } from './sequence.js';
import { start, answer, showMe, resolveMove, current, isDone, counts, homeOf, heardBefore, lastHeard } from './session.js';
import { mark } from '../marking/marking.js';
import { questionOf } from './sequence.js';
import { keyText } from '../theory/pitch.js';
import { tuneById, realStats } from '../../test/data.js';

const stats = realStats();
const tune = tuneById('cochichando');

// The user's own chart takes another path in bars 13–14 (Gm C7 | F Dm): the
// mockup's other version, given here as the engine takes one.
const alts = new Map([['0:29:1', ['V/III']], ['0:30:0', ['III']]]);

function run() {
  let st = start(buildSequence(tune, { sections: 'ab', level: 6, alts }));
  const at = () => current(st);
  const go = (picked, expectMark) => {
    const before = st.idx;
    const ev = at();
    st = answer(st, picked, stats);
    const got = st.results[before];
    expect(got.kind, `bar ${ev.bar} ${ev.sym}: picked ${picked}`).toBe(expectMark.kind);
    if (expectMark.reason) expect(got.reason, `bar ${ev.bar} ${ev.sym}`).toBe(expectMark.reason);
    return ev;
  };
  // Right through to the second time through bar 12 (bar 28).
  while (!(at().section === 0 && at().bar === 28)) go(at().expected, { kind: 'right' });
  return { get st() { return st; }, at, go, set st(v) { st = v; } };
}

describe('Predict on Cochichando, A then B', () => {
  it('starts on the given Dm, plays it, and asks for bar 2', () => {
    const st = start(buildSequence(tune, { sections: 'ab', level: 6 }));
    expect(st.play).toEqual([0]);
    expect(current(st)).toMatchObject({ bar: 2, sym: 'A7', expected: 'V' });
    expect(keyText(homeOf(st))).toBe('Dm');
  });

  it('plays the chords off the board for you: Bm7(b5) and Am in bars 5–6', () => {
    let st = start(buildSequence(tune, { sections: 'ab', level: 6 }));
    while (!(current(st).bar === 5)) st = answer(st, current(st).expected, stats);
    st = answer(st, 'i', stats);
    expect(current(st)).toMatchObject({ bar: 7, sym: 'E7' });
    expect(st.play.map((i) => st.events[i].sym)).toEqual(['Dm', 'Bm7(b5)', 'Am']);
  });

  it('marks the mockup’s run the same way, answer by answer', () => {
    const r = run();
    expect(r.at()).toMatchObject({ sym: 'D7', expected: 'V/iv' });
    r.go('V/iv', { kind: 'right' });
    r.go('iv', { kind: 'right' });
    // The other version’s path (C7, then F): another way.
    r.go('V/III', { kind: 'another', reason: 'alt' });
    r.go('III', { kind: 'another', reason: 'alt' });
    // Going straight to A7 leaves the passing E7/B out: another way, and A7 is answered too.
    r.go('V', { kind: 'another', reason: 'skip' });
    expect(r.st.results[r.st.idx - 1]).toMatchObject({ kind: 'right', reason: 'reached' });
    expect(r.at().bar).toBe(32);
    // An arrival (bar 16 of the phrase plan) counts only the exact chord.
    r.go('III', { kind: 'miss', reason: 'arrival' });
    // Going straight from C7 to F asks whether home has moved.
    r.go('III', { kind: 'another', reason: 'skip' });
    expect(r.st.pendingMove).not.toBeNull();
    expect(current(r.st)).toBeNull();
    expect(keyText(homeOf(r.st))).toBe('Dm');
    // Making F major home re-centres the board.
    r.st = resolveMove(r.st, true);
    expect(keyText(homeOf(r.st))).toBe('F');
    expect(r.st.moves).toHaveLength(1);
    expect(r.st.moves[0]).toMatchObject({ found: true });
    expect(r.at()).toMatchObject({ section: 1, sym: 'D7', expected: 'V/ii' });
    expect(lastHeard(r.st)).toBe('I');
    // In F, the D7 is the V of ii; right through bars 2–6 of B.
    r.go('V/ii', { kind: 'right' });
    for (const id of ['ii', 'V', 'I', 'V/vi', 'vi']) r.go(id, { kind: 'right' });
    // Another path of common moves (vi → ii → V) for G7 is another way.
    expect(r.at().sym).toBe('G7');
    r.go('ii', { kind: 'another', reason: 'path' });
    r.go('V', { kind: 'right' });
  });

  it('counts a chord doing the same job as another way, and a stray one as missed', () => {
    const ev = buildSequence(tune, { sections: 'ab', level: 6 }).find((e) => e.bar === 7 && e.sym === 'E7');
    expect(mark(questionOf(ev), '#IV°', stats)).toEqual({ kind: 'another', reason: 'job' });
    expect(mark(questionOf(ev), 'bVI7', stats)).toEqual({ kind: 'another', reason: 'job' });
    expect(mark(questionOf(ev), 'VI', stats).kind).toBe('miss');
  });

  it('shows the chord and counts a miss when asked to', () => {
    let st = start(buildSequence(tune, { sections: 'a', level: 6 }));
    st = showMe(st);
    expect(st.results[1]).toEqual({ kind: 'miss', reason: 'shown', picked: null });
    expect(st.last).toMatchObject({ kind: 'miss', reason: 'shown', sym: 'A7', expected: 'V' });
    expect(current(st).bar).toBe(4);
  });

  it('replays the last four chords as heard, a held bar repeating its chord', () => {
    let st = start(buildSequence(tune, { sections: 'a', level: 6 }));
    st = answer(st, 'V', stats);
    expect(heardBefore(st).map((i) => st.events[i].sym)).toEqual(['Dm', 'A7', 'A7']);
  });

  it('keeps going when you say you are just visiting, and remembers it', () => {
    let st = start(buildSequence(tune, { sections: 'ab', level: 6 }));
    while (st.pendingMove === null) st = answer(st, current(st).expected, stats);
    st = resolveMove(st, false);
    expect(st.moves[0].found).toBe(false);
    expect(st.last).toMatchObject({ kind: 'miss', reason: 'move', moved: false });
    expect(keyText(homeOf(st))).toBe('F');
  });

  it('ends after the last chord, with its totals', () => {
    let st = start(buildSequence(tune, { sections: 'ab', level: 6 }));
    let guard = 0;
    while (!isDone(st) && guard++ < 500) {
      st = st.pendingMove !== null ? resolveMove(st, true) : answer(st, current(st).expected, stats);
    }
    expect(isDone(st)).toBe(true);
    const c = counts(st);
    expect(c.miss).toBe(0);
    expect(c.another).toBe(0);
    expect(c.right).toBe(Object.keys(st.results).length);
    expect(c.right).toBeGreaterThan(50);
  });

  it('can be played in any key, the functions unchanged', () => {
    const ev = buildSequence(tune, { sections: 'ab', level: 6, transpose: { step: 4, semis: 7 } });
    expect(ev[0]).toMatchObject({ sym: 'Am', fn: 'i' });
    expect(keyText(ev[0].key)).toBe('Am');
    const f = ev.find((e) => e.moveTo);
    expect(f).toMatchObject({ sym: 'C', expected: 'III' });
    expect(keyText(f.key)).toBe('C');
  });

  it('asks fewer chords at a lower level, and plays the rest for you', () => {
    const asked = (level) => buildSequence(tune, { sections: 'a', level }).filter((e) => e.asked).length;
    expect(asked(1)).toBeLessThan(asked(3));
    expect(asked(3)).toBeLessThan(asked(6));
    const l1 = buildSequence(tune, { sections: 'a', level: 1 });
    expect(l1.filter((e) => e.asked).every((e) => ['i', 'V'].includes(e.expected))).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { buildSequence } from './sequence.js';
import { start, answer, current, resolveMove, isDone } from './session.js';
import { phrases, pattern, missKind, missDrillPlan, statusOf } from './review.js';
import { tuneById, realStats } from '../../test/data.js';

const stats = realStats();

// The mockup's review: two dominants that lead away from home, heard as the plain V.
function mockupRun() {
  let st = start(buildSequence(tuneById('cochichando'), { sections: 'ab', level: 6 }));
  while (!isDone(st)) {
    if (st.pendingMove !== null) { st = resolveMove(st, true); continue; }
    const ev = current(st);
    const wrong = (ev.section === 0 && ev.bar === 12 && ev.sym === 'D7') || (ev.section === 1 && ev.bar === 5 && ev.sym === 'A7');
    st = answer(st, wrong ? 'V' : ev.expected, stats);
  }
  return st;
}

describe('how it went', () => {
  it('names the pattern: dominants that lead away from home, heard as the plain V', () => {
    const p = pattern(mockupRun());
    expect(p.code).toBe('awayAsV');
    expect(p.items.map((m) => [m.sym, m.expected, m.picked])).toEqual([['D7', 'V/iv', 'V'], ['A7', 'V/vi', 'V']]);
    expect(p.focus).toEqual([{ id: 'V/iv', mode: 'min' }, { id: 'V/vi', mode: 'maj' }]);
    expect(missDrillPlan(p)).toEqual([{ id: 'V/iv', mode: 'min' }, { id: 'V', mode: 'min' }, { id: 'V/vi', mode: 'maj' }, { id: 'V', mode: 'maj' }]);
  });

  it('goes phrase by phrase, four bars at a time, each chord with how it went', () => {
    const st = mockupRun();
    const g = phrases(st);
    expect(g[0]).toMatchObject({ section: 0, from: 1, to: 4, miss: false });
    expect(g[0].bars.map((b) => b.items.map((x) => `${x.sym}:${x.status}`).join(' '))).toEqual([
      'Dm:given', 'A7:right', '%:held', 'Dm:right A7:right',
    ]);
    const g2 = g.find((x) => x.section === 0 && x.from === 5);
    expect(g2.played).toEqual(['Bm7(b5)', 'Am']);
    const lost = g.find((x) => x.section === 0 && x.from === 9);
    expect(lost.miss).toBe(true);
    expect(lost.marks).toMatchObject([{ kind: 'miss', sym: 'D7', expected: 'V/iv', picked: 'V', bar: 12 }]);
    expect(statusOf(st, 0)).toBe('given');
  });

  it('is clean with no misses, and scattered when they share nothing', () => {
    let st = start(buildSequence(tuneById('cochichando'), { sections: 'a', level: 6 }));
    while (!isDone(st)) st = answer(st, current(st).expected, stats);
    expect(pattern(st).code).toBe('clean');
    expect(missKind({ expected: 'ii', picked: 'V' })).toBe('tooSoon');
    expect(missKind({ expected: '#IV°', picked: 'I' })).toBe('diminished');
    expect(missKind({ expected: 'V', picked: 'V/ii' })).toBe('vAsAway');
    expect(missKind({ expected: 'i', picked: 'III', reason: 'arrival' })).toBe('arrival');
    expect(missKind({ expected: 'vi', picked: 'iii' })).toBe('mixed');
  });

  it('says so when every miss was the same chord', () => {
    let st = start(buildSequence(tuneById('cochichando'), { sections: 'a', level: 1 }));
    while (!isDone(st)) {
      const ev = current(st);
      st = answer(st, ev.expected === 'i' && ev.bar % 2 === 0 && !ev.arrival ? 'V' : ev.expected, stats);
    }
    const p = pattern(st);
    expect(p.code).toBe('sameChord');
    expect(p.fn).toBe('i');
  });
});

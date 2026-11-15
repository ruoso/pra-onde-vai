import { describe, it, expect } from 'vitest';
import { drill, drillSequence, progression, strongestPath, chordName, randomKey } from './drills.js';
import { start, answer, current, isDone, counts } from '../practice/session.js';
import { boardAt } from '../levels/levels.js';
import { parseKey } from '../theory/pitch.js';
import { realStats } from '../../test/data.js';

const stats = realStats();
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

describe('drill progressions', () => {
  it('walk the corpus’s moves from home back home, through the chord being practised', () => {
    const rng = seeded(7);
    for (let i = 0; i < 50; i += 1) {
      const p = progression(stats, 'maj', 4, 'V/ii', rng);
      expect(p[0]).toBe('I');
      expect(p[p.length - 1]).toBe('I');
      expect(p).toContain('V/ii');
      for (let k = 0; k + 1 < p.length; k += 1) {
        expect(stats.exits.maj[p[k]].map(([id]) => id), `${p[k]} → ${p[k + 1]}`).toContain(p[k + 1]);
      }
    }
  });

  it('use only the learner’s chords, but for one chord off the board now and then', () => {
    const rng = seeded(11);
    const board = boardAt(2, 'min');
    let off = 0;
    for (let i = 0; i < 200; i += 1) {
      const p = progression(stats, 'min', 2, null, rng);
      const outside = p.filter((id) => !board.has(id));
      expect(outside.length).toBeLessThanOrEqual(1);
      off += outside.length;
    }
    expect(off).toBeGreaterThan(5);
    expect(off).toBeLessThan(80);
  });

  it('find the strongest way when no walk reaches the chord', () => {
    expect(strongestPath(stats, 'min', boardAt(4, 'min'), 'V/iv')).toEqual(['i', 'V/iv', 'iv', 'V', 'i']);
  });
});

describe('a drill', () => {
  it('asks twelve questions in random keys, spelled in each key', () => {
    const d = drill({ stats, level: 3, mode: 'maj', focusOf: () => 'V/V', rng: seeded(3) });
    const ev = drillSequence(d);
    expect(ev.filter((e) => e.asked).length).toBeGreaterThanOrEqual(12);
    expect(ev.filter((e) => e.given).length).toBe(d.length);
    expect(chordName(parseKey('F'), 'V/ii')).toBe('D7');
    expect(chordName(parseKey('Dm'), 'iiø')).toBe('Em7(b5)');
    expect(randomKey('min', () => 0)).toMatchObject({ mode: 'min' });
  });

  it('runs through the practice engine: right answers all round, home marked strictly', () => {
    const d = drill({ stats, level: 3, mode: 'min', rng: seeded(5) });
    let st = start(drillSequence(d));
    while (!isDone(st)) {
      const ev = current(st);
      st = answer(st, ev.expected, stats);
    }
    expect(counts(st).miss).toBe(0);
    const last = drillSequence(d).filter((e) => e.arrival);
    expect(last.every((e) => e.fn === 'i')).toBe(true);
  });

  it('takes "Something else", or the chord’s own button, for a chord above the level; nothing else', () => {
    const ids = ['I', 'V/ii', 'ii', 'V', 'I', 'V/ii', 'ii', 'V', 'I'];
    const ev = drillSequence([{ mode: 'maj', key: parseKey('C'), ids, board: boardAt(2, 'maj') }]);
    let st = start(ev);
    st = answer(st, 'something', stats);
    expect(st.results[1].kind).toBe('right');
    st = answer(st, 'something', stats);
    expect(st.results[2].kind).toBe('miss');
    st = answer(st, 'V', stats);
    st = answer(st, 'I', stats);
    st = answer(st, 'V/ii', stats);
    expect(st.results[5].kind).toBe('right');
    expect(st.last).toMatchObject({ expected: 'something', fn: 'V/ii' });
    st = answer(st, 'ii', stats);
    st = answer(st, 'V', stats);
    st = answer(st, 'V', stats);
    expect(st.results[8].kind).toBe('miss');
  });
});

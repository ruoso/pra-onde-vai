import { describe, it, expect } from 'vitest';
import { initialMap, addChord, changeHome, currentOf, movedOf, playedOf, removeChord, undo, resetMap, centreOf } from './mapState.js';
import { parseKey, keyText } from '../core/theory/pitch.js';

const Dm = parseKey('Dm');
const F = parseKey('F');

function aRun() {
  let m = initialMap(Dm);
  for (const [fn, sym] of [['i', 'Dm'], ['V', 'A7'], ['i', 'Dm'], ['V/III', 'C7'], ['III', 'F']]) m = addChord(m, fn, sym);
  m = changeHome(m, [...m.centres, { key: F, rel: 'relative' }], { current: 'I' });
  return addChord(m, 'V/ii', 'D7');
}

describe('the map’s log', () => {
  it('keeps what was played, across a change of home, and the chord you are on', () => {
    const m = aRun();
    expect(playedOf(m)).toEqual(['Dm', 'A7', 'Dm', 'C7', 'F', 'D7']);
    expect(currentOf(m)).toBe('V/ii');
    expect(keyText(centreOf(m))).toBe('F');
    expect(movedOf(m)).toBe(false);
  });

  it('takes one chord out, from anywhere', () => {
    const m = aRun();
    const a7 = m.log.find((e) => e.sym === 'A7');
    const out = removeChord(m, a7.id);
    expect(playedOf(out)).toEqual(['Dm', 'Dm', 'C7', 'F', 'D7']);
    expect(currentOf(out)).toBe('V/ii');
    // A change of home is not a chord: it stays.
    const home = m.log.find((e) => e.kind === 'home');
    expect(removeChord(m, home.id)).toEqual(m);
  });

  it('takes out the last chord, and the one before is current again', () => {
    const m = addChord(addChord(initialMap(Dm), 'i', 'Dm'), 'V', 'A7');
    const out = removeChord(m, m.log[1].id);
    expect(currentOf(out)).toBe('i');
  });

  it('undoes step by step, a change of home going back to the home before', () => {
    let m = aRun();
    m = undo(m);
    expect(playedOf(m)).toEqual(['Dm', 'A7', 'Dm', 'C7', 'F']);
    expect(currentOf(m)).toBe('I');
    expect(movedOf(m)).toBe(true);
    m = undo(m);
    expect(keyText(centreOf(m))).toBe('Dm');
    expect(m.centres).toHaveLength(1);
    expect(currentOf(m)).toBe('III');
    for (let i = 0; i < 10; i += 1) m = undo(m);
    expect(m.log).toEqual([]);
    expect(currentOf(m)).toBeNull();
  });

  it('resets to the first home', () => {
    const m = resetMap(aRun());
    expect(keyText(centreOf(m))).toBe('Dm');
    expect(m.log).toEqual([]);
  });
});

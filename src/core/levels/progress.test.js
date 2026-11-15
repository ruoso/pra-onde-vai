import { describe, it, expect } from 'vitest';
import { attemptOf, mastery, currentLevel, levelDone, pickFocus } from './progress.js';
import { LEVELS, boardAt, levelOf, addedAt } from './levels.js';

const many = (mode, fn, n, kinds, keys) =>
  Array.from({ length: n }, (_, i) => attemptOf(mode, fn, kinds(i), keys[i % keys.length], i));

describe('the levels', () => {
  it('are the seven of design §8, each adding chords in both modes', () => {
    expect(LEVELS).toHaveLength(7);
    expect(addedAt(1, 'maj')).toEqual(['I', 'V']);
    expect(addedAt(4, 'min')).toEqual(['V/iv']);
    expect([...boardAt(2, 'maj')]).toEqual(['I', 'V', 'IV', 'ii', 'iv']);
    expect(levelOf('min', 'bVI7')).toBe(6);
    expect(levelOf('maj', 'ii/IV')).toBe(7);
    expect(levelOf('maj', 'Vm')).toBeNull();
  });
});

describe('mastery', () => {
  it('is 17 of the last 20 right or another way, in at least 3 keys', () => {
    const a = many('maj', 'V', 20, (i) => (i < 3 ? 'miss' : i % 2 ? 'another' : 'right'), ['C', 'F', 'G']);
    expect(mastery(a, 'maj', 'V')).toEqual({ tries: 20, ok: 17, keys: 3, mastered: true });
  });

  it('is not reached in two keys, however right', () => {
    const a = many('maj', 'V', 20, () => 'right', ['C', 'F']);
    expect(mastery(a, 'maj', 'V').mastered).toBe(false);
  });

  it('counts only the last 20, so old misses fade', () => {
    const a = [...many('maj', 'V', 10, () => 'miss', ['C']), ...many('maj', 'V', 20, () => 'right', ['C', 'F', 'G'])];
    expect(mastery(a, 'maj', 'V').mastered).toBe(true);
    const b = [...many('maj', 'V', 20, () => 'right', ['C', 'F', 'G']), ...many('maj', 'V', 4, () => 'miss', ['C'])];
    expect(mastery(b, 'maj', 'V').mastered).toBe(false);
  });

  it('keeps the modes apart: the V of major is not the V of minor', () => {
    const a = many('maj', 'V', 20, () => 'right', ['C', 'F', 'G']);
    expect(mastery(a, 'min', 'V').tries).toBe(0);
  });
});

describe('unlocking', () => {
  const master = (mode, fn) => many(mode, fn, 20, () => 'right', ['C', 'F', 'G']);

  it('starts at level 1', () => expect(currentLevel([])).toBe(1));

  it('moves on when every chord of the level is mastered in both modes', () => {
    const half = [...master('maj', 'I'), ...master('maj', 'V'), ...master('min', 'i')];
    expect(levelDone(half, 1)).toBe(false);
    expect(currentLevel(half)).toBe(1);
    const all = [...half, ...master('min', 'V')];
    expect(levelDone(all, 1)).toBe(true);
    expect(currentLevel(all)).toBe(2);
  });
});

describe('the review mix', () => {
  it('asks one question in five from earlier levels', () => {
    let seed = 1;
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const picks = Array.from({ length: 2000 }, () => pickFocus([], 3, 'maj', rng));
    const earlier = picks.filter((p) => p !== 'V/V').length / picks.length;
    expect(earlier).toBeGreaterThan(0.15);
    expect(earlier).toBeLessThan(0.25);
    expect(pickFocus([], 1, 'maj', () => 0.01)).toBe('I');
  });
});

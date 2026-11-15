import { describe, it, expect } from 'vitest';
import { attemptOf, mastery, currentLevel, levelDone, pickFocus, levelProgress } from './progress.js';
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

const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const master = (mode, fn) => many(mode, fn, 20, () => 'right', ['C', 'F', 'G']);

describe('what a drill practises', () => {
  it('asks one question in five from earlier levels, in both modes', () => {
    const picks = Array.from({ length: 2000 }, () => pickFocus([], 3, seeded(1)));
    const rng = seeded(1);
    const many2 = Array.from({ length: 2000 }, () => pickFocus([], 3, rng));
    const earlier = many2.filter((p) => p.fn !== 'V/V').length / many2.length;
    expect(earlier).toBeGreaterThan(0.15);
    expect(earlier).toBeLessThan(0.25);
    expect(new Set(many2.map((p) => p.mode))).toEqual(new Set(['maj', 'min']));
    expect(picks).toHaveLength(2000);
  });

  it('goes where the level still needs work: the minor side, when major is mastered', () => {
    const done = [...master('maj', 'I'), ...master('maj', 'V')];
    const rng = seeded(5);
    const picks = Array.from({ length: 1000 }, () => pickFocus(done, 1, rng));
    const minor = picks.filter((p) => p.mode === 'min').length / picks.length;
    expect(minor).toBeGreaterThan(0.8);
  });
});

describe('where a level stands', () => {
  it('lists the level’s chords in both modes, so a mastered major side does not hide the minor one', () => {
    const done = [...master('maj', 'I'), ...master('maj', 'V')];
    expect(levelProgress(done, 1).map((x) => [x.mode, x.fn, x.mastered])).toEqual([
      ['maj', 'I', true], ['maj', 'V', true], ['min', 'i', false], ['min', 'V', false],
    ]);
    expect(currentLevel(done)).toBe(1);
  });
});

import { describe, it, expect } from 'vitest';
import { pickTransposition, intervalBetween, keysOf } from './keys.js';
import { parseKey, transposeCentre, signature, keyText } from '../theory/pitch.js';
import { realTunes, tuneById } from '../../test/data.js';

describe('any key', () => {
  it('measures intervals letter by letter', () => {
    expect(intervalBetween(parseKey('Dm'), parseKey('Bm'))).toEqual({ step: 5, semis: 9 });
    expect(intervalBetween(parseKey('F'), parseKey('Eb'))).toEqual({ step: 6, semis: 10 });
  });

  it('moves every tune to another common key, every key it visits readable', () => {
    let seed = 9;
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (const tune of realTunes()) {
      const iv = pickTransposition(tune, rng);
      const home = parseKey(tune.key);
      const to = transposeCentre(home, iv.step, iv.semis);
      expect(keyText(to), tune.title).not.toBe(tune.key);
      for (const k of keysOf(tune)) expect(Math.abs(signature(transposeCentre(k, iv.step, iv.semis))), tune.title).toBeLessThanOrEqual(6);
    }
  });

  it('lists the keys a tune visits', () => {
    expect(keysOf(tuneById('cochichando')).map(keyText).sort()).toEqual(['D', 'Dm', 'F']);
  });
});

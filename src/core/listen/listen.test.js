import { describe, it, expect } from 'vitest';
import { rankHomes, rankChords, keySignature, allKeys } from './listen.js';
import { parseKey, keyText } from '../theory/pitch.js';
import { realStats } from '../../test/data.js';

const stats = realStats();
const pcs = (names) => names.map((n) => ({ C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, Bb: 10, B: 11 })[n]);

describe('finding home', () => {
  it('ranks D minor first for the mockup’s phrase, F E G Bb A E C# D', () => {
    const r = rankHomes(pcs(['F', 'E', 'G', 'Bb', 'A', 'E', 'C#', 'D']));
    expect(r[0].name).toBe('Dm');
    expect(r[0]).toMatchObject({ fit: 8, restsOn: { degree: 'tonic', note: 'D' }, leavesOut: [], hasThird: true });
    expect(r).toHaveLength(3);
  });

  it('says major and minor both fit when no 3rd is heard', () => {
    const r = rankHomes(pcs(['G', 'D', 'G']));
    expect(r[0].hasThird).toBe(false);
    expect(r.map((x) => x.name)).toEqual(expect.arrayContaining(['G']));
  });

  it('names the notes a key leaves out, spelled in that key', () => {
    const r = rankHomes(pcs(['C', 'E', 'G', 'F#', 'C']));
    const c = r.find((x) => x.name === 'C');
    expect(c.leavesOut).toEqual(['F#']);
  });

  it('spells the 24 keys as charts do', () => {
    expect(allKeys().map(keyText)).toEqual(expect.arrayContaining(['C#m', 'Ebm', 'F#', 'Bb', 'Ab', 'G#m']));
  });
});

describe('naming a chord', () => {
  const Dm = parseKey('Dm');

  it('reads a note outside the key as the strongest clue: C# in D minor means A7', () => {
    const r = rankChords(pcs(['E', 'G', 'C#']), Dm, null, stats);
    expect(r[0].name).toBe('A7');
    expect(r[0].clue).toEqual({ note: 'C#', role: 'third' });
  });

  it('lets the style break a tie: after the home chord, what usually follows it', () => {
    const r = rankChords(pcs(['A']), Dm, 'i', stats);
    expect(r[0].name).toBe('A7');
  });

  it('counts the note a phrase lands on double', () => {
    const r = rankChords(pcs(['A', 'C', 'F']), parseKey('F'), null, stats);
    expect(r[0].name).toBe('F');
  });

  it('can rank only the learner’s chords', () => {
    const r = rankChords(pcs(['E', 'G#', 'B', 'D']), Dm, null, stats, { board: new Set(['i', 'V']) });
    expect(r.every((x) => ['Dm', 'A7'].includes(x.name))).toBe(true);
  });

  it('draws the key signature letter by letter', () => {
    expect(keySignature(Dm)).toEqual([0, 0, 0, 0, 0, 0, -1]);
    expect(keySignature(parseKey('A'))).toEqual([1, 0, 0, 1, 1, 0, 0]);
    expect(keySignature(null)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

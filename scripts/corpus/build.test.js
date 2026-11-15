// The data build against the real corpus (vendor/dcml-choro at the pinned
// commit): every tune aligns, and the figures the design states come out of it.

import { describe, it, expect } from 'vitest';
import { corpus } from './corpus-data.js';

const tune = (title) => corpus().tunes.find((t) => t.title === title);
const flat = (t, phrase) => t.phrases[phrase].bars.flat().filter(Boolean);

describe('the tune file', () => {
  it('has all 295 tunes, each aligned chord for chord with the table', () => {
    expect(corpus().tunes).toHaveLength(295);
    expect(new Set(corpus().tunes.map((t) => t.id)).size).toBe(295);
  });

  it('gives Cochichando its metadata, form and keys', () => {
    const t = tune('Cochichando');
    expect(t).toMatchObject({
      id: 'cochichando', composers: ['Pixinguinha', 'João de Barro', 'Alberto Ribeiro'],
      key: 'Dm', mode: 'min', meter: '2/4', songbook: 1, genre: 'Choro', keys: 3,
    });
    expect(t.sections.map((s) => [s.kind, s.name ?? s.of?.name, s.phrases.join(' ')])).toEqual([
      ['part', 'A', 'P1 P2 P1 P3'], ['part', 'B', 'P4 P5 P4 P5'], ['again', 'A', 'P1 P6'],
      ['part', 'C', 'P7 P8 P7 P9'], ['end', 'A', 'P1 P2'],
    ]);
  });

  it('writes the bars as the songbook does, held bars included, with each chord’s function', () => {
    const t = tune('Cochichando');
    const bars = t.phrases.P1.bars;
    expect(bars[2]).toBeNull();
    expect(bars[11]).toEqual([{ s: 'D7', k: 'Dm', f: 'V/iv', d: 0.5 }]);
    expect(bars[12].map((c) => [c.s, c.f])).toEqual([['Gm', 'iv'], ['Em7(b5)', 'iiø']]);
    expect(flat(t, 'P4').slice(0, 4).map((c) => [c.s, c.k, c.f])).toEqual([
      ['F', 'F', 'I'], ['D7', 'F', 'V/ii'], ['Gm', 'F', 'ii'], ['C7', 'F', 'V'],
    ]);
    expect(flat(t, 'P7').find((c) => c.s === 'Ab°')).toMatchObject({ k: 'D', f: 'bV°' });
  });

  it('merges a `.` into the chord it carries on', () => {
    const t = tune('Aguenta seu Fulgêncio');
    const last = t.phrases.P1.bars[t.phrases.P1.bars.length - 1];
    expect(last.map((c) => [c.s, c.d])).toEqual([['D', 0.25], ['Em7', 0.125], ['A7', 0.125]]);
  });

  it('writes the corpus’s diminished `o` as `°`, and its `m7/b5` as `m7(b5)`', () => {
    const all = corpus().tunes.flatMap((t) => Object.values(t.phrases).flatMap((p) => p.bars.flat().filter(Boolean)));
    expect(all.some((c) => /o/.test(c.s.replace(/omit/, '')))).toBe(false);
    expect(all.some((c) => c.s.includes('m7/b5'))).toBe(false);
    expect(all.filter((c) => c.s === 'NC').every((c) => c.f === null && c.k === null)).toBe(true);
  });

  it('reads the corpus’s traps as its table does, and says so', () => {
    expect(tune('Alvorada').notes).toContain('$P0*14 is played once');
    expect(tune('Forró de gala').notes).toContain('$P0*3 is played once');
    expect(tune('Aguenta seu Fulgêncio').notes).toContain('P7: definition 1 is the one the table plays');
    expect(tune('Meu sabiá').notes).toContain('P7: definition 2 is the one the table plays');
  });

  it('reads the ii of a secondary dominant from what follows it (level 7)', () => {
    // Each ii, and the chord after it (after a run of the same ii, the chord after the run).
    const pairs = corpus().tunes.flatMap((t) => Object.values(t.phrases).flatMap((p) => {
      const cs = p.bars.flat().filter(Boolean);
      return cs.map((c, i) => {
        let j = i + 1;
        while (j < cs.length && cs[j].f === c.f) j += 1;
        return [c, cs[j]];
      });
    }));
    const iis = pairs.filter(([c]) => c.f && c.f.startsWith('ii/'));
    expect(new Set(iis.map(([c]) => c.f))).toEqual(new Set(['ii/IV', 'ii/vi', 'ii/iii', 'ii/ii', 'ii/iv', 'ii/V', 'ii/VI']));
    for (const [c, next] of iis) expect(next.f).toBe(c.f.replace(/^ii\//, 'V/'));
    // A minor sixth heard as the half-diminished a sixth above: Cm6 before D7 in D minor.
    const cm6 = pairs.find(([c, n]) => c.s.startsWith('Cm6') && c.k === 'Dm' && n?.s.startsWith('D7'));
    expect(cm6[0].f).toBe('ii/iv');
  });
});

describe('the figures in the design', () => {
  const s = () => corpus().stats;

  it('gives each level’s coverage, median tune and tunes as design §8 tabulates them', () => {
    expect(s().levels.map((l) => [l.cover.maj, l.cover.min, l.median, l.tunes80])).toEqual([
      [41, 46, 43, 2], [57, 62, 58, 20], [62, 67, 64, 36], [73, 73, 75, 111],
      [84, 81, 85, 199], [86, 86, 88, 225], [91, 89, 93, 256],
    ]);
  });

  it('covers a median 88% of a tune’s changes on the full board of level 6, 133 tunes at 90% or more', () => {
    expect(s().medianFit).toBe(88);
    expect(s().levels[5].tunes90).toBe(133);
  });

  it('gives the moves out of home the map shows (design §4)', () => {
    expect(s().exits.maj.I.slice(0, 6)).toEqual([['V', 22], ['V/ii', 13], ['V/vi', 8], ['V/IV', 7], ['vi', 7], ['V/V', 7]]);
    expect(s().exits.min.i.slice(0, 4)).toEqual([['V', 29], ['iv', 15], ['V/V', 13], ['V/iv', 8]]);
    expect(s().exits.maj.V[0]).toEqual(['I', 75]);
    expect(s().exits.maj['V/V'][0]).toEqual(['V', 82]);
  });

  it('keeps every move the mockups list, at the same share', () => {
    const mockup = {
      maj: { ii: [['V', 56], ['iv', 8]], vi: [['V/V', 27], ['ii', 18]], IV: [['iv', 27], ['#IV°', 18], ['I', 12]],
        'V/ii': [['ii', 62], ['V/V', 26]], 'V/vi': [['vi', 63], ['V/ii', 15]], '#I°': [['V', 47], ['ii', 40], ['V/ii', 11]],
        '#IV°': [['I', 78]], bII: [['I', 33], ['V', 28]], iv: [['I', 52], ['V', 19]] },
      min: { V: [['i', 71], ['V/iv', 8]], iv: [['V', 32], ['iiø', 18], ['i', 17], ['V/III', 10]], 'iiø': [['i', 46], ['V', 43]],
        'V/VI': [['VI', 46], ['bVI7', 34], ['V/V', 12]], 'bVI7': [['V', 63], ['bII', 12]], '#IV°': [['V', 42], ['i', 21], ['III', 16]] },
    };
    for (const [mode, table] of Object.entries(mockup)) {
      for (const [from, moves] of Object.entries(table)) {
        for (const move of moves) expect(s().exits[mode][from]).toContainEqual(move);
      }
    }
  });

  it('opens sections on the tonic 65% of the time in major and 64% in minor (design §5)', () => {
    const { maj, min } = s().opens;
    expect(Math.round((100 * maj.counts.I) / maj.total)).toBe(65);
    expect(Math.round((100 * maj.counts.V) / maj.total)).toBe(17);
    expect(Math.round((100 * min.counts.i) / min.total)).toBe(64);
    expect(Math.round((100 * min.counts.V) / min.total)).toBe(16);
    expect(Math.round((100 * min.counts.iv) / min.total)).toBe(7);
  });

  it('gives the function frequencies of corpus-notes.md', () => {
    const top = (m) => Object.fromEntries(s().frequencies[m].top.map(([l, , p]) => [l, p]));
    expect(top('maj')).toMatchObject({ I: 22, V: 18.5, ii: 9.3, 'V/ii': 6, 'V/V': 5.2, vi: 4.8 });
    expect(top('min')).toMatchObject({ i: 24.2, V: 21.6, iv: 11.7, 'V/iv': 6.2, 'V/V': 5.4, 'iiø': 4.2 });
  });

  it('puts B in the relative major in 49 of the 109 minor-key choros with a B section', () => {
    expect(s().bMoves.min).toEqual({ tunes: 109, relative: 49, parallel: 12, same: 35, other: 13 });
    expect(s().bMoves.maj.tunes).toBe(295 - corpus().tunes.filter((t) => t.mode === 'min').length
      - corpus().tunes.filter((t) => t.mode === 'maj' && !t.sections.some((x) => x.part === 'PartB')).length);
  });

  it('finds every chord of the board in three tunes, for Meet it', () => {
    for (const mode of ['maj', 'min']) {
      for (const [id, found] of Object.entries(s().meet[mode])) {
        expect(found.length, `${mode} ${id}`).toBe(3);
        expect(new Set(found.map((f) => f.tune)).size).toBe(3);
      }
    }
    expect(s().meet.maj['V/ii'][0]).toMatchObject({ tune: expect.any(String), bar: expect.any(Number) });
  });
});

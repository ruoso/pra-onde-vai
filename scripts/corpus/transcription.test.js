import { describe, it, expect } from 'vitest';
import { readTranscription, playedTokens, phrasesOf } from './transcription.js';

const COCHICHANDO_A = `P1: Dm | A7 | | Dm A7 |
P2: Dm |
P3: Dm C7 |

P4[F]: F . Gm C7 | F |

PartA: $P1 $P2 $P1 $P3
PartB[F] : $P4 $P4

S[Dm, 2/4]: $PartA $PartB $P1 $P2`;

describe('reading a transcription', () => {
  const t = readTranscription(COCHICHANDO_A);

  it('reads phrases as bars of tokens, a held bar as null', () => {
    expect(t.phrases.P1.bars).toEqual([['Dm'], ['A7'], null, ['Dm', 'A7']]);
    expect(t.phrases.P4).toEqual({ key: 'F', bars: [['F', '.', 'Gm', 'C7'], ['F']] });
  });

  it('reads parts with their keys, a space before the colon included', () => {
    expect(t.parts.PartA).toEqual({ key: null, refs: ['P1', 'P2', 'P1', 'P3'] });
    expect(t.parts.PartB).toEqual({ key: 'F', refs: ['P4', 'P4'] });
    expect(t.partOrder).toEqual(['PartA', 'PartB']);
  });

  it('reads the form with its key and meter', () => {
    expect(t.form).toEqual({ key: 'Dm', meter: '2/4', refs: ['PartA', 'PartB', 'P1', 'P2'] });
    expect(phrasesOf(t, 'PartA')).toEqual(['P1', 'P2', 'P1', 'P3']);
  });

  it('plays every token that sounds, in the form’s order, counting each phrase’s playings', () => {
    const toks = playedTokens(t);
    expect(toks.map((x) => x.token).slice(0, 6)).toEqual(['Dm', 'A7', 'Dm', 'A7', 'Dm', 'Dm']);
    expect(toks.filter((x) => x.phrase === 'P1').map((x) => x.playing)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
    expect(toks.filter((x) => x.phrase === 'P4').length).toBe(10);
  });

  it('plays a counted phrase once, as the table does, and says so', () => {
    const r = readTranscription('P0: Dm | A7 |\nPartA: $P0*14\nS[Dm, 2/4]: $PartA');
    expect(r.parts.PartA.refs).toEqual(['P0']);
    expect(r.notes).toEqual(['$P0*14 is played once']);
  });

  it('keeps both definitions of a phrase written twice', () => {
    const r = readTranscription('P7: Dm |\nP7: Bb |\nS[Dm, 2/4]: $P7');
    expect(r.phrases.P7.bars).toEqual([['Dm']]);
    expect(r.alternatives.P7.map((d) => d.bars)).toEqual([[['Dm']], [['Bb']]]);
  });

  it('refuses a line it cannot read, and a phrase that starts held', () => {
    expect(() => readTranscription('nonsense')).toThrow(/cannot read line/);
    expect(() => readTranscription('P1: | Dm |')).toThrow(/starts with a held bar/);
  });
});

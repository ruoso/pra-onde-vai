import { describe, it, expect } from 'vitest';
import { spell, parseKey, keyText, spellIn, transposeCentre, signature, noteName } from './pitch.js';
import { columns, chords, chordDef, canBeHome, homeModeOf, target, functionParts, homeId } from './board.js';
import { chordInfo, transposeSymbol, fromCorpus } from './chord.js';
import { labelRow, labelSymbol } from './functions.js';

const Dm = parseKey('Dm');
const F = parseKey('F');
const name = (centre, mode, id) => {
  const d = chordDef(mode, id);
  return spell(centre, d.step, d.semis).text + d.suffix;
};

describe('spelling', () => {
  it('spells by letter, so F# and Gb are different notes', () => {
    expect(spell(parseKey('D'), 2, 4).text).toBe('F#');
    expect(spell(parseKey('Db'), 3, 5).text).toBe('Gb');
    expect(spell(parseKey('C#'), 6, 11).text).toBe('B#');
    expect(noteName(0, 11)).toBe('Cb');
  });

  it('reads and writes keys as charts do', () => {
    expect(parseKey('Dm')).toEqual({ L: 1, pc: 2, mode: 'min' });
    expect(parseKey('F#m')).toEqual({ L: 3, pc: 6, mode: 'min' });
    expect(parseKey('Bb')).toEqual({ L: 6, pc: 10, mode: 'maj' });
    expect(parseKey('H')).toBeNull();
    expect(keyText(Dm)).toBe('Dm');
    expect(keyText(transposeCentre(Dm, 2, 3))).toBe('Fm');
  });

  it('spells a note in a key by its degree, and the usual chromatic notes as charts do', () => {
    expect(spellIn(Dm, 1).text).toBe('C#');
    expect(spellIn(Dm, 10).text).toBe('Bb');
    expect(spellIn(F, 10).text).toBe('Bb');
    expect(spellIn(parseKey('E'), 3).text).toBe('D#');
    expect(spellIn(null, 3).text).toBe('Eb');
  });

  it('counts a key’s signature', () => {
    expect(signature(Dm)).toBe(-1);
    expect(signature(parseKey('A'))).toBe(3);
    expect(signature(parseKey('C'))).toBe(0);
  });
});

describe('the boards', () => {
  it('puts columns in fifths, home fifth from the left (design §4)', () => {
    expect(columns('maj').map((c) => c.t.id)).toEqual(['iii', 'vi', 'ii', 'V', 'I', 'IV', 'bVII', 'bIII', 'bVI']);
    expect(columns('min').map((c) => c.t.id)).toEqual(['III', 'VI', 'iiø', 'V', 'i', 'iv', 'VII']);
    expect(columns('maj').map((c) => c.a?.id ?? null)).toEqual(['V/iii', 'V/vi', 'V/ii', 'V/V', null, 'V/IV', 'IV7', 'bVII7', 'bIII7']);
    expect(homeId('maj')).toBe('I');
  });

  it('goes on past IV to the flat side, each borrowed chord under the dominant that leads into it', () => {
    const flat = (mode) => columns(mode).filter((c) => c.flat).map((c) => `${c.a.id}>${c.t.id}`);
    expect(flat('maj')).toEqual(['IV7>bVII', 'bVII7>bIII', 'bIII7>bVI']);
    expect(flat('min')).toEqual(['IV7>VII']);
    // In C: F7 over Bb, Bb7 over Eb, Eb7 over Ab.
    const C = parseKey('C');
    expect(['IV7', 'bVII', 'bVII7', 'bIII', 'bIII7', 'bVI', 'bVI7'].map((id) => name(C, 'maj', id))).toEqual(['F7', 'Bb', 'Bb7', 'Eb', 'Eb7', 'Ab', 'Ab7']);
    expect(name(parseKey('Am'), 'min', 'VII')).toBe('G');
    expect(labelSymbol('Bb', C)).toBe('bVII');
    expect(labelSymbol('Eb7', C)).toBe('bIII7');
    expect(labelSymbol('G', parseKey('Am'))).toBe('VII');
    expect(canBeHome('maj', 'bIII')).toBe(true);
  });

  it('names every button in D minor and F major as the mockups do', () => {
    const min = [...chords('min').keys()].map((id) => `${id}=${name(Dm, 'min', id)}`);
    expect(min).toEqual(expect.arrayContaining(['i=Dm', 'V=A7', 'V/V=E7', 'V/iv=D7', 'iiø=Em7(b5)', 'bVI7=Bb7',
      'bII=Eb', '#IV°=G#°', 'V/III=C7', 'III=F', 'V/VI=F7', 'VI=Bb', 'iv=Gm', 'ii/V=Bm7(b5)', 'ii/iv=Am7(b5)', 'ii/VI=Cm7', 'bII7=Eb7', 'IV7=G7']));
    const maj = [...chords('maj').keys()].map((id) => `${id}=${name(F, 'maj', id)}`);
    expect(maj).toEqual(expect.arrayContaining(['I=F', 'V/ii=D7', 'ii=Gm', 'V=C7', 'V/vi=A7', 'vi=Dm', 'V/V=G7',
      'V/iii=E7', 'iii=Am', 'IV=Bb', 'iv=Bbm6', '#I°=F#°', '#IV°=B°', 'bII=Gb', 'ii/IV=Cm7', 'bIII°=Ab°', 'bVII7=Eb7', 'IV7=Bb7']));
  });

  it('knows where each function goes and how it is read', () => {
    expect(target('V/ii')).toBe('ii');
    expect(target('ii/IV')).toBe('IV');
    expect(target('V')).toBeNull();
    expect(functionParts('V/ii')).toEqual({ of: 'V', to: 'ii' });
    expect(functionParts('#IV°')).toEqual({ name: '#IV°' });
  });

  it('offers to make home of a destination that can be a key', () => {
    expect(canBeHome('min', 'III')).toBe(true);
    expect(canBeHome('min', 'iiø')).toBe(false);
    expect(canBeHome('min', 'i')).toBe(false);
    expect(canBeHome('maj', 'V/ii')).toBe(false);
    expect(homeModeOf('maj', 'vi')).toBe('min');
    expect(homeModeOf('min', 'III')).toBe('maj');
  });
});

describe('chords', () => {
  it('reads what the app needs: root, bass, class and tones', () => {
    expect(chordInfo('E7/B')).toMatchObject({ root: 4, bass: 11, kind: 'dom', tones: [4, 8, 11, 2] });
    expect(chordInfo('Bm7(b5)')).toMatchObject({ kind: 'min', halfDiminished: true });
    expect(chordInfo('G#°')).toMatchObject({ kind: 'dim', tones: [8, 11, 2, 5] });
    expect(chordInfo('C7M').kind).toBe('maj');
    expect(chordInfo('D7(4)(9)').kind).toBe('dom');
    expect(chordInfo('NC')).toBeNull();
  });

  it('still reads a chord cifra.md cannot spell, by its root', () => {
    expect(chordInfo('C(omit3)')).toMatchObject({ root: 0, kind: 'maj' });
  });

  it('transposes letter by letter', () => {
    expect(transposeSymbol('D7/F#', 2, 4)).toBe('F#7/A#');
    expect(transposeSymbol('Bbm6', 1, 2)).toBe('Cm6');
    expect(transposeSymbol('NC', 1, 2)).toBe('NC');
  });

  it('respells the corpus’s chords for cifra.md', () => {
    expect(fromCorpus('A#o')).toBe('A#°');
    expect(fromCorpus('F#o/A')).toBe('F#°/A');
    expect(fromCorpus('Bm7/b5')).toBe('Bm7(b5)');
    expect(fromCorpus('NC')).toBe('NC');
  });
});

describe('functions', () => {
  const row = (sd, type, added, mode) => ({ sd, type, added, local_mode: mode === 'maj' ? 'major' : 'minor' });

  it('labels a corpus row as research/corpus_labels.py does', () => {
    expect(labelRow(row('VI', '', '7', 'maj'))).toBe('V/ii');
    expect(labelRow(row('V', '', '', 'min'))).toBe('V');
    expect(labelRow(row('bVI', '', '7', 'min'))).toBe('bVI7');
    expect(labelRow(row('#IV', 'o', '7', 'min'))).toBe('#IV°');
    expect(labelRow(row('II', 'm', '7', 'min'))).toBe('iiø');
    expect(labelRow(row('V', 'm', '7', 'maj'))).toBe('Vm');
    expect(labelRow(row('IV', '', '7M', 'maj'))).toBe('IV');
    expect(labelRow(row('NC', '', '', 'maj'))).toBeNull();
  });

  it('labels a symbol in a key the same way', () => {
    expect(labelSymbol('F', Dm)).toBe('III');
    expect(labelSymbol('C7', Dm)).toBe('V/III');
    expect(labelSymbol('Eb7', Dm)).toBe('bII7');
    expect(labelSymbol('G#°', Dm)).toBe('#IV°');
    expect(labelSymbol('D7', F)).toBe('V/ii');
    expect(labelSymbol('Gm6', F)).toBe('ii');
    expect(labelSymbol('NC', F)).toBeNull();
  });
});

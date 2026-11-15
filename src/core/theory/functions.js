// The board's function for a chord, two ways:
//
// - `labelRow(row)` reads a row of the corpus table (its scale degree, chord
//   type, added note and local mode), as research/corpus_labels.py does with
//   its alias (`iiø/ii` is the iiø), so the figures in the docs come out the
//   same;
// - `labelSymbol(symbol, key)` reads a chord symbol against a key, for the
//   places the table does not cover (a chord heard in the key being left).
//
// A chord the board has no place for comes back as its degree and type
// (`Vm`, `bVII7`), and `null` when there is no chord (NC).

import { chordInfo } from './chord.js';
import { mod } from './pitch.js';

const MAJOR_ROWS = {
  'I||': 'I', 'IV||': 'IV', 'II||m': 'ii', 'VI||m': 'vi', 'III||m': 'iii', 'IV||m': 'iv',
  'I|7|': 'V/IV', 'II|7|': 'V/V', 'VI|7|': 'V/ii', 'III|7|': 'V/vi', 'VII|7|': 'V/iii',
};
const MINOR_ROWS = {
  'I||m': 'i', 'IV||m': 'iv', 'III||': 'III', 'VI||': 'VI', 'bIII||': 'III', 'bVI||': 'VI',
  'I|7|': 'V/iv', 'II|7|': 'V/V', 'VII|7|': 'V/III', 'bVII|7|': 'V/III', 'III|7|': 'V/VI', 'bIII|7|': 'V/VI',
  'VI|7|': 'bVI7', 'bVI|7|': 'bVI7', 'II||m': 'iiø', 'bVII||': 'VII',
};

/** The function of a corpus table row, or null for no chord. */
export function labelRow(row) {
  const { sd, type: t, added: add } = row;
  if (sd === 'NC' || sd === '') return null;
  const dom = t === '' && add.includes('7') && !add.includes('M');
  if (t === 'o' || t === 'o7' || t === 'dim') return sd + '°';
  const mode = row.local_mode === 'major' ? 'maj' : 'min';
  if (sd === 'V' && t === '') return 'V';
  const table = mode === 'maj' ? MAJOR_ROWS : MINOR_ROWS;
  return table[`${sd}|${dom ? '7' : ''}|${t}`] ?? sd + t + (dom ? '7' : '');
}

// By semitones above the tonic and chord class: the same functions as above.
const MAJOR_SEMIS = {
  '0|maj': 'I', '0|dom': 'V/IV', '1|dim': '#I°', '1|maj': 'bII', '2|min': 'ii', '2|dom': 'V/V',
  '3|dim': 'bIII°', '4|min': 'iii', '4|dom': 'V/vi', '5|maj': 'IV', '5|min': 'iv', '5|dom': 'IV7',
  '6|dim': '#IV°', '7|maj': 'V', '7|dom': 'V', '9|min': 'vi', '9|dom': 'V/ii', '10|dom': 'bVII7', '11|dom': 'V/iii',
  '10|maj': 'bVII', '3|maj': 'bIII', '3|dom': 'bIII7', '8|maj': 'bVI', '8|dom': 'bVI7',
};
const MINOR_SEMIS = {
  '0|min': 'i', '0|dom': 'V/iv', '1|maj': 'bII', '1|dom': 'bII7', '2|min': 'iiø', '2|dom': 'V/V',
  '3|maj': 'III', '3|dom': 'V/VI', '5|min': 'iv', '5|dom': 'IV7', '6|dim': '#IV°', '7|maj': 'V', '7|dom': 'V',
  '8|maj': 'VI', '8|dom': 'bVI7', '10|dom': 'V/III', '10|maj': 'VII',
};

/** The function of a chord symbol in a key ({ pc, mode }), or null. */
export function labelSymbol(symbol, key) {
  const info = chordInfo(symbol);
  if (!info) return null;
  const semis = mod(info.root - key.pc, 12);
  const table = key.mode === 'maj' ? MAJOR_SEMIS : MINOR_SEMIS;
  return table[`${semis}|${info.kind}`] ?? `${semis}:${info.kind}`;
}

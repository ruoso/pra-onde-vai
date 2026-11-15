// Chord symbols: reading them (with the cifra.md grammar, from the copy in
// lib/cifra-md), the class the board's functions need, the pitch classes to
// sound, and transposing them letter by letter.

import { parseChord, chordTones } from '../../../lib/cifra-md/js/src/chord.js';
import { LETTERS, NATURALS, mod, parseNote, spell } from './pitch.js';

const ROOT = /^([A-G](?:#{1,2}|b{1,2})?)/;

/**
 * The corpus writes a diminished chord `o` (cifra.md: `°`) and once separates
 * a flat fifth with a slash (`m7/b5`). Everything else it writes is cifra.
 */
export function fromCorpus(token) {
  if (token === 'NC' || token === '.') return token;
  const m = /^([A-G][#b]?)(.*?)(\/[A-G][#b]?)?$/.exec(token);
  if (!m) return token;
  let body = m[2];
  if (body.startsWith('o')) body = '°' + body.slice(1);
  body = body.replace('m7/b5', 'm7(b5)');
  return m[1] + body + (m[3] ?? '');
}

const pcOf = (note) => mod(NATURALS[LETTERS.indexOf(note.letter)] + note.accidental, 12);

/**
 * What the app needs to know of a chord: its root and bass pitch classes, its
 * class for the board ('maj', 'min', 'dom' or 'dim'; a half-diminished chord
 * is 'min', as the corpus types it) and the pitch classes of its tones.
 * Returns null for no chord. A symbol the grammar cannot read (the corpus's
 * four `(omit3)` chords) is read by its root and the start of its body.
 */
export function chordInfo(symbol) {
  if (!symbol || symbol === 'NC' || symbol === 'N.C.' || symbol === '%' || symbol === '.') return null;
  const parsed = parseChord(symbol).chord;
  if (parsed) {
    const root = pcOf(parsed.root);
    const seventh = parsed.extensions.find((e) => e.degree === 7);
    let kind;
    if (parsed.quality === 'minor') kind = 'min';
    else if (parsed.quality === 'dim') kind = seventh && seventh.alter === -1 ? 'min' : 'dim';
    else if (seventh && seventh.alter === -1) kind = 'dom';
    else kind = 'maj';
    const tones = chordTones(parsed).map((t) => pcOf(parseNoteObj(t)));
    return {
      root, bass: parsed.bass ? pcOf(parsed.bass) : root, kind, tones,
      halfDiminished: parsed.quality === 'dim' && kind === 'min',
    };
  }
  const m = ROOT.exec(symbol);
  if (!m) return null;
  const note = parseNote(m[1]);
  const body = symbol.slice(m[1].length);
  const kind = /^m(?!aj)/.test(body) ? 'min' : /^°/.test(body) ? 'dim' : /7/.test(body) ? 'dom' : 'maj';
  const shape = { maj: [0, 4, 7], min: [0, 3, 7], dom: [0, 4, 7, 10], dim: [0, 3, 6, 9] }[kind];
  return { root: note.pc, bass: note.pc, kind, tones: shape.map((x) => mod(note.pc + x, 12)), halfDiminished: false };
}

function parseNoteObj(text) {
  const n = parseNote(text);
  if (n) return { letter: LETTERS[n.L], accidental: mod(n.pc - NATURALS[n.L] + 6, 12) - 6 };
  // Triple accidentals do not occur in the corpus; read the letter alone.
  return { letter: text[0], accidental: 0 };
}

/** Transpose a symbol by letter steps and semitones: `D7/F#` up a 3rd is `F#7/A#`. */
export function transposeSymbol(symbol, step, semis) {
  if (!symbol || symbol === 'NC' || symbol === '%') return symbol;
  const move = (text) => {
    const n = parseNote(text);
    return n ? spell({ L: n.L, pc: n.pc }, step, semis).text : text;
  };
  const m = /^([A-G](?:#{1,2}|b{1,2})?)(.*?)(?:\/([A-G](?:#{1,2}|b{1,2})?))?$/.exec(symbol);
  if (!m) return symbol;
  return move(m[1]) + m[2] + (m[3] ? '/' + move(m[3]) : '');
}

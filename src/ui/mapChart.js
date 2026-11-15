// What was played on the map, as a chart: a section for each home, in the
// order the homes came, each chord a bar, four bars to a line, and under
// each block the functions, as notes. Written in cifra.md's canonical form
// (lib/cifra-md), so it pastes into Estante de Cifras as it is.

import { keyText } from '../core/theory/pitch.js';

const BARS_PER_LINE = 4;

/**
 * The sections of the run: [{ key, chords: [{ id, sym, fn }] }]. A change of
 * home starts a section; a home with no chord played in it leaves none.
 */
export function sectionsOf(map) {
  const out = [];
  let cur = { key: map.centres[0].key, chords: [] };
  for (const e of map.log) {
    if (e.kind === 'home') {
      if (cur.chords.length) out.push(cur);
      cur = { key: e.key, chords: [] };
    } else {
      cur.chords.push({ id: e.id, sym: e.sym, fn: e.fn });
    }
  }
  if (cur.chords.length) out.push(cur);
  return out;
}

/**
 * The cifra.md text. `keyName` and `fnName` put keys and functions into the
 * language in use; `functionsLabel` heads the line of functions.
 */
export function chartText(map, { title, keyName, fnName, functionsLabel }) {
  const sections = sectionsOf(map);
  const lines = [`# ${title.trim() || 'Untitled'}`, `- key: ${keyText(map.centres[0].key)}`, '- notation: brazilian'];
  const names = new Map();
  for (const s of sections) {
    let name = keyName(s.key);
    const n = (names.get(name) ?? 0) + 1;
    names.set(name, n);
    if (n > 1) name = `${name} (${n})`;
    lines.push('', `## ${name}`, '```');
    for (let i = 0; i < s.chords.length; i += BARS_PER_LINE) {
      lines.push(s.chords.slice(i, i + BARS_PER_LINE).map((c) => c.sym).join(' | '));
    }
    lines.push('```', '', `${functionsLabel}: ${s.chords.map((c) => fnName(c.fn)).join(' · ')}`);
  }
  return `${lines.join('\n')}\n`;
}

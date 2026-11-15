// The map's run as a cifra.md chart, read back by the copy of cifra-md
// Estante uses: it must read as the same chords, and be canonical already.

import { describe, it, expect } from 'vitest';
import { parse, write } from '../../lib/cifra-md/js/src/index.js';
import { sectionsOf, chartText } from './mapChart.js';
import { initialMap, addChord, changeHome } from './mapState.js';
import { parseKey } from '../core/theory/pitch.js';

const names = {
  title: 'Cochichando, by ear',
  keyName: (k) => `${k.pc === 2 ? 'D' : 'F'} ${k.mode === 'maj' ? 'major' : 'minor'}`,
  fnName: (id) => id.replace(/^V\//, 'V of '),
  functionsLabel: 'Functions',
};

function aRun() {
  let m = initialMap(parseKey('Dm'));
  for (const [fn, sym] of [['i', 'Dm'], ['V', 'A7'], ['i', 'Dm'], ['V/III', 'C7'], ['III', 'F']]) m = addChord(m, fn, sym);
  m = changeHome(m, [...m.centres, { key: parseKey('F'), rel: 'relative' }], { current: 'I' });
  for (const [fn, sym] of [['V/ii', 'D7'], ['ii', 'Gm'], ['V', 'C7'], ['I', 'F']]) m = addChord(m, fn, sym);
  return m;
}

describe('the map as a chart', () => {
  it('has a section for each home, four bars to a line, and the functions under each', () => {
    expect(chartText(aRun(), names)).toBe(`# Cochichando, by ear
- key: Dm
- notation: brazilian

## D minor
\`\`\`
Dm | A7 | Dm | C7
F
\`\`\`

Functions: i · V · i · V of III · III

## F major
\`\`\`
D7 | Gm | C7 | F
\`\`\`

Functions: V of ii · ii · V · I
`);
  });

  it('reads back in cifra.md as the same chords, and is already canonical', () => {
    const text = chartText(aRun(), names);
    const doc = parse(new TextEncoder().encode(text));
    expect(doc.title).toBe('Cochichando, by ear');
    expect(doc.sections.map((s) => s.name)).toEqual(['D minor', 'F major']);
    const chords = doc.sections.map((s) => s.body.filter((b) => b.type === 'music')
      .flatMap((b) => b.lines.flatMap((l) => l.measures.flatMap((m) => m.items.map((i) => i.symbol)))));
    expect(chords).toEqual([['Dm', 'A7', 'Dm', 'C7', 'F'], ['D7', 'Gm', 'C7', 'F']]);
    expect(write(doc)).toBe(text);
  });

  it('leaves out a home with nothing played in it, and tells a home that comes back apart', () => {
    let m = initialMap(parseKey('Dm'));
    m = changeHome(m, [...m.centres, { key: parseKey('F'), rel: 'relative' }], { current: 'I' });
    m = addChord(m, 'I', 'F');
    m = changeHome(m, m.centres.slice(0, 1), { moved: false });
    m = addChord(m, 'i', 'Dm');
    m = changeHome(m, [...m.centres, { key: parseKey('F'), rel: 'relative' }], { current: 'I' });
    m = addChord(m, 'I', 'F');
    expect(sectionsOf(m).map((s) => s.chords.map((c) => c.sym).join(' '))).toEqual(['F', 'Dm', 'F']);
    const text = chartText(m, names);
    expect(text).toContain('## F major\n');
    expect(text).toContain('## F major (2)\n');
    expect(write(parse(new TextEncoder().encode(text)))).toBe(text);
  });
});

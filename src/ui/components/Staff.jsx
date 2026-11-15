// The notes entered, on a treble staff in the home key's signature
// (mockups/Listen.dc.html). Each note is spelled in the home key; an
// accidental is drawn only where the signature does not already give it.

import { t } from '../../i18n/index.js';
import { spellIn, accidentalOf, LETTERS } from '../../core/theory/pitch.js';
import { keySignature } from '../../core/listen/listen.js';

const GLYPH = { '-2': '\u{1D12B}', '-1': '♭', 0: '♮', 1: '♯', 2: '\u{1D12A}' };
const SHARP_ORDER = [[3, 10], [0, 7], [4, 11], [1, 8], [5, 5], [2, 9], [6, 6]];
const FLAT_ORDER = [[6, 6], [2, 9], [5, 5], [1, 8], [4, 4], [0, 7], [3, 3]];
const C4_Y = 130;
const STEP = 7;

export default function Staff({ notes, home, highlight = null, emptyText }) {
  const ks = keySignature(home);
  const sig = [
    ...SHARP_ORDER.filter(([L]) => ks[L] === 1).map(([, s]) => ({ glyph: GLYPH[1], step: s })),
    ...FLAT_ORDER.filter(([L]) => ks[L] === -1).map(([, s]) => ({ glyph: GLYPH[-1], step: s })),
  ];
  const x0 = Math.max(170, 104 + sig.length * 16 + 50);
  const names = notes.map((pc) => spellIn(home, pc).text);
  return (
    <figure className="staff">
      <svg viewBox="0 0 1124 196" role="img" aria-label={notes.length ? t('listen.staffAria', { notes: names.join(', ') }) : t('listen.staffEmpty')}>
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="24" x2="1100" y1={60 + i * 14} y2={60 + i * 14} className="staff-line" />)}
        <text x="34" y="116" className="clef" aria-hidden="true">{'\u{1D11E}'}</text>
        {sig.map((k, i) => (
          <text key={i} x={104 + i * 16} y={C4_Y - k.step * STEP} className="sig" dominantBaseline="central" aria-hidden="true">{k.glyph}</text>
        ))}
        {notes.map((pc, i) => {
          const sp = spellIn(home, pc);
          const acc = accidentalOf(sp.L, pc);
          const x = x0 + i * 88;
          const y = C4_Y - sp.L * STEP;
          const drawn = acc !== ks[sp.L];
          const lit = highlight ? highlight(pc) : null;
          const cls = lit === null ? 'note' : lit ? 'note is-lit' : 'note is-dim';
          return (
            <g key={i} className={cls} aria-hidden="true">
              {sp.L === 0 && <line x1={x - 17} x2={x + 17} y1={C4_Y} y2={C4_Y} className="staff-line" />}
              {drawn && <text x={x - 26} y={y} className="acc" dominantBaseline="central">{GLYPH[acc]}</text>}
              <ellipse cx={x} cy={y} rx="9" ry="6.5" transform={`rotate(-18 ${x} ${y})`} />
              <text x={x} y="170" className="note-name" textAnchor="middle">{LETTERS[sp.L]}{sp.text.slice(1)}</text>
            </g>
          );
        })}
        {!notes.length && <text x={x0} y="168" className="staff-empty">{emptyText}</text>}
      </svg>
    </figure>
  );
}

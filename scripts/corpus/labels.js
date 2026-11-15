// The function of every chord of a tune, as the board names it.
//
// Each row is labelled from the table (core/theory/functions.js labelRow,
// research/corpus_labels.py). Then one reading the table's degrees cannot
// make (design §8, level 7): a minor chord the board has no place for, played
// right before a dominant a fourth above it, is that dominant's ii — Gm7 in
// C before C7 is the ii of IV; Bm7(b5) in D minor before E7 is the ii of V.
// A minor sixth chord is read as the half-diminished a sixth above (Cm6 is
// Am7(b5)), as an accompanist hears it. A run of the same chord takes the
// label together; the dominant must follow in the same phrase and key.

import { labelRow } from '../../src/core/theory/functions.js';
import { chordDef, isOnBoard } from '../../src/core/theory/board.js';
import { chordInfo, fromCorpus } from '../../src/core/theory/chord.js';
import { mod } from '../../src/core/theory/pitch.js';

export const modeOf = (row) => (row.local_mode === 'major' ? 'maj' : 'min');

export const rawLabel = labelRow;

function iiRoot(row) {
  const info = chordInfo(fromCorpus(row.chord));
  if (!info) return null;
  return row.added === '6' ? mod(info.root + 9, 12) : info.root;
}

/**
 * Labels for a list of rows played in order within one phrase: the raw
 * labels, with the ii of a secondary dominant read from what follows.
 */
export function labelPhrase(rows) {
  const labels = rows.map(rawLabel);
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j + 1 < rows.length && labels[j + 1] === labels[i] && rows[j + 1].local_key === rows[i].local_key) j += 1;
    const l = labels[i];
    const mode = modeOf(rows[i]);
    const next = rows[j + 1];
    if (l && next && rows[j].type === 'm' && !isOnBoard(mode, l) && next.local_key === rows[j].local_key) {
      const nl = labels[j + 1];
      const to = nl === 'V' ? null : /^V\/(.+)$/.exec(nl ?? '')?.[1];
      const nextInfo = chordInfo(fromCorpus(next.chord));
      const root = iiRoot(rows[j]);
      if ((nl === 'V' || to) && nextInfo && nextInfo.kind === 'dom' && root !== null && nextInfo.root === mod(root + 5, 12)) {
        const id = to ? `ii/${to}` : null;
        if (id && chordDef(mode, id)) for (let k = i; k <= j; k += 1) labels[k] = id;
      }
    }
    i = j + 1;
  }
  return labels;
}

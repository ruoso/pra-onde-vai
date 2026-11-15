// The map's board (design §4): columns by fifths, rows for the ii of a
// secondary dominant, the dominant that leads in, the destination, and
// colour. A button never moves; chords not yet on the learner's board leave
// their place empty. Every button shows its function and its chord name.

import { Button } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { columns, homeId } from '../../core/theory/board.js';
import { spell } from '../../core/theory/pitch.js';
import { fnName } from '../words.js';

function Chord({ def, centre, row, lit, current, onPick, isHome, disabled }) {
  const name = spell(centre, def.step, def.semis).text + def.suffix;
  const fn = fnName(def.id);
  const tier = current === def.id ? null : lit?.get(def.id) ?? (lit?.has(def.id) ? 'lit' : null);
  const tierWord = tier && tier !== 'lit' ? t(`tier.${tier}`) : null;
  const cls = ['chord', `row-${row}`, isHome && 'is-home', tier && `tier-${tier}`, current === def.id && 'is-current'].filter(Boolean).join(' ');
  return (
    // The name is read from the visible text, chord name first: `A7, V, a usual
    // next move, Home`. The function shows above the name (CSS order).
    <Button className={cls} onPress={() => onPick(def.id, name)} isDisabled={disabled} data-id={def.id}>
      <span className={`name ${name.length > 6 ? 'long' : name.length > 4 ? 'mid' : ''}`}>{name}<span className="sr-only">,</span></span>
      <span className="fn">
        {fn}
        {tierWord && <span className="sr-only">, {t('tier.aria', { tier: tierWord })}</span>}
        {isHome && <span className="sr-only">,</span>}
      </span>
      {isHome && <span className="home-mark">{t('board.home')}</span>}
      {tierWord && <span className={`badge badge-${tier}`} aria-hidden="true">{tierWord}</span>}
    </Button>
  );
}

function Empty({ row, note }) {
  return <div className={`slot row-${row}`} aria-hidden="true">{note}</div>;
}

/**
 * @param centre   the home key { L, pc, mode }
 * @param board    the set of function ids shown (the learner's level), or null for all
 * @param lit      Map id → tier ('usual' | 'sometimes' | 'rare' | 'lit')
 * @param current  the id of the chord last played
 * @param onPick   called with (id, name)
 */
export default function Board({ centre, board = null, lit = null, current = null, onPick, size = 'map', disabled = false, labelledBy }) {
  const mode = centre.mode;
  const cols = columns(mode);
  const shows = (d) => !!d && (!board || board.has(d.id));
  const hasIi = cols.some((c) => shows(c.ii));
  const hasColour = cols.some((c) => c.c.some(shows));
  const props = { centre, lit, current, onPick, disabled };
  return (
    <div className={`board board-${size}`} role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : t('board.label')}>
      <div className="row-labels" aria-hidden="true">
        {hasIi && <span className="row-ii">{t('board.rowIi')}</span>}
        <span className="row-a">{t('board.rowA')}</span>
        <span className="row-t">{t('board.rowT')}</span>
        {hasColour && <span className="row-c">{t('board.rowC')}</span>}
      </div>
      {cols.map((col) => (
        <div className="column" key={col.t.id}>
          {hasIi && (shows(col.ii) ? <Chord def={col.ii} row="ii" {...props} />
            : <Empty row="ii" note={col.iiNote && (!board || board.has(col.iiNote)) && size === 'map' ? t('board.iiNote', { fn: fnName(col.iiNote) }) : null} />)}
          {shows(col.a) ? <Chord def={col.a} row="a" {...props} />
            : <Empty row="a" note={col.aNote && (!board || board.has(col.aNote)) && size === 'map' ? t('board.aNote', { fn: fnName(col.aNote) }) : null} />}
          {shows(col.t) ? <Chord def={col.t} row="t" isHome={col.t.id === homeId(mode)} {...props} /> : <Empty row="t" />}
          {hasColour && (
            <div className="colour-cell">
              {col.c.filter(shows).map((d) => <Chord key={d.id} def={d} row="c" {...props} />)}
              {!col.c.some(shows) && <Empty row="c" />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

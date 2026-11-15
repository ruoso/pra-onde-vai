// The map (design §4, mockups/Main.dc.html): tap the chord you hear against
// any recording. The usual next moves light up; landing on a destination
// asks "visiting, or moving in?"; a breadcrumb leads back to the keys before.

import { Button } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import Board from '../components/Board.jsx';
import Segmented from '../components/Segmented.jsx';
import { canBeHome, chordDef, homeId, homeModeOf } from '../../core/theory/board.js';
import { spell } from '../../core/theory/pitch.js';
import { nextMoves } from '../../core/stats/tiers.js';
import { boardAt } from '../../core/levels/levels.js';
import { playChords } from '../../audio/synth.js';
import { fnName, keyName } from '../words.js';
import { href } from '../router.js';

const RELATIONS = { 'maj:vi': 'relative', 'min:III': 'relative', 'maj:IV': 'subdominant', 'min:iv': 'subdominant', 'maj:V': 'dominant', 'min:V': 'dominant' };
const TRAIL = 9;

export default function MapScreen() {
  const { data, map, setMap, level, settings, setSetting, navigate } = useApp();
  const centre = map.centres[map.centres.length - 1].key;
  const mode = centre.mode;
  const board = settings.mapScope === 'all' ? null : boardAt(level, mode);
  const lit = map.current
    ? nextMoves(data.stats, mode, map.current, board)
    : new Map([[homeId(mode), 'lit'], ['V', 'lit']]);
  const push = (trail, item) => [...trail, item].slice(-TRAIL);

  const pick = (id, name) => {
    playChords([{ sym: name, d: 0.5 }], { pattern: false });
    setMap((m) => ({ ...m, current: id, moved: false, trail: push(m.trail, { t: name }) }));
  };

  // "Make this home": offered on a destination other than home that can be a key.
  const stay = map.current && canBeHome(mode, map.current) && (!board || board.has(map.current)) ? map.current : null;
  let stayInfo = null;
  if (stay) {
    const d = chordDef(mode, stay);
    const root = spell(centre, d.step, d.semis);
    const next = { L: root.L, pc: root.pc, mode: homeModeOf(mode, stay) };
    stayInfo = { chord: root.text + d.suffix, fn: fnName(stay), next, rel: RELATIONS[`${mode}:${stay}`] ?? 'newCentre' };
  }

  const makeHome = () => {
    const { next, rel } = stayInfo;
    setMap((m) => ({
      centres: [...m.centres, { key: next, rel }], current: homeId(next.mode), moved: true,
      trail: push(m.trail, { t: t('map.trailHome', { key: keyName(next) }), mark: true }),
    }));
  };

  const flip = (to) => {
    setMap((m) => {
      const top = m.centres[m.centres.length - 1];
      if (top.key.mode === to) return m;
      const below = m.centres[m.centres.length - 2];
      const centres = below && below.key.pc === top.key.pc && below.key.mode === to
        ? m.centres.slice(0, -1)
        : [...m.centres, { key: { ...top.key, mode: to }, rel: 'parallel' }];
      const now = centres[centres.length - 1].key;
      return { centres, current: homeId(to), moved: true, trail: push(m.trail, { t: t('map.trailHome', { key: keyName(now) }), mark: true }) };
    });
  };

  const back = (i) => {
    setMap((m) => (i === m.centres.length - 1 ? m : {
      centres: m.centres.slice(0, i + 1), current: null, moved: false,
      trail: push(m.trail, { t: t('map.trailHome', { key: keyName(m.centres[i].key) }), mark: true }),
    }));
  };

  const first = map.centres[0].key;
  return (
    <div className="map-screen">
      <div className="toolbar">
        <ol className="crumbs" aria-label={t('map.crumbs')}>
          {map.centres.map((c, i) => {
            const active = i === map.centres.length - 1;
            return (
              <li key={i}>
                <Button className={`crumb ${active ? 'is-active' : ''}`} onPress={() => back(i)} aria-current={active ? 'location' : undefined}>
                  <span className="crumb-key"><span className="sr-only">{active ? t('map.crumbCurrent') : t('map.crumbBack')} </span>{keyName(c.key)}<span className="sr-only">,</span></span>
                  <span className="crumb-rel">{t(`map.rel.${c.rel}`)}</span>
                </Button>
              </li>
            );
          })}
        </ol>
        <div className="toolbar-end">
          <Segmented label={t('map.modeLabel')} value={mode} onChange={flip}
            options={[{ value: 'min', label: t('mode.minorWord') }, { value: 'maj', label: t('mode.majorWord') }]} />
          <a className="button amber" href={href('listen')}>{t('map.stuck')}</a>
          <Segmented label={t('map.scopeLabel')} value={settings.mapScope} onChange={(v) => setSetting('mapScope', v)}
            options={[{ value: 'level', label: t('map.scopeLevel', { n: level }) }, { value: 'all', label: t('map.scopeAll') }]} />
          <Segmented label={t('map.practiceLabel')} value="free" onChange={(v) => v === 'checked' && navigate(href('tunes'))}
            options={[{ value: 'free', label: t('map.free') }, { value: 'checked', label: t('map.checked') }]} />
        </div>
      </div>

      <div className={`banner ${stayInfo ? 'is-stay' : ''}`} aria-live="polite">
        {stayInfo ? (
          <>
            <div>
              <div className="banner-title">{t('map.stayTitle', { chord: stayInfo.chord, fn: stayInfo.fn, key: keyName(centre) })}</div>
              <div className="banner-text">{t('map.stayText')}</div>
            </div>
            <Button className="button primary" onPress={makeHome}>{t('map.makeHome', { key: keyName(stayInfo.next) })}</Button>
          </>
        ) : map.moved ? (
          <div>
            <div className="banner-title">{t('map.movedTitle', { key: keyName(centre) })}</div>
            <div className="banner-text">{map.centres.length > 1 ? t('map.movedBack', { key: keyName(first) }) : t('map.movedParallel')}</div>
          </div>
        ) : (
          <div className="banner-text">{t('map.hint')}</div>
        )}
      </div>

      <div className="fifths-note" aria-hidden="true">{t('map.fifths')} →</div>
      <Board centre={centre} board={board} lit={lit} current={map.current} onPick={pick} size="map" />

      <div className="trail">
        <span className="trail-label">{t('map.played')}</span>
        <ol className="trail-items" aria-label={t('map.played')}>
          {map.trail.map((x, i) => <li key={i} className={x.mark ? 'is-mark' : ''}>{x.t}</li>)}
        </ol>
        <span className="trail-caption">{t('map.caption', { n: data.stats.tunes })}</span>
      </div>
    </div>
  );
}

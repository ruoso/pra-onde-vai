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
import { playChords, stop } from '../../audio/synth.js';
import { fnName, keyName } from '../words.js';
import { href } from '../router.js';
import HomePicker from '../components/HomePicker.jsx';
import { initialMap, resetMap, addChord, changeHome, currentOf, movedOf, playedOf, removeChord, undo } from '../mapState.js';
import { BAR_SECONDS } from './PracticeScreen.jsx';
import MapChart from '../components/MapChart.jsx';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { useState } from 'react';
import { relationOf } from '../../core/practice/relations.js';
import { sameKey } from '../../core/theory/pitch.js';

const RELATIONS = { 'maj:vi': 'relative', 'min:III': 'relative', 'maj:IV': 'subdominant', 'min:iv': 'subdominant', 'maj:V': 'dominant', 'min:V': 'dominant' };
const TRAIL = 9;

export default function MapScreen() {
  const { data, map, setMap, level, settings, setSetting, navigate } = useApp();
  const [choosing, setChoosing] = useState(false);
  if (!map) {
    return (
      <HomePicker onPick={(key, text) => {
        playChords([{ sym: text, d: 0.5 }], { pattern: false });
        setMap(initialMap(key));
      }} />
    );
  }
  const centre = map.centres[map.centres.length - 1].key;
  const mode = centre.mode;
  const board = settings.mapScope === 'all' ? null : boardAt(level, mode);
  const current = currentOf(map);
  const moved = movedOf(map);
  const played = playedOf(map);
  const lit = current
    ? nextMoves(data.stats, mode, current, board)
    : new Map([[homeId(mode), 'lit'], ['V', 'lit']]);

  const pick = (id, name) => {
    playChords([{ sym: name, d: 0.5 }], { pattern: false });
    setMap((m) => addChord(m, id, name));
  };

  // "Make this home": offered on a destination other than home that can be a key.
  const stay = current && canBeHome(mode, current) && (!board || board.has(current)) ? current : null;
  let stayInfo = null;
  if (stay) {
    const d = chordDef(mode, stay);
    const root = spell(centre, d.step, d.semis);
    const next = { L: root.L, pc: root.pc, mode: homeModeOf(mode, stay) };
    stayInfo = { chord: root.text + d.suffix, fn: fnName(stay), next, rel: RELATIONS[`${mode}:${stay}`] ?? 'newCentre' };
  }

  const makeHome = () => {
    const { next, rel } = stayInfo;
    setMap((m) => changeHome(m, [...m.centres, { key: next, rel }], { current: homeId(next.mode) }));
  };

  const flip = (to) => {
    setMap((m) => {
      const top = m.centres[m.centres.length - 1];
      if (top.key.mode === to) return m;
      const below = m.centres[m.centres.length - 2];
      const centres = below && below.key.pc === top.key.pc && below.key.mode === to
        ? m.centres.slice(0, -1)
        : [...m.centres, { key: { ...top.key, mode: to }, rel: 'parallel' }];
      return changeHome(m, centres, { current: homeId(to) });
    });
  };

  // Tapping the current home changes it: before anything is played, the
  // starting home is replaced; after, it is a change of home in the run,
  // which Undo takes back.
  const changeTo = (key) => {
    setChoosing(false);
    setMap((m) => {
      const from = m.centres[m.centres.length - 1].key;
      if (sameKey(from, key)) return m;
      if (!m.log.length && m.centres.length === 1) return initialMap(key);
      const rel = relationOf(from, key);
      return changeHome(m, [...m.centres, { key, rel: rel === 'other' ? 'newCentre' : rel }], { current: homeId(key.mode) });
    });
  };

  const back = (i) => {
    setMap((m) => (i === m.centres.length - 1 ? m : changeHome(m, m.centres.slice(0, i + 1), { moved: false })));
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
                <Button className={`crumb ${active ? 'is-active' : ''}`} onPress={() => (active ? setChoosing(true) : back(i))} aria-current={active ? 'location' : undefined}>
                  <span className="crumb-key"><span className="sr-only">{active ? t('map.crumbCurrent') : t('map.crumbBack')} </span>{keyName(c.key)}<span className="sr-only">,</span></span>
                  <span className="crumb-rel">{t(`map.rel.${c.rel}`)}{active && <span className="crumb-edit"> · {t('map.change')}</span>}</span>
                </Button>
              </li>
            );
          })}
        </ol>
        <div className="toolbar-end">
          <Segmented label={t('map.modeLabel')} value={mode} onChange={flip}
            options={[{ value: 'min', label: t('mode.minorWord') }, { value: 'maj', label: t('mode.majorWord') }]} />
          <Button className="button" onPress={() => setMap(null)}>{t('map.newHome')}</Button>
          <a className="button amber" href={href('listen')}>{t('map.stuck')}</a>
          <Segmented label={t('map.scopeLabel')} value={settings.mapScope} onChange={(v) => setSetting('mapScope', v)}
            options={[{ value: 'level', label: t('map.scopeLevel', { n: level }) }, { value: 'all', label: t('map.scopeAll') }]} />
          <Segmented label={t('map.practiceLabel')} value="free" onChange={(v) => v === 'checked' && navigate(href('tunes'))}
            options={[{ value: 'free', label: t('map.free') }, { value: 'checked', label: t('map.checked') }]} />
        </div>
      </div>

      <ModalOverlay className="overlay" isDismissable isOpen={choosing} onOpenChange={setChoosing}>
        <Modal className="modal wide">
          <Dialog className="dialog">
            <HomePicker inDialog onPick={(key) => changeTo(key)} />
          </Dialog>
        </Modal>
      </ModalOverlay>

      <div className={`banner ${stayInfo ? 'is-stay' : ''}`} aria-live="polite">
        {stayInfo ? (
          <>
            <div>
              <div className="banner-title">{t('map.stayTitle', { chord: stayInfo.chord, fn: stayInfo.fn, key: keyName(centre) })}</div>
              <div className="banner-text">{t('map.stayText')}</div>
            </div>
            <Button className="button primary" onPress={makeHome}>{t('map.makeHome', { key: keyName(stayInfo.next) })}</Button>
          </>
        ) : moved ? (
          <div>
            <div className="banner-title">{t('map.movedTitle', { key: keyName(centre) })}</div>
            <div className="banner-text">{map.centres.length > 1 ? t('map.movedBack', { key: keyName(first) }) : t('map.movedParallel')}</div>
          </div>
        ) : (
          <div className="banner-text">{t('map.hint')}</div>
        )}
      </div>

      <div className="fifths-note" aria-hidden="true">{t('map.fifths')} →</div>
      <Board centre={centre} board={board} lit={lit} current={current} onPick={pick} size="map" />

      <div className="trail">
        <span className="trail-label">{t('map.played')}</span>
        <ol className="trail-items" aria-label={t('map.played')}>
          {map.log.slice(-TRAIL).map((x) => (x.kind === 'home' ? (
            <li key={x.id} className="is-mark">{t('map.trailHome', { key: keyName(x.key) })}</li>
          ) : (
            <li key={x.id}>
              <Button className="trail-chord" aria-label={t('map.remove', { sym: x.sym })} onPress={() => setMap((m) => removeChord(m, x.id))}>
                {x.sym}<span className="trail-x" aria-hidden="true">×</span>
              </Button>
            </li>
          )))}
        </ol>
        <div className="trail-actions">
          <MapChart map={map} />
          <Button className="button" isDisabled={!played.length}
            onPress={() => playChords(played.map((sym) => ({ sym, d: 0.5 })), { barSeconds: BAR_SECONDS[settings.speed] ?? 1.6 })}>
            {t('map.playBack')}
          </Button>
          <Button className="button" isDisabled={!map.log.length} onPress={() => setMap((m) => undo(m))}>
            {t('map.undo')}
          </Button>
          <Button className="button" isDisabled={!map.log.length && map.centres.length === 1}
            onPress={() => { stop(); setMap(resetMap(map)); }}>
            {t('map.reset')}
          </Button>
        </div>
        <span className="trail-caption">{t('map.caption', { n: data.stats.tunes })}</span>
      </div>
    </div>
  );
}

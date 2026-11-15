// What am I hearing? (design §5, mockups/Listen.dc.html). For a tune with no
// chart: find home by ear, then name a chord from notes you hum or tap.
// The screen fills in whatever is still unknown.

import { useEffect, useRef, useState } from 'react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import Staff from '../components/Staff.jsx';
import { rankHomes, rankChords, keyNotes } from '../../core/listen/listen.js';
import { chords, homeId } from '../../core/theory/board.js';
import { spellIn, mod, keyText } from '../../core/theory/pitch.js';
import { chordInfo } from '../../core/theory/chord.js';
import { tierOf } from '../../core/stats/tiers.js';
import { playChords, playNotes } from '../../audio/synth.js';
import { listen } from '../../audio/mic.js';
import { fnName, keyName, nameIn } from '../words.js';
import { href } from '../router.js';
import { initialMap } from '../App.jsx';

const MAX_NOTES = 10;

export default function ListenScreen() {
  const { data, map, setMap, navigate, settings, setSetting } = useApp();
  const [home, setHome] = useState(null);
  const [notes, setNotes] = useState([]);
  const [sel, setSel] = useState(null);
  const [from, setFrom] = useState('start');
  const [hearing, setHearing] = useState(false);
  const [micError, setMicError] = useState(false);
  const stopMic = useRef(null);
  const known = !!home;
  const mapHome = map.centres[map.centres.length - 1].key;

  useEffect(() => () => stopMic.current?.(), []);

  const add = (pc) => setNotes((n) => (n.length < MAX_NOTES ? [...n, pc] : n));
  const tap = (pc) => {
    playNotes([{ midi: 60 + pc, time: 0 }]);
    add(pc);
    setSel(null);
  };

  const hum = async () => {
    if (hearing) {
      stopMic.current?.();
      stopMic.current = null;
      setHearing(false);
      return;
    }
    try {
      setMicError(false);
      stopMic.current = await listen((note) => { add(note.pc); setSel(null); }, { cents: settings.cents });
      setHearing(true);
    } catch {
      setMicError(true);
      setHearing(false);
    }
  };

  const fromId = from === 'start' ? null : from;
  const ranked = known ? rankChords(notes, home, fromId, data.stats) : rankHomes(notes);
  const chosen = ranked.find((r) => r.name === sel) ?? ranked[0] ?? null;

  const explains = (pc) => {
    if (!chosen) return null;
    if (known) return chosen.tones.includes(pc) || (chordInfo(chosen.name).kind === 'dom' && mod(pc - chosen.root, 12) === 1);
    return keyNotes(chosen.key).includes(mod(pc - chosen.key.pc, 12));
  };

  const playCard = (r) => {
    setSel(r.name);
    if (known) {
      playChords([{ sym: r.name, d: Math.max(0.5, notes.length * 0.16) }], { pattern: false });
      playNotes(notes.map((pc, i) => ({ midi: 60 + pc, time: i * 0.26 })));
    } else {
      const dom = nameIn(r.key, 'V');
      const tonic = nameIn(r.key, homeId(r.key.mode));
      playChords([{ sym: dom, d: 0.5 }, { sym: tonic, d: 0.5 }], { pattern: false });
    }
  };

  const footOf = (r) => {
    if (!known) return t('listen.cardTest', { dom: nameIn(r.key, 'V'), tonic: nameIn(r.key, homeId(r.key.mode)) });
    const tier = tierOf(r.likely);
    const modeWord = t(`review.modeWord.${home.mode}`);
    if (fromId === null) return t(`listen.opens.${tier ?? 'never'}`, { mode: modeWord, n: data.stats.tunes });
    return t(`listen.follows.${tier ?? 'rare'}`, { chord: nameIn(home, fromId), n: data.stats.tunes });
  };

  const whyOf = (r) => {
    if (!known) {
      const deg = r.restsOn.degree;
      return deg === 'none' ? t('listen.restsNot', { note: r.restsOn.note }) : t(`listen.restsOn.${deg}`, { note: r.restsOn.note });
    }
    return r.clue ? t('listen.clue', { note: r.clue.note, key: keyName(home), role: t(`listen.role.${r.clue.role}`) }) : t('listen.inKey');
  };
  const restOf = (r) => {
    if (r.leavesOut.length) return t('listen.leavesOut', { notes: r.leavesOut.join(', ') });
    if (!known) return r.hasThird ? t('listen.allIn') : t('listen.noThird');
    return t('listen.explainsAll');
  };

  const cents = settings.cents ?? 0;
  const fromOptions = known ? [['start', t('listen.fromNothing')], ...[...chords(home.mode).keys()].map((id) => [id, `${nameIn(home, id)} · ${fnName(id)}`])] : [];

  return (
    <div className="listen-screen">
      <div className="screen-head">
        <div>
          <h1>{t('listen.title')}</h1>
          <p className="sub">{known ? t('listen.step2') : t('listen.step1')}</p>
        </div>
        <div className="head-tools">
          <div className={`home-tile ${known ? 'is-known' : ''}`}>
            <span className="eyebrow">{t('board.home')}</span>
            <span className="home-key">{known ? keyName(home) : t('listen.unknown')}</span>
            {known && <Button className="button small" onPress={() => { setHome(null); setNotes([]); setSel(null); setFrom('start'); }}>{t('listen.change')}</Button>}
          </div>
          {!known && (
            <Button className="button" onPress={() => { setHome(mapHome); setNotes([]); setSel(null); }}>{t('listen.useMapHome', { key: keyName(mapHome) })}</Button>
          )}
          {known && (
            <Select className="from-select" selectedKey={from} onSelectionChange={(k) => { setFrom(k); setSel(null); }}>
              <Label className="eyebrow">{t('listen.comingFrom')}</Label>
              <Button className="button select-button"><SelectValue /> <span aria-hidden="true">▾</span></Button>
              <Popover className="popover">
                <ListBox className="select-list">
                  {fromOptions.map(([id, text]) => <ListBoxItem key={id} id={id} className="select-item">{text}</ListBoxItem>)}
                </ListBox>
              </Popover>
            </Select>
          )}
        </div>
      </div>

      <Staff notes={notes} home={home} highlight={chosen ? explains : null}
        emptyText={known ? t('listen.emptyKnown', { key: keyName(home) }) : t('listen.emptyUnknown')} />

      <div className="note-entry">
        <Button className={`button amber hum ${hearing ? 'is-on' : ''}`} onPress={hum} aria-pressed={hearing}>
          {hearing ? t('listen.humStop') : t('listen.hum')}
        </Button>
        <div className="note-pad" role="group" aria-label={t('listen.pad')}>
          {Array.from({ length: 12 }, (_, pc) => (
            <Button key={pc} className="note-key" onPress={() => tap(pc)}>{spellIn(home, pc).text}</Button>
          ))}
        </div>
        <Button className="button" onPress={() => { setNotes((n) => n.slice(0, -1)); setSel(null); }} isDisabled={!notes.length}>{t('listen.undo')}</Button>
        <Button className="button" onPress={() => { setNotes([]); setSel(null); }} isDisabled={!notes.length}>{t('listen.clear')}</Button>
      </div>
      {micError && <p className="notice" role="alert">{t('listen.noMic')}</p>}
      {hearing && <p className="notice" role="status">{t('listen.hearing')}</p>}

      <h2 className="eyebrow">{known ? t('listen.likelyChords') : t('listen.likelyHomes')}</h2>
      {ranked.length === 0 ? (
        <div className="cards-empty">{t('listen.noCards')}</div>
      ) : (
        <ul className="cards">
          {ranked.map((r) => {
            const on = chosen && chosen.name === r.name;
            return (
              <li key={r.name}>
                <Button className={`card-button ${on ? 'is-on' : ''}`} onPress={() => playCard(r)} aria-pressed={!!on}>
                  <span className="card-top">
                    <span className="card-name">{known ? r.name : keyName(r.key)}</span>
                    {known && <span className="card-tag">{fnName(r.id)}</span>}
                  </span>
                  <span className="card-fit">
                    <span className="bar"><span style={{ width: `${Math.round(r.share * 100)}%` }} /></span>
                    <span>{t('listen.fit', { fit: r.fit, n: notes.length })}</span>
                  </span>
                  <span className="card-why">{whyOf(r)}</span>
                  <span className="card-rest">{restOf(r)}</span>
                  <span className="card-foot">{footOf(r)}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="listen-foot">
        <Slider className="pitch" minValue={-50} maxValue={50} step={1} value={cents} onChange={(v) => setSetting('cents', v)}>
          <Label>{t('listen.pitch')}</Label>
          <SliderTrack className="track"><SliderThumb className="thumb" /></SliderTrack>
          <SliderOutput className="pitch-out">{({ state }) => {
            const v = state.values[0];
            return v === 0 ? t('listen.concert') : t(v < 0 ? 'listen.flat' : 'listen.sharp', { n: Math.abs(v) });
          }}</SliderOutput>
        </Slider>
        {!known && chosen && (
          <Button className="button primary" onPress={() => { setHome(chosen.key); setNotes([]); setSel(null); setFrom('start'); }}>
            {t('listen.makeHome', { key: keyName(chosen.key) })}
          </Button>
        )}
        {known && (
          <Button className="button primary" onPress={() => { setMap(initialMap(home)); navigate(href('map')); }}>
            {t('listen.openMap', { key: keyText(home) })} →
          </Button>
        )}
      </div>
    </div>
  );
}

// Meet it (design §8): a chord a level adds, heard in three corpus tunes
// where it is easy to hear — tunes mostly on the board at that level, at a
// place where the chords around it are known.

import { Button } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import { buildSequence } from '../../core/practice/sequence.js';
import { levelOf } from '../../core/levels/levels.js';
import { playChords } from '../../audio/synth.js';
import { fnName, keyName, sectionName } from '../words.js';
import { href } from '../router.js';
import { BAR_SECONDS, chordsOf } from './PracticeScreen.jsx';

export default function MeetScreen() {
  const { data, route, settings } = useApp();
  const { mode, id } = route.params;
  const found = data.stats.meet[mode]?.[id] ?? [];
  const lvl = levelOf(mode, id);

  return (
    <div className="meet-screen">
      <div className="screen-head">
        <div className="head-start">
          <a className="icon-button" href={href('levels', { level: String(lvl ?? 1) })} aria-label={t('meet.back')}>←</a>
          <div>
            <h1>{t('meet.title', { fn: fnName(id) })}</h1>
            <p className="sub">{t('meet.sub', { mode: t(`review.modeWord.${mode}`) })}</p>
          </div>
        </div>
      </div>
      {!found.length && <p className="notice">{t('meet.none')}</p>}
      <ul className="meet-list">
        {found.map((f) => {
          const tune = data.tunes.find((x) => x.id === f.tune);
          const events = buildSequence(tune, { sections: 'all', level: lvl });
          const from = Math.floor((f.bar - 1) / 4) * 4 + 1;
          const idx = events.map((e, i) => [e, i]).filter(([e]) => e.section === f.section && e.bar >= from && e.bar < from + 4).map(([, i]) => i);
          const hit = idx.find((i) => events[i].bar === f.bar && events[i].expected === id);
          const key = events[hit]?.inKey;
          return (
            <li key={`${f.tune}:${f.section}:${f.bar}`} className="card meet-card">
              <div className="card-head">
                <h2 className="card-title">{tune.title}</h2>
                <span className="sub">{t('meet.where', { section: sectionName(tune.sections[f.section]), from, to: from + 3, key: keyName(key) })}</span>
              </div>
              <ol className="meet-bars" aria-label={t('meet.barsLabel')}>
                {idx.map((i) => {
                  const e = events[i];
                  return (
                    <li key={i} className={i === hit ? 'is-hit' : ''}>
                      <span className="sym">{e.repeat ? '%' : e.sym}</span>
                      <span className="fn">{e.repeat ? '' : fnName(e.fn)}</span>
                    </li>
                  );
                })}
              </ol>
              <div className="row">
                <Button className="button primary" onPress={() => playChords(chordsOf(events, idx, tune.meter), { barSeconds: BAR_SECONDS[settings.speed] })}>{t('meet.hear')}</Button>
                <a className="button" href={href('tunes', { tune: tune.id })}>{t('meet.practise')}</a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// How it went (design §6, mockups/Review.dc.html): the run phrase by phrase,
// each tappable to hear it again; the pattern in the misses, named; and a
// short drill made of them.

import { Button } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import { phrases, pattern } from '../../core/practice/review.js';
import { counts } from '../../core/practice/session.js';
import { relationOf } from '../../core/practice/relations.js';
import { playChords } from '../../audio/synth.js';
import { fnName, keyName, nameIn, sectionName } from '../words.js';
import { href } from '../router.js';
import { again, missDrillRun } from '../runs.js';
import { BAR_SECONDS, chordsOf } from './PracticeScreen.jsx';

const GLYPH = { right: '✓', another: '≈', miss: '×' };

function markLine(m) {
  const p = { sym: m.sym, fn: fnName(m.expected), picked: m.picked ? nameIn(m.key, m.picked) : '', pickedFn: fnName(m.picked), bar: m.bar };
  if (m.kind === 'another') return t(`review.another.${m.reason}`, p);
  if (m.reason === 'shown') return t('review.shown', p);
  if (m.expected === 'something') return t('review.missSomething', p);
  if (m.reason === 'arrival') return t('review.missArrival', p);
  return t('review.miss', p);
}

export default function ReviewScreen() {
  const { data, run, setRun, navigate, attempts, settings } = useApp();
  if (!run) {
    return (
      <div className="empty-screen">
        <p>{t('review.none')}</p>
        <a className="button primary" href={href('tunes')}>{t('practice.chooseTune')}</a>
      </div>
    );
  }
  const { st } = run;
  const tune = run.kind === 'tune' ? data.tunes.find((x) => x.id === run.tuneId) : null;
  const meter = tune?.meter ?? '2/4';
  const c = counts(st);
  const groups = phrases(st);
  const p = pattern(st);
  const move = st.moves[0] ?? null;

  const label = (g) => (tune
    ? t('review.phraseLabel', { section: sectionName(tune.sections[g.section]), from: g.from, to: g.to })
    : t('review.drillLabel', { n: g.section + 1 }));

  const note = (g) => {
    const lines = g.marks.map(markLine);
    const mv = st.moves.find((m) => g.events.includes(m.at));
    if (mv) lines.push(mv.found ? t('review.movedFound', { key: keyName(mv.to) }) : t('review.movedMissed', { key: keyName(mv.to) }));
    if (g.played.length) lines.push(t('review.playedFor', { chords: g.played.join(', ') }));
    return lines.length ? lines.join(' ') : t('review.allRight');
  };

  const items = p.items ?? [];
  const patternText = p.code === 'clean' ? t('review.pattern.cleanText')
    : t(`review.pattern.${p.code}Text`, {
      list: items.map((m) => t('review.itemAt', { sym: m.sym, bar: m.bar, fn: fnName(m.expected), picked: m.picked ? nameIn(m.key, m.picked) : t('review.nothing') })).join('; '),
    });

  // The corpus fact about the move the run made, when it made one.
  let keep = null;
  if (move && tune) {
    const rel = relationOf(move.from, move.to);
    const fact = data.stats.bMoves[tune.mode];
    if (fact && fact[rel] !== undefined && rel !== 'other') {
      keep = t(`review.keep.${move.found ? 'found' : 'missed'}`, {
        from: keyName(move.from), to: keyName(move.to), n: fact[rel], of: fact.tunes,
        rel: t(`review.rel.${rel}`), mode: t(`review.modeWord.${tune.mode}`),
      });
    }
  }

  const speed = BAR_SECONDS[settings.speed];
  const title = tune ? tune.title : run.kind === 'misses' ? t('practice.missesTitle') : t('practice.drillTitle', { n: run.level });

  return (
    <div className="review-screen">
      <div className="screen-head">
        <div>
          <h1>{t('review.title')}</h1>
          <p className="sub">{title}</p>
        </div>
        <div className="head-tools tiles">
          <div className="tile"><span className="n s-right">{c.right}</span><span>{t('review.right')}</span></div>
          <div className="tile"><span className="n s-another">{c.another}</span><span>{t('review.another.word')}</span></div>
          <div className="tile"><span className="n s-miss">{c.miss}</span><span>{t('review.missed')}</span></div>
          {move && (
            <div className={`tile is-move ${move.found ? '' : 'is-missed'}`}>
              <span className="n">{move.found ? t('review.found') : t('review.notFound')}</span>
              <span>{t('review.homeMoving', { key: keyName(move.to) })}</span>
            </div>
          )}
        </div>
      </div>

      <div className="review-body">
        <section className="phrases" aria-labelledby="phrases-h">
          <h2 id="phrases-h" className="eyebrow">{t('review.phrases')}</h2>
          <ul>
            {groups.map((g, k) => (
              <li key={k}>
                <Button className={`phrase ${g.miss ? 'is-miss' : ''}`}
                  onPress={() => playChords(chordsOf(st.events, g.events, meter), { barSeconds: speed })}>
                  <span className="phrase-row">
                    <span className="phrase-label">{label(g)}</span>
                    {g.bars.map((b) => (
                      <span className="phrase-bar" key={b.n}>
                        {b.items.map((x) => (
                          <span key={x.i} className={`item status-${x.status}`}>
                            {x.sym}{GLYPH[x.status] && <span className="glyph">{GLYPH[x.status]}</span>}
                          </span>
                        ))}
                      </span>
                    ))}
                  </span>
                  <span className={`phrase-note ${g.miss ? 'is-miss' : ''}`}>{note(g)}</span>
                  <span className="sr-only"> {t('review.playPhrase')}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="review-side">
          <section className="card pattern" aria-labelledby="pattern-h">
            <h2 id="pattern-h" className="eyebrow">{t('review.patternTitle')}</h2>
            <p className="card-title">{t(`review.pattern.${p.code}`, { fn: fnName(p.fn) })}</p>
            <p className="card-text">{patternText}</p>
          </section>
          <section className="card" aria-labelledby="next-h">
            <h2 id="next-h" className="eyebrow">{t('review.next')}</h2>
            {p.focus.length > 0 && (
              <div className="next-item">
                <p className="card-title small">{t('review.drillTitle')}</p>
                <p className="card-text">{t('review.drillText', { list: p.focus.map((f) => fnName(f.id)).join(', ') })}</p>
              </div>
            )}
            {keep && (
              <div className="next-item">
                <p className="card-title small">{t('review.keepTitle')}</p>
                <p className="card-text">{keep}</p>
              </div>
            )}
            {!p.focus.length && !keep && <p className="card-text">{t('review.nextClean')}</p>}
          </section>
          <div className="review-actions">
            {p.focus.length > 0 && (
              <Button className="button primary large" onPress={() => { setRun(missDrillRun(data.stats, run.level, p)); navigate(href('practice')); }}>
                {t('review.practiseMisses', { count: p.misses.length })}
              </Button>
            )}
            <div className="row">
              <Button className="button" onPress={() => { setRun(again(run, data, attempts, { key: 'random' })); navigate(href('practice')); }}>
                {tune ? t('review.againAnyKey') : t('review.againDrill')}
              </Button>
              <a className="button" href={tune ? href('tunes', { tune: tune.id }) : href('levels')}>{tune ? t('review.anotherTune') : t('review.toLevels')}</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

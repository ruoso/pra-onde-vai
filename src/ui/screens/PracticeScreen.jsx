// Checked practice, Predict (design §6, mockups/Practice.dc.html): the app
// plays a real choro's harmony, stops before each chord change, and you find
// the next chord on the board. Each answer is marked (§7), and the real chord
// plays. At a change of key it asks whether home has moved.

import { useEffect, useRef } from 'react';
import { Button, ToggleButton } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import Board from '../components/Board.jsx';
import { answer, showMe, resolveMove, current, isDone, counts, homeOf, heardBefore, lastHeard } from '../../core/practice/session.js';
import { nextMoves } from '../../core/stats/tiers.js';
import { TOP_LEVEL } from '../../core/levels/levels.js';
import { playChords, stop } from '../../audio/synth.js';
import { feedback, keyName, sectionName, fnName } from '../words.js';
import { href } from '../router.js';
import { attemptsOf } from '../runs.js';

export const BAR_SECONDS = { slow: 2.2, normal: 1.6, fast: 1.1 };

/** The length of a bar in whole notes, from the meter: 2/4 is half a whole note. */
export function barLength(meter = '2/4') {
  const [n, d] = meter.split('/').map(Number);
  return n && d ? n / d : 0.5;
}

/** The chords of some events, as the synth plays them: a held bar repeats the chord before. */
export function chordsOf(events, indices, meter) {
  return indices.map((i) => events[i]).map((e) => (e.repeat ? { sym: '%', d: barLength(meter) } : { sym: e.sym, d: e.dur }));
}

const ROW = 8;

/** The rows of bars to show: the eight-bar row being played, with the one before and after. */
function stripRows(st, tune) {
  const bars = [];
  st.events.forEach((e, i) => {
    const last = bars[bars.length - 1];
    if (!last || last.section !== e.section || last.n !== e.bar) bars.push({ section: e.section, n: e.bar, items: [i] });
    else last.items.push(i);
  });
  const rows = [];
  for (const b of bars) {
    const r = rows[rows.length - 1];
    if (!r || r.section !== b.section || r.bars.length === ROW) rows.push({ section: b.section, bars: [b] });
    else r.bars.push(b);
  }
  const at = Math.min(st.pendingMove ?? st.idx, st.events.length - 1);
  const ri = Math.max(0, rows.findIndex((r) => r.bars.some((b) => b.items.includes(at))));
  const from = Math.max(0, Math.min(ri - 1, rows.length - 3));
  return rows.slice(from, from + 3).map((r) => ({
    ...r, label: tune ? sectionName(tune.sections[r.section]) : String(r.section + 1),
  }));
}

function Bar({ bar, st, done }) {
  const pendingIdx = st.pendingMove === null && !done ? st.idx : -1;
  const arrives = bar.items.some((i) => st.events[i].arrival && !st.events[i].given);
  const isCurrent = bar.items.includes(pendingIdx);
  const revealedUntil = st.pendingMove !== null ? st.pendingMove + 1 : st.idx;
  return (
    <li className={`strip-bar ${isCurrent ? 'is-current' : ''}`}>
      <span className={`bar-n ${arrives ? 'arrives' : ''}`} aria-label={arrives ? t('practice.barArrives', { n: bar.n }) : t('practice.bar', { n: bar.n })}>{bar.n}</span>
      {bar.items.map((i) => {
        const e = st.events[i];
        const r = st.results[i];
        if (e.repeat) return <span key={i} className="item held" aria-label={t('practice.held')}>{i < revealedUntil ? '%' : '·'}</span>;
        if (i === pendingIdx) return <span key={i} className="item pending" aria-label={t('practice.toFind')}>?</span>;
        if (i >= revealedUntil) return <span key={i} className="item future" aria-label={t('practice.toCome')}>·</span>;
        if (!r) return <span key={i} className="item played" aria-label={t(e.given ? 'practice.given' : 'practice.playedFor', { sym: e.sym })}>{e.sym}</span>;
        const glyph = { right: '✓', another: '≈', miss: '×' }[r.kind];
        return (
          <span key={i} className={`item mark-${r.kind}`} aria-label={t(`practice.mark.${r.kind}`, { sym: e.sym })}>
            {e.sym}<span className="glyph" aria-hidden="true">{glyph}</span>
          </span>
        );
      })}
    </li>
  );
}

export default function PracticeScreen() {
  const { data, run, setRun, settings, setSetting, addAttempts } = useApp();
  const played = useRef(null);
  const st = run?.st;
  const tune = run?.kind === 'tune' ? data.tunes.find((x) => x.id === run.tuneId) : null;
  const meter = tune?.meter ?? '2/4';

  // Play what the last step says to play, once per step.
  useEffect(() => {
    if (!st || played.current === st) return;
    played.current = st;
    if (st.play?.length) playChords(chordsOf(st.events, st.play, meter), { barSeconds: BAR_SECONDS[settings.speed] ?? 1.6 });
  }, [st, meter, settings.speed]);
  useEffect(() => () => stop(), []);

  if (!run) {
    return (
      <div className="empty-screen">
        <p>{t('practice.none')}</p>
        <a className="button primary" href={href('tunes')}>{t('practice.chooseTune')}</a>
      </div>
    );
  }

  const done = isDone(st);
  const ev = current(st);
  const home = homeOf(st);
  const mode = home.mode;
  const level = run.kind === 'misses' ? TOP_LEVEL : run.level;
  // The whole board, always: a few buttons would give the answer away. The
  // level decides only which chords are asked (design §8).
  const last = lastHeard(st);
  const hintsOn = settings.hints;
  const lit = hintsOn && st.pendingMove === null && !done && last ? nextMoves(data.stats, mode, last) : null;
  const c = counts(st);
  const fb = feedback(st.last);
  const update = (next) => {
    addAttempts(attemptsOf(st, next));
    setRun({ ...run, st: next });
  };
  const pick = (id) => { if (ev) update(answer(st, id, data.stats)); };
  const prevIdx = heardBefore(st, 1)[0];
  const ask = ev ? t('practice.ask', { bar: ev.bar, sym: prevIdx !== undefined ? st.events[prevIdx].sym : '' }) : '';
  const moveEv = st.pendingMove !== null ? st.events[st.pendingMove] : null;
  const beforeMove = moveEv ? heardBefore(st, 2).filter((i) => i !== st.pendingMove).pop() : undefined;
  const title = tune ? tune.title : run.kind === 'misses' ? t('practice.missesTitle') : t('practice.drillTitle', { n: run.level });
  const sub = tune
    ? [t(`practice.sections.${run.options.sections}`), run.transpose ? t('practice.inKey', { key: keyName(run.home) }) : t('practice.asWritten'), t('choose.predict')].join(' · ')
    : t('practice.drillSub');
  // In a drill, a chord above the learner's level is asked too: its own
  // button or "Something else" answers it. A tune plays such chords for you.
  const showSomething = !tune && level < TOP_LEVEL;

  return (
    <div className="practice-screen">
      <div className="screen-head">
        <div className="head-start">
          <a className="icon-button" href={tune ? href('tunes', { tune: tune.id }) : href('levels')} aria-label={tune ? t('practice.backTunes') : t('practice.backLevels')}>←</a>
          <div>
            <h1>{title}</h1>
            <p className="sub">{sub}</p>
          </div>
        </div>
        <div className="head-tools">
          <div className="home-tile">
            <span className="eyebrow">{t('board.home')}</span>
            <span className="home-key">{keyName(home)}</span>
          </div>
          <div className="score" role="img" aria-label={t('practice.scoreAria', c)}>
            <span className="s-right">✓ {c.right}</span>
            <span className="s-another">≈ {c.another}</span>
            <span className="s-miss">× {c.miss}</span>
          </div>
          <ToggleButton className="toggle" isSelected={hintsOn} onChange={(v) => setSetting('hints', v)}>
            {hintsOn ? t('practice.hintsOn') : t('practice.hintsOff')}
          </ToggleButton>
        </div>
      </div>

      {tune && (
        <div className="strip" aria-label={t('practice.strip')}>
          {stripRows(st, tune).map((r, k) => (
            <div className="strip-row" key={k}>
              <span className="strip-label">{r.label}</span>
              <ol className="bars">{r.bars.map((b) => <Bar key={`${b.section}:${b.n}`} bar={b} st={st} done={done} />)}</ol>
            </div>
          ))}
        </div>
      )}
      {!tune && (
        <ol className="drill-trail" aria-label={t('practice.strip')}>
          {st.events.slice(0, st.pendingMove ?? st.idx).slice(-10).map((e, k) => {
            const i = (st.pendingMove ?? st.idx) - Math.min(10, st.pendingMove ?? st.idx) + k;
            const r = st.results[i];
            return <li key={i} className={r ? `mark-${r.kind}` : e.given ? 'given' : ''}>{e.sym}{r ? ` ${{ right: '✓', another: '≈', miss: '×' }[r.kind]}` : ''}</li>;
          })}
        </ol>
      )}

      <div aria-live="polite" className="panels">
        {moveEv && (
          <div className="panel is-move">
            <div>
              <div className="panel-title">{t(moveEv.bar === 1 ? 'practice.moveNewSection' : 'practice.moveMid', { sym: moveEv.sym })}</div>
              <div className="panel-text">{t('practice.moveText', { prev: beforeMove !== undefined ? st.events[beforeMove].sym : '', sym: moveEv.sym, fn: fnName(moveEv.expected), key: keyName(moveEv.key) })}</div>
            </div>
            <div className="panel-actions">
              <Button className="button outline" onPress={() => update(resolveMove(st, false))}>{t('practice.visiting', { sym: moveEv.sym })}</Button>
              <Button className="button primary" onPress={() => update(resolveMove(st, true))}>{t('practice.makeHome', { key: keyName(moveEv.key) })}</Button>
            </div>
          </div>
        )}
        {!moveEv && !done && (
          <div className={`panel ${fb ? `fb-${st.last.kind}` : ''}`}>
            <div className="panel-body">
              <div className="panel-title">{fb ? fb.title : t('practice.whatNext')}</div>
              <div className="panel-text">{fb ? `${fb.text} ` : ''}{ask}</div>
            </div>
            <div className="panel-actions">
              <Button className="button" onPress={() => playChords(chordsOf(st.events, heardBefore(st, 4), meter), { barSeconds: BAR_SECONDS[settings.speed] })}>{t('practice.again')}</Button>
              <Button className="button" onPress={() => update(showMe(st))}>{t('practice.showMe')}</Button>
            </div>
          </div>
        )}
        {done && (
          <div className="panel is-done">
            <div className="panel-title">{t('practice.done', c)}</div>
            <a className="button primary" href={href('review')}>{t('practice.seeHow')}</a>
          </div>
        )}
      </div>

      <div className="practice-board">
        <Board centre={home} board={null} lit={lit} current={last} onPick={pick} size="practice" disabled={!ev} />
        {showSomething && (
          <Button className="button something" onPress={() => pick('something')} isDisabled={!ev}>{t('practice.something')}</Button>
        )}
      </div>
    </div>
  );
}

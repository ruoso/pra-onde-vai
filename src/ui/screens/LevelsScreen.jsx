// Your levels (design §8, mockups/Levels.dc.html): each level adds the
// chords the corpus uses most after the ones before. Mastery is computed from
// your answers; a level unlocks when its chords are mastered in both modes.

import { useState } from 'react';
import { Button, Dialog, DialogTrigger, Heading, ListBox, ListBoxItem, Modal, ModalOverlay } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import Segmented from '../components/Segmented.jsx';
import { LEVELS, addedAt } from '../../core/levels/levels.js';
import { levelDone } from '../../core/levels/progress.js';
import LevelProgress from '../components/LevelProgress.jsx';
import { fnName } from '../words.js';
import { href } from '../router.js';
import { levelDrillRun } from '../runs.js';

export default function LevelsScreen() {
  const { data, attempts, level, earned, route, navigate, setRun, setSetting } = useApp();
  const [mode, setMode] = useState('min');
  const sel = Number(route.params.level ?? level);
  const info = data.stats.levels[sel - 1];
  const l = LEVELS[sel - 1];
  const done = sel < earned || levelDone(attempts, sel);
  const now = sel === level && !done;
  const locked = sel > level;
  const skippedTo = level > earned;

  const drillNow = () => {
    setRun(levelDrillRun(data.stats, attempts, sel));
    navigate(href('practice'));
  };

  return (
    <div className="levels-screen">
      <div className="screen-head">
        <div>
          <h1>{t('levels.title')}</h1>
          <p className="sub">{t('levels.sub', { n: data.stats.tunes })}</p>
        </div>
        <Segmented label={t('levels.modeLabel')} value={mode} onChange={setMode}
          options={[{ value: 'min', label: t('choose.minor') }, { value: 'maj', label: t('choose.major') }]} />
      </div>
      <div className="levels-body">
        <ListBox aria-label={t('levels.listLabel')} className="level-list" selectionMode="single" disallowEmptySelection
          selectedKeys={[String(sel)]}
          onSelectionChange={(keys) => { const [k] = [...keys]; if (k) navigate(href('levels', { level: String(k) })); }}>
          {LEVELS.map((x) => {
            const isDone = x.n < earned;
            const isNow = x.n === level;
            const isSkipped = !isDone && x.n < level;
            const state = isDone ? t('levels.done') : isNow ? t('levels.current') : isSkipped ? t('levels.skipped') : t('levels.locked');
            return (
              <ListBoxItem key={x.n} id={String(x.n)} textValue={t(`levels.name.${x.key}`)}
                className={`level-row ${isDone ? 'is-done' : isNow ? 'is-now' : isSkipped ? 'is-skipped' : 'is-locked'}`}>
                <span className="dot" aria-hidden="true">{isDone ? '✓' : x.n}</span>
                <span className="level-main">
                  <span className="level-name">{t('levels.levelName', { n: x.n, name: t(`levels.name.${x.key}`) })}<span className="sr-only">, {state},</span></span>
                  <span className="chips">
                    {x[mode].map((fn) => <span key={fn} className="chip">{fnName(fn)}</span>)}
                    {x.keyMove && <span className="chip key-move">{t(`levels.keyMove.${x.keyMove}`)}</span>}
                  </span>
                </span>
                <span className="level-tunes"><span className="n">{data.stats.levels[x.n - 1].tunes80}</span> <span>{t('levels.tunesWhole')}</span></span>
              </ListBoxItem>
            );
          })}
        </ListBox>

        <aside className="level-side">
          <section className="card" aria-labelledby="level-h">
            <div className="card-head">
              <h2 id="level-h" className="card-title">{t('levels.levelName', { n: sel, name: t(`levels.name.${l.key}`) })}</h2>
              <span className="sub">{t('levels.cover', { pct: info.cover[mode] })}</span>
            </div>
            <p className="card-text">{t(`levels.blurb.${l.key}`)}</p>
            <LevelProgress attempts={attempts} level={sel} />
            <p className="note">{t('levels.rule')}</p>
          </section>
          <section className="card" aria-labelledby="ways-h">
            <h2 id="ways-h" className="eyebrow">{t('levels.ways')}</h2>
            <div className="way">
              <span className="way-name">{t('levels.meet')}</span>
              <span className="way-text">{t('levels.meetText')}{' '}
                {addedAt(sel, mode).map((fn, i) => (
                  <span key={fn}>{i > 0 && ', '}<a href={href('meet', { mode, id: fn })}>{fnName(fn)}</a></span>
                ))}
              </span>
            </div>
            <div className="way">
              <span className="way-name">{t('levels.drills')}</span>
              <span className="way-text">{t('levels.drillsText')}</span>
            </div>
            <div className="way">
              <span className="way-name">{t('levels.tunes')}</span>
              <span className="way-text">{t('levels.tunesText', { n: info.tunes80 })} <a href={href('tunes')}>{t('levels.toTunes')}</a></span>
            </div>
          </section>
          <Button className="button primary large" isDisabled={locked} onPress={drillNow}>
            {locked ? t('levels.lockedGo', { n: level }) : done ? t('levels.reviewGo') : now ? t('levels.continueGo', { n: sel }) : t('levels.reviewGo')}
          </Button>
          {locked && (
            <DialogTrigger>
              <Button className="button">{t('levels.unlockGo', { n: sel })}</Button>
              <ModalOverlay className="overlay" isDismissable>
                <Modal className="modal">
                  <Dialog className="dialog" role="alertdialog">
                    {({ close }) => (
                      <>
                        <Heading slot="title" className="card-title">{t('levels.unlockTitle', { n: sel })}</Heading>
                        <p className="card-text">{t('levels.unlockText', { n: sel })}</p>
                        <div className="row">
                          <Button className="button" onPress={close}>{t('about.cancel')}</Button>
                          <Button className="button primary" onPress={() => { setSetting('unlockedLevel', sel); close(); }}>{t('levels.unlockConfirm')}</Button>
                        </div>
                      </>
                    )}
                  </Dialog>
                </Modal>
              </ModalOverlay>
            </DialogTrigger>
          )}
          {skippedTo && (
            <p className="note">
              {t('levels.skippedNote', { level, earned })}{' '}
              <Button className="button small" onPress={() => setSetting('unlockedLevel', null)}>{t('levels.relock', { n: earned })}</Button>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

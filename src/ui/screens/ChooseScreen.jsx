// Choose a tune to practise (design §6, mockups/Choose.dc.html): the corpus's
// 295 choros, each with how much of it is on the learner's board; the
// sections, the key and the way of playing.

import { useState } from 'react';
import { Button, ListBox, ListBoxItem, SearchField, Input, Label } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import Segmented from '../components/Segmented.jsx';
import { sectionChoices } from '../../core/practice/sequence.js';
import { parseKey } from '../../core/theory/pitch.js';
import { composersText, sectionName, choiceName, keyName } from '../words.js';

/** The key a section starts in: the key of its first chord. */
function sectionKey(tune, i) {
  const c = tune.sections[i].phrases.flatMap((p) => tune.phrases[p].bars.flat()).find((x) => x && x.k);
  return c ? parseKey(c.k) : null;
}

/** What a choice of sections does to home, in a line. */
function choiceNote(tune, choice) {
  if (choice.kind === 'all') return t('choose.wholeNote');
  if (choice.kind === 'part') return t('choose.partNote', { name: choice.from });
  const [a, b] = choice.sections.map((i) => sectionKey(tune, i));
  const same = a && b && a.pc === b.pc && a.mode === b.mode;
  return same
    ? t('choose.joinSame', { from: choice.from, to: choice.to, key: keyName(a) })
    : t('choose.joinMove', { from: choice.from, to: choice.to, fromKey: keyName(a), toKey: keyName(b) });
}
import { href } from '../router.js';
import { tuneRun } from '../runs.js';

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function ChooseScreen() {
  const { data, level, route, navigate, setRun } = useApp();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState({ sections: null, key: 'original', play: 'name' });
  const cover = (tune) => Math.round(100 * tune.coverage[level - 1]);

  const q = fold(query.trim());
  const shown = data.tunes
    .filter((u) => filter === 'all' || u.mode === filter)
    .filter((u) => !q || fold(u.title).includes(q) || u.composers.some((c) => fold(c).includes(q)))
    .sort((a, b) => cover(b) - cover(a) || a.title.localeCompare(b.title, 'pt'));
  const selected = data.tunes.find((u) => u.id === route.params.tune) ?? shown[0] ?? null;
  // The choices are the tune's own; the first join (A → B) unless one was picked.
  const choices = selected ? sectionChoices(selected) : [];
  const choice = choices.find((c) => c.id === options.sections)
    ?? choices.find((c) => c.kind === 'join') ?? choices[0];
  const sections = choice?.id;

  const begin = () => {
    setRun(tuneRun(selected, { ...options, sections }, level));
    navigate(href('practice'));
  };

  return (
    <div className="choose-screen">
      <div className="screen-head">
        <div>
          <h1>{t('choose.title')}</h1>
          <p className="sub">{t('choose.sub', { n: data.tunes.length })}</p>
        </div>
        <div className="head-tools">
          <SearchField className="search" value={query} onChange={setQuery} aria-label={t('choose.search')}>
            <Input placeholder={t('choose.search')} />
          </SearchField>
          <Segmented label={t('choose.which')} value={filter} onChange={setFilter}
            options={[{ value: 'all', label: t('choose.all') }, { value: 'min', label: t('choose.minor') }, { value: 'maj', label: t('choose.major') }]} />
        </div>
      </div>
      {level < 4 && (
        <p className="notice">{t('choose.lowLevel', { n: level })} <a href={href('levels', { level: String(level) })}>{t('choose.toDrills')}</a></p>
      )}
      <div className="choose-body">
        <div className="tune-table">
          <div className="tune-head" aria-hidden="true">
            <span>{t('choose.colTune')}</span><span>{t('choose.colKey')}</span><span>{t('choose.colStyle')}</span>
            <span>{t('choose.colBoard')}</span><span>{t('choose.colKeys')}</span>
          </div>
          <ListBox
            aria-label={t('choose.listLabel')}
            className="tune-list"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={selected ? [selected.id] : []}
            onSelectionChange={(keys) => {
              const [id] = [...keys];
              if (id) navigate(href('tunes', { tune: id }));
            }}
            renderEmptyState={() => <p className="empty">{t('choose.none')}</p>}
          >
            {shown.map((u) => (
              <ListBoxItem key={u.id} id={u.id} className="tune-row" textValue={u.title}>
                <span className="tune-title">
                  <span className="title">{u.title}<span className="sr-only">,</span></span>
                  <span className="composer">{composersText(u.composers)}<span className="sr-only">,</span></span>
                </span>
                <span className="tune-key"><span className="sr-only">{t('choose.srKey')} </span>{u.key}<span className="sr-only">,</span></span>
                <span className="tune-genre">{u.genre ? <>{u.genre}<span className="sr-only">,</span></> : ''}</span>
                <span className="tune-fit">
                  <span className="bar"><span style={{ width: `${cover(u)}%` }} /></span>
                  <span className="pct">{cover(u)}%<span className="sr-only"> {t('choose.srBoard')},</span></span>
                </span>
                <span className="tune-keys">{u.keys}<span className="sr-only"> {t('choose.srKeys')}</span></span>
              </ListBoxItem>
            ))}
          </ListBox>
          <p className="table-foot">{t('choose.foot')}</p>
        </div>

        {selected && (
          <section className="tune-panel" aria-labelledby="selected-title">
            <div className="panel-head">
              <span className="eyebrow">{t('choose.selected')}</span>
              <h2 id="selected-title">{selected.title}</h2>
              <p className="sub">{composersText(selected.composers)}{selected.year ? ` · ${selected.year}` : ''}</p>
              <p className="sub">{selected.sections.map(sectionName).join(' ')}</p>
            </div>
            <div className="setting">
              <Label id="set-sections" className="setting-label">{t('choose.sections')}</Label>
              <Segmented label={t('choose.sections')} value={sections} onChange={(v) => setOptions({ ...options, sections: v })}
                options={choices.map((c) => ({ value: c.id, label: choiceName(c) }))} className="wrap" />
              <p className="setting-note">{choiceNote(selected, choice)}</p>
            </div>
            <div className="setting">
              <Label className="setting-label">{t('choose.key')}</Label>
              <Segmented label={t('choose.key')} value={options.key} onChange={(v) => setOptions({ ...options, key: v })}
                options={[{ value: 'original', label: t('choose.asWritten', { key: selected.key }) }, { value: 'random', label: t('choose.anyKey') }]} />
              <p className="setting-note">{options.key === 'random' ? t('choose.anyKeyNote') : t('choose.asWrittenNote')}</p>
            </div>
            <div className="setting">
              <Label className="setting-label">{t('choose.how')}</Label>
              <Segmented label={t('choose.how')} value={options.play} onChange={(v) => setOptions({ ...options, play: v })}
                options={[{ value: 'name', label: t('choose.name') }, { value: 'predict', label: t('choose.predict') }, { value: 'follow', label: t('choose.follow'), disabled: true }]} />
              <p className="setting-note">{options.play === 'predict' ? t('choose.predictNote') : t('choose.nameNote')} {t('choose.followLater')}</p>
            </div>
            <Button className="button primary large start" onPress={begin}>{t('choose.start')} →</Button>
          </section>
        )}
      </div>
    </div>
  );
}

// The core's ids and codes in words, in the current language. Chord symbols
// and note names are letters in every language, as charts write them; the
// rest comes from the message files.

import { t } from '../i18n/index.js';
import { functionParts } from '../core/theory/board.js';
import { tonicText, keyText } from '../core/theory/pitch.js';
import { chordName } from '../core/drills/drills.js';

/** `V of ii`, `ii of IV`, `#IV°`: a function as the board reads it. */
export function fnName(id) {
  if (id === 'something') return t('fn.something');
  if (!id) return '';
  const p = functionParts(id);
  return p.name ?? t('fn.of', { a: p.of, b: p.to });
}

/** `D minor`, `F major`. */
export function keyName(centre) {
  if (!centre) return '';
  return t(centre.mode === 'maj' ? 'key.major' : 'key.minor', { tonic: tonicText(centre) });
}

export { keyText };

/** The chord a function is in a key: `V of ii` in F is D7. */
export function nameIn(centre, id) {
  if (id === 'something') return t('fn.something');
  return chordName(centre, id);
}

/** A section as the form names it: `A`, `A, again`, `Intro`. */
export function sectionName(section) {
  if (!section) return '';
  const of = section.of ? (section.of.name ?? t(`section.${section.of.kind}`)) : null;
  let s;
  if (section.kind === 'part') s = section.name;
  else if (section.kind === 'again' || section.kind === 'end') s = t(`section.${section.kind}`, { of });
  else s = t(`section.${section.kind}`);
  return section.n ? `${s} ${section.n}` : s;
}

export function composersText(list) {
  return new Intl.ListFormat(document.documentElement.lang || 'en', { type: 'conjunction' }).format(list);
}

/**
 * The feedback after an answer (session.last), as a title and a line,
 * as mockups/Practice.dc.html words them.
 */
export function feedback(last) {
  if (!last) return null;
  const k = last.key;
  if (last.reason === 'move') {
    return last.moved
      ? { title: t('practice.fb.movedTitle', { key: keyName(k) }), text: t('practice.fb.movedText', { key: keyName(k) }) }
      : { title: t('practice.fb.didMoveTitle', { key: keyName(k) }), text: t('practice.fb.didMoveText', { key: keyName(k), tonic: tonicText(k) }) };
  }
  // For a chord above the learner's level, the function it really is.
  const fn = fnName(last.expected === 'something' ? last.fn : last.expected);
  const picked = last.picked ? nameIn(k, last.picked) : '';
  const pickedFn = last.picked ? fnName(last.picked) : '';
  const p = { sym: last.sym, fn, picked, pickedFn, next: last.nextSym ?? '', bar: last.bar };
  if (last.reason === 'shown') return { title: t('practice.fb.itWas', p), text: t('practice.fb.shown') };
  if (last.kind === 'right') {
    if (last.expected === 'something') return { title: t('practice.fb.rightSomething', p), text: t('practice.fb.rightSomethingText', p) };
    return { title: t('practice.fb.right', p), text: t('practice.fb.rightText') };
  }
  if (last.kind === 'another') {
    if (last.reason === 'alt') return { title: t('practice.fb.alt', p), text: t('practice.fb.altText', p) };
    if (last.reason === 'job') return { title: t('practice.fb.job', p), text: last.prepares ? t('practice.fb.jobPrepares') : t('practice.fb.jobLeads', p) };
    if (last.reason === 'skip') return { title: t('practice.fb.skip', p), text: t('practice.fb.skipText', p) };
    return { title: t('practice.fb.path', p), text: t('practice.fb.pathText', p) };
  }
  if (last.expected === 'something') return { title: t('practice.fb.itWasSomething', p), text: t('practice.fb.itWasSomethingText', p) };
  if (last.picked === 'something') return { title: t('practice.fb.itWas', p), text: t('practice.fb.notSomething', p) };
  if (last.reason === 'arrival') return { title: t('practice.fb.itWas', p), text: t('practice.fb.arrival', p) };
  return { title: t('practice.fb.itWas', p), text: t(last.heard ? 'practice.fb.missHeard' : 'practice.fb.miss', p) };
}

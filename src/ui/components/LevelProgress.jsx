// How far a level is from done: each chord it adds, in major and in minor,
// with how close it is to mastered (17 right of its last 20, in 3 keys).

import { t } from '../../i18n/index.js';
import { levelProgress, NEEDED, KEYS_NEEDED } from '../../core/levels/progress.js';
import { TOP_LEVEL } from '../../core/levels/levels.js';
import { fnName } from '../words.js';

export default function LevelProgress({ attempts, level, compact = false }) {
  const items = levelProgress(attempts, level);
  const left = items.filter((x) => !x.mastered).length;
  const title = level < TOP_LEVEL ? t('progress.toUnlock', { n: level + 1 }) : t('progress.topLevel');
  return (
    <section className={`level-progress ${compact ? 'compact' : ''}`} aria-label={title}>
      <div className="progress-head">
        <span className="eyebrow">{title}</span>
        <span className="progress-left">{left ? t('progress.left', { count: left }) : t('progress.allDone')}</span>
      </div>
      <ul>
        {items.map((x) => (
          <li key={`${x.mode}:${x.fn}`} className={x.mastered ? 'is-done' : ''}>
            <span className="p-fn">{fnName(x.fn)} <span className="p-mode">{t(`review.modeWord.${x.mode}`)}</span></span>
            <span className="bar" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round((100 * x.ok) / NEEDED))}%` }} /></span>
            <span className="p-text">
              {x.mastered ? t('progress.mastered') : t('progress.counts', { ok: Math.min(x.ok, NEEDED), needed: NEEDED, keys: Math.min(x.keys, KEYS_NEEDED), keysNeeded: KEYS_NEEDED })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

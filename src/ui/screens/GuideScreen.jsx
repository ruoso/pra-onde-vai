// The landing page: what the app is for, how its parts fit, how answers are
// marked, where to start, and how to install it.

import { t } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import { href } from '../router.js';
import { InstallCard } from '../components/Install.jsx';

function Part({ id, title, children, to, go }) {
  return (
    <section className="card guide-part" aria-labelledby={`guide-${id}`}>
      <h2 id={`guide-${id}`} className="card-title">{title}</h2>
      {children}
      <a className="button primary guide-go" href={to}>{go} →</a>
    </section>
  );
}

export default function GuideScreen() {
  const { level, data } = useApp();
  const p = (key, params) => <p className="card-text">{t(key, params)}</p>;
  return (
    <div className="guide-screen">
      <header className="guide-head">
        <h1>{t('app.name')}</h1>
        <p className="tagline">{t('guide.tagline')}</p>
        <p className="card-text guide-idea">{t('guide.idea')}</p>
      </header>

      <div className="guide-parts">
        <Part id="map" title={t('guide.map.title')} to={href('map')} go={t('guide.map.go')}>
          {p('guide.map.text')}
          {p('guide.map.home')}
        </Part>
        <Part id="listen" title={t('guide.listen.title')} to={href('listen')} go={t('guide.listen.go')}>
          {p('guide.listen.text')}
        </Part>
        <Part id="tunes" title={t('guide.tunes.title')} to={href('tunes')} go={t('guide.tunes.go')}>
          {p('guide.tunes.text', { n: data.tunes.length })}
          <ul className="guide-list">
            <li><strong>{t('choose.name')}</strong> — {t('guide.tunes.name')}</li>
            <li><strong>{t('choose.predict')}</strong> — {t('guide.tunes.predict')}</li>
          </ul>
        </Part>
        <Part id="levels" title={t('guide.levels.title')} to={href('levels', { level: String(level) })} go={t('guide.levels.go', { n: level })}>
          {p('guide.levels.text')}
          <ul className="guide-list">
            <li><strong>{t('levels.drills')}</strong> — {t('guide.levels.drills')}</li>
            <li><strong>{t('levels.meet')}</strong> — {t('guide.levels.meet')}</li>
            <li>{t('guide.levels.unlock')}</li>
          </ul>
        </Part>
      </div>

      <div className="guide-bottom">
        <section className="card" aria-labelledby="guide-marks">
          <h2 id="guide-marks" className="card-title">{t('guide.marks.title')}</h2>
          <ul className="guide-list marks">
            <li><span className="s-right">✓</span> {t('guide.marks.right')}</li>
            <li><span className="s-another">≈</span> {t('guide.marks.another')}</li>
            <li><span className="s-miss">×</span> {t('guide.marks.miss')}</li>
          </ul>
          {p('guide.marks.arrival')}
        </section>
        <section className="card guide-start" aria-labelledby="guide-start">
          <h2 id="guide-start" className="card-title">{t('guide.start.title')}</h2>
          {p('guide.start.text')}
          <p className="note">{t('guide.credits')} <a href={href('about')}>{t('guide.about')}</a></p>
        </section>
      </div>
      <InstallCard />
    </div>
  );
}

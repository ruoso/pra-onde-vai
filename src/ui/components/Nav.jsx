// The way between screens: the map, the listening help, the tunes, the levels,
// and the credits and settings.

import { t } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import { href } from '../router.js';

const ITEMS = [
  ['guide', ['guide']],
  ['map', ['map']],
  ['listen', ['listen']],
  ['tunes', ['tunes', 'practice', 'review']],
  ['levels', ['levels', 'meet']],
  ['about', ['about']],
];

export default function Nav() {
  const { route, level } = useApp();
  const here = route.name === 'start' ? 'guide' : route.name;
  return (
    <header className="nav">
      <a className="skip" href="#main">{t('nav.skip')}</a>
      <span className="wordmark">{t('app.name')}</span>
      <nav aria-label={t('nav.label')}>
        <ul>
          {ITEMS.map(([name, covers]) => (
            <li key={name}>
              <a href={href(name)} aria-current={covers.includes(here) ? 'page' : undefined}>
                {t(`nav.${name}`)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <a className="nav-level" href={href('levels', { level: String(level) })}>{t('nav.level', { n: level })}</a>
    </header>
  );
}

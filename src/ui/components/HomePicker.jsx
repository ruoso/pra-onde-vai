// Where is home? The map starts here: the 24 keys as their home chords,
// by fifths, spelled as charts spell them. Not knowing is fine: the
// listening screen is there to find it by ear.

import { Button } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { parseKey } from '../../core/theory/pitch.js';
import { keyName } from '../words.js';
import { href } from '../router.js';

export const MAJOR_HOMES = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
export const MINOR_HOMES = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

export default function HomePicker({ onPick }) {
  const row = (list, label) => (
    <div className="home-row" role="group" aria-label={label}>
      {list.map((text) => {
        const key = parseKey(text);
        return (
          <Button key={text} className="home-key-button" onPress={() => onPick(key, text)} aria-label={`${text}, ${keyName(key)}`}>
            {text}
          </Button>
        );
      })}
    </div>
  );
  return (
    <section className="home-picker" aria-labelledby="home-picker-h">
      <h1 id="home-picker-h">{t('map.askTitle')}</h1>
      <p className="sub">{t('map.askText')}</p>
      <span className="eyebrow">{t('map.askMajor')}</span>
      {row(MAJOR_HOMES, t('map.askMajor'))}
      <span className="eyebrow">{t('map.askMinor')}</span>
      {row(MINOR_HOMES, t('map.askMinor'))}
      <a className="button amber large find-by-ear" href={href('listen')}>{t('map.askListen')} →</a>
    </section>
  );
}

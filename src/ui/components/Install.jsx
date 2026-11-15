// Installing the app, and the notices about it: ready offline, and a new
// version waiting.

import { useSyncExternalStore } from 'react';
import { Button } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { subscribe, getState, install, applyUpdate, dismissOffline } from '../../pwa/pwa.js';

export function usePwa() {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** How to install, for the browser in hand: its prompt, the iOS steps, or the menu. */
export function InstallCard() {
  const pwa = usePwa();
  return (
    <section className="card install" aria-labelledby="install-h">
      <h2 id="install-h" className="card-title">{t('install.title')}</h2>
      {pwa.installed ? (
        <p className="card-text">{t('install.installed')}</p>
      ) : (
        <>
          <p className="card-text">{t('install.why')}</p>
          {pwa.canInstall && <Button className="button primary" onPress={() => install()}>{t('install.button')}</Button>}
          {!pwa.canInstall && pwa.platform === 'ios' && (
            <ol className="install-steps">
              <li>{t('install.ios1')}</li>
              <li>{t('install.ios2')}</li>
              <li>{t('install.ios3')}</li>
            </ol>
          )}
          {!pwa.canInstall && pwa.platform !== 'ios' && <p className="card-text">{t('install.menu')}</p>}
        </>
      )}
    </section>
  );
}

/** A new version waiting, or the app now ready to work offline. */
export function PwaNotices() {
  const pwa = usePwa();
  if (pwa.updateReady) {
    return (
      <div className="pwa-notice" role="status">
        <span>{t('install.update')}</span>
        <Button className="button primary small" onPress={() => applyUpdate()}>{t('install.reload')}</Button>
      </div>
    );
  }
  if (pwa.offlineReady) {
    return (
      <div className="pwa-notice" role="status">
        <span>{t('install.offline')}</span>
        <Button className="button small" onPress={() => dismissOffline()}>{t('install.ok')}</Button>
      </div>
    );
  }
  return null;
}

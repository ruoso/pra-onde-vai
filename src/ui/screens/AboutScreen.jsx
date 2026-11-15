// About and settings: the credits the corpus's licence asks for (design
// §3.1), the licences, the language, how practice sounds, and resetting
// progress.

import { useState } from 'react';
import { Button, Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { t, LOCALES } from '../../i18n/index.js';
import { useApp } from '../AppContext.jsx';
import Segmented from '../components/Segmented.jsx';

export default function AboutScreen() {
  const { data, settings, setSetting, resetProgress, attempts, persistent } = useApp();
  const [cleared, setCleared] = useState(false);
  return (
    <div className="about-screen">
      <div className="screen-head">
        <div>
          <h1>{t('about.title')}</h1>
          <p className="sub">{t('about.sub')}</p>
        </div>
      </div>
      <div className="about-body">
        <section className="card" aria-labelledby="credits-h">
          <h2 id="credits-h" className="card-title">{t('about.creditsTitle')}</h2>
          <p className="card-text">{t('about.corpus', { n: data.tunes.length })}</p>
          <p className="card-text">
            <a href="https://github.com/DCMLab/choro" rel="noreferrer" target="_blank">github.com/DCMLab/choro</a>
          </p>
          <p className="card-text">{t('about.songbook')}</p>
          <p className="card-text">{t('about.dataLicence')}{' '}
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" rel="noreferrer" target="_blank">CC BY-NC-SA 4.0</a>
          </p>
          <p className="card-text">{t('about.codeLicence')}</p>
          <p className="card-text">{t('about.fonts')}</p>
        </section>

        <section className="card" aria-labelledby="settings-h">
          <h2 id="settings-h" className="card-title">{t('about.settingsTitle')}</h2>
          <div className="setting">
            <span className="setting-label" id="lang-label">{t('about.language')}</span>
            <Segmented label={t('about.language')} value={settings.language ?? 'auto'} onChange={(v) => setSetting('language', v === 'auto' ? null : v)}
              options={[{ value: 'auto', label: t('about.automatic') }, ...LOCALES.map((l) => ({ value: l.id, label: l.name }))]} className="wrap" />
          </div>
          <div className="setting">
            <span className="setting-label">{t('about.speed')}</span>
            <Segmented label={t('about.speed')} value={settings.speed} onChange={(v) => setSetting('speed', v)}
              options={['slow', 'normal', 'fast'].map((v) => ({ value: v, label: t(`about.speeds.${v}`) }))} />
          </div>
          <div className="setting">
            <span className="setting-label">{t('about.hints')}</span>
            <Segmented label={t('about.hints')} value={settings.hints ? 'on' : 'off'} onChange={(v) => setSetting('hints', v === 'on')}
              options={[{ value: 'on', label: t('about.on') }, { value: 'off', label: t('about.off') }]} />
            <p className="setting-note">{t('about.hintsNote')}</p>
          </div>
          <div className="setting">
            <span className="setting-label">{t('about.progress')}</span>
            <p className="setting-note">{persistent ? t('about.kept', { count: attempts.length }) : t('about.notKept')}</p>
            <DialogTrigger>
              <Button className="button danger" isDisabled={!attempts.length}>{t('about.reset')}</Button>
              <ModalOverlay className="overlay" isDismissable>
                <Modal className="modal">
                  <Dialog className="dialog" role="alertdialog">
                    {({ close }) => (
                      <>
                        <Heading slot="title" className="card-title">{t('about.resetTitle')}</Heading>
                        <p className="card-text">{t('about.resetText')}</p>
                        <div className="row">
                          <Button className="button" onPress={close}>{t('about.cancel')}</Button>
                          <Button className="button danger" onPress={async () => { await resetProgress(); setCleared(true); close(); }}>{t('about.resetConfirm')}</Button>
                        </div>
                      </>
                    )}
                  </Dialog>
                </Modal>
              </ModalOverlay>
            </DialogTrigger>
            {cleared && <p className="setting-note" role="status">{t('about.cleared')}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

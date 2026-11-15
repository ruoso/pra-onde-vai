// The app: loads the tunes and the learner's progress, keeps what the screens
// share, and shows the screen the address names.

import { useCallback, useEffect, useMemo, useState } from 'react';
import LocaleRoot from '../i18n/LocaleRoot.jsx';
import { t } from '../i18n/index.js';
import { AppContext } from './AppContext.jsx';
import { parseRoute } from './router.js';
import { openStore } from '../storage/db.js';
import { loadData } from '../data/load.js';
import { currentLevel } from '../core/levels/progress.js';
import { TOP_LEVEL } from '../core/levels/levels.js';
import { setDetune } from '../audio/synth.js';
import Nav from './components/Nav.jsx';
import MapScreen from './screens/MapScreen.jsx';
import ListenScreen from './screens/ListenScreen.jsx';
import ChooseScreen from './screens/ChooseScreen.jsx';
import PracticeScreen from './screens/PracticeScreen.jsx';
import ReviewScreen from './screens/ReviewScreen.jsx';
import LevelsScreen from './screens/LevelsScreen.jsx';
import MeetScreen from './screens/MeetScreen.jsx';
import AboutScreen from './screens/AboutScreen.jsx';
import GuideScreen from './screens/GuideScreen.jsx';
import { PwaNotices } from './components/Install.jsx';

export const DEFAULT_SETTINGS = { language: null, hints: true, speed: 'normal', mapScope: 'all', cents: 0, unlockedLevel: null, guided: false };

const SCREENS = {
  guide: GuideScreen, map: MapScreen, listen: ListenScreen, tunes: ChooseScreen, practice: PracticeScreen,
  review: ReviewScreen, levels: LevelsScreen, meet: MeetScreen, about: AboutScreen,
};

export default function App({ store: givenStore = null, data: givenData = null }) {
  const [store, setStore] = useState(givenStore);
  const [data, setData] = useState(givenData);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [attempts, setAttempts] = useState([]);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [map, setMap] = useState(null);
  const [run, setRun] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const s = givenStore ?? (await openStore());
      const [saved, done] = await Promise.all([s.getSettings(), s.attempts()]);
      if (!live) return;
      setStore(s);
      setSettings({ ...DEFAULT_SETTINGS, ...saved });
      setAttempts(done);
      setReady(true);
    })().catch(() => setFailed(true));
    return () => { live = false; };
  }, [givenStore]);

  useEffect(() => {
    if (data) return undefined;
    let live = true;
    loadData().then((d) => { if (live) setData(d); }).catch(() => setFailed(true));
    return () => { live = false; };
  }, [data]);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { setDetune(settings.cents ?? 0); }, [settings.cents]);

  // The bare address opens the guide the first time: go to its own address,
  // so the guide stays put once it has marked itself seen.
  useEffect(() => {
    // The hashchange listener takes the route from there.
    if (ready && route.name === 'start' && !settings.guided) window.location.replace('#/guide');
  }, [ready, route.name, settings.guided]);

  const setSetting = useCallback((key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    store?.setSetting(key, value);
  }, [store]);

  const addAttempts = useCallback((list) => {
    if (!list.length) return;
    setAttempts((a) => [...a, ...list]);
    store?.addAttempts(list);
  }, [store]);

  const resetProgress = useCallback(async () => {
    await store?.clearProgress();
    setAttempts([]);
  }, [store]);

  const navigate = useCallback((hash) => {
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute(parseRoute(hash));
  }, []);

  // The level earned by mastery, or a higher one the learner unlocked to move
  // ahead (a setting, kept on the device).
  const earned = useMemo(() => currentLevel(attempts), [attempts]);
  const level = Math.max(earned, Math.min(TOP_LEVEL, settings.unlockedLevel ?? 1));

  const value = useMemo(() => ({
    data, settings, setSetting, attempts, addAttempts, resetProgress, level, earned, route, navigate,
    map, setMap, run, setRun, persistent: store?.persistent ?? false,
  }), [data, settings, setSetting, attempts, addAttempts, resetProgress, level, earned, route, navigate, map, run, store]);

  // The bare address is the map, once the guide has been seen (above).
  const Screen = route.name === 'start' ? (settings.guided ? MapScreen : GuideScreen) : SCREENS[route.name] ?? MapScreen;
  return (
    <LocaleRoot language={settings.language}>
      <AppContext.Provider value={value}>
        <div className="app">
          <Nav />
          <PwaNotices />
          <main className="screen" id="main">
            {failed ? (
              <p className="status" role="alert">{t('app.failed')}</p>
            ) : !ready || !data ? (
              <p className="status" role="status">{t('app.loading')}</p>
            ) : (
              <Screen />
            )}
          </main>
        </div>
      </AppContext.Provider>
    </LocaleRoot>
  );
}

// What every screen shares: the tune data, the settings, the learner's
// progress, the map's state and the run in progress.

import { createContext, useContext } from 'react';

export const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside the app');
  return ctx;
}

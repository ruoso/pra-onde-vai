// The locale root: the one component that makes the app speak the chosen
// language and change it live (as Estante's LocaleRoot does). The policy is
// the pure `resolveLocale`; this only makes the result current, carries it on
// <html lang>, and remounts the tree under a key so every t() re-reads.

import { Fragment, useEffect } from 'react';
import { resolveLocale, setLocale } from './index.js';

export default function LocaleRoot({ language, children }) {
  const locale = resolveLocale(language);
  // Current during render, so the first paint under the new key is already
  // in the right language.
  setLocale(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <Fragment key={locale}>{children}</Fragment>;
}

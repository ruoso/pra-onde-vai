// The languages (docs/implementation-plan.md, "Languages"), as Estante tests
// them: every language has exactly English's keys and the same placeholders,
// and translates rather than copies.

import { describe, it, expect, afterEach } from 'vitest';
import { LOCALES, LOCALE_IDS, DEFAULT_LOCALE, t, tr, setLocale, detectLocale, resolveLocale, hasMessage } from './index.js';
import en from './locales/en.js';

afterEach(() => setLocale(DEFAULT_LOCALE));

function leaves(node, prefix = []) {
  if (node === null || typeof node !== 'object') return [prefix.join('.')];
  return Object.entries(node).flatMap(([key, value]) => leaves(value, [...prefix, key]));
}
const PLURAL = /\.(zero|one|two|few|many|other)$/;
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const leafValue = (node, path) => path.split('.').reduce((n, seg) => (n == null ? undefined : n[seg]), node);
const collapse = (paths) => [...new Set(paths.map((p) => p.replace(PLURAL, '')))].sort();

describe('the languages', () => {
  it('are English, Brazilian Portuguese, Latin American Spanish and Italian, as in Estante', () => {
    expect(LOCALE_IDS).toEqual(['en', 'pt-BR', 'es-419', 'it']);
    expect(DEFAULT_LOCALE).toBe('en');
    expect(LOCALES.map((l) => l.name)).toEqual(['English', 'Português (Brasil)', 'Español (Latinoamérica)', 'Italiano']);
  });

  for (const locale of LOCALES.filter((l) => l.id !== 'en')) {
    describe(locale.id, () => {
      it('has every key English has, and no others', () => {
        expect(collapse(leaves(locale.messages))).toEqual(collapse(leaves(en)));
      });

      it('uses the same placeholders as English in every string', () => {
        for (const path of leaves(en)) {
          if (PLURAL.test(path)) continue;
          const ours = leafValue(en, path);
          const theirs = leafValue(locale.messages, path);
          expect(placeholders(theirs), path).toEqual(placeholders(ours));
        }
      });

      it('gives every plural the forms its language needs, with the same placeholders', () => {
        for (const path of collapse(leaves(en).filter((p) => PLURAL.test(p)))) {
          const forms = leafValue(locale.messages, path);
          expect(forms.other, path).toBeTruthy();
          const want = placeholders(leafValue(en, `${path}.other`));
          for (const text of Object.values(forms)) expect(placeholders(text).every((p) => want.includes(p)), path).toBe(true);
        }
      });

      it('translates rather than copies, for the bulk of the strings', () => {
        const paths = leaves(en).filter((p) => typeof leafValue(en, p) === 'string');
        const same = paths.filter((p) => leafValue(en, p) === leafValue(locale.messages, p));
        // The app's name, numerals and placeholders alone are the same everywhere.
        expect(same.length / paths.length).toBeLessThan(0.08);
      });
    });
  }
});

describe('lookup', () => {
  it('interpolates, and leaves an unknown placeholder visible', () => {
    expect(t('key.minor', { tonic: 'D' })).toBe('D minor');
    expect(t('key.minor', {})).toBe('{tonic} minor');
  });

  it('chooses the plural form by count, in the language in force', () => {
    expect(t('about.kept', { count: 1 })).toBe('Kept on this device: 1 answer.');
    expect(t('about.kept', { count: 3 })).toBe('Kept on this device: 3 answers.');
    setLocale('pt-BR');
    expect(t('about.kept', { count: 3 })).toMatch(/3/);
  });

  it('shows the key rather than nothing for a missing string', () => {
    expect(t('no.such.key')).toBe('no.such.key');
    expect(hasMessage('no.such.key')).toBe(false);
    expect(tr('nav')).toBeTruthy();
  });

  it('names the app Pra Onde Vai in every language', () => {
    for (const id of LOCALE_IDS) {
      setLocale(id);
      expect(t('app.name'), id).toBe('Pra Onde Vai');
    }
  });

  it('leaves chord symbols and numerals alone: the V of ii reads with its letters in every language', () => {
    for (const id of LOCALE_IDS) {
      setLocale(id);
      const text = t('fn.of', { a: 'V', b: 'ii' });
      expect(text, id).toMatch(/^V .+ ii$/);
    }
  });
});

describe('choosing the language', () => {
  it('follows the browser by primary subtag until one is chosen', () => {
    expect(detectLocale(['pt-PT', 'en'])).toBe('pt-BR');
    expect(detectLocale(['es-ES'])).toBe('es-419');
    expect(detectLocale(['de-DE'])).toBe('en');
    expect(resolveLocale(null, ['it-IT'])).toBe('it');
    expect(resolveLocale('pt-BR', ['it-IT'])).toBe('pt-BR');
    expect(resolveLocale('xx', ['it-IT'])).toBe('it');
  });
});

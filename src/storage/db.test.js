import { describe, it, expect } from 'vitest';
import { openStore } from './db.js';

let n = 0;
const fresh = () => openStore(`test-${n++}`);

describe('the store', () => {
  it('keeps settings across openings', async () => {
    const name = `test-keep-${n++}`;
    const a = await openStore(name);
    expect(a.persistent).toBe(true);
    await a.setSetting('language', 'pt-BR');
    await a.setSetting('hints', false);
    a.close();
    const b = await openStore(name);
    expect(await b.getSettings()).toEqual({ language: 'pt-BR', hints: false });
    b.close();
  });

  it('keeps attempts in order, and forgets them when progress is reset', async () => {
    const s = await fresh();
    await s.addAttempts([{ mode: 'maj', fn: 'V', ok: true, key: 'C', at: 1 }, { mode: 'maj', fn: 'I', ok: false, key: 'C', at: 2 }]);
    await s.addAttempts([{ mode: 'min', fn: 'i', ok: true, key: 'Dm', at: 3 }]);
    expect((await s.attempts()).map((a) => a.fn)).toEqual(['V', 'I', 'i']);
    await s.clearProgress();
    expect(await s.attempts()).toEqual([]);
    expect((await s.getSettings())).toEqual({});
  });

  it('works for the session with no IndexedDB', async () => {
    const saved = globalThis.indexedDB;
    globalThis.indexedDB = undefined;
    try {
      const s = await openStore();
      expect(s.persistent).toBe(false);
      await s.setSetting('hints', true);
      await s.addAttempts([{ fn: 'V' }]);
      expect(await s.getSettings()).toEqual({ hints: true });
      expect(await s.attempts()).toHaveLength(1);
    } finally {
      globalThis.indexedDB = saved;
    }
  });
});

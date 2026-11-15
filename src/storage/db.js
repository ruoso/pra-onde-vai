// Progress and settings, kept on the device in IndexedDB (no account, no
// server). Attempts are what mastery is computed from (core/levels/
// progress.js); settings are the language, the hints and the like. With no
// IndexedDB (a private window that blocks it), everything works for the
// session and is forgotten after.

const NAME = 'pra-onde-vai';
const VERSION = 1;

function request(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function memoryStore() {
  const settings = new Map();
  const attempts = [];
  return {
    persistent: false,
    async getSettings() { return Object.fromEntries(settings); },
    async setSetting(key, value) { settings.set(key, value); },
    async addAttempts(list) { attempts.push(...list); },
    async attempts() { return [...attempts]; },
    async clearProgress() { attempts.length = 0; },
    close() {},
  };
}

/** Opens the store; falls back to memory when IndexedDB cannot be used. */
export async function openStore(name = NAME) {
  const idb = globalThis.indexedDB;
  if (!idb) return memoryStore();
  let db;
  try {
    const open = idb.open(name, VERSION);
    open.onupgradeneeded = () => {
      const d = open.result;
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('attempts')) d.createObjectStore('attempts', { autoIncrement: true });
    };
    db = await request(open);
  } catch {
    return memoryStore();
  }
  return {
    persistent: true,
    async getSettings() {
      const rows = await request(db.transaction('settings').objectStore('settings').getAll());
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    },
    async setSetting(key, value) {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key, value });
      await done(tx);
    },
    async addAttempts(list) {
      if (!list.length) return;
      const tx = db.transaction('attempts', 'readwrite');
      const store = tx.objectStore('attempts');
      for (const a of list) store.add(a);
      await done(tx);
    },
    async attempts() {
      return request(db.transaction('attempts').objectStore('attempts').getAll());
    },
    async clearProgress() {
      const tx = db.transaction('attempts', 'readwrite');
      tx.objectStore('attempts').clear();
      await done(tx);
    },
    close() { db.close(); },
  };
}

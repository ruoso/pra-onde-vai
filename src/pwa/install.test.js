// The installed app's state, with fake browser objects: the install offer,
// iPhone and iPad, an installed app, ready offline, and an update.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initPwa, getState, install, applyUpdate, platformOf, resetPwa, dismissOffline } from './pwa.js';

class Target {
  constructor() { this.handlers = {}; }
  addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); }
  emit(type, e = {}) { for (const fn of this.handlers[type] ?? []) fn(e); }
}

function browser({ ua = 'Mozilla/5.0 (Linux; Android 14) Chrome/130', standalone = false, controller = null, reg = null } = {}) {
  const win = new Target();
  win.matchMedia = () => ({ matches: standalone });
  win.location = { reload: vi.fn() };
  win.document = new Target();
  const sw = new Target();
  sw.controller = controller;
  sw.register = vi.fn(async () => reg);
  const nav = { userAgent: ua, maxTouchPoints: 5, serviceWorker: sw, storage: { persist: vi.fn(async () => true) } };
  return { win, nav };
}

function registration({ waiting = null, active = null } = {}) {
  const r = new Target();
  r.waiting = waiting;
  r.active = active;
  r.installing = null;
  r.update = vi.fn(async () => {});
  return r;
}

beforeEach(() => resetPwa());

describe('installing', () => {
  it('offers the browser’s install prompt when it has one, and knows when it is accepted', async () => {
    const { win, nav } = browser();
    await initPwa({ win, nav, base: '/pra-onde-vai/', register: false });
    expect(getState()).toMatchObject({ canInstall: false, installed: false, platform: 'other' });
    const offer = { preventDefault: vi.fn(), prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
    win.emit('beforeinstallprompt', offer);
    expect(offer.preventDefault).toHaveBeenCalled();
    expect(getState().canInstall).toBe(true);
    expect(await install()).toBe(true);
    expect(offer.prompt).toHaveBeenCalled();
    expect(getState()).toMatchObject({ canInstall: false, installed: true });
  });

  it('knows an app opened from the home screen is installed, and asks to keep its data', async () => {
    const { win, nav } = browser({ standalone: true });
    await initPwa({ win, nav, register: false });
    expect(getState().installed).toBe(true);
    expect(nav.storage.persist).toHaveBeenCalled();
    win.emit('appinstalled');
    expect(getState().installed).toBe(true);
  });

  it('tells iPhones and iPads apart, an iPad that calls itself a Mac included', () => {
    expect(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios');
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605', 5)).toBe('ios');
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605', 0)).toBe('other');
    expect(platformOf('Mozilla/5.0 (Linux; Android 14)')).toBe('other');
  });
});

describe('the service worker', () => {
  it('registers under the Pages path, and says when the app is first ready offline', async () => {
    const reg = registration();
    const { win, nav } = browser({ reg });
    await initPwa({ win, nav, base: '/pra-onde-vai/' });
    expect(nav.serviceWorker.register).toHaveBeenCalledWith('/pra-onde-vai/sw.js', { scope: '/pra-onde-vai/' });
    const worker = new Target();
    reg.installing = worker;
    reg.emit('updatefound');
    worker.state = 'installed';
    worker.emit('statechange');
    expect(getState()).toMatchObject({ offlineReady: true, updateReady: false });
    dismissOffline();
    expect(getState().offlineReady).toBe(false);
  });

  it('says when an update is waiting, and moves to it on request, reloading once it controls the page', async () => {
    const waiting = { postMessage: vi.fn() };
    const reg = registration({ waiting, active: {} });
    const { win, nav } = browser({ reg, controller: {} });
    await initPwa({ win, nav, base: '/' });
    expect(getState().updateReady).toBe(true);
    applyUpdate();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(win.location.reload).not.toHaveBeenCalled();
    nav.serviceWorker.emit('controllerchange');
    expect(win.location.reload).toHaveBeenCalled();
  });

  it('looks for an update when the app comes back to the foreground', async () => {
    const reg = registration({ active: {} });
    const { win, nav } = browser({ reg, controller: {} });
    await initPwa({ win, nav });
    win.document.visibilityState = 'visible';
    win.document.emit('visibilitychange');
    expect(reg.update).toHaveBeenCalled();
  });
});

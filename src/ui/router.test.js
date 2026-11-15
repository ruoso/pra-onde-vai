import { describe, it, expect } from 'vitest';
import { parseRoute, href } from './router.js';

describe('routes', () => {
  it('read every screen’s address, and fall back to the map', () => {
    expect(parseRoute('')).toEqual({ name: 'map', params: {} });
    expect(parseRoute('#/map')).toEqual({ name: 'map', params: {} });
    expect(parseRoute('#/tunes/cochichando')).toEqual({ name: 'tunes', params: { tune: 'cochichando' } });
    expect(parseRoute('#/levels/3')).toEqual({ name: 'levels', params: { level: '3' } });
    expect(parseRoute('#/meet/maj/V%2Fii')).toEqual({ name: 'meet', params: { mode: 'maj', id: 'V/ii' } });
    expect(parseRoute('#/nowhere')).toEqual({ name: 'map', params: {} });
  });

  it('write addresses that read back the same', () => {
    for (const [name, params] of [['tunes', { tune: 'tico-tico-no-fuba' }], ['levels', { level: '7' }], ['meet', { mode: 'min', id: '#IV°' }], ['about', {}]]) {
      expect(parseRoute(href(name, params))).toEqual({ name, params });
    }
  });
});

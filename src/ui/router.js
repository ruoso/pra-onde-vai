// Hash routes, so every screen has an address that works on GitHub Pages and
// offline with no server rewrites: #/map, #/tunes/cochichando, #/levels/3.
// The bare address is `start`, which lands on the guide.

const ROUTES = [
  ['start', /^\/?$/],
  ['guide', /^\/guide$/],
  ['map', /^\/map$/],
  ['listen', /^\/listen$/],
  ['tunes', /^\/tunes(?:\/([^/]+))?$/, ['tune']],
  ['practice', /^\/practice$/],
  ['review', /^\/review$/],
  ['levels', /^\/levels(?:\/(\d))?$/, ['level']],
  ['meet', /^\/meet\/(maj|min)\/(.+)$/, ['mode', 'id']],
  ['about', /^\/about$/],
];

export function parseRoute(hash) {
  const path = decodeURIComponent(String(hash ?? '').replace(/^#/, ''));
  for (const [name, re, keys = []] of ROUTES) {
    const m = re.exec(path);
    if (m) {
      const params = {};
      keys.forEach((k, i) => { if (m[i + 1] !== undefined) params[k] = m[i + 1]; });
      return { name, params };
    }
  }
  return { name: 'map', params: {} };
}

export function href(name, params = {}) {
  switch (name) {
    case 'tunes': return params.tune ? `#/tunes/${encodeURIComponent(params.tune)}` : '#/tunes';
    case 'levels': return params.level ? `#/levels/${params.level}` : '#/levels';
    case 'meet': return `#/meet/${params.mode}/${encodeURIComponent(params.id)}`;
    case 'map': return '#/map';
    default: return `#/${name}`;
  }
}

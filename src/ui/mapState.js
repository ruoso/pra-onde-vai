// The map's state once home is known: the homes so far (a trail back), the
// chord last tapped, and what was played. Until home is chosen the map's
// state is null, and the map asks where home is: it never assumes one.

export function initialMap(key) {
  return { centres: [{ key, rel: 'home' }], current: null, moved: false, trail: [] };
}

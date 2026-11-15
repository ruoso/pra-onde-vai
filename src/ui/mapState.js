// The map's state once home is known: the homes so far (a trail back), the
// chord last tapped, what was played (the trail shows the last few, with the
// changes of home; `played` keeps every chord, to play it back). Until home is chosen the map's
// state is null, and the map asks where home is: it never assumes one.

export function initialMap(key) {
  return { centres: [{ key, rel: 'home' }], current: null, moved: false, trail: [], played: [] };
}

/** Start over in the first home: nothing played, no change of home. */
export function resetMap(map) {
  return initialMap(map.centres[0].key);
}

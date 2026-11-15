// The map's state once home is known: the homes so far (a trail back), and a
// log of what happened — each chord tapped, and each change of home with the
// homes before it. The chord lit as "current", whether home just moved, the
// strip of what was played and Play back are all read from the log, so a
// chord can be taken out of it, and the last step undone, home changes too.
// Until home is chosen the map's state is null: it never assumes a home.

export function initialMap(key) {
  return { centres: [{ key, rel: 'home' }], log: [], next: 1 };
}

/** Start over in the first home: nothing played, no change of home. */
export function resetMap(map) {
  return initialMap(map.centres[0].key);
}

export function centreOf(map) {
  return map.centres[map.centres.length - 1].key;
}

export function addChord(map, fn, sym) {
  return { ...map, log: [...map.log, { id: map.next, kind: 'chord', fn, sym }], next: map.next + 1 };
}

/**
 * A change of home: the homes after it, the chord then current (the new
 * home's tonic, or none when going back), and whether to say home has moved.
 */
export function changeHome(map, centres, { current = null, moved = true } = {}) {
  const entry = { id: map.next, kind: 'home', before: map.centres, key: centres[centres.length - 1].key, current, moved };
  return { ...map, centres, log: [...map.log, entry], next: map.next + 1 };
}

/** The chord lit as the one you are on: the last chord since the last change of home. */
export function currentOf(map) {
  const last = map.log[map.log.length - 1];
  if (!last) return null;
  return last.kind === 'chord' ? last.fn : last.current;
}

/** Whether home has just moved (the last step was a change of home that says so). */
export function movedOf(map) {
  const last = map.log[map.log.length - 1];
  return !!last && last.kind === 'home' && last.moved;
}

/** The chords played, in order, for Play back. */
export function playedOf(map) {
  return map.log.filter((e) => e.kind === 'chord').map((e) => e.sym);
}

/** Take one chord out of what was played. Changes of home are undone, not removed. */
export function removeChord(map, id) {
  return { ...map, log: map.log.filter((e) => e.id !== id || e.kind !== 'chord') };
}

/** Undo the last step: a chord comes out; a change of home goes back to the homes before it. */
export function undo(map) {
  const last = map.log[map.log.length - 1];
  if (!last) return map;
  const log = map.log.slice(0, -1);
  return last.kind === 'home' ? { ...map, centres: last.before, log } : { ...map, log };
}

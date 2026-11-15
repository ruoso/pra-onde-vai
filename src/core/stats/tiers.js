// Next moves as tiers (design §4): usual (≥ 35% of the moves out of a chord in
// the corpus), sometimes (≥ 10%), rare (anything listed, which the build cuts
// at 3%). Never shown as percentages: the data supports them only roughly.

export const USUAL = 35;
export const SOMETIMES = 10;

export function tierOf(share) {
  if (share >= USUAL) return 'usual';
  if (share >= SOMETIMES) return 'sometimes';
  if (share > 0) return 'rare';
  return null;
}

/** The share (in percent) of the moves out of `from` that go to `to`, or 0. */
export function share(stats, mode, from, to) {
  const hit = (stats.exits[mode][from] ?? []).find((e) => e[0] === to);
  return hit ? hit[1] : 0;
}

/**
 * The next moves from a chord, as a map of id → tier, keeping only the
 * chords in `board` (the learner's level) when one is given.
 */
export function nextMoves(stats, mode, from, board = null) {
  const out = new Map();
  for (const [id, pct] of stats.exits[mode][from] ?? []) {
    if (board && !board.has(id)) continue;
    out.set(id, tierOf(pct));
  }
  return out;
}

/** How often sections open on a chord, as a share in percent. */
export function openShare(stats, mode, id) {
  const { counts, total } = stats.opens[mode];
  return total ? (100 * (counts[id] ?? 0)) / total : 0;
}

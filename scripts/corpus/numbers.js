// Rounding as the research scripts round (Python's round() and format() go to
// the even neighbour on a tie), so the build's figures match theirs.

export function roundHalfEven(x, digits = 0) {
  const f = 10 ** digits;
  const v = x * f;
  const r = Math.round(v);
  const tie = Math.abs(v - Math.trunc(v)) === 0.5;
  const out = tie ? (r % 2 === 0 ? r : r - 1) : r;
  return out / f;
}

/** The middle value as research/levels.py takes it: sorted, index ⌊n/2⌋. */
export function median(values) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

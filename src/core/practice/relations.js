// How one key stands to another (design §1's key plan): the relative, the
// parallel, the same key, and in major the subdominant and the dominant.

import { mod } from '../theory/pitch.js';

export function relationOf(from, to) {
  const interval = mod(to.pc - from.pc, 12);
  if (interval === 0) return to.mode === from.mode ? 'same' : 'parallel';
  if (from.mode === 'min' && to.mode === 'maj' && interval === 3) return 'relative';
  if (from.mode === 'maj' && to.mode === 'min' && interval === 9) return 'relative';
  if (from.mode === 'maj' && to.mode === 'maj' && interval === 5) return 'subdominant';
  if (from.mode === 'maj' && to.mode === 'maj' && interval === 7) return 'dominant';
  return 'other';
}

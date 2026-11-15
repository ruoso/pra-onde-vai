// Marking an answer (design §7.2). The songbook is one good version of a tune,
// not the only one: arrivals are marked strictly, the way between them by
// the job each chord does. `mark()` in mockups/Practice.dc.html is the
// reference behaviour; tests/practice-marking.test.mjs pins it.
//
//   right    — the songbook's function (basses and extensions never count);
//   another  — another way of the same move, never at an arrival:
//              'alt'  the way another version of the tune has it,
//              'job'  a chord doing the same job,
//              'skip' straight to the chord after, leaving a passing one out,
//              'path' a move choro makes (usual or sometimes) from the chord
//                     before, that leads on (usual or sometimes) to the one after;
//   miss     — anything else, and anything but the exact chord at an arrival.

import { share, SOMETIMES } from '../stats/tiers.js';

/**
 * Chords doing the same job: a dominant, its diminished and its tritone
 * substitute lead to the same place; ii and IV, iiø and iv, prepare the
 * dominant. A hand-picked list (design §9).
 */
const SAME_JOB = {
  maj: { 'V/ii': ['#I°'], '#I°': ['V/ii'], ii: ['IV'], IV: ['ii'] },
  min: {
    'V/V': ['#IV°', 'bVI7'], '#IV°': ['V/V', 'bVI7'], bVI7: ['V/V', '#IV°'],
    iv: ['iiø'], 'iiø': ['iv'], V: ['bII7'], bII7: ['V'],
  },
};

export function sameJob(mode, a, b) {
  return (SAME_JOB[mode][a] ?? []).includes(b);
}

/** Whether a function prepares the dominant (for the words of a 'job' mark). */
export function preparesDominant(id) {
  return ['ii', 'IV', 'iv', 'iiø'].includes(id);
}

/**
 * Mark the answer `picked` for the question `q`:
 *   q.expected   the songbook's function;
 *   q.arrival    whether the chord is where a phrase arrives;
 *   q.mode       the mode of the key in force;
 *   q.prev       the function of the chord heard before, in that key, or null;
 *   q.next       the function of the chord after, in that key, or null;
 *   q.nextAsked  whether the chord after is itself a question;
 *   q.alts       functions other versions of the tune have here.
 * @returns {{ kind: 'right'|'another'|'miss', reason?: string, consumes?: boolean }}
 */
export function mark(q, picked, stats) {
  if (picked === q.expected) return { kind: 'right' };
  if (q.arrival) return { kind: 'miss', reason: 'arrival' };
  if ((q.alts ?? []).includes(picked)) return { kind: 'another', reason: 'alt' };
  if (sameJob(q.mode, q.expected, picked)) return { kind: 'another', reason: 'job' };
  if (q.next && picked === q.next && q.nextAsked) return { kind: 'another', reason: 'skip', consumes: true };
  if (q.prev && q.next && share(stats, q.mode, q.prev, picked) >= SOMETIMES && share(stats, q.mode, picked, q.next) >= SOMETIMES) {
    return { kind: 'another', reason: 'path' };
  }
  return { kind: 'miss' };
}

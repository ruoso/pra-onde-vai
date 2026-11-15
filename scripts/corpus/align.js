// Aligning a transcription with the corpus table. The table has one row per
// chord as played and none for a held bar, and its bar numbers skip held bars
// (docs/corpus-notes.md), so rows are matched to the transcription's tokens by
// order: every token of every bar that sounds, in the form's order, `.` being
// the chord before carrying on. The alignment must hold chord for chord.

import { playedTokens } from './transcription.js';

function tryAlign(t, rows) {
  const tokens = playedTokens(t);
  if (tokens.length !== rows.length) {
    return { ok: false, error: `${tokens.length} chords as played, ${rows.length} rows in the table` };
  }
  let prev = null;
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    const want = tok.token === '.' ? prev : tok.token;
    if (rows[i].chord !== want) {
      return { ok: false, error: `chord ${i + 1}: ${want} written, ${rows[i].chord} in the table` };
    }
    if (rows[i].phrase !== tok.phrase) {
      return { ok: false, error: `chord ${i + 1}: phrase ${tok.phrase} written, ${rows[i].phrase} in the table` };
    }
    prev = want;
  }
  return { ok: true, tokens };
}

/** Every way of choosing one definition for each phrase defined twice. */
function choices(alternatives) {
  let out = [{}];
  for (const [id, defs] of Object.entries(alternatives)) {
    out = out.flatMap((c) => defs.map((d, i) => ({ ...c, [id]: { def: d, i } })));
  }
  return out;
}

/**
 * @returns {{ ok: true, transcription, tokens: {phrase, bar, index, token, row}[], chosen: Object }
 *   | { ok: false, error: string }}
 * `chosen` says which definition was kept for a phrase defined twice.
 */
export function align(t, rows) {
  let first = null;
  for (const choice of choices(t.alternatives ?? {})) {
    const phrases = { ...t.phrases };
    for (const [id, c] of Object.entries(choice)) phrases[id] = c.def;
    const candidate = { ...t, phrases };
    const r = tryAlign(candidate, rows);
    if (r.ok) {
      const chosen = Object.fromEntries(Object.entries(choice).map(([id, c]) => [id, c.i]));
      return { ok: true, transcription: candidate, tokens: r.tokens.map((tok, i) => ({ ...tok, row: rows[i] })), chosen };
    }
    first ??= r;
  }
  return first;
}

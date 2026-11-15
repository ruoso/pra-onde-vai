// Reading a DCML transcription (data/transcriptions/*.txt): phrases of bars,
// parts made of phrase references, and the form (the `S` line) in play order.
// The format and its traps are in docs/corpus-notes.md.

const LINE = /^([A-Za-z]+\d*)(?:\[([^\]]*)\])?\s*:\s*(.*)$/;
const REF = /^\$([A-Za-z]+\d*)(?:\*(\d+))?$/;

/**
 * @returns {{ phrases: Object<string, {key: string|null, bars: (string[]|null)[]}>,
 *   parts: Object<string, {key: string|null, refs: string[]}>, partOrder: string[],
 *   form: {key: string, meter: string, refs: string[]}|null, notes: string[] }}
 * A bar is its tokens (chords, `.`, `NC`), or null for an empty cell: the bar
 * before, held.
 *
 * Two traps of the corpus are read the way its table reads them, since the
 * table is the answer key (docs/corpus-notes.md):
 * - `$P0*3` is played once: the two transcriptions that write a count have
 *   one pass of the phrase in the table;
 * - a phrase name defined twice (Aguenta seu Fulgêncio, Meu Sabiá) keeps
 *   both definitions in `alternatives`; the first is in `phrases` until the
 *   alignment with the table picks the one it plays (`align.js`).
 * Each is recorded in `notes`.
 */
export function readTranscription(text, name = 'transcription') {
  const phrases = {};
  const parts = {};
  const partOrder = [];
  let form = null;
  const notes = [];
  const alternatives = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = LINE.exec(line);
    if (!m) throw new Error(`${name}: cannot read line ${JSON.stringify(line)}`);
    const [, id, opt, body] = m;
    if (/^P\d+$/.test(id)) {
      let cells = body.split('|');
      if (cells.length && !cells[cells.length - 1].trim()) cells = cells.slice(0, -1);
      const bars = cells.map((cell) => {
        const toks = cell.trim().split(/\s+/).filter(Boolean);
        return toks.length ? toks : null;
      });
      if (bars[0] === null) throw new Error(`${name}: ${id} starts with a held bar`);
      const def = { key: opt ?? null, bars };
      if (phrases[id]) {
        if (!alternatives[id]) alternatives[id] = [phrases[id]];
        alternatives[id].push(def);
        notes.push(`${id} is defined more than once`);
        continue;
      }
      phrases[id] = def;
      continue;
    }
    const refs = [];
    for (const tok of body.split(/\s+/).filter(Boolean)) {
      const r = REF.exec(tok);
      if (!r) throw new Error(`${name}: bad reference ${JSON.stringify(tok)}`);
      if (r[2] && r[2] !== '1') notes.push(`${tok} is played once`);
      refs.push(r[1]);
    }
    if (id === 'S') {
      const [key, meter] = (opt ?? '').split(',').map((s) => s.trim());
      form = { key, meter, refs };
    } else {
      parts[id] = { key: opt ?? null, refs };
      partOrder.push(id);
    }
  }
  return { phrases, parts, partOrder, form, notes, alternatives };
}

/** The phrases a reference stands for, in order: a part's phrases, or the phrase itself. */
export function phrasesOf(t, ref) {
  if (t.parts[ref]) return t.parts[ref].refs.flatMap((r) => phrasesOf(t, r));
  if (t.phrases[ref]) return [ref];
  throw new Error(`unknown reference ${ref}`);
}

/**
 * The chords as played, one entry per table row: every token of every bar
 * that is not held, in the form's order. `.` is the chord before carrying on.
 * `playing` counts the times the phrase has been played before (0 the first).
 */
export function playedTokens(t) {
  const out = [];
  const times = new Map();
  for (const ref of t.form.refs) {
    for (const p of phrasesOf(t, ref)) {
      const playing = times.get(p) ?? 0;
      times.set(p, playing + 1);
      t.phrases[p].bars.forEach((bar, b) => {
        if (bar === null) return;
        bar.forEach((tok, k) => out.push({ phrase: p, playing, bar: b, index: k, token: tok }));
      });
    }
  }
  return out;
}

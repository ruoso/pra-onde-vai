// How it went (design §6): the run phrase by phrase, and the pattern in the
// misses, turned into a short drill in random keys.

import { target } from '../theory/board.js';

/** How each event of a run went: given, right, another, miss, played (for you), or held. */
export function statusOf(st, i) {
  const e = st.events[i];
  if (e.repeat) return 'held';
  if (e.given) return 'given';
  const r = st.results[i];
  if (r) return r.kind;
  return 'played';
}

/** The run in four-bar phrases, section by section, with what went wrong in each. */
export function phrases(st) {
  const groups = [];
  st.events.forEach((e, i) => {
    if (i >= st.idx && st.pendingMove === null && !(i in st.results)) return;
    const g = Math.floor((e.bar - 1) / 4);
    let cur = groups[groups.length - 1];
    if (!cur || cur.section !== e.section || cur.group !== g) {
      cur = { section: e.section, group: g, from: g * 4 + 1, to: g * 4 + 4, bars: [], events: [], marks: [] };
      groups.push(cur);
    }
    let bar = cur.bars.find((b) => b.n === e.bar);
    if (!bar) { bar = { n: e.bar, items: [] }; cur.bars.push(bar); }
    const status = statusOf(st, i);
    bar.items.push({ i, sym: e.sym, status });
    cur.events.push(i);
    const r = st.results[i];
    if (r && r.kind !== 'right') {
      cur.marks.push({ i, kind: r.kind, reason: r.reason, picked: r.picked, sym: e.sym, expected: e.expected, bar: e.bar, mode: e.inKey.mode, key: e.inKey });
    }
  });
  for (const g of groups) {
    g.to = Math.max(...g.bars.map((b) => b.n));
    g.miss = g.marks.some((m) => m.kind === 'miss');
    g.played = g.bars.flatMap((b) => b.items).filter((x) => x.status === 'played').map((x) => x.sym);
  }
  return groups;
}

const isDominant = (id) => id === 'V' || /^V\//.test(id ?? '') || id === 'bVI7' || id === 'bII7';
const isSecondary = (id) => /^V\//.test(id ?? '');
const isDiminished = (id) => /°$/.test(id ?? '');
const isSubdominant = (id) => ['ii', 'IV', 'iv', 'iiø'].includes(id) || /^ii\//.test(id ?? '');

/** The kind of mistake a miss is. */
export function missKind(m) {
  if (m.reason === 'shown') return 'shown';
  if (isSecondary(m.expected) && m.picked === 'V') return 'awayAsV';
  if (m.expected === 'V' && isSecondary(m.picked)) return 'vAsAway';
  if (isSecondary(m.expected) && isSecondary(m.picked)) return 'wrongTarget';
  if (isDiminished(m.expected)) return 'diminished';
  if (isSubdominant(m.expected) && isDominant(m.picked)) return 'tooSoon';
  if (m.reason === 'arrival') return 'arrival';
  if (m.expected === 'something' || m.picked === 'something') return 'offBoard';
  return 'mixed';
}

/**
 * The pattern in the misses: the kind most of them share (at least two, and
 * at least half), or `scattered`; `clean` with none. With it, the chords to
 * practise (the ones missed) and the ones they were taken for.
 */
export function pattern(st) {
  const misses = Object.entries(st.results)
    .filter(([, r]) => r.kind === 'miss')
    .map(([i, r]) => {
      const e = st.events[Number(i)];
      return { i: Number(i), bar: e.bar, sym: e.sym, expected: e.expected, picked: r.picked, reason: r.reason, mode: e.inKey.mode, key: e.inKey, section: e.section };
    });
  if (!misses.length) return { code: 'clean', misses, focus: [], contrast: [] };
  const byKind = new Map();
  for (const m of misses) {
    const k = missKind(m);
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k).push(m);
  }
  let [kind, items] = [...byKind.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  let shared = items.length >= 2 && items.length * 2 >= misses.length;
  // No kind of mistake in common, but every miss was the same chord: say so.
  const one = misses.every((m) => m.expected === misses[0].expected && m.mode === misses[0].mode);
  if (misses.length >= 2 && one && (!shared || kind === 'mixed')) {
    kind = 'sameChord';
    items = misses;
    shared = true;
  }
  const focus = [];
  const contrast = [];
  for (const m of misses) {
    if (m.expected !== 'something' && !focus.some((f) => f.id === m.expected && f.mode === m.mode)) focus.push({ id: m.expected, mode: m.mode });
    if (m.picked && m.picked !== 'something' && !contrast.some((f) => f.id === m.picked && f.mode === m.mode)) contrast.push({ id: m.picked, mode: m.mode });
  }
  return { code: shared ? kind : 'scattered', misses, items: shared ? items : misses, focus, contrast, fn: misses[0].expected };
}

/**
 * What a drill of the misses practises, progression by progression: each
 * missed chord, and between them the chord it was taken for, so the two are
 * heard side by side (design §6: "turned into a short drill in random keys").
 */
export function missDrillPlan(p) {
  const plan = [];
  for (const f of p.focus) {
    plan.push(f);
    const c = p.contrast.find((x) => x.mode === f.mode && x.id !== f.id && target(x.id) !== f.id);
    if (c) plan.push(c);
  }
  return plan.length ? plan : [{ id: null, mode: 'maj' }];
}

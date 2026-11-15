// The seven levels (design §8): each adds the functions the corpus uses most
// after the ones before. The figures shown with them (coverage, tunes) come
// from the data build, never from here.

export const LEVELS = [
  { n: 1, key: 'home', maj: ['I', 'V'], min: ['i', 'V'] },
  { n: 2, key: 'subdominant', maj: ['IV', 'ii', 'iv'], min: ['iv', 'iiø'] },
  { n: 3, key: 'vOfV', maj: ['V/V'], min: ['V/V'], keyMove: 'relative' },
  { n: 4, key: 'awayFromHome', maj: ['V/ii', 'vi'], min: ['V/iv'] },
  { n: 5, key: 'secondaries', maj: ['V/vi', 'V/IV', 'V/iii', 'iii'], min: ['V/III', 'III', 'V/VI', 'VI'], keyMove: 'parallel' },
  { n: 6, key: 'colour', maj: ['#IV°', '#I°', 'bII'], min: ['#IV°', 'bII', 'bVI7'] },
  {
    n: 7, key: 'secondaryTwo',
    maj: ['ii/IV', 'ii/vi', 'ii/iii', 'ii/ii', 'bIII°', 'IV7', 'bVII7', 'bVII', 'bIII', 'bIII7', 'bVI', 'bVI7'],
    min: ['ii/iv', 'ii/V', 'ii/VI', 'IV7', 'bII7', 'VII'],
  },
];

export const TOP_LEVEL = LEVELS.length;

/** The functions on the board at a level, in one mode. */
export function boardAt(level, mode) {
  const out = new Set();
  for (const l of LEVELS) if (l.n <= level) for (const id of l[mode]) out.add(id);
  return out;
}

/** The level a function arrives at, or null when it is never on the board. */
export function levelOf(mode, id) {
  const l = LEVELS.find((x) => x[mode].includes(id));
  return l ? l.n : null;
}

/** The functions a level adds, in one mode. */
export function addedAt(level, mode) {
  return LEVELS[level - 1][mode];
}

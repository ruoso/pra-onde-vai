# Implementation plan

How to turn the design (`docs/design.md`) and the mockups (`mockups/`) into
the app. It proposes an architecture and an order of work; the decisions still
open are at the end, to settle with the user before or as each is reached.

## What the app is

A free, non-commercial, offline web app (a PWA), tablet in landscape first,
phone later. Everything runs on the device: the tunes and statistics ship with
it, progress is stored locally, there is no account and no server.

## Architecture

Pure logic below, views above, as in Estante de Cifras: the core knows nothing
of the UI, the audio or storage, and is tested on its own.

- **`core/theory`** — pitch classes, letter-based spelling of a function in any
  key (the mockups' `spell(centre, step, semitones)`: `F#` and `Gb` are
  different), the two boards (major and minor: each button's id, function
  name, letter step, semitones and chord suffix — `board()` in
  `mockups/Practice.dc.html`), chord parsing (cifra.md's grammar: reuse the
  `cifra-md` package if it is a dependency, §Open decisions).
- **`core/corpus`** — the tune model (below) and its loading.
- **`core/stats`** — next-move tiers (usual ≥ 35%, sometimes ≥ 10%, rare > 0),
  how sections open, coverage per tune and level. Computed at build time from
  the corpus, shipped as data, never hand-copied.
- **`core/marking`** — the marking rules (design §7.2): arrivals, right,
  another way (alt, job, skip, path), missed. `mark()` in
  `mockups/Practice.dc.html` is the reference behaviour and
  `tests/practice-marking.test.mjs` its specification.
- **`core/levels`** — the seven levels' sets, mastery (17 of the last 20, in
  at least 3 keys), unlocking, review mix (one question in five from earlier
  levels).
- **`core/drills`** — short progressions as random walks on the corpus's move
  graph restricted to the learner's chords, in any key.
- **`core/listen`** — ranking home keys from notes, and chords from notes given
  home and the chord before (`rankHomes`, `rankChords` in
  `mockups/Listen.dc.html`).
- **`audio`** — Web Audio: a plucked chord (the mockups' synth to start),
  cadences, phrase playback; later a scheduler with a choro rhythm (Follow).
  Pitch detection of one hummed note (an AudioWorklet; autocorrelation or YIN).
- **`storage`** — progress and settings in IndexedDB (localStorage only for
  conveniences such as the last screen).
- **`ui`** — the screens of the mockups: Map, Listen, Choose, Practice, Review,
  Levels, plus About (credits and licence).

### The tune data

A build step reads the corpus (`docs/corpus-notes.md`) and writes the app's
tune file, under CC BY-NC-SA 4.0 like the corpus. Per tune:

- `id`, `title`, `composers[]`, `year?`, `genre`, `songbook` (volume),
  `key` (global key and mode), `meter`;
- `sections`: each part (A, B, …) with its own key, and its bars **as
  written**, taken from the transcription (held bars included); each chord has
  its symbol (with `°` for `o`), its local key and mode, and its function
  (the board's id, or the corpus label when it has no button);
- `form`: the play order of the sections and of the returns with new endings
  (the transcription's `S` line);
- `arrivals`: computed from the bars (design §7.2).

The functions come from the table's labels, aligned to the transcription's
chords by order (the table has no rows for held bars, and repeats a phrase each
time it is played). The build must check, for every tune, that the alignment
holds chord for chord, and fail otherwise. The statistics (tiers, openings,
coverage) are computed in the same build.

`research/dcml2cifra.py` and `research/verify.py` already parse the
transcriptions and check play order against them; `research/corpus_labels.py`
maps the table's labels to board ids. They are the starting point, not code to
ship.

## Order of work

Each step ends with tests that go the whole way through what the user does
(see `CLAUDE.md`), and the app building.

1. **Scaffold**: the stack (§Open decisions), lint, tests, build, a CI that
   runs them.
2. **The data build**: the tune file and the statistics from the corpus. Done
   when every tune aligns, the 295 tunes load, and the figures in
   `docs/design.md` and `docs/corpus-notes.md` come out of it (e.g. the tiers,
   the 88% median coverage, the level table).
3. **Theory core and the map**: both boards, any key, tiers lit from the chord
   you are on, chord names and functions on every button, sound on tap,
   changes of key (make home, breadcrumb, minor/major). Done when a session
   can follow Cochichando's A and B on the map, with key change, by tapping.
4. **Checked practice, Predict**: choose a tune (coverage at the learner's
   level), play it bar by bar, ask at each change, mark (§7.2), ask *has home
   moved?* at key changes, review with the misses' pattern. Done when
   `tests/practice-marking.test.mjs`'s run passes against the real engine, on
   the real tune data, and a whole tune can be practised in any key.
5. **Levels, drills and progress**: the seven levels, mastery and unlocking,
   *Something else* for chords off the board, drills from the move graph,
   progress kept across restarts.
6. **Listening help**: notes by tapping, on a staff in the home key; home keys
   and chords ranked; the cadence test; recording pitch; then humming with
   pitch detection.
7. **Offline and credits**: installable PWA, works with no network, an About
   screen crediting DCML and the Choro Songbook, with the licence.

Later, each needing design first: Follow mode (real-time, with a rhythm
engine), voicings for the 6-string guitar, the user's own cifra.md books as
practice tunes and second versions (design §7.2, *another version*).

## Open decisions

To settle with the user; a recommendation for each.

- **Stack.** Recommendation: the same as Estante de Cifras — Vite, React,
  react-aria-components for accessible controls, Vitest with jsdom and Testing
  Library, ESLint — so the two projects share habits and the user knows the
  code. The mockups' `support.js` is only for the mockups.
- **cifra.md.** The app needs the cifra.md chord grammar now and the full
  reader later (the user's own books). The JavaScript implementation lives in
  the Estante de Cifras repository (`cifra.md/js`, package `cifra-md`).
  Options: a git dependency on that path, a copy, or publishing the package.
- **How the user's own books arrive** (later): a zip like Estante's download,
  a folder, or a link to an Estante book.
- **Name and code licence.** The tune data must be CC BY-NC-SA 4.0; the code
  can be anything compatible with a free, non-commercial app.
- **Sound.** A synthesised pluck is enough to start; a sampled nylon guitar
  would sound like the real thing.
- **Where work lands.** Estante commits straight to `main`; ask whether this
  repository works the same way or through branches.

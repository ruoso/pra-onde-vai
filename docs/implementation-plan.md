# Implementation plan

How the design (`docs/design.md`) and the mockups (`mockups/`) became the
app: its architecture, its tune data, the order the work went in, and the
decisions taken and still open. All seven steps of the order of work are
built; what is left is the later work at the end of that section.

## What the app is

A free, non-commercial, offline web app (a PWA), tablet in landscape first,
phone later. Everything runs on the device: the tunes and statistics ship with
it, progress is stored locally, there is no account and no server. It is
served as static files from GitHub Pages; once its assets are loaded and
cached it works with no network.

## Stack

The same as Estante de Cifras, so the two projects share habits and the
user knows the code:

- **Vite** with **React** and the React Compiler, in plain JavaScript (ES
  modules, no TypeScript), as Estante is.
- **react-aria-components** for the controls: the board's buttons, the
  segmented controls, dialogs and sheets, keyboard and screen-reader
  behaviour on a tablet and a computer alike. They carry no look of their
  own, so the mockups' visual language applies as drawn.
- **vite-plugin-pwa** for the service worker and the install manifest: every
  asset, the tune file included, cached up front.
- **Vitest** with **jsdom** and **Testing Library** for the core and the
  screens, **vitest-axe** for accessibility in those tests, and **Playwright**
  for end-to-end runs in a real browser (install, go offline, practise a tune).
- **ESLint** with the React, hooks and jsx-a11y plugins.
- **The data build in Node**, as a script in the repository, so the app and
  its data need one toolchain. It reads the corpus at a pinned commit; the
  research scripts in Python stay as they are, for the research.

The mockups' `support.js` is only for the mockups.

### Hosting and deploying

GitHub Pages, as static files: the app has no state on a server, so nothing
else is needed. A GitHub Actions workflow on every push to `main` clones the
corpus at its pinned commit, runs the data build, lint, the unit tests and
the end-to-end tests, builds, and publishes to Pages only if all of it
passed. The site lives under the repository's path, so Vite's `base`, the
manifest's `start_url` and `scope`, and the service worker's scope are all
set to that path (and tested: the end-to-end run serves the build under it).

## Architecture

Pure logic below, views above, as in Estante de Cifras: the core knows nothing
of the UI, the audio or storage, and is tested on its own.

- **`core/theory`** — pitch classes, letter-based spelling of a function in any
  key (the mockups' `spell(centre, step, semitones)`: `F#` and `Gb` are
  different), the two boards (major and minor: each button's id, function
  name, letter step, semitones and chord suffix — `board()` in
  `mockups/Practice.dc.html`), chord parsing (cifra.md's grammar, from the
  copy of `cifra-md` below).
- **`lib/cifra-md`** — a copy of the JavaScript cifra.md implementation
  from Estante de Cifras (`cifra.md/js/src`, MIT), with its tests. Copied,
  not linked: the app needs the chord grammar now and the full reader later,
  and a copy keeps this repository buildable on its own. The copy records the
  Estante commit it came from, so it can be refreshed by hand.
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
- **`i18n`** — translations, as in Estante de Cifras (below).

### Languages

The same set-up as Estante de Cifras (`app/src/i18n/` there), carried over:

- The same four languages: English, Brazilian Portuguese, Latin American
  Spanish and Italian. English is the source and the fallback; each language's
  name is written in that language.
- No library: one message object per language, a lookup by dotted key,
  `{name}` interpolation, plural and ordinal forms by `Intl.PluralRules`.
- The browser's language (by primary subtag) until the user picks one; the
  choice is a setting kept in `storage`, and `<html lang>` follows it. A
  change remounts the tree under a key, as Estante's `LocaleRoot` does.
- The core knows nothing of languages: it returns ids and codes (a board
  button's id, a mark such as `job`, an error code), and the view turns them
  into text.
- Tests check that every language has exactly English's keys and the same
  placeholders in every string, and the screens' tests run in more than one
  language.

What gets translated here: the interface, the function names on the board
(*dominant*, *dominante*), the tiers (*usual*, *sometimes*, *rare*), the
marks and the review's explanations. What does not: chord symbols, which are
letters in every language (as cifra.md writes them), and the tunes' titles,
composers and section names, which are data. Note names on the listening
staff are written as chord charts write them, letters (`C`, `F#`, `Bb`) in
every language, never *dó ré mi*: what you hear on the staff is named the way
you will read it in a chart.

### The tune data

A build step reads the corpus (`docs/corpus-notes.md`) and writes the app's
tune file, under CC BY-NC-SA 4.0 like the corpus. Per tune:

- `id`, `title`, `composers[]`, `year`, `genre`, `songbook` (volume),
  `key` (global key, as a chart writes it: `Dm`), `mode`, `meter`;
- `phrases`: each phrase once, its bars **as written**, taken from the
  transcription (a held bar is `null`); each chord has its symbol `s` (with
  `°` for `o`; a `.` merged into the chord it carries on), its local key `k`,
  its function `f` (the board's id, or the corpus label when it has no
  button) and its length `d` in whole notes. A phrase is labelled the same
  every time it is played, which the build relies on;
- `sections`: the form in play order (the transcription's `S` line), each a
  list of phrases with what it is: a part (`A`, `B2`), a return to one with a
  new ending (`again`, `end`), an intro, a coda, a link;
- `coverage`: the share of the tune's chord changes on the board at each of
  the seven levels; `keys`: how many keys it visits; `notes`: the corpus
  traps the build met in it.

Arrivals are not stored: `core/practice/sequence.js` finds them from the bars
as played (the first chord of every fourth bar of a section, a section's first
chord, a change of home), so one function decides them.

The functions come from the table's labels, aligned to the transcription's
chords by order (the table has no rows for held bars, and repeats a phrase each
time it is played). The build must check, for every tune, that the alignment
holds chord for chord, and fail otherwise. The statistics (tiers, openings,
coverage) are computed in the same build.

The build is `scripts/corpus/` (the readers, the alignment, the labels, the
statistics) under `scripts/build-data.js`; it ports `research/corpus_labels.py`,
`tiers.py`, `levels.py` and `fit.py`, rounding as Python does, and
`scripts/corpus/build.test.js` checks that the design's figures come out the
same. The statistics also hold, for each chord of the board, three tunes to
meet it in (design §8, *Meet it*), and where the B section of a major or
minor tune goes.

## Order of work

Each step ends with tests that go the whole way through what the user does
(see `CLAUDE.md`), and the app building.

1. **Scaffold**: the stack (§Stack), lint, tests, build, the workflow that
   runs them and publishes to GitHub Pages (§Hosting and deploying,
   `.github/workflows/pages.yml`); the copy of `cifra-md` with its tests
   passing here; i18n with its four languages and its tests, so every screen
   is written with `t()` from the start.
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

Step 4 grew a second mode after use: *Name it* (each chord sounds, then you
name it), now the way tunes start and the only way drills run, since bare
harmony seldom decides what comes next (design §6). Predict stays as an
option for tunes.

Every step is built, each with its tests: the data build's against the real
corpus (`scripts/corpus/*.test.js`), the core's (`src/core/**`), the screens'
driven as the user drives them (`src/ui/App.test.jsx`), and the build in
Chromium (`e2e/`). Step 3's map follows Cochichando's A and B by tapping, with
the key change, in `App.test.jsx`; step 4's done-when is
`src/core/practice/session.test.js`.

Later, each needing design first: Follow mode (real-time, with a rhythm
engine; the tune chooser shows it, switched off), voicings for the 6-string
guitar, the user's own cifra.md books as practice tunes and second versions
(design §7.2, *another version*: the marking engine already takes other
versions, as `alts`).

## Decisions taken

- **The name is *Pra Onde Vai*** ("where is it going"), the question the app
  trains you to answer at every change. The repository, the package and the
  Pages path are `pra-onde-vai`.
- **cifra.md is a copy** of Estante's JavaScript implementation
  (`lib/cifra-md`, above), not a git dependency or a published package.
- **Internationalisation as in Estante**: the same four languages and the
  same set-up (§Languages), from the first screen.
- **Note names are letters**, as in chord charts, in every language.
- **The stack is Estante's** (§Stack).
- **Work lands straight on `main`**, as in Estante; each push deploys.
- **GitHub Pages** serves the app as static files (§Hosting and deploying).
- **The code is MIT**, as Estante's is (`LICENSE`); the tune data and
  everything derived from the corpus stay CC BY-NC-SA 4.0, and the About
  screen states both.

## Open decisions

To settle with the user; a recommendation for each.

- **How the user's own books arrive** (later): a zip like Estante's download,
  a folder, or a link to an Estante book.
- **Sound.** A synthesised pluck is enough to start; a sampled nylon guitar
  would sound like the real thing.

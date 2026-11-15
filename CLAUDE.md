# Pra Onde Vai

*Where is it going?* An ear-training app for choro harmony: learn to hear where
a tune is going and follow it on the 6-string guitar, including tunes there is
no chart for. Free and non-commercial, offline, tablet first.

**Status: designed, not implemented.** This repository holds the design, the
mockups and the research behind them. The next step is building the app.

## Read first

1. `docs/design.md` — the design of record: the map of chord functions,
   listening help, checked practice, marking, levels, open questions.
2. `docs/implementation-plan.md` — the proposed architecture, the tune data
   format, the order of work, and the decisions still open.
3. `docs/corpus-notes.md` — the DCML corpus's formats and traps (the table
   repeats phrases as played; `bar_no` skips held bars).
4. `mockups/index.html` — every screen, live. The mockups' JavaScript is the
   reference behaviour for the boards, spelling, tiers, the listening rankings
   and the marking rules; `tests/practice-marking.test.mjs` pins the marking.

## Decisions already taken

Do not reopen these unless the user does.

- A separate product from Estante de Cifras (the user's songbook app, in the
  sibling repository `../estante-de-cifras`), at least for now.
- **Free and non-commercial.** It ships the whole DCML Choro Songbooks Corpus
  (295 tunes, with its keys and function labels as the answer key), credits
  DCML, and keeps the tune data and anything derived from it under
  CC BY-NC-SA 4.0. The user's position is that a chord chart is not subject to
  the original song's copyright; do not raise it as a blocker.
- Next moves are shown as tiers (usual ≥ 35%, sometimes ≥ 10%, rare), never as
  percentages, and come from the corpus, not from the user's own book.
- The songbook is one good version of a tune, not the only one: arrivals are
  marked strictly, the way between them by the job each chord does
  (design §7).
- Seven levels by corpus frequency; drills before whole tunes until level 4.
- The two modes are major and minor; choro's character is in the moves (the
  board and its tiers), not in a scale of its own.
- cifra.md comes in as a copy of Estante's JavaScript implementation
  (`lib/cifra-md`), not as a dependency.
- Internationalisation as in Estante: English, Brazilian Portuguese, Latin
  American Spanish and Italian, with Estante's small i18n module and its tests
  (`docs/implementation-plan.md`, §Languages). Note names are letters, as in
  chord charts, in every language.
- The stack is Estante's: Vite, React, react-aria-components,
  vite-plugin-pwa, Vitest with jsdom, Testing Library and axe, Playwright,
  ESLint; the data build in Node (`docs/implementation-plan.md`, §Stack).
- Static hosting on GitHub Pages, deployed from `main` by GitHub Actions once
  every test passes.

## The user

Plays 6-string guitar and is learning to accompany choro by ear. Author of
Estante de Cifras and of the cifra.md format; keeps a book of 13 choro charts
of their own (the "Chorinho" book; nine of its tunes are also in the corpus).
Ask for it when a step needs it.

## How to work here

- **Tests are real and go the whole way.** No throwaway checks: a scenario
  worth checking becomes a test in the repository. A test exercises what the
  user does end to end (an import is tested by opening the imported song, not
  by finding its file). Build and test before every commit.
- Never run a build with unbounded parallelism: give `-j` an explicit count
  (`-j $(nproc)`).
- Numbers in the docs come from scripts in `research/` (or, once it exists, the
  data build), never typed in by hand; when a figure changes, change it in the
  docs too.
- Commit messages: an imperative subject line, then a body saying what changed
  and why, then the attribution trailers. Work goes straight to `main` (no
  branches); push only when asked, since each push deploys.
- The mockups are also on a Claude Design canvas
  (https://claude.ai/artifact/QBfdwcv672ZJNQ2VHDxv6C); this repository's copy
  is the reference. `mockups/support.js` exists only to run them outside the
  canvas; the app does not use the Design Component format.

## Running

```
npm install
npm test          # the mockups in jsdom, and the marking rules
```

The research scripts need the corpus (not in this repository):

```
git clone --depth 1 https://github.com/DCMLab/choro.git vendor/dcml-choro
python3 -I research/levels.py vendor/dcml-choro/data/choro.tsv
```

`research/README.md` lists every script and what it reproduces.

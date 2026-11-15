# Pra Onde Vai

*Where is it going?* An ear-training app for the harmony of choro: learn to
hear where a tune is going and follow it on the 6-string guitar, including
tunes there is no chart for. Free and non-commercial, offline, tablet first,
in English, Brazilian Portuguese, Latin American Spanish and Italian.

It runs at **https://ruoso.github.io/pra-onde-vai/** and installs as an app;
once loaded, it works with no network.

- **The map**: a fixed board of chord functions to play along on, against any
  recording, lighting the usual next moves and following changes of key.
- **What am I hearing?**: find home from notes you hum or tap, then name the
  chord.
- **Practice**: the app plays a real choro's harmony from the corpus and you
  find each chord on the map, marked against the songbook's version; a review
  names the pattern in your misses and drills it.
- **Levels**: seven, by how often the corpus uses each chord, with drills and
  three tunes to meet each new chord in.

- **[docs/design.md](docs/design.md)** — the whole design: the map of chord
  functions, the listening help, checked practice on 295 real choros, how
  answers are marked, the levels, and the open questions, with the data behind
  each decision.
- **[mockups/](mockups/)** — the screens, as live pages. Open
  `mockups/index.html` in a browser for all of them, with notes; each page also
  opens on its own. They work straight from the file system: no server, no
  build. Sound starts after the first tap.
- **[research/](research/)** — the scripts that produced the design's numbers.
- **[src/](src/)** — the app; **[scripts/](scripts/)** — the data build;
  **[docs/implementation-plan.md](docs/implementation-plan.md)** — how it is
  put together.

## The mockups

Each `*.dc.html` is a Design Component page, the format of the Claude Design
canvas they were drawn on. `mockups/support.js` is a small runtime for that
format, so they run outside the canvas: it renders the `<x-dc>` template from
the page's `Component`, with its loops, conditions, events and state. A page
takes its props from the query string: `Main.dc.html?scene=moved`,
`Practice.dc.html?scene=move`. Fonts load from Google Fonts when online.

## Building and testing

```
npm install
npm run corpus    # fetch the DCML corpus at its pinned commit into vendor/
npm test          # build the tune data, then every unit, screen and mockup test
npm run build && npx playwright install chromium && npm run test:e2e
```

`npm test` builds the tune data from the corpus (and fails if any tune does
not align with the corpus table), runs the core's and the screens' tests,
the copy of cifra-md's own suite, and the mockups' tests. The end-to-end
tests run the production build in Chromium: install, offline, a whole
practice run, and accessibility (WCAG 2.1 AA) on every screen. Every push to
`main` runs all of it on GitHub Actions and deploys to Pages if it passes.

## Data and credits

The practice tunes, and the statistics the design rests on, come from the
[DCML Choro Songbooks Corpus](https://github.com/DCMLab/choro) (Digital and
Cognitive Musicology Lab, EPFL: Fabian C. Moss, Willian Fernandes Souza),
chord transcriptions of the *Choro Songbook* (Chediak, Sève, Souza & Dininho;
Lumiar). The corpus is licensed
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/); the
tune data this project uses or derives from it is shared under the same
licence. The corpus itself is not in this repository: `npm run corpus` fetches
it, and the build writes the tune data from it.

The code (the app, the mockups, the research scripts and the tests) is under
the [MIT License](LICENSE).

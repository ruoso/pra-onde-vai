# Pra Onde Vai

*Where is it going?* An ear-training app for the harmony of choro, at the
design stage: learn to hear where a tune is going and follow it on the 6-string
guitar, including tunes there is no chart for. Free and non-commercial.

- **[docs/design.md](docs/design.md)** — the whole design: the map of chord
  functions, the listening help, checked practice on 295 real choros, how
  answers are marked, the levels, and the open questions, with the data behind
  each decision.
- **[mockups/](mockups/)** — the screens, as live pages. Open
  `mockups/index.html` in a browser for all of them, with notes; each page also
  opens on its own. They work straight from the file system: no server, no
  build. Sound starts after the first tap.
- **[research/](research/)** — the scripts that produced the design's numbers.

## The mockups

Each `*.dc.html` is a Design Component page, the format of the Claude Design
canvas they were drawn on. `mockups/support.js` is a small runtime for that
format, so they run outside the canvas: it renders the `<x-dc>` template from
the page's `Component`, with its loops, conditions, events and state. A page
takes its props from the query string: `Main.dc.html?scene=moved`,
`Practice.dc.html?scene=move`. Fonts load from Google Fonts when online.

## Tests

```
npm install
npm test
```

loads every mockup in jsdom with `support.js` and drives one interaction on
each (`tests/mockups.test.cjs`), and runs the practice frame's marking rules
through a full tune (`tests/practice-marking.test.mjs`).

## Data and credits

The practice tunes, and the statistics the design rests on, come from the
[DCML Choro Songbooks Corpus](https://github.com/DCMLab/choro) (Digital and
Cognitive Musicology Lab, EPFL: Fabian C. Moss, Willian Fernandes Souza),
chord transcriptions of the *Choro Songbook* (Chediak, Sève, Souza & Dininho;
Lumiar). The corpus is licensed
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/); the
tune data this project uses or derives from it is shared under the same
licence. The corpus itself is not in this repository: `research/README.md`
says how to fetch it.

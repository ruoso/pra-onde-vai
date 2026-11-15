# Pra Onde Vai — design

An ear-training app for the harmony of choro. Its goal is the skill a 6-string
accompanist needs at a roda: to hear where a tune is going and follow it,
including tunes there is no chart for. It is a separate product from Estante
de Cifras: free and non-commercial, offline, made for a tablet beside the
guitar.

This document records the design as it stands, the decisions taken and why,
and the data behind them. The mockups are in [`../mockups/`](../mockups/)
(open `index.html`); the scripts that produced every number here are in
[`../research/`](../research/).

## 1. How to think about choro harmony

The design starts from an analysis of the tunes, made on a 13-chart book of the
user's and then checked against 295 tunes (§3).

- **Destinations, not chord names.** Sections are 16 bars in four 4-bar
  phrases, each heading somewhere: state the key; go to the dominant; restate
  and tip towards the subdominant; cadence home. In the 13 charts, 26 of 38
  sections start on the tonic, but 37 of 38 end with a dominant-to-tonic
  cadence: the end of a phrase tells you where home is, the start often does
  not.
- **A small key plan.** Minor tunes go to the relative major and then the
  parallel major (Dm → F → D); major tunes to the relative minor and the
  subdominant (F → Dm → Bb). The pivot into a new section is usually its key's
  dominant in the last bar. In the corpus, 49 of the 109 minor-key choros with
  a B section put B in the relative major.
- **A handful of formulas**: the major endings (IV – iv – I – VI7 – ii – V – I,
  and IV – #IV° – I/5), chains of dominants, the diminished chord as a
  disguised dominant, approaches from above (bII, bVI7).
- **The bass line is a melody**: a dominant with its seventh in the bass falls
  to the next chord's third.

## 2. What the product is

Two connected tools, built on one idea: **you know where home is, and from
there the style is a small graph of moves**. Learning choro harmony is mostly
learning the ways to leave home; once you are on a chord, the next one is
nearly forced (V → I three times in four; the V of V → V four times in five).

1. **The map**: a fixed board of chord functions you play along on, against
   any recording. It lights the usual next moves and handles changes of key.
2. **Listening help**: for a tune with no chart, find home by ear, then name a
   chord from notes you hum or tap.
3. **Checked practice**: the app plays a real choro's harmony and you find each
   chord on the map, marked against the songbook's version, with levels that
   grow the board.

The earlier experiment `explore-scales` (a mode explorer: pick a tonic and a
mode, get the diatonic chords and canned progressions) was the starting point
and the counter-example: a mode's chord palette cannot explain choro, whose
harmony is mostly chords from outside the scale. This app goes from tunes to
theory instead.

## 3. Data

### 3.1 The DCML Choro Songbooks Corpus

[github.com/DCMLab/choro](https://github.com/DCMLab/choro): chord
transcriptions of the 295 pieces of the three volumes of the *Choro Songbook*
(Chediak, Sève, Souza & Dininho; Lumiar, 2009–2011), by the Digital and
Cognitive Musicology Lab, EPFL (Fabian C. Moss, Willian Fernandes Souza).
Every chord has its section, bar, local key and Roman numeral, annotated by
people. About 44 000 chord rows.

**Licence: CC BY-NC-SA 4.0.** The app is free and non-commercial, so it ships
the whole corpus: every tune, with its keys and function labels as the answer
key for practice. It credits DCML (an about screen, and on each tune), and the
tune data and anything derived from it (the tiers, the coverage figures) stay
under BY-NC-SA. The app's own code may be licensed separately. Our position is
that a chord chart is not subject to the copyright of the original song. If
the app ever became commercial, the corpus's terms would need revisiting.

The corpus writes a diminished chord as `o`; converted to cifra.md it is `°`.
Four chords use `(omit3)`, which cifra.md cannot spell; they are kept as
written (unknown tokens).

### 3.2 The user's own charts

A 13-chart cifra.md book, 9 of whose tunes are also in the corpus. It was the
first test bed (§3.3) and is the evidence that the songbook is one good version
among several (§7.1).

### 3.3 Is a rule-based analysis viable?

Yes, for this repertoire. A ~250-line rule-based analyser over the 13 charts
(930 chords, 39 sections) matched a hand analysis on 38 of 39 section keys and
gave 99% of chords a functional label, after four rules every musician would
know: weight a section's closing cadence; read a m6 as the half-diminished a
sixth above; allow delayed and deceptive resolutions; read a stray chord in a
nearby key with a cadence into it. Its weaknesses: key regions and sequences
inside a section (Ingênuo), and formula matching without bar positions. With
the corpus's own labels the app does not need it for practice, but it remains
the way to analyse a user's tunes.

## 4. The map

The map is the main instrument: tap the chord you hear. Mockups:
`Main.dc.html`, and the same page with `?scene=arrived` and `?scene=moved`.

- **Columns by fifths**, so each dominant sits above its destination and a
  chain of dominants (F#7 B7 E7 A7) steps one column to the right:
  major `iii · vi · ii · V · I · IV`, minor `III · VI · iiø · V · i · iv`.
- **Three rows**: the dominant that leads in (V of …), the destination, and
  colour — major `#I°` (under ii), `#IV°` (under V), `bII` (under I), `iv` as
  m6 (under IV); minor `bVI7` (under VI), `bII` (under iiø), `#IV°` (under V).
- **Fixed positions**: a button never moves, so the hand learns the map like
  an instrument. Every button shows both its function and its chord name
  ("V of ii · D7"), so the two fuse.
- **Next moves light up** from the chord you are on, tagged **usual**
  (≥ 35% of the moves out of that chord in the corpus), **sometimes** (≥ 10%)
  or **rare** — never as percentages, which the data supports only roughly.
- **Changes of key.** A modulation is a visit where you stay. When you land on
  a destination the board asks "visiting, or moving in?"; *Make F major home*
  re-centres it: positions and functions stay, chord names change. A
  breadcrumb (D minor › F major) is the way back, and a minor/major switch is
  the parallel move (the dominant does not change). This covers every section
  change in the 13 charts.

Next-move shares from the corpus, from the home chord: major I → V 22%,
V of ii 13%, V of vi 8%, V of IV, vi, V of V 7% each; minor i → V 29%, iv 15%,
V of V 13%, V of iv 8%. Most other chords have one or two strong exits (the
full tables are in the mockups and `research/tiers.py`).

## 5. Listening help

One screen, *What am I hearing?* (`Listen.dc.html`), that fills in whatever is
still unknown:

| You know | The app suggests | Weighted by |
|---|---|---|
| Nothing yet | home keys | the notes alone |
| Home, not the chord before | chords | how sections open in the corpus |
| Home and the chord before | chords | what follows that chord |

- **Enter notes** by humming (pitch detection of one sung note is reliable; the
  mockup simulates it) or tapping, shown on a staff in the home key's
  signature.
- **Find home**: keys ranked by how many notes fit and by the note a phrase
  comes to rest on; tap a key to hear the cadence into it, then make it home.
  A recording-pitch slider handles recordings not at concert pitch.
- **Name a chord**: chords on the map ranked by how many notes they explain,
  the last note counting double, nudged by the style's statistics, which only
  break ties. A note outside the key is the strongest clue: C# in D minor
  means A7.
- Sections open on the tonic 65% of the time in major (V 17%) and 64% in minor
  (V 16%, iv 7%), so "coming from nothing" is not "coming from home".

## 6. Checked practice

Mockups: `Choose.dc.html`, `Practice.dc.html` (and `?scene=move`),
`Review.dc.html`.

- **Pick a tune** from the corpus. *On your board* is the share of its chord
  changes the map covers at your level (the full board: a median 88%, 133 of
  295 tunes at 90% or more). Chords off your board are played for you. Choose
  the sections (A only; A then B, which brings a change of key; the whole
  tune), the key (as written, or any key, so you learn moves rather than names)
  and the mode:
  - **Predict**: playback stops before each chord change; you choose what comes
    next; then it plays. No clock. The way in.
  - **Follow**: it keeps playing and you tap along. Not designed yet: it needs a
    playback engine with a choro rhythm before it can be judged.
- **Each answer is marked** (§7) and the real chord plays. A strip shows the
  bars so far; *Hear it again* replays the last four chords; *Show me* reveals
  and counts a miss; hints (the usual next moves) can be turned off.
- **Has home moved?** At a change of key the app asks before going on, and
  making the new key home re-centres the board.
- **How it went**: the run phrase by phrase, each tappable to replay; the
  pattern in the misses named (in the example, dominants that lead away from
  home heard as the plain V) and turned into a short drill in random keys.
- The corpus has chords only, no melody. Practice therefore runs on bare
  harmony; following a real recording, melody and all, is the later stage.

## 7. Marking

### 7.1 The songbook is one good version, not the only one

Your 9 charts against the songbook's versions of the same tunes: of 416 aligned
bars, 223 are identical; the other 202 places they differ are:

| How they differ | Share |
|---|---|
| Same chord, another bass or extension | 47% |
| A passing chord added or left out | 29% |
| A related chord sharing two notes | 9% |
| The same root made a secondary dominant | 5% |
| Same bass, related chord | 3% |
| Diminished for its dominant, tritone substitute | 1–2% |
| Different harmony, or the bar rewritten | about 5% |

About 95% of the differences between two good versions are the same movement
told another way. So the reference is not treated as 100% correct.

### 7.2 The rules

**Arrivals are strict**: the chord a phrase lands on (the first chord of bars
4, 8, 12 and 16 of a section), the first chord of a section, and every change
of home. There only the exact function counts.

Elsewhere, an answer is:

- **✓ right** — the songbook's function. Basses and extensions never count:
  the board asks functions, so Dm/F, Dm and Dm7 are all the i.
- **≈ another way** — the same move told differently:
  - **the same job**: a dominant, its diminished or its tritone substitute
    (E7, G#°, Bb7 into A7); ii or IV, iiø or iv, before the dominant;
  - **straight to where it goes**: the chord after a passing one (this answers
    both);
  - **another path**: a move the corpus calls usual or sometimes from the chord
    before, that leads on (usual or sometimes) to the chord after;
  - **another version**: the way the user's own chart has it, for a tune in
    both; a user can also accept their way for a tune.
- **× missed** — anything else: it lands somewhere else, or it is a move choro
  does not make.

Limits: *another path* looks one chord ahead (a longer detour counts only as a
stored version); *a passing chord added* cannot arise in Predict, which asks
one chord at a time, and belongs to Follow.

## 8. Levels

Each level adds the functions the corpus uses most after the ones before
(`Levels.dc.html`). Coverage is of all chord changes in that mode; *tunes* is
how many of the 295 have at least 80% of their changes on the board.

| Level | Adds (major / minor) | Coverage (maj / min) | Median tune | Tunes |
|---|---|---|---|---|
| 1 | Home and its dominant: I, V / i, V | 41% / 46% | 43% | 2 |
| 2 | The subdominant side: IV, ii, iv / iv, iiø | 57% / 62% | 58% | 20 |
| 3 | The V of V; the move to the relative key | 62% / 67% | 64% | 36 |
| 4 | Going to ii and iv: V of ii, vi / V of iv | 73% / 73% | 75% | 111 |
| 5 | The other secondary dominants, iii / III, VI; parallel and subdominant keys | 84% / 81% | 85% | 199 |
| 6 | Diminished and borrowed colour: #IV°, #I°, bII / #IV°, bII, bVI7 | 86% / 86% | 88% | 225 |
| 7 | The ii before a secondary dominant (and IV7, bVII7, bII7) | 91% / 92% | 94% | 261 |

- **Below level 4 whole tunes are mostly played for you**, so levels 1–3
  practise on drills: short progressions that walk the corpus's usual moves,
  using only your chords, in any key. Whole tunes come from level 4.
- **"Something else"**: a chord not yet on your board is answered with a
  *Something else* button; noticing it is part of the training.
- **Level 7 is an idea more than new chords**: any secondary dominant can bring
  its own ii (Bm7(b5) → E7 → A7 in Cochichando).
- **Unlocking**: each chord right, or another way of the same move, 17 of its
  last 20 times, in at least 3 keys; one question in five from earlier levels.
- Each level has three ways in: *Meet it* (the new chord in three corpus tunes
  where it is easy to hear), *Drills* and *Tunes*.

## 9. Open questions

- **Follow mode**: real-time tapping is the riskiest assumption; it needs a
  playback engine with a choro rhythm. Test whether tapping along to someone
  else's recording feels playable, and at what rate of chord changes.
- **From the map to the guitar**: showing a 6-string voicing for each chord you
  pick, e.g. inversions that keep the bass line moving, so the ear training
  carries over to the hands.
- **Hum detection** with the recording playing in the room; headphones may be
  needed.
- **A phrase spanning two chords** on the listening screen needs a way to mark
  the split; a *these are bass notes* switch would sharpen suggestions.
- **The ii of a secondary ii–V** (level 7) has no button on the board yet.
- **Same job** is a hand-picked list of pairs; *another path* needs testing
  against more paired versions of tunes.
- **The mockups do not share state** (the map always opens in D minor), the
  sound is a simple synthesised pluck, and the mastery and review numbers are
  examples, not computed.

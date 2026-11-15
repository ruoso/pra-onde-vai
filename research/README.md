# Research scripts

Quick analysis code, kept so every number in `docs/design.md` can be produced
again. Python 3, standard library only; run from the repository root with
`python3 -I`.

## Data

```
git clone --depth 1 https://github.com/DCMLab/choro.git vendor/dcml-choro
```

`vendor/` is not committed. `vendor/dcml-choro/data/choro.tsv` is the corpus
table (one row per chord: key, local key, Roman numeral, bar, section),
`vendor/dcml-choro/data/transcriptions/` the transcriptions; their formats and
traps are in `docs/corpus-notes.md`. Licensed CC BY-NC-SA 4.0 (see the
top-level README). Below, `$T` is the table and `$X` the transcriptions folder.

Some scripts read a cifra.md book of the user's own charts (a folder of
`*.cifra.md`), given as `<book>` below.

## Scripts

| Script | What it gives | Used in design.md |
|---|---|---|
| `corpus_labels.py` | `label(row)`: the map's function for a corpus chord (shared by the others) | — |
| `tiers.py $T` | next-move shares out of each map chord, and how sections open, as JSON | §4, §5 |
| `fit.py $T [title…]` | per tune: share of its chord changes on the full board, keys visited | §6 |
| `levels.py $T` | function frequencies, and each level's coverage | §8 |
| `transitions.py $T` | the first look at the corpus: moves out of each function | §2, §4 |
| `analyse.py <book>/*.cifra.md` | the rule-based analyser: section keys against a hand analysis, chord labels, formulas | §3.3 |
| `graph.py <book>` | the move graph of the user's charts by function | §2 |
| `home.py <book>` | how sections start and end in the user's charts | §1 |
| `dcml2cifra.py $X $T <out> [skip-title…]` | the corpus as cifra.md songs, each part written once: a return to a part is the part again in the Form, and what the corpus plays around it is an Intro, a Break, a To C or the Coda (a return playing only some of its part is "A, short", listed on stdout); then normalise them with `cifra-fmt -w <out>/*.cifra.md` (the Go command in `../estante-de-cifras/cifra.md/go/cmd/cifra-fmt`) | §3.1 |
| `verify.py $X <out>` | after normalising: every converted song plays chord for chord as transcribed, a later return to a part read as one pass of it short of at most its last four bars, which the next section plays instead (it compares canonical spellings, so `NC` before normalising reads as a difference) | §3.1 |
| `compare.py <mine> <theirs>` | two versions of a song, section by section | §7.1 |
| `versions.py <mine> <theirs> [<mine> <theirs>…]` | how two versions differ, classified, over many pairs | §7.1 |

`analyse.py` holds its hand analysis of the 13-chart book (`GOLD`, section
keys by title); `graph.py` and `home.py` import it. `verify.py` reads the
`mapping.tsv` that `dcml2cifra.py` writes beside it.

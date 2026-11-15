# Research scripts

Quick analysis code, kept so every number in `docs/design.md` can be produced
again. Python 3, standard library only; run with `python3 -I`.

## Data

```
git clone --depth 1 https://github.com/DCMLab/choro.git ../dcml
```

`../dcml/data/choro.tsv` is the corpus table (one row per chord: key, local
key, Roman numeral, bar, section); `../dcml/data/transcriptions/` the
transcriptions. Licensed CC BY-NC-SA 4.0 (see the top-level README).

Some scripts read a cifra.md book of the user's own charts (a folder of
`*.cifra.md`), given as `<book>` below.

## Scripts

| Script | What it gives | Used in design.md |
|---|---|---|
| `corpus_labels.py` | `label(row)`: the map's function for a corpus chord (shared by the others) | — |
| `tiers.py ../dcml/data/choro.tsv` | next-move shares out of each map chord, and how sections open, as JSON | §4, §5 |
| `fit.py ../dcml/data/choro.tsv [title…]` | per tune: share of its chord changes on the full board, keys visited | §6 |
| `levels.py ../dcml/data/choro.tsv` | function frequencies, and each level's coverage | §8 |
| `transitions.py ../dcml/data/choro.tsv` | the first look at the corpus: moves out of each function | §2, §4 |
| `analyse.py <book>/*.cifra.md` | the rule-based analyser: section keys against a hand analysis, chord labels, formulas | §3.3 |
| `graph.py <book>` | the move graph of the user's charts by function | §2 |
| `home.py <book>` | how sections start and end in the user's charts | §1 |
| `dcml2cifra.py <transcriptions> <choro.tsv> <out> [skip-title…]` | the corpus as cifra.md songs (normalise them with cifra.md's `cifra-fmt -w` after) | §3.1 |
| `verify.py <transcriptions> <out>` | every converted song plays chord for chord as transcribed | §3.1 |
| `compare.py <mine> <theirs>` | two versions of a song, section by section | §7.1 |
| `versions.py <mine> <theirs> [<mine> <theirs>…]` | how two versions differ, classified, over many pairs | §7.1 |

`analyse.py` holds its hand analysis of the 13-chart book (`GOLD`, section
keys by title); `graph.py` and `home.py` import it. `verify.py` reads the
`mapping.tsv` that `dcml2cifra.py` writes beside it.

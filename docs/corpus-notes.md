# The DCML Choro Songbooks Corpus: working notes

What was learned using the corpus for this design, including the traps. The
corpus is at [github.com/DCMLab/choro](https://github.com/DCMLab/choro)
(CC BY-NC-SA 4.0); `research/` has the scripts that read it.

## Layout

- `data/choro.tsv` — one row per chord *as played*, 44 067 rows, 295 pieces.
  (The README calls it `choro.csv`; it is tab-separated, `.tsv`.)
- `data/transcriptions/*.txt` — one file per piece, 297 files: the chart as
  written, with its form. Two have no rows in the table and no form line:
  `2_chorinho_pra_voce_WF.txt` and `3_um_chorinho_na_aldeia_WF.txt`, second
  copies of `1_um_chorinho_pra_voce_WF.txt` and `1_um_chorinho_em_aldeia_WF.txt`.
  Leave them out; the corpus is the 295 in the table.
- `choro2harte.py` — the authors' converter to Harte chord syntax.
- `LICENSE` — CC BY-NC-SA 4.0 for the whole repository.

## The transcription format

Each line is `Name[opt]: body`, blank lines between groups. Three lines have a
space before the colon (`PartB[A] : …`); accept it.

- **Phrases**, `P0`, `P1`, …: `|`-separated bars, usually with a trailing `|`.
  - An **empty cell** (`| |`) is the previous bar again, held. It is never the
    first bar of a phrase.
  - Tokens are chords, `.` (the previous chord carries on a beat: `F . F/A`)
    and `NC` (no chord).
  - `P3[Em]`: the phrase's local key, when it differs.
- **Parts**: `PartA`, `PartB[F]` (with the part's key), `PartA2`, `Intro`,
  `Coda`, `Fadeout`, `Impro`. The body is phrase references:
  `$P1 $P2 $P1 $P3`, and `$P0*3` for three times.
- **The form**: `S[Dm, 2/4]: $PartA $PartB $P1 $P6 $PartC $P1 $P2` — the play
  order, with the global key and the meter. Bare phrases in the form are
  returns to a part with a different ending (`$P1 $P6`: A's first phrase, then
  a new ending), intros and codas.
- Recurring shapes: `X E1 X E2` is a repeat with first and second endings;
  `X Y X Y` a repeat. Anything else is in order.

### Chord spellings

Close to Brazilian cifra: `7M`, `m7(b5)`, `7(9)`, `7(b13)`, `6(9)`, `m(7M)`,
`7(4)(9)` (sus), `(#5)`. Specific to the corpus:

- `o` is the **diminished** chord (`A#o`, `F#o/A`): `°` in cifra.md. In
  Brazilian reading a bare `°` is the diminished seventh.
- `(omit3)` occurs four times (in *Nó na garganta* and *Perspectivo*); cifra.md
  has no spelling for it.
- `m7/b5` occurs once (the slash is a separator, as in Brazilian cifras).

## The table, `choro.tsv`

Columns: `global_key local_key global_meter local_meter local_mode global_mode
path phrase part bar_no duration chord harte root rn_chord rn_harte sd type
added extensions bass_note songbook title composer sub_genre year filename`.

- `sd` (scale degree of the root in the local key: `I`, `bIII`, `#IV`…), `type`
  (`''`, `m`, `o`), `added` (`''`, `7`, `6`, `7M`) and `local_mode` are what
  `research/corpus_labels.py` maps to the map's functions (V of ii, #IV°…). That
  mapping is hand-written and has not been checked chord by chord.
- `rn_chord` is the corpus's own Roman numeral (`V7`, `#VIm7(b5)`, `II7/5`).
- `composer` separates several composers with `; `; `year` reads as a float
  (`1877.0`) and may be empty.

### Traps

- **The table is the form expanded.** A phrase played four times has its rows
  four times. For statistics about the music as written (transitions, function
  frequencies), take each `(filename, phrase)` once — the research scripts take
  its first contiguous run.
- **`bar_no` skips held bars.** An empty cell in a transcription has no row,
  and the numbering does not count it: Cochichando's `Dm | A7 | | Dm A7` is
  bars 1, 2, 3 in the table. Take bars from the transcriptions and align
  chords by order.
- **`duration`** reads as fractions of a whole note (0.5 is a whole 2/4 bar,
  0.25 half of one), not quarter notes as the README says.
- **Keys can be off.** *Sonoroso*'s global key is `D` though it is in D minor.
  Check a tune's key against its last cadence before relying on it.
- Some chords have `sd` `NC` (no chord); skip them.
- **`.` has a row.** `D . Em7 A7` is four rows, the second a `D` again: the
  chord carries on, and the table repeats it.
- **A counted phrase is played once.** Only two transcriptions write a count
  (`$P0*14` in *Alvorada*, `$P0*3` in *Forró de gala*), and in both the table
  plays the phrase once.
- **A phrase name can be defined twice.** *Aguenta seu Fulgêncio* and *Meu
  sabiá* each write `P7` twice; the table plays the first in one and the
  second in the other. The build takes the definition that aligns.
- With those three read as the table reads them, all 295 tunes align with the
  table chord for chord (`scripts/corpus/build.test.js`).

## Figures used in the design

Reproduced by the scripts in `research/`, and by the app's data build
(`npm run data`), whose tests pin them; see `docs/design.md` for where each is
used.

- Function frequencies: major I 22%, V 18.5%, ii 9.3%, V of ii 6.0%, V of V
  5.2%, vi 4.8%; minor i 24.2%, V 21.6%, iv 11.7%, V of iv 6.2%, V of V 5.4%,
  iiø 4.2% (`levels.py`).
- Sections open on the tonic in 65% of major and 64% of minor parts
  (`tiers.py`).
- Of the 109 minor-key pieces with a B part, 49 put it in the relative major,
  12 in the parallel major, 35 stay in the key.
- The full map board covers a median 88% of a tune's chord changes; 133–135
  tunes reach 90% (`levels.py`, `fit.py`; they round differently).

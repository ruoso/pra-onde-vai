# Other styles: how far the choro board reaches

A first measurement towards styles beyond choro: the choro board (design §4,
with level 7) run over another repertoire, read with the app's own labelling.
Every figure here comes from `research/jazz.mjs`.

## Jazz: the Jazz Harmony Treebank

[DCML's Jazz Harmony Treebank](https://github.com/DCMLab/JazzHarmonyTreebank)
(Harasim, Finkensiep, Ericson, O'Donnell & Rohrmeier, ISMIR 2020): 1,170
standards from the iRealPro corpus (977 in major, 193 in minor), each with its
chords bar by bar and **one key**. CC BY-NC-SA 4.0, like the choro corpus.

| Level | Coverage (maj / min) | Median tune | Tunes ≥ 80% | Tunes ≥ 90% |
|---|---|---|---|---|
| 1 | 29% / 34% | 30% | 1 | 1 |
| 2 | 48% / 49% | 49% | 29 | 11 |
| 3 | 51% / 52% | 53% | 46 | 16 |
| 4 | 62% / 55% | 64% | 168 | 36 |
| 5 | 76% / 69% | 80% | 579 | 207 |
| 6 | 78% / 74% | 81% | 649 | 267 |
| 7 | 88% / 83% | 93% | 895 | 700 |

For choro the same board gives 91% / 89% and a median tune of 93% (design
§8). So the board reaches jazz almost as far as choro, but by another road:

- **Level 7 matters far more.** Jazz's median tune goes from 81% to 93% at
  level 7, choro's from 88% to 93%: the ii of a secondary dominant is jazz's
  everyday chord, and the bluesy sevenths (IV7, bVII7) are common.
- **The order differs.** Home and its dominant are 29% of jazz's chord changes
  in major against 41% of choro's; ii is 12.8% (choro 9.3%). Out of I, jazz
  goes most to ii (13%) and vi (11%); choro to V (22%) and the V of ii (13%).
  A jazz level plan would be computed from jazz's frequencies, not choro's.
- **What the board lacks**, in major: tritone substitutes (bVI7 1.5%, bIII7
  1.1%, bII7 0.9%, #IV7 0.8%: 11% of all dominants resolve down a semitone)
  and borrowed chords (Im 0.9%, bVI 0.7%, bVII 0.6%, bIII 0.5%); in minor, the
  chords around VI and bVII (VI7, bVII, bVIIm, bVIm, about 1% each).

### What the figures do not show

The treebank gives one key per tune, and jazz modulates: a bridge in another
key is read against the tune's key. That cuts both ways. A cadence into a key
the board has no destination for counts as missed (10% of what the board
misses is such a cadence); and a chord of the new key can land on a button
for the wrong reason: in *All the Things You Are*, the G7 → C of the second
eight reads as "V of iii" in A♭; in *Blue Bossa*, the A♭7 of the ii–V into
D♭ reads as choro minor's bVI7. So the coverage above is an upper bound on
what the board explains correctly, until key regions are annotated or
inferred (the rule-based analyser of design §3.3 does it for a section's key).

## What a jazz style would take

From this, and from the parts of the app that are choro's (the board's
colour row and level 7, two modes only, chord classes that ignore 7 against
maj7, the same-job pairs, four-bar phrases, the violão pattern):

1. **A row for tritone substitutes**, the commonest thing jazz plays that
   the board has no place for, and their pairs in the same-job list.
2. **Borrowed chords** (Im, bVI, bVII, bIII in major) as colour.
3. **Levels computed from jazz's frequencies**, not choro's order.
4. **Key regions**, so a bridge's ii–V–I is heard in its own key: from an
   analyser, before the figures above can be trusted function by function.
5. A swing comping pattern for the sound.

Modes (design's major/minor decision) are not needed for the standards
measured here; they would be for modal jazz.

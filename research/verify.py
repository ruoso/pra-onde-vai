"""Check each converted song plays the same chords as its transcription.

usage: python3 -I verify.py <transcriptions-dir> <converted-dir>

For every song, the chords as played (the form expanded, `%` and repeat groups
and endings expanded) must equal the transcription's S line expanded, with the
corpus's `o` read as `°`. Only bars are compared; annotation and note lines are
skipped. This is an independent reading of the written text, not of the
converter's internals.

A part is written once, and the Form names it again when it comes back, to be
played the way choro is played. So a later entry of a part in the Form may play
one pass of it (the part's repeat group with one of its endings, with or without
what is written before and after the group) short of its last four bars at most,
which the next section of the Form then plays instead: a To C, a Coda, or the
next part. The first entry of each part, and every other section (To ..., Break,
Coda, ..., short), must play exactly as transcribed.
"""
import os
import re
import sys

sys.argv, here = sys.argv, os.path.dirname(os.path.abspath(__file__))
tdir, cdir = sys.argv[1:3]


def chord(tok):
    m = re.match(r'^([A-G][#b]?)(.*?)(/[A-G][#b]?)?$', tok)
    if not m or tok in ('NC', '.'):
        return 'N.C.' if tok == 'NC' else tok
    body = m.group(2)
    if body.startswith('o'):
        body = '°' + body[1:]
    return m.group(1) + body + (m.group(3) or '')


def source(path):
    phrases, parts, form = {}, {}, None
    for raw in open(path, encoding='utf-8'):
        line = raw.strip()
        if not line:
            continue
        name, rest = re.match(r'^([A-Za-z]+\d*)(?:\[[^\]]*\])?\s*:\s*(.*)$', line).groups()
        if re.fullmatch(r'P\d+', name):
            cells = rest.split('|')
            if cells and not cells[-1].strip():
                cells = cells[:-1]
            bars, prev = [], None
            for c in cells:
                toks = [chord(t) for t in c.split()]
                bars.append(toks if toks else prev)
                prev = bars[-1]
            phrases[name] = bars
        else:
            refs = []
            for t in rest.split():
                n, k = re.match(r'^\$([A-Za-z]+\d*)(?:\*(\d+))?$', t).groups()
                refs += [n] * int(k or 1)
            (parts.__setitem__(name, refs) if name != 'S' else None)
            if name == 'S':
                form = refs

    def play(n):
        if n in parts:
            return [b for r in parts[n] for b in play(r)]
        return [list(b) for b in phrases[n]]
    return [b for r in form for b in play(r)]


def converted(path):
    """The Form line, and each section's chords as played and its passes."""
    text = open(path, encoding='utf-8').read()
    form = re.search(r'^Form: (.*)$', text, re.M).group(1).split(' → ')
    sections, cur, fence = {}, None, False
    for line in text.split('\n'):
        if line.startswith('## '):
            cur = line[3:]
            sections[cur] = []
            continue
        if line.startswith('```'):
            fence = not fence
            continue
        if fence and cur is not None and not line.startswith('//'):
            sections[cur].append(line)

    def expand(lines):
        # Tokenise to a flat item stream with bar separators kept.
        stream = []
        for line in lines:
            stream.extend(re.findall(r'\|:|:\||\||[^\s|]+', line))
            stream.append('|')  # end of line is a bar end
        # Group into bars and marks.
        items, bar = [], []
        for tok in stream:
            if tok in ('|', '|:', ':|') or re.fullmatch(r'x\d+', tok) or re.fullmatch(r'\d+\.', tok):
                if bar:
                    items.append(('bar', bar))
                    bar = []
                if tok == '|:':
                    items.append(('open', None))
                elif tok == ':|':
                    items.append(('close', None))
                elif tok.startswith('x'):
                    items.append(('count', int(tok[1:])))
                elif tok.endswith('.'):
                    items.append(('ending', int(tok[:-1])))
                # a plain | is just a separator; a doubled one adds nothing
                for _ in ():
                    pass
                continue
            bar.append(tok)
        if bar:
            items.append(('bar', bar))
        # Play.
        out, i = [], 0
        while i < len(items):
            kind, val = items[i]
            if kind == 'bar':
                out.append(val)
                i += 1
            elif kind == 'open':
                j = i + 1
                body, endings, cur_end = [], {}, None
                while items[j][0] != 'close':
                    k, v = items[j]
                    if k == 'ending':
                        cur_end = v
                        endings[v] = []
                    elif k == 'bar':
                        (endings[cur_end] if cur_end else body).append(v)
                    j += 1
                j += 1
                count = 2
                if j < len(items) and items[j][0] == 'count':
                    count = items[j][1]
                    j += 1
                last = None
                if j < len(items) and items[j][0] == 'ending':
                    last = items[j][1]
                    endings[last] = []
                    j += 1
                    while j < len(items) and items[j][0] == 'bar':
                        endings[last].append(items[j][1])
                        j += 1
                passes = max(endings) if endings else count
                for p in range(1, passes + 1):
                    out.extend(body)
                    out.extend(endings.get(p, []))
                i = j
            else:
                i += 1
        # % is the previous bar as played.
        played = []
        for b in out:
            played.append(list(played[-1]) if b == ['%'] else b)
        return played

    def passes(lines):
        """One pass of a part, read from its bars as played: the whole part;
        X E1 X E2 gives X E1, X E2 and X; a unit played k times, then a tail,
        gives the unit with and without the tail; and the same after a pickup
        of up to four bars played once."""
        def of(w, pickup=True):
            out = [w]
            n = len(w)
            for m in range(1, n // 2 + 1):
                for e1 in range(1, n - 2 * m + 1):
                    if w[m + e1:2 * m + e1] == w[:m] and 2 * m + e1 < n:
                        x, a, b = w[:m], w[m:m + e1], w[2 * m + e1:]
                        out += [x + a, x + b, x]
                k = 1
                while w[k * m:(k + 1) * m] == w[:m]:
                    k += 1
                if k >= 2:
                    out += [w[:m], w[:m] + w[k * m:]]
            if pickup:
                for p in range(1, min(4, n - 1) + 1):
                    out += [q for r in of(w[p:], False) for q in (r, w[:p] + r)]
            return out
        return [q for q in of(expand(lines)) if q]

    return form, {n: expand(ls) for n, ls in sections.items()}, {n: passes(ls) for n, ls in sections.items()}


EXACT = re.compile(r'^(To |Break|Coda)|, short')


def plays_as(src, form, played, passes):
    """Whether the Form plays the source, reading later returns of a part by
    the convention above; returns the number of such returns, or None."""
    def walk(i, pos, seen):
        if i == len(form):
            return 0 if pos == len(src) else None
        name = form[i]
        bars = played[name]
        if src[pos:pos + len(bars)] == bars:
            r = walk(i + 1, pos + len(bars), seen | {name})
            if r is not None:
                return r
        if name in seen and not EXACT.search(name):
            for q in passes[name]:
                for n in range(len(q), max(1, len(q) - 4) - 1, -1):
                    if src[pos:pos + n] == q[:n]:
                        r = walk(i + 1, pos + n, seen)
                        if r is not None:
                            return r + 1
        return None
    return walk(0, 0, frozenset())


bad = 0
names = {}
for fn in os.listdir(cdir):
    title = re.search(r'^# (.*)$', open(os.path.join(cdir, fn), encoding='utf-8').read(), re.M).group(1)
    names[fn] = title
src_by_title = {}
import csv  # noqa: E402
for fn in sorted(os.listdir(cdir)):
    pass
mapping = {}
for line in open(os.path.join(here, 'mapping.tsv'), encoding='utf-8'):
    a, b = line.rstrip('\n').split('\t')
    mapping[a] = b
conventional = 0
for fn in sorted(os.listdir(cdir)):
    src = source(os.path.join(tdir, mapping[fn]))
    form, played, ps = converted(os.path.join(cdir, fn))
    r = plays_as(src, form, played, ps)
    if r is None:
        bad += 1
        got = [b for name in form for b in played[name]]
        k = next((i for i, (a, b) in enumerate(zip(src, got)) if a != b), min(len(src), len(got)))
        print(f'{fn}: does not play as transcribed; read literally it differs at played bar {k + 1}: '
              f'source {src[k:k + 3]} converted {got[k:k + 3]} ({len(src)} vs {len(got)} bars)')
    else:
        conventional += r
print(f'{len(os.listdir(cdir)) - bad} of {len(os.listdir(cdir))} songs play as transcribed '
      f'({conventional} returns to a part read as a player plays them)')

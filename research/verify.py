"""Check each converted song plays the same chords as its transcription.

usage: python3 -I verify.py <transcriptions-dir> <converted-dir>

For every song, the chords as played (the form expanded, `%` and repeat groups
and endings expanded) must equal the transcription's S line expanded, with the
corpus's `o` read as `°`. Only bars are compared; annotation and note lines are
skipped. This is an independent reading of the written text, not of the
converter's internals.
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
    """Expand the cifra.md text: sections by the Form line, repeats as played."""
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

    return [b for name in form for b in expand(sections[name])]


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
for fn in sorted(os.listdir(cdir)):
    src = source(os.path.join(tdir, mapping[fn]))
    got = converted(os.path.join(cdir, fn))
    if src != got:
        bad += 1
        k = next((i for i, (a, b) in enumerate(zip(src, got)) if a != b), min(len(src), len(got)))
        print(f'{fn}: differs at played bar {k + 1}: source {src[k:k + 3]} converted {got[k:k + 3]} '
              f'({len(src)} vs {len(got)} bars)')
print(f'{len(os.listdir(cdir)) - bad} of {len(os.listdir(cdir))} songs play exactly as transcribed')

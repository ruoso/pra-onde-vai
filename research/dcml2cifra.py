"""Convert the DCML Choro Songbooks Corpus transcriptions to cifra.md songs.

usage: python3 -I dcml2cifra.py <transcriptions-dir> <choro.tsv> <out-dir> [skip-title ...]

Each part is written once. Where the form plays phrases between parts, the
run is read as returns to parts and the phrases of no part around them: a
return that plays a pass of its part (give or take the last bar or two, or a
last ending of up to four bars that the next section replaces) is the part
again in the Form line; the phrases of no part are an Intro (or the section
they repeat), a Break when all N.C., "To X" before the next part, or the Coda,
which also holds the part's last ending when the song ends on it. A return
that plays only some of its part is written as "<part>, short". The returns
read as short are listed on stdout.

The output is close to canonical but not guaranteed to be: run cifra-fmt -w -u
over it afterwards. Titles given as skip-title (compared without accents, case
or punctuation) are not written.
"""
import csv
import os
import re
import sys
import unicodedata

LINE = re.compile(r'^([A-Za-z]+\d*)(?:\[([^\]]*)\])?\s*:\s*(.*)$')
REF = re.compile(r'^\$([A-Za-z]+\d*)(?:\*(\d+))?$')
CHORD = re.compile(r'^([A-G][#b]?)(.*?)(/[A-G][#b]?)?$')
BARS_PER_LINE = 4


def fold(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '', s.lower())


def slug(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-') or 'untitled'


def chord(tok):
    """Respell a corpus chord token for cifra.md: `o` is the corpus's diminished."""
    if tok in ('NC', '.'):
        return tok
    m = CHORD.match(tok)
    if not m:
        return tok
    root, body, bass = m.group(1), m.group(2), m.group(3) or ''
    if body.startswith('o'):
        body = '°' + body[1:]
    return root + body + bass


def read(path):
    phrases, parts, form, order = {}, {}, None, []
    for raw in open(path, encoding='utf-8'):
        line = raw.strip()
        if not line:
            continue
        m = LINE.match(line)
        if not m:
            raise ValueError(f'{path}: cannot read line {line!r}')
        name, opt, body = m.groups()
        if re.fullmatch(r'P\d+', name):
            cells = body.split('|')
            if cells and not cells[-1].strip():
                cells = cells[:-1]
            bars = []
            for cell in cells:
                toks = cell.split()
                bars.append([chord(t) for t in toks] if toks else ['%'])
            phrases[name] = {'key': opt, 'bars': bars}
        else:
            refs = []
            for tok in body.split():
                r = REF.match(tok)
                if not r:
                    raise ValueError(f'{path}: bad reference {tok!r}')
                refs.append((r.group(1), int(r.group(2) or 1)))
            if name == 'S':
                key, meter = [x.strip() for x in opt.split(',')]
                form = {'key': key, 'meter': meter, 'refs': refs}
            else:
                parts[name] = {'key': opt, 'refs': refs}
                order.append(name)
    return phrases, parts, form


def part_label(name):
    m = re.fullmatch(r'Part([A-Z])(\d*)', name)
    if m:
        return m.group(1) + m.group(2)
    return {'Fadeout': 'Fade-out', 'Impro': 'Improvisation'}.get(name, name)


def bar_lines(bars):
    """Chunk a phrase's bars into lines of BARS_PER_LINE, as lists of bar strings."""
    cells = [' '.join(b) for b in bars]
    return [cells[i:i + BARS_PER_LINE] for i in range(0, len(cells), BARS_PER_LINE)]


def flat(refs):
    """[(name, times)] -> [name, ...] with times written out."""
    out = []
    for name, times in refs:
        out.extend([name] * times)
    return out


def tidy(lines):
    """Join a line with no bar line onto the line before it, so every chord is in a measure."""
    out = []
    for ln in lines:
        if '|' not in ln and not ln.startswith('//'):
            prev = next((k for k in range(len(out) - 1, -1, -1) if not out[k].startswith('//')), None)
            if prev is not None and prev == len(out) - 1:
                out[prev] = out[prev] + (' ' if out[prev].endswith('|') else ' | ') + ln
                continue
            ln = ln + ' |'
        out.append(ln)
    return out


class Fence:
    """The lines of one music fence, with the key annotations it needs."""

    def __init__(self, phrases, key):
        self.phrases = phrases
        self.key = key
        self.lines = []

    def annotate(self, name):
        k = self.phrases[name]['key']
        if k and k != self.key:
            self.lines.append(f'// key: {k}')
            self.key = k

    def plain(self, names):
        for name in names:
            self.annotate(name)
            for cells in bar_lines(self.phrases[name]['bars']):
                self.lines.append(' | '.join(cells))

    def group(self, names, count):
        """|: names :| xcount, spanning as many lines as it needs."""
        rows = []
        for name in names:
            self.annotate(name)
            for cells in bar_lines(self.phrases[name]['bars']):
                rows.append(cells)
        if not rows:
            return
        out = [' | '.join(r) for r in rows]
        out[0] = '|: ' + out[0]
        out[-1] = out[-1] + ' :|' + (f' x{count}' if count != 2 else '')
        self.lines.extend(out)

    def endings(self, body, first, second):
        """|: body |1. first :|2. second |"""
        rows = []
        for name in body:
            self.annotate(name)
            for cells in bar_lines(self.phrases[name]['bars']):
                rows.append(cells)
        out = [' | '.join(r) for r in rows]
        out[0] = '|: ' + out[0]
        self.lines.extend(out)
        one = ' | '.join(' '.join(b) for b in self.phrases[first]['bars'])
        two = ' | '.join(' '.join(b) for b in self.phrases[second]['bars'])
        self.lines.append(f'|1. {one} :|2. {two} |')

    def sequence(self, names):
        """Write a phrase sequence, using repeat signs where the shape allows."""
        n = len(names)
        # X E1 X E2: a repeat with first and second endings.
        if n == 4 and names[0] == names[2] and names[1] != names[3] and names[0] not in (names[1], names[3]):
            self.endings([names[0]], names[1], names[3])
            return
        # X Y ... X Y: the same run played k times.
        for size in range(1, n // 2 + 1):
            if n % size == 0:
                unit = names[:size]
                if unit * (n // size) == names and n // size > 1:
                    self.group(unit, n // size)
                    return
        # Otherwise in order, with runs of one phrase as a counted group.
        i = 0
        while i < n:
            j = i
            while j + 1 < n and names[j + 1] == names[i]:
                j += 1
            if j > i:
                self.group([names[i]], j - i + 1)
            else:
                self.plain([names[i]])
            i = j + 1


stats = {'new': [], 'short': [], 'coda-ending': [], 'ending-replaced': [], 'intro-from-part': [], 'reused': [], 'tail-dropped': [], 'coda-from-part': []}


def endings_of(whole):
    """X E1 X E2 (X one or more phrases): the endings, else None."""
    n = len(whole)
    if n % 2 == 0 and n >= 4:
        m = n // 2 - 1
        if whole[:m] == whole[m + 1:2 * m + 1] and whole[m] != whole[-1]:
            return [whole[m], whole[-1]]
    return None


def passes_of(whole, nbars=None, top=True):
    """The ways one pass of a part is written: the whole part, a body and one
    ending, the repeated unit, and the same after a pickup played once."""
    out = [whole]
    e = endings_of(whole)
    if e:
        m = len(whole) // 2 - 1
        out += [whole[:m] + [e[0]], whole[:m] + [e[1]], whole[:m]]
    n = len(whole)
    for size in range(1, n // 2 + 1):
        if n % size == 0 and whole[:size] * (n // size) == whole:
            out.append(whole[:size])
            break
    for size in range(1, n // 2 + 1):        # U U ... T: the unit repeated, then a tail
        k = 1
        while whole[k * size:(k + 1) * size] == whole[:size]:
            k += 1
        if k >= 2 and k * size < n:
            out += [whole[:size] + whole[k * size:]]
    if top and nbars and n > 1 and whole[0] not in whole[1:] and nbars([whole[0]]) <= 4:
        rest = passes_of(whole[1:], nbars, False)
        out += rest + [[whole[0]] + q for q in rest]
    return out


def convert(path, meta, phrases, parts, form):
    gkey = form['key']
    sections = []          # (name, part key or None, phrase names)
    labels = []            # the form, in play order
    written = {}           # part name -> section label
    used = set()

    def unique(label):
        base, k = label, 2
        while label in used:
            label = f'{base} {k}'
            k += 1
        used.add(label)
        return label

    refs = form['refs']
    i = 0
    while i < len(refs):
        name, times = refs[i]
        if name in parts:
            if name not in written:
                written[name] = unique(part_label(name))
                sections.append((written[name], parts[name]['key'], flat(parts[name]['refs'])))
            labels.extend([written[name]] * times)
            i += 1
            continue
        # A run of bare phrases between parts: returns to parts, and the
        # phrases of no part around them (an intro, a break, a transition, a coda).
        j = i
        while j < len(refs) and refs[j][0] not in parts:
            j += 1
        run = flat(refs[i:j])
        owner_of = lambda ph: next((p for p in parts if ph in flat(parts[p]['refs'])), None)
        blocks = []                       # [owner or None, [phrases]]
        for ph in run:
            o = owner_of(ph)
            if blocks and blocks[-1][0] == o:
                blocks[-1][1].append(ph)
            else:
                blocks.append([o, [ph]])
        nxt = refs[j][0] if j < len(refs) else None
        rebuilt = []
        for b, (o, names) in enumerate(blocks):
            rebuilt += names
            last = b == len(blocks) - 1
            same = next((lab for lab, _, ph in sections if ph == names), None)
            if same:                      # the phrases of a section already written: that section again
                labels.append(same)
                stats['reused'].append((path, same))
                continue
            if o is None:
                allnc = all(all(t in ('NC', '%') for t in bar) for ph in names for bar in phrases[ph]['bars'])
                if i == 0 and b == 0:
                    label = 'Intro'
                elif last and nxt is None:
                    label = 'Coda'
                elif allnc:
                    label = 'Break'
                elif last:
                    label = 'To ' + (written.get(nxt) or part_label(nxt))
                elif b == 0:
                    label = 'To ' + (written.get(blocks[1][0]) or part_label(blocks[1][0]))
                else:
                    label = 'Link'
                label = unique(label)
                sections.append((label, None, names))
                labels.append(label)
                stats['new'].append((path, label))
                continue
            whole = flat(parts[o]['refs'])
            plabel = written.get(o) or part_label(o)
            # The first time a part is heard is not a return to it: unless the
            # run plays all of it, what it plays is a section of its own.
            first = o not in written
            if first and names == whole:
                written[o] = unique(plabel)
                sections.append((written[o], parts[o]['key'], whole))
                plabel = written[o]
            nbars = lambda ps: sum(len(phrases[x]['bars']) for x in ps)
            passes = passes_of(whole, nbars)
            follows_new = not last and blocks[b + 1][0] is None
            nbars = lambda ps: sum(len(phrases[x]['bars']) for x in ps)
            if names not in passes and any(len(names) < len(q) and names == q[:len(names)] and nbars(q[len(names):]) <= 2 for q in passes):
                passes.append(names)       # the pass, with its last bar or two left to the player
                stats['tail-dropped'].append(path)
            if names not in passes and follows_new and any(len(names) < len(q) and names == q[:len(names)] and nbars(q[len(names):]) <= 4 for q in passes):
                passes.append(names)       # a pass whose last phrase the new material replaces
                stats['ending-replaced'].append(path)
            if first and names != whole:
                passes = []
            if names in passes:
                labels.append(plabel)
                # The song ends on the part's own last ending: write it as the Coda.
                if last and nxt is None and endings_of(whole) and names[-1] == endings_of(whole)[-1] and len(names) > 1:
                    label = unique('Coda')
                    sections.append((label, None, [names[-1]]))
                    labels.append(label)
                    stats['coda-ending'].append(path)
            elif last and nxt is None and nbars(names) <= 4:
                label = unique('Coda')
                sections.append((label, None, names))
                labels.append(label)
                stats['coda-from-part'].append(path)
            elif i == 0 and b == 0:
                label = unique('Intro')
                sections.append((label, parts[o]['key'], names))
                labels.append(label)
                stats['intro-from-part'].append(path)
            else:
                label = unique(plabel + ', short')
                sections.append((label, parts[o]['key'], names))
                labels.append(label)
                stats['short'].append((path, label, ' '.join(names), ' '.join(whole), 'then new' if follows_new else ('end' if last and nxt is None else 'then ' + str(nxt if last else blocks[b + 1][0]))))
        assert rebuilt == run, (path, run, rebuilt)
        i = j

    props = [('artist', meta['composer'])]
    props.append(('key', gkey))
    props.append(('time', form['meter']))
    props.append(('notation', 'brazilian'))
    if meta['sub_genre']:
        props.append(('genre', meta['sub_genre']))
    if meta['year']:
        props.append(('year', str(int(float(meta['year'])))))
    props.append(('source', f"Choro Songbook vol. {meta['songbook']} (Chediak, Sève, Souza & Dininho, Lumiar), "
                            'via the DCML Choro Songbooks Corpus, CC BY-NC-SA 4.0'))

    out = [f"# {meta['title']}"]
    out += [f'- {k}: {v}' for k, v in props if v]
    out += ['', 'Form: ' + ' → '.join(labels)]
    for label, pkey, names in sections:
        key = pkey or phrases[names[0]]['key'] or gkey
        out += ['', f'## {label}']
        if key != gkey:
            out += ['', f'Key: {key}']
        fence = Fence(phrases, key)
        fence.sequence(names)
        out += ['', '```'] + tidy(fence.lines) + ['```']
    return '\n'.join(out) + '\n'


def main():
    tdir, tsv, outdir = sys.argv[1:4]
    skip = {fold(t) for t in sys.argv[4:]}
    meta = {}
    for r in csv.DictReader(open(tsv, encoding='utf-8'), delimiter='\t'):
        meta.setdefault(r['filename'], r)
    os.makedirs(outdir, exist_ok=True)
    names, skipped, missing = {}, [], []
    for fn in sorted(os.listdir(tdir)):
        m = meta.get(fn)
        phrases, parts, form = read(os.path.join(tdir, fn))
        if m is None or form is None:
            missing.append(fn)
            continue
        if fold(m['title']) in skip:
            skipped.append(m['title'])
            continue
        base = slug(m['title'])
        name, k = base, 2
        while name in names:
            name = f'{base}-{k}'
            k += 1
        names[name] = fn
        with open(os.path.join(outdir, name + '.cifra.md'), 'w', encoding='utf-8') as f:
            f.write(convert(fn, m, phrases, parts, form))
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mapping.tsv'), 'w', encoding='utf-8') as f:
        for name, fn in sorted(names.items()):
            f.write(f'{name}.cifra.md\t{fn}\n')
    print(f'wrote {len(names)}; skipped (already in the book) {len(skipped)}: {", ".join(skipped)}')
    print('new-material sections:', len(stats['new']), '; codas from a last ending:', len(stats['coda-ending']), '; endings replaced:', len(stats['ending-replaced']), '; intros from a part:', len(stats['intro-from-part']), '; reused:', len(stats['reused']), '; tail dropped:', len(stats['tail-dropped']), '; codas from a part:', len(stats['coda-from-part']))
    for x in stats['short']: print('SHORT', *x, sep='\t')
    print(f'not converted (no metadata or no form line) {len(missing)}: {", ".join(missing)}')


main()

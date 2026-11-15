"""Convert the DCML Choro Songbooks Corpus transcriptions to cifra.md songs.

usage: python3 -I dcml2cifra.py <transcriptions-dir> <choro.tsv> <out-dir> [skip-title ...]

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
        # A run of bare phrases between parts.
        j = i
        while j < len(refs) and refs[j][0] not in parts:
            j += 1
        run = flat(refs[i:j])
        # The parts this run draws its phrases from, in the order it uses them.
        owners = []
        for ph in run:
            p = next((p for p in parts if ph in flat(parts[p]['refs'])), None)
            if p and p not in owners:
                owners.append(p)
        owner = owners[0] if owners else None
        drawn = ' and '.join(written.get(p) or part_label(p) for p in owners)
        if owner and run == flat(parts[owner]['refs']):
            label = written.get(owner) or part_label(owner)
            labels.append(label)
        else:
            if i == 0 and not owners:
                label = 'Intro'
            elif j == len(refs):
                label = (drawn + ', last time') if owners else 'Coda'
            else:
                label = (drawn + ' again') if owners else 'Link'
            label = unique(label)
            sections.append((label, None, run))
            labels.append(label)
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
        out += ['', '```'] + fence.lines + ['```']
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
    print(f'not converted (no metadata or no form line) {len(missing)}: {", ".join(missing)}')


main()

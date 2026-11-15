"""Classify how two versions of the same tune differ, bar by bar.

usage: python3 -I versions.py <book-song> <corpus-song> [...pairs]
"""
import collections, difflib, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from compare import sections  # noqa: E402  (reads sections as written, % expanded)

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def pc(n):
    v = NOTE[n[0]]
    for a in n[1:]: v += 1 if a == '#' else -1
    return v % 12

def chord(tok):
    m = re.match(r'^([A-G][#b]?)(.*?)(?:/([A-G][#b]?))?$', tok)
    if not m: return None
    root, body, bass = pc(m.group(1)), m.group(2), m.group(3)
    if body.startswith('°') or body.startswith('dim'): q, ivs = 'dim', [0, 3, 6, 9]
    elif 'm7(b5)' in body or 'ø' in body: q, ivs = 'hdim', [0, 3, 6, 10]
    elif re.match(r'^m(?!aj)', body):
        q = 'min'; ivs = [0, 3, 7] + ([9] if body.startswith('m6') else [10] if body.startswith('m7') else [])
    elif re.match(r'^(7M|maj7|M7)', body): q, ivs = 'maj', [0, 4, 7, 11]
    elif '7' in body or '9' in body or '13' in body: q, ivs = 'dom', [0, 4, 7, 10]
    elif body.startswith('6'): q, ivs = 'maj', [0, 4, 7, 9]
    elif body.startswith('+') or '(#5)' in body: q, ivs = 'aug', [0, 4, 8]
    else: q, ivs = 'maj', [0, 4, 7]
    return {'root': root, 'q': q, 'pcs': {(root + i) % 12 for i in ivs},
            'bass': pc(bass) if bass else root, 'core': (root, q)}

def pair_kind(a, b):
    """How chord b differs from chord a, as a kind of move."""
    if a['core'] == b['core']:
        return 'same chord, other bass or colour'
    for x, y in ((a, b), (b, a)):
        if x['q'] == 'dom' and y['q'] == 'dim' and y['pcs'] <= {(x['root'] + i) % 12 for i in (1, 4, 7, 10)}:
            return 'diminished for its dominant'
    if a['q'] == 'dom' and b['q'] == 'dom' and (a['root'] - b['root']) % 12 == 6:
        return 'tritone substitute'
    for x, y in ((a, b), (b, a)):
        if y['q'] == 'dom' and x['root'] == y['root'] and x['q'] in ('maj', 'min'):
            return 'made into a secondary dominant'
    shared = len(a['pcs'] & b['pcs'])
    if a['bass'] == b['bass'] and shared >= 2:
        return 'same bass, related chord'
    if shared >= 2:
        return 'related chord (two notes shared)'
    return 'different harmony'

def bar_kinds(x, y):
    xa = [chord(t) for t in x.split()]
    ya = [chord(t) for t in y.split()]
    if None in xa or None in ya: return ['unreadable']
    if len(xa) != len(ya):
        cx, cy = [c['core'] for c in xa], [c['core'] for c in ya]
        short, long_ = (cx, cy) if len(cx) < len(cy) else (cy, cx)
        it = iter(long_)
        if all(c in it for c in short):
            return ['passing chord added or left out']
        return ['bar rewritten']
    return [pair_kind(a, b) for a, b in zip(xa, ya) if a['pcs'] != b['pcs'] or a['bass'] != b['bass']]

total = collections.Counter(); same = 0; compared = 0; unaligned = 0
args = sys.argv[1:]
for mine_path, theirs_path in zip(args[::2], args[1::2]):
    mine, theirs = sections(mine_path), sections(theirs_path)
    for name in [n for n in theirs if n in mine]:
        a, b = mine[name], theirs[name]
        sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op == 'equal':
                same += i2 - i1; compared += i2 - i1; continue
            if op == 'replace' and i2 - i1 == j2 - j1:
                for x, y in zip(a[i1:i2], b[j1:j2]):
                    compared += 1
                    for k in bar_kinds(x, y): total[k] += 1
            else:
                unaligned += max(i2 - i1, j2 - j1)
n = sum(total.values())
print(f'{compared} aligned bars, {same} identical; {n} differences in the rest; {unaligned} bars not aligned (form or endings)')
for k, v in total.most_common():
    print(f'  {v:4}  {100*v/n:4.0f}%  {k}')

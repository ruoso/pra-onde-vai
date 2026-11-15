import csv, sys, collections, json, os
rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8'), delimiter='\t'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from corpus_labels import label  # noqa: E402
ALIAS = {'iiø/ii': 'iiø'}
BOARD = {'major': ['I', 'V', 'ii', 'vi', 'iii', 'IV', 'V/ii', 'V/V', 'V/vi', 'V/iii', 'V/IV', 'iv', '#I°', '#IV°', 'bII'],
         'minor': ['i', 'V', 'iv', 'iiø', 'III', 'VI', 'V/V', 'V/iv', 'V/III', 'V/VI', 'bII', 'bVI7', '#IV°']}
seen = set(); runs = []; cur = None
for r in rows:
    k = (r['filename'], r['phrase'], r['path']); kk = (r['filename'], r['phrase'])
    if cur is None or cur[0] != k:
        if kk in seen: cur = (k, None); continue
        seen.add(kk); cur = (k, []); runs.append((r['local_mode'], cur[1]))
    if cur[1] is not None:
        l = label(r)
        cur[1].append(ALIAS.get(l, l) if l else None)
out = {}
for mode in ('major', 'minor'):
    edges = collections.Counter(); tot = collections.Counter()
    for m, seq in runs:
        if m != mode: continue
        s = [x for x in seq if x]; s = [x for i, x in enumerate(s) if i == 0 or x != s[i-1]]
        for a, b in zip(s, s[1:]): edges[(a, b)] += 1; tot[a] += 1
    ex = {}
    for a in BOARD[mode]:
        if not tot[a]: continue
        lst = sorted(((b, round(100 * k / tot[a])) for (x, b), k in edges.items() if x == a and b in BOARD[mode]), key=lambda t: -t[1])
        ex[a] = [[b, p] for b, p in lst if p >= 3][:6]
        ex[a + '#n'] = tot[a]
    out[mode] = ex
first = {}
for r in rows:
    if r['part'] and (r['filename'], r['part']) not in first and label(r):
        l = label(r); first[(r['filename'], r['part'])] = (r['local_mode'], ALIAS.get(l, l))
for mode in ('major', 'minor'):
    c = collections.Counter(l for m, l in first.values() if m == mode); t = sum(c.values())
    out[mode + '_opens'] = {'counts': {a: k for a, k in c.items() if a in BOARD[mode]}, 'total': t}
print(json.dumps(out, ensure_ascii=False, indent=1))

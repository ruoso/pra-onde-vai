import csv, sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from corpus_labels import label  # noqa: E402
ALIAS = {'iiø/ii': 'iiø'}
BOARD = {'major': set(['I', 'V', 'ii', 'vi', 'iii', 'IV', 'V/ii', 'V/V', 'V/vi', 'V/iii', 'V/IV', 'iv', '#I°', '#IV°', 'bII']),
         'minor': set(['i', 'V', 'iv', 'iiø', 'III', 'VI', 'V/V', 'V/iv', 'V/III', 'V/VI', 'bII', 'bVI7', '#IV°'])}
rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8'), delimiter='\t'))
by = collections.defaultdict(list)
for r in rows: by[r['filename']].append(r)
out = []
for fn, rs in by.items():
    seq = []
    for r in rs:
        l = label(r)
        if not l: continue
        l = ALIAS.get(l, l)
        item = (l, r['local_mode'], r['local_key'])
        if not seq or seq[-1] != item: seq.append(item)
    on = sum(1 for l, m, k in seq if l in BOARD[m])
    keys = []
    for _, _, k in seq:
        if not keys or keys[-1] != k: keys.append(k)
    m = rs[0]
    out.append((m['title'], m['composer'], m['global_key'], m['sub_genre'], round(100 * on / len(seq)), len(set(keys)), len(seq), fn))
want = sys.argv[2:]
for t in out:
    if not want or any(w.lower() in t[0].lower() for w in want):
        print('\t'.join(map(str, t)))
print('median fit', sorted(t[4] for t in out)[len(out)//2], ' >=90%:', sum(t[4] >= 90 for t in out), ' >=80%:', sum(t[4] >= 80 for t in out), 'of', len(out))

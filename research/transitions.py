import csv, sys, collections, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from corpus_labels import label  # noqa: E402
rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8'), delimiter='\t'))
print('rows', len(rows), 'pieces', len({r['filename'] for r in rows}))
for col in ('sd', 'type', 'added', 'local_mode', 'sub_genre'):
    print(col, collections.Counter(r[col] for r in rows).most_common(16))


# each written phrase once: first contiguous run of (filename, phrase)
seen = set(); runs = []; cur = None
for r in rows:
    k = (r['filename'], r['phrase'], r['path'])
    kk = (r['filename'], r['phrase'])
    if cur is None or cur[0] != k:
        if kk in seen: cur = (k, None); continue
        seen.add(kk); cur = (k, []); runs.append((r['local_mode'], cur[1]))
    if cur[1] is not None: cur[1].append(label(r))
for mode, homeLab in (('major', 'I'), ('minor', 'i')):
    nodes = collections.Counter(); edges = collections.Counter()
    for m, seq in runs:
        if m != mode: continue
        s = [x for x in seq if x]; s = [x for i, x in enumerate(s) if i == 0 or x != s[i-1]]
        nodes.update(s); edges.update(zip(s, s[1:]))
    n = sum(nodes.values())
    print(f'\n## {mode}: {n} chord events; top nodes:', ', '.join(f'{a} {c}' for a, c in nodes.most_common(16)))
    for lab in ([homeLab, 'V', 'ii', 'IV', 'iv', 'V/ii', 'V/V', 'V/vi', 'vi'] if mode == 'major' else [homeLab, 'V', 'iv', 'V/V', 'V/iv', 'III']):
        outs = sorted(((b, k) for (a, b), k in edges.items() if a == lab), key=lambda x: -x[1]); tot = sum(k for _, k in outs)
        if tot: print(f'  from {lab:5} (n={tot}):', ', '.join(f'{b} {100*k//tot}%' for b, k in outs[:7]))
# openings: first chord of each part
first = {}
for r in rows:
    if r['part'] and (r['filename'], r['part']) not in first and label(r): first[(r['filename'], r['part'])] = (r['local_mode'], label(r))
for mode in ('major', 'minor'):
    c = collections.Counter(l for m, l in first.values() if m == mode); t = sum(c.values())
    print(f'openings {mode} (n={t}):', ', '.join(f'{a} {100*k//t}%' for a, k in c.most_common(6)))

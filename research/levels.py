import csv, sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from corpus_labels import label  # noqa: E402
ALIAS = {'iiø/ii': 'iiø'}
rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8'), delimiter='\t'))
by = collections.defaultdict(list)
for r in rows: by[r['filename']].append(r)
tunes = {}
freq = {'major': collections.Counter(), 'minor': collections.Counter()}
for fn, rs in by.items():
    seq = []
    for r in rs:
        l = label(r)
        if not l: continue
        item = (ALIAS.get(l, l), r['local_mode'], r['local_key'])
        if not seq or seq[-1] != item: seq.append(item)
    tunes[fn] = seq
    for l, m, k in seq: freq[m][l] += 1
for m in ('major', 'minor'):
    tot = sum(freq[m].values()); acc = 0
    print(f'== {m}: {tot} chord events')
    for l, n in freq[m].most_common(18):
        acc += n; print(f'   {l:8} {n:5}  {100*n/tot:5.1f}%  cum {100*acc/tot:5.1f}%')
LEVELS = [
    ('1 home and dominant', {'I', 'V'}, {'i', 'V'}),
    ('2 + subdominant side', {'IV', 'ii', 'iv'}, {'iv', 'iiø'}),
    ('3 + the dominant of the dominant', {'V/V'}, {'V/V'}),
    ('4 + going to ii and iv', {'V/ii', 'vi'}, {'V/iv'}),
    ('5 + the other secondary dominants', {'V/vi', 'V/IV', 'V/iii', 'iii'}, {'V/III', 'III', 'V/VI', 'VI'}),
    ('6 + diminished and borrowed colour', {'#IV°', '#I°', 'bII'}, {'#IV°', 'bII', 'bVI7'}),
]
majset, minset = set(), set()
for name, mj, mn in LEVELS:
    majset |= mj; minset |= mn
    cov = []
    for fn, seq in tunes.items():
        on = sum(1 for l, m, k in seq if l in (majset if m == 'major' else minset))
        cov.append(on / len(seq))
    cov.sort()
    allm = sum(freq['major'][l] for l in majset) / sum(freq['major'].values())
    alln = sum(freq['minor'][l] for l in minset) / sum(freq['minor'].values())
    print(f'L{name}: major {100*allm:.0f}% of chords, minor {100*alln:.0f}%; median tune {100*cov[len(cov)//2]:.0f}%; tunes >=90%: {sum(c >= .9 for c in cov)}, >=80%: {sum(c >= .8 for c in cov)}')

L7 = ({'Vm', 'bIII°', 'bVII7', 'IV7'}, {'Vm', '#VIm', 'VIIm', 'IV7', 'bII7'})
majset |= L7[0]; minset |= L7[1]
cov = sorted(sum(1 for l, m, k in seq if l in (majset if m == 'major' else minset)) / len(seq) for seq in tunes.values())
allm = sum(freq['major'][l] for l in majset) / sum(freq['major'].values())
alln = sum(freq['minor'][l] for l in minset) / sum(freq['minor'].values())
print(f'L7 + the ii of a secondary ii-V, and the bluesy sevenths: major {100*allm:.0f}%, minor {100*alln:.0f}%; median tune {100*cov[len(cov)//2]:.0f}%; >=90%: {sum(c >= .9 for c in cov)}, >=80%: {sum(c >= .8 for c in cov)}')

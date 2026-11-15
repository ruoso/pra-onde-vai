import sys, os, re, glob, collections, io, contextlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
argv = sys.argv; sys.argv = ['x']
with contextlib.redirect_stdout(io.StringIO()):
    import analyse as A
files = sorted(glob.glob(os.path.join(argv[1], '*.cifra.md')))
def simp(l):
    l = re.sub(r' \((delayed|deceptive|m6)\)', '', l)
    if ' in ' in l: return '(other key)'
    if 'unresolved' in l or l.endswith('?'): return '(unexplained)'
    l = l.replace('°→bass ', 'vii°/').replace('iiø/→', 'ii/→')
    return l
for mode in ('maj', 'min'):
    nodes = collections.Counter(); edges = collections.Counter(); nsec = 0
    for f in files:
        title, sections = A.read(f)
        keys = [A.detect_key(b) for _, b in sections]
        for (name, bars), key in zip(sections, keys):
            if key[1] != mode: continue
            nsec += 1
            cs = A.flat(bars); others = [k[0] for k in keys]
            labs = [simp(A.label(cs, i, key, others)[0]) for i in range(len(cs))]
            seq = [l for i, l in enumerate(labs) if i == 0 or l != labs[i-1]]
            nodes.update(seq); edges.update(zip(seq, seq[1:]))
    n = sum(nodes.values()); acc = 0; k90 = None
    for i, (lab, c) in enumerate(nodes.most_common(), 1):
        acc += c
        if k90 is None and acc >= 0.9 * n: k90 = i
    print(f'\n##### {mode}: {nsec} sections, {n} chord events, {len(nodes)} distinct functions, {k90} cover 90%')
    print('nodes:', ', '.join(f'{l} {c}' for l, c in nodes.most_common(22)))
    ne = sum(edges.values()); acc = 0; e80 = None
    for i, (e, c) in enumerate(edges.most_common(), 1):
        acc += c
        if e80 is None and acc >= 0.8 * ne: e80 = i
    print(f'edges: {len(edges)} distinct, {e80} cover 80% of moves')
    for lab, c in nodes.most_common(9):
        outs = [(b, k) for (a, b), k in edges.items() if a == lab]; tot = sum(k for _, k in outs)
        outs.sort(key=lambda x: -x[1])
        top3 = sum(k for _, k in outs[:3])
        print(f'  from {lab:8} ({len(outs):2} exits; top 3 = {100*top3//tot}%): ' + ', '.join(f'{b} {100*k//tot}%' for b, k in outs[:6]))

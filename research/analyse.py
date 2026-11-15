import re, sys, os, collections

PC = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
NAMES = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B']
def pc(n):
    v = PC[n[0]]
    for a in n[1:]: v += 1 if a == '#' else -1
    return v % 12

CH = re.compile(r'^([A-G][#b]?)([^/\[]*)(?:/([A-G][#b]?))?(?:\[\d+\])?$')
def parse_chord(tok):
    m = CH.match(tok)
    if not m: return None
    root, rest, bass = m.groups()
    if '°' in rest: q = 'dim'
    elif 'm7(b5)' in rest: q = 'hdim'
    elif rest.startswith('m') and not rest.startswith('maj'): q = 'min'
    elif ('7' in rest and 'maj7' not in rest and '7M' not in rest) or 'sus' in rest or '9' in rest: q = 'dom'
    else: q = 'maj'
    return dict(sym=tok, root=pc(root), q=q, bass=pc(bass) if bass else pc(root))

def read(path):
    """-> title, [(section, [bar,...])], bar = [chord,...]"""
    title, sections, cur, fence = None, [], None, False
    for line in open(path, encoding='utf-8'):
        line = line.rstrip('\n')
        if line.strip() == '---': break
        if line.startswith('# '): title = line[2:]; continue
        if line.startswith('## '): cur = (line[3:], []); sections.append(cur); continue
        if line.startswith('```'): fence = not fence; continue
        if not fence or cur is None: continue
        line = re.sub(r'\[[^\]]*\]', ' ', line)       # ending labels
        line = re.sub(r'@\d+', ' ', line); line = re.sub(r'\(\s+', ' ', line); line = re.sub(r'\s+\)', ' ', line)
        for cell in line.split('|'):
            toks = cell.split()
            if not toks: continue
            if toks == ['%']:
                if cur[1]: cur[1].append(list(cur[1][-1]))
                continue
            bar = [c for c in (parse_chord(t) for t in toks if t != '-') if c]
            if bar: cur[1].append(bar)
    return title, sections

def flat(bars): return [c for b in bars for c in b]

def is_tonic(c, key):
    t, mode = key
    return c['root'] == t and c['q'] == ('min' if mode == 'min' else 'maj')

def key_score(bars, key):
    cs = flat(bars); t, mode = key; s = 0
    for a, b in zip(cs, cs[1:]):
        if a['root'] == (t + 7) % 12 and a['q'] in ('dom', 'maj') and is_tonic(b, key): s += 3
    s += sum(1 for c in cs if is_tonic(c, key))
    for i in (3, 7, 15):                     # phrase ends
        if i < len(bars) and is_tonic(bars[i][-1], key): s += 2
    if is_tonic(cs[0], key): s += 1
    tail = cs[-5:]
    for a, b in zip(tail, tail[1:]):
        if a['root'] == (t + 7) % 12 and a['q'] in ('dom', 'maj') and is_tonic(b, key): s += 4
    return s

def detect_key(bars):
    keys = [(t, m) for t in range(12) for m in ('maj', 'min')]
    return max(keys, key=lambda k: key_score(bars, k))

def kname(k): return NAMES[k[0]] + ('m' if k[1] == 'min' else '')

MAJ = {0:('I',{'maj'}),2:('ii',{'min'}),4:('iii',{'min'}),5:('IV',{'maj'}),7:('V',{'maj','dom'}),9:('vi',{'min'}),11:('viiø',{'hdim'})}
MIN = {0:('i',{'min'}),2:('iiø',{'hdim'}),3:('III',{'maj'}),5:('iv',{'min'}),7:('V',{'maj','dom','min'}),8:('VI',{'maj'}),10:('VII',{'maj','dom'})}
BOR_MAJ = {(5,'min'):'iv',(8,'maj'):'bVI',(8,'dom'):'bVI7',(1,'maj'):'bII',(10,'maj'):'bVII',(10,'dom'):'bVII7',(0,'min'):'i',(0,'dom'):'I7',(2,'hdim'):'iiø',(5,'dom'):'IV7'}
BOR_MIN = {(1,'maj'):'bII',(5,'maj'):'IV',(0,'maj'):'I',(0,'dom'):'I7',(8,'dom'):'bVI7',(2,'min'):'ii',(9,'hdim'):'viø'}
DEG = ['I','bII','II','bIII','III','IV','#IV','V','bVI','VI','bVII','VII']

def degname(root, key, q):
    t, mode = key; d = (root - t) % 12
    tab = MAJ if mode == 'maj' else MIN
    if d in tab: 
        n = tab[d][0]
        return n
    n = DEG[d]
    return n.lower() if q in ('min', 'hdim') else n

def label(cs, i, key, other_tonics):
    c = cs[i]; t, mode = key; d = (c['root'] - t) % 12
    nxt = None
    for n in cs[i+1:]:
        if n['root'] != c['root'] or n['q'] != c['q']: nxt = n; break
    tab = MAJ if mode == 'maj' else MIN
    if c['q'] == 'dim':
        pcs = {(c['root'] + k) % 12 for k in (0, 3, 6, 9)}
        if nxt:
            if (nxt['root'] - 1) % 12 in pcs: return 'vii°/' + degname(nxt['root'], key, nxt['q']), 'applied'
            if (nxt['bass'] - 1) % 12 in pcs: return '°→bass ' + degname(nxt['root'], key, nxt['q']), 'applied'
            if (nxt['root'] + 1) % 12 in pcs or (nxt['bass'] + 1) % 12 in pcs: return '°↓' + degname(nxt['root'], key, nxt['q']), 'passing'
            if nxt['root'] in pcs: return 'ct°', 'passing'
        return '°?', 'unexplained'
    if c['q'] in ('dom', 'maj') and nxt and (c['root'] - nxt['root']) % 12 == 7:
        if d == 7: return 'V', 'diatonic'
        if c['q'] == 'dom' or d not in tab or c['q'] not in tab[d][1]:
            return 'V/' + degname(nxt['root'], key, nxt['q']), 'applied'
    if c['q'] == 'dom' and nxt and (c['root'] - nxt['root']) % 12 == 1 and d != 7:
        return 'subV/' + degname(nxt['root'], key, nxt['q']), 'applied'
    if c['q'] in ('min', 'hdim') and nxt and nxt['q'] == 'dom' and (nxt['root'] - c['root']) % 12 == 5 and (nxt['root'] - t) % 12 != 7 \
       and not (d in tab and c['q'] in tab[d][1]):
        return 'ii/→', 'applied'
    if d in tab and c['q'] in tab[d][1]:
        return tab[d][0] + ('7' if c['q'] == 'dom' and d != 7 else ''), 'diatonic'
    bor = (BOR_MAJ if mode == 'maj' else BOR_MIN).get((d, c['q']))
    if c['q'] == 'min' and 'm6' in c['sym'] and nxt and nxt['q'] == 'dom' and (nxt['root'] - c['root']) % 12 == 2 and not bor:
        return 'iiø/→ (m6)', 'applied'
    nxt2 = None
    if nxt:
        k = cs.index(nxt, i)
        for n in cs[k+1:]:
            if n['root'] != nxt['root'] or n['q'] != nxt['q']: nxt2 = n; break
    if c['q'] == 'dom' and nxt2 and (c['root'] - nxt2['root']) % 12 == 7:
        return 'V/' + degname(nxt2['root'], key, nxt2['q']) + ' (delayed)', 'applied'
    if c['q'] == 'dom' and nxt and ((nxt['root'] - c['root']) % 12 == 1 and nxt['q'] == 'maj' or (nxt['root'] - c['root']) % 12 == 2 and nxt['q'] == 'min'):
        return 'V/' + DEG[(d + 5) % 12] + ' (deceptive)', 'applied'
    if nxt is None and c['q'] in ('dom', 'maj'):
        for ot in other_tonics:
            if (c['root'] - ot) % 12 == 7: return 'V→next section', 'applied'
    if bor: return bor, 'borrowed'
    if c['q'] == 'dom': return DEG[d] + '7 (unresolved)', 'unexplained'
    return degname(c['root'], key, c['q']) + '?', 'unexplained'

def formulas(cs, labs, key):
    t, mode = key; out = []
    deg = [(c['root'] - t) % 12 for c in cs]
    for i in range(len(cs) - 2):
        # major ending: IV, (iv | #iv°), I
        if mode == 'maj' and deg[i] == 5 and cs[i]['q'] == 'maj':
            j = i + 1
            mid = cs[j]
            dimpcs = {(mid['root'] + k) % 12 for k in (0, 3, 6, 9)} if mid['q'] == 'dim' else set()
            kind = 'falling' if (deg[j] == 5 and mid['q'] == 'min') else 'rising' if (t + 6) % 12 in dimpcs else None
            if kind and deg[j+1] == 0:
                tail = ' '.join(c['sym'] for c in cs[i:i+8])
                out.append(f'major ending ({kind}): {tail}')
        if mode == 'maj' and deg[i] == 5 and cs[i]['q'] == 'min' and deg[i+1] == 0 and (i == 0 or deg[i-1] != 5):
            out.append('major ending (iv–I only): ' + ' '.join(c['sym'] for c in cs[i:i+7]))
    i = 0
    while i < len(cs):
        j = i
        while j + 1 < len(cs) and cs[j]['q'] == 'dom' and cs[j+1]['q'] == 'dom' and (cs[j]['root'] - cs[j+1]['root']) % 12 == 7: j += 1
        if j - i >= 2: out.append('dominant chain: ' + ' '.join(c['sym'] for c in cs[i:j+2]))
        i = j + 1
    for a, b in zip(cs, cs[1:]):
        if a['q'] == 'dom' and a['bass'] == (a['root'] + 10) % 12 and (a['root'] - b['root']) % 12 == 7 and b['bass'] in ((b['root'] + 3) % 12, (b['root'] + 4) % 12):
            out.append(f"7th-in-bass → 3rd: {a['sym']} {b['sym']}")
    if mode == 'min':
        for i in range(len(cs) - 3):
            if (deg[i] == 5 and cs[i]['q'] == 'min' or deg[i] == 2 and cs[i]['q'] == 'hdim') and deg[i+1] == 0 and cs[i+1]['q'] == 'min':
                tail = cs[i:i+6]
                if any((c['root'] - t) % 12 == 7 for c in tail[2:]):
                    out.append('minor ending: ' + ' '.join(c['sym'] for c in tail))
    return out

GOLD = {'Apanhei-te Cavaquinho':'G Em C','Cochichando':'Dm F D','Coralina':'Dm F D','Sedutor':'Dm F D','Sonoroso':'Dm F D',
        'Sanfonando':'Dm Dm D','Três Estrelinhas':'Dm F Bb','Dominante':'Dm F Bb','Vou Vivendo':'F Dm Bb','Ingênuo':'F F Bb',
        'Noites Cariocas':'G C G','Flor do Abacate':'C C F','Qui nem giló':'D D D'}

tot = collections.Counter(); keyok = keyn = 0; verbose = '-v' in sys.argv
allf = collections.Counter()
for path in sorted(a for a in sys.argv[1:] if a.endswith('.cifra.md')):
    title, sections = read(path)
    keys = [detect_key(b) for _, b in sections]
    gold = GOLD[title].split()
    print(f'\n=== {title}')
    for (name, bars), key, g in zip(sections, keys, gold):
        cs = flat(bars)
        others = [k[0] for k in keys]
        labs = [label(cs, i, key, others) for i in range(len(cs))]
        for i in range(len(cs)):
            if labs[i][1] != 'unexplained': continue
            win = cs[max(0, i-4):i+5]
            for a, b in zip(win, win[1:]):
                if a['q'] in ('dom',) and (a['root'] - b['root']) % 12 == 7 and b['q'] in ('maj', 'min'):
                    k2 = (b['root'], b['q'])
                    if k2 == key: continue
                    l2 = label(cs, i, k2, others)
                    if l2[1] in ('diatonic', 'applied', 'borrowed'):
                        labs[i] = (l2[0] + ' in ' + kname(k2), 'region'); break
        c = collections.Counter(kind for _, kind in labs); tot.update(c)
        ok = kname(key) == g; keyok += ok; keyn += 1
        un = [f"{cs[i]['sym']}={labs[i][0]}" for i in range(len(cs)) if labs[i][1] == 'unexplained']
        print(f"  {name:6} key {kname(key):3} {'ok ' if ok else 'WRONG (gold '+g+')'} | {len(cs)} chords, unexplained {len(un)}: {' '.join(un)}")
        dest = [degname(bars[i][-1]['root'], key, bars[i][-1]['q']) for i in (3, 7, 11, 15) if i < len(bars)]
        print(f"         phrase ends: {' '.join(dest)}")
        if verbose: print('         ' + ' | '.join(' '.join(f"{c['sym']}:{l}" for c, (l, _) in zip(b, labs[sum(len(x) for x in bars[:bi]):])) for bi, b in enumerate(bars)))
        for f in formulas(cs, labs, key):
            print('         * ' + f); allf[f.split(':')[0]] += 1
print(f'\nKEYS: {keyok}/{keyn} sections match the hand analysis')
n = sum(tot.values()); print('CHORDS:', n, {k: f'{v} ({100*v//n}%)' for k, v in tot.items()})
print('FORMULAS:', dict(allf))

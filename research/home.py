import sys, os, glob, io, contextlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
argv = sys.argv; sys.argv = ['x']
with contextlib.redirect_stdout(io.StringIO()):
    import analyse as A
n = first = cad = b16 = 0; firsts = []
for f in sorted(glob.glob(os.path.join(argv[1], '*.cifra.md'))):
    title, sections = A.read(f)
    for name, bars in sections:
        if name == 'Intro': continue
        key = A.detect_key(bars); cs = A.flat(bars); n += 1
        t = A.is_tonic(cs[0], key); first += t
        if not t: firsts.append(f"{title} {name}: {cs[0]['sym']} in {A.kname(key)}")
        tail = cs[-6:]
        cad += any(a['root'] == (key[0] + 7) % 12 and A.is_tonic(b, key) for a, b in zip(tail, tail[1:]))
        b16 += len(bars) >= 16 and A.is_tonic(bars[15][0], key)
print(n, 'sections; first chord is tonic:', first, '; V-I cadence in the last few chords:', cad, '; tonic on bar 16:', b16)
print('\n'.join(firsts))

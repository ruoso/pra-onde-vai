"""Compare a song in the book with its corpus version, section by section, as written.

usage: python3 -I compare.py <book-song> <corpus-song>
"""
import difflib, re, sys

def sections(path):
    out, cur, fence = {}, None, False
    for line in open(path, encoding='utf-8'):
        line = line.rstrip('\n')
        if line.strip() == '---' and not fence: break
        if line.startswith('## ') and not fence:
            cur = line[3:]; out.setdefault(cur, []); continue
        if line.startswith('```'): fence = not fence; continue
        if not fence or cur is None or line.startswith('//'): continue
        line = re.sub(r'\[[^\]]*\]', ' ', line)                  # ending labels like [first]
        line = re.sub(r'(^|\s)(\|:|:\||\d+\.|x\d+|@\d+)(?=\s|$)', ' ', line)
        line = line.replace('|:', '|').replace(':|', '|')
        line = re.sub(r'(^|\s)[()](?=\s|$)', ' ', line)
        for cell in line.split('|'):
            toks = [t for t in cell.split() if t not in ('.', '-', '/')]
            if not toks: continue
            if toks == ['%']:
                if out[cur]: out[cur].append(out[cur][-1])
                continue
            out[cur].append(' '.join(toks))
    return out

def core(bar):
    """Root and quality only: Dm/F -> Dm, A7(b9) -> A7, F#° -> F#°."""
    res = []
    for t in bar.split():
        m = re.match(r'^([A-G][#b]?)(m(?!aj)|°|ø)?(7)?', t)
        res.append(''.join(x or '' for x in m.groups()) if m else t)
    return ' '.join(res)

if __name__ == '__main__':
    mine, theirs = sections(sys.argv[1]), sections(sys.argv[2])
    for name in [n for n in theirs if n in mine]:
        a, b = mine[name], theirs[name]
        exact = difflib.SequenceMatcher(None, a, b, autojunk=False)
        loose = difflib.SequenceMatcher(None, [core(x) for x in a], [core(x) for x in b], autojunk=False)
        print(f'  {name}: {len(a)} bars in yours, {len(b)} in the corpus; '
              f'{round(100 * exact.ratio())}% identical, {round(100 * loose.ratio())}% same root and quality')
        for op, i1, i2, j1, j2 in loose.get_opcodes():
            if op == 'equal': continue
            y = ' | '.join(a[i1:i2]) or '(nothing)'
            c = ' | '.join(b[j1:j2]) or '(nothing)'
            print(f'      yours bar {i1 + 1}: {y}\n      corpus     : {c}')
    only = [n for n in mine if n not in theirs]
    if only: print('  sections only in yours:', ', '.join(only))

"""The board's function for a chord of the DCML Choro Songbooks Corpus.

`label(row)` reads one row of the corpus table (data/choro.tsv): its scale
degree (`sd`), chord type (`type`), added sixth or seventh (`added`) and local
mode, and names the chord as the map does: I, V, V/ii, #IV° and so on. A chord
the map has no place for comes back as its degree and type (`Vm`, `bVII7`).
"""

ALIAS = {'iiø/ii': 'iiø'}


def label(r):
    sd, t, add, mode = r['sd'], r['type'], r['added'], r['local_mode']
    if sd in ('NC', ''): return None
    dom = t == '' and '7' in add and 'M' not in add
    if t in ('o', 'o7', 'dim'): return sd + '°'
    if mode == 'major':
        m = {('I', False, ''): 'I', ('IV', False, ''): 'IV', ('II', False, 'm'): 'ii', ('VI', False, 'm'): 'vi', ('III', False, 'm'): 'iii', ('IV', False, 'm'): 'iv',
             ('I', True, ''): 'V/IV', ('II', True, ''): 'V/V', ('VI', True, ''): 'V/ii', ('III', True, ''): 'V/vi', ('VII', True, ''): 'V/iii'}
        if sd == 'V' and t == '': return 'V'
    else:
        m = {('I', False, 'm'): 'i', ('IV', False, 'm'): 'iv', ('III', False, ''): 'III', ('VI', False, ''): 'VI', ('bIII', False, ''): 'III', ('bVI', False, ''): 'VI',
             ('I', True, ''): 'V/iv', ('II', True, ''): 'V/V', ('VII', True, ''): 'V/III', ('bVII', True, ''): 'V/III', ('III', True, ''): 'V/VI', ('bIII', True, ''): 'V/VI',
             ('VI', True, ''): 'bVI7', ('bVI', True, ''): 'bVI7', ('II', False, 'm'): 'iiø/ii'}
        if sd == 'V' and t == '': return 'V'
    return m.get((sd, dom, t), sd + t + ('7' if dom else ''))

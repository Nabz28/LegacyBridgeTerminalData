import json, os, collections
OUT = os.path.dirname(os.path.abspath(__file__))
F = json.load(open(os.path.join(OUT, 'final_industry_series.json'), encoding='utf-8'))
FREQ = {'P1D': 'Daily', 'P7D': 'Weekly', 'P1M': 'Monthly', 'P3M': 'Quarterly', 'P6M': 'Semiannual', 'P1Y': 'Annual', 'NA': '-'}
tree = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))
for s in F:
    tree[s['industry']][s['sub_industry']][s['side']].append(s)
L = []
W = L.append
W('# LBC Industry Terminal — Indonesia (CEIC) Data Inventory')
W('')
W('**%d series · %d observations · country=`idind` · source=CEIC**' % (len(F), sum(s['n_obs'] for s in F)))
W('')
W('Hierarchy: **Industry → Sub-industry → Demand/Supply → series**. ID code = `CEICI`+CEIC Series ID.')
W('Frequency: `P1D` Daily · `P7D` Weekly · `P1M` Monthly · `P3M` Quarterly · `P1Y` Annual.')
W('')
W('## Summary')
W('')
W('| Industry | Sub-industries | Demand | Supply | Total |')
W('|---|---|---|---|---|')
for ind in sorted(tree):
    d = sum(len(tree[ind][sub]['demand']) for sub in tree[ind])
    s = sum(len(tree[ind][sub]['supply']) for sub in tree[ind])
    W('| %s | %d | %d | %d | %d |' % (ind, len(tree[ind]), d, s, d + s))
W('')
W('## Full series list')
W('')
for ind in sorted(tree):
    W('## %s' % ind)
    for sub in sorted(tree[ind]):
        for side in ('demand', 'supply'):
            arr = tree[ind][sub][side]
            if not arr:
                continue
            W('')
            W('### %s › %s › **%s** (%d)' % (ind, sub, side.upper(), len(arr)))
            W('')
            W('| ID (ric) | CEIC ID | Series | Freq | Unit | Source | Obs |')
            W('|---|---|---|---|---|---|---|')
            for s in sorted(arr, key=lambda x: x['description']):
                rng = '%s→%s' % ((s['first_obs'] or '')[:7], (s['last_obs'] or '')[:7])
                W('| `%s` | %s | %s | %s | %s | %s | %s |' % (
                    s['ric'], s['series_id'], (s['description'] or '')[:80].replace('|', '/'),
                    FREQ.get(s['frequency'], s['frequency']), (s['units'] or '')[:12],
                    (s['source'] or '')[:22], rng))
    W('')
open(os.path.join(OUT, '..', '..', 'docs', 'INDUSTRY_CEIC_DATA_INVENTORY.md'), 'w', encoding='utf-8').write('\n'.join(L))
print('industry report ->', len(F), 'series,', len(L), 'lines')

import json, os, collections
OUT = os.path.dirname(os.path.abspath(__file__))
F = json.load(open(os.path.join(OUT, 'final_series.json'), encoding='utf-8'))
FREQLBL = {'P1D': 'Daily', 'P7D': 'Weekly', 'P1M': 'Monthly', 'P3M': 'Quarterly',
           'P6M': 'Semiannual', 'P1Y': 'Annual', 'NA': '—'}
by = collections.defaultdict(list)
for s in F:
    by[(s['section'], s['category'], s['category_slug'])].append(s)

lines = []
W = lines.append
W('# LBC Macro Terminal — Indonesia (CEIC) Data Inventory')
W('')
W('**%d series · %d observations · country=`id` · source=CEIC**' % (len(F), sum(s['n_obs'] for s in F)))
W('')
W('Frequency tags (ISO-8601): `P1D` Daily · `P1M` Monthly · `P3M` Quarterly · `P6M` Semiannual · `P1Y` Annual.')
W('Each series ID code = `CEIC` + CEIC numeric Series ID. Browsed in the Data Gatherer by category.')
W('')
W('## Category summary')
W('')
W('| Section | Category | category_slug | Series |')
W('|---|---|---|---|')
secorder = ['National Accounts','Prices & Inflation','Money & Finance','External Sector',
            'Government Sector','Labor Market','Industry Sector','Consumer Sector','Surveys & Forecasts']
def secrank(s):
    return secorder.index(s) if s in secorder else 99
for (sec, cat, slug), arr in sorted(by.items(), key=lambda kv: (secrank(kv[0][0]), kv[0][1])):
    W('| %s | %s | `%s` | %d |' % (sec, cat, slug, len(arr)))
W('')
W('## Full series list (by category)')
W('')
for (sec, cat, slug), arr in sorted(by.items(), key=lambda kv: (secrank(kv[0][0]), kv[0][1])):
    W('### %s — %s  `%s`  (%d)' % (sec, cat, slug, len(arr)))
    W('')
    W('| ID code (ric) | CEIC Series ID | Data identifier (description) | Subcategory | Freq | Unit | Source | Obs range |')
    W('|---|---|---|---|---|---|---|---|')
    for s in sorted(arr, key=lambda x: x['description']):
        rng = '%s→%s (%d)' % ((s['first_obs'] or '')[:7], (s['last_obs'] or '')[:7], s['n_obs'])
        desc = (s['description'] or '')[:90].replace('|', '/')
        sub = (s['subcategory'] or '')[:38].replace('|', '/')
        unit = (s['units'] or '')[:14]
        src = (s['source'] or '')[:24]
        W('| `%s` | %s | %s | %s | %s | %s | %s | %s |' %
          (s['ric'], s['series_id'], desc, sub, FREQLBL.get(s['frequency'], s['frequency']), unit, src, rng))
    W('')
open(os.path.join(OUT, '..', '..', 'docs', 'MACRO_CEIC_DATA_INVENTORY.md'), 'w', encoding='utf-8').write('\n'.join(lines))
# also a copy in build dir
open(os.path.join(OUT, 'MACRO_CEIC_DATA_INVENTORY.md'), 'w', encoding='utf-8').write('\n'.join(lines))
print('report rows:', len(F), '-> docs/MACRO_CEIC_DATA_INVENTORY.md (%d lines)' % len(lines))

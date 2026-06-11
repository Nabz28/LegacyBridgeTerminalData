import json, os
OUT = os.path.dirname(os.path.abspath(__file__))
PAY = os.path.join(OUT, 'payload')
os.makedirs(PAY, exist_ok=True)
final = json.load(open(os.path.join(OUT, 'final_industry_series.json'), encoding='utf-8'))
master = json.load(open(os.path.join(OUT, 'master.json'), encoding='utf-8'))
midx = {}
for rel, ss in master.items():
    for s in ss:
        midx[(s['series_id'], rel)] = s

# macro.series-shaped rows (country=idind); industry=category, sub_industry=subcategory, side=stat_role
srows = []
for f in final:
    srows.append({
        'ric': f['ric'], 'slug': f['category_slug'], 'country': 'idind',
        'category': f['industry'], 'category_slug': f['category_slug'],
        'subcategory': f['sub_industry'] or None, 'section': 'Industry',
        'stat_role': f['side'], 'indicator_topic': f['subcategory'] or None,
        'description': f['description'], 'frequency': f['frequency'],
        'units': f['units'], 'source': f['source'], 'source_file': f['source_file'],
        'is_poll': False, 'first_obs': f['first_obs'], 'last_obs': f['last_obs'], 'n_obs': f['n_obs'],
        'metadata': {'industry': f['industry'], 'sub_industry': f['sub_industry'], 'side': f['side']},
    })
SC = 400
for i in range(0, len(srows), SC):
    json.dump(srows[i:i+SC], open(os.path.join(PAY, 'series_%03d.json' % (i//SC)), 'w', encoding='utf-8'), ensure_ascii=False)
n_series_chunks = (len(srows)+SC-1)//SC

obs = []
for f in final:
    rec = midx[(f['series_id'], f['source_file'])]
    ric = f['ric']
    for d, v in rec['obs']:
        obs.append({'ric': ric, 'date': d, 'value': v})
CH = 8000
for i in range(0, len(obs), CH):
    json.dump(obs[i:i+CH], open(os.path.join(PAY, 'obs_%04d.json' % (i//CH)), 'w', encoding='utf-8'), ensure_ascii=False)
n_obs_chunks = (len(obs)+CH-1)//CH

man = {'series_chunks': n_series_chunks, 'series_total': len(srows),
       'obs_chunks': n_obs_chunks, 'obs_total': len(obs), 'obs_chunk_size': CH}
json.dump(man, open(os.path.join(PAY, 'manifest.json'), 'w'))
print(man)

import json, os
OUT = os.path.dirname(os.path.abspath(__file__))
PAY = os.path.join(OUT, 'payload')
os.makedirs(PAY, exist_ok=True)

final = json.load(open(os.path.join(OUT, 'final_series.json'), encoding='utf-8'))
master = json.load(open(os.path.join(OUT, 'master.json'), encoding='utf-8'))
# obs source: per chosen source_file + series_id
midx = {}
for rel, ss in master.items():
    for s in ss:
        midx[(s['series_id'], rel)] = s

# series rows for macro.series (match exact columns)
srows = []
for f in final:
    srows.append({
        'ric': f['ric'], 'slug': f['category_slug'], 'country': 'id',
        'category': f['category'], 'category_slug': f['category_slug'],
        'subcategory': f['subcategory'] or None, 'section': f['section'] or None,
        'description': f['description'], 'frequency': f['frequency'],
        'units': f['units'], 'source': f['source'], 'source_file': f['source_file'],
        'is_poll': False, 'first_obs': f['first_obs'], 'last_obs': f['last_obs'],
        'n_obs': f['n_obs'],
    })
# write series in chunks of 300
for i in range(0, len(srows), 300):
    json.dump(srows[i:i+300], open(os.path.join(PAY, 'series_%03d.json' % (i//300)), 'w', encoding='utf-8'), ensure_ascii=False)
n_series_chunks = (len(srows)+299)//300

# observation rows
obs = []
for f in final:
    rec = midx[(f['series_id'], f['source_file'])]
    ric = f['ric']
    for d, v in rec['obs']:
        obs.append({'ric': ric, 'date': d, 'value': v})
CH = 5000
n_obs_chunks = (len(obs)+CH-1)//CH
for i in range(0, len(obs), CH):
    json.dump(obs[i:i+CH], open(os.path.join(PAY, 'obs_%04d.json' % (i//CH)), 'w', encoding='utf-8'), ensure_ascii=False)

manifest = {'series_chunks': n_series_chunks, 'series_total': len(srows),
            'obs_chunks': n_obs_chunks, 'obs_total': len(obs), 'obs_chunk_size': CH}
json.dump(manifest, open(os.path.join(PAY, 'manifest.json'), 'w'))
print(manifest)

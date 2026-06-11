import json, os, re, collections
OUT = os.path.dirname(os.path.abspath(__file__))
master = json.load(open(os.path.join(OUT, 'master.json'), encoding='utf-8'))
midx = {}
master_ids = set()
for rel, ss in master.items():
    for s in ss:
        midx[(s['series_id'], rel)] = s
        master_ids.add(s['series_id'])
files_by_sid = collections.defaultdict(list)
for (sid, rel) in midx:
    files_by_sid[sid].append(rel)


def slugify(name):
    return 'idind_' + re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def clean(d):
    return re.sub(r'\s+', ' ', str(d or '')).strip().rstrip(':').strip()


recs = []
for n in range(7):
    p = os.path.join(OUT, 'cat_group%d.json' % n)
    g = json.load(open(p, encoding='utf-8'))
    recs.extend(g['series'])
print('merged records:', len(recs))

# coverage check BEFORE dedup
covered = set(r['series_id'] for r in recs)
missing = master_ids - covered
extra = covered - master_ids
print('master unique series_id:', len(master_ids), '| covered:', len(covered),
      '| MISSING:', len(missing), '| EXTRA(not in master):', len(extra))
if missing:
    print('  missing examples:', list(missing)[:10])
if extra:
    print('  extra examples:', list(extra)[:10])

final = {}
side_fix = 0
for r in recs:
    sid = r['series_id']
    if sid not in files_by_sid:
        continue
    best_rel = max(files_by_sid[sid], key=lambda rel: midx[(sid, rel)]['n_obs'])
    mb = midx[(sid, best_rel)]
    side = (r.get('side') or '').strip().lower()
    if side not in ('demand', 'supply'):
        side = 'supply'
        side_fix += 1
    ind = r['industry']
    rec = {
        'ric': 'CEICI' + sid,
        'series_id': sid,
        'country': 'idind',
        'industry': ind,
        'sub_industry': clean(r['sub_industry'])[:60],
        'side': side,
        'description': clean(r['description']),
        'subcategory': clean(r.get('subcategory') or '')[:60],
        'category': ind,
        'category_slug': slugify(ind),
        'section': 'Industry',
        'stat_role': side,
        'frequency': r['frequency'],
        'units': r.get('units'),
        'source': r.get('source'),
        'source_file': best_rel,
        'first_obs': mb['first_obs'],
        'last_obs': mb['last_obs'],
        'n_obs': mb['n_obs'],
        'is_poll': False,
    }
    if sid in final and rec['n_obs'] <= final[sid]['n_obs']:
        continue
    final[sid] = rec

finals = list(final.values())
print('UNIQUE final series:', len(finals), '| side defaulted:', side_fix)
print('total obs:', sum(f['n_obs'] for f in finals))
json.dump(finals, open(os.path.join(OUT, 'final_industry_series.json'), 'w', encoding='utf-8'), ensure_ascii=False)

# tree: industry -> sub_industry -> side -> count
tree = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.Counter()))
for f in finals:
    tree[f['industry']][f['sub_industry']][f['side']] += 1
print('\n=== INDUSTRY TREE (industry / sub-industry : demand|supply) ===')
for ind in sorted(tree):
    tot = sum(sum(s.values()) for s in tree[ind].values())
    print('%-28s  %d series, %d sub-industries' % (ind, tot, len(tree[ind])))
fd = collections.Counter(f['frequency'] for f in finals)
sd = collections.Counter(f['side'] for f in finals)
print('freq:', dict(fd), '| side:', dict(sd))

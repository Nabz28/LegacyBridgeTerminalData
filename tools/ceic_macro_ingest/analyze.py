import json, os, collections
OUT=os.path.dirname(os.path.abspath(__file__))
M=json.load(open(os.path.join(OUT,'master.json'),encoding='utf-8'))
allrows=[]
for rel,ss in M.items():
    for s in ss:
        s2=dict(s); s2['_file']=rel; allrows.append(s2)
print('TOTAL series rows:', len(allrows))
# dedup by series_id
byid=collections.defaultdict(list)
noid=0
for s in allrows:
    if s['series_id']: byid[s['series_id']].append(s)
    else: noid+=1
print('unique CEIC series_id:', len(byid), '| rows without series_id:', noid)
dups=[k for k,v in byid.items() if len(v)>1]
print('series_id appearing in >1 row (dupes):', len(dups))
# DC
dc=sum(1 for s in allrows if s['discontinued'])
print('discontinued (DC/disc) rows:', dc)
# zero obs
zero=sum(1 for s in allrows if s['n_obs']==0)
print('zero-observation rows:', zero)
# freq dist
fd=collections.Counter(s['frequency'] for s in allrows)
print('frequency dist:', dict(fd))
# NA freq examples
na=[ (s['frequency_raw'], s['name'][:40]) for s in allrows if s['frequency']=='NA'][:8]
print('NA freq examples:', na)
# province-ish (clean candidates)
prov=sum(1 for s in allrows if any(p in (s['name'] or '') for p in [': Aceh',': Bali',': Papua',': Jakarta','Province','Provinsi','Maluku','Sulawesi','Kalimantan','Sumatera','Java',' Riau']))
print('province-tagged rows (granular):', prov)
# unique after dedup + drop DC + drop zero-obs
keep={}
for s in allrows:
    if s['discontinued'] or s['n_obs']==0: continue
    k=s['series_id'] or ('NOID::'+s['name']+'::'+s['_file'])
    # prefer the row with more obs
    if k not in keep or s['n_obs']>keep[k]['n_obs']: keep[k]=s
print('CLEAN unique series (no DC, has obs, dedup):', len(keep))
print('CLEAN total obs:', sum(s['n_obs'] for s in keep.values()))
json.dump({'clean_keys':list(keep.keys())}, open(os.path.join(OUT,'analysis.json'),'w'))

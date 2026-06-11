import json, os, collections
OUT=os.path.dirname(os.path.abspath(__file__))
M=json.load(open(os.path.join(OUT,'master.json'),encoding='utf-8'))
slim={}
for rel,ss in M.items():
    arr=[]
    for s in ss:
        arr.append({'series_id':s['series_id'],'name':s['name'],'frequency':s['frequency'],
                    'frequency_raw':s['frequency_raw'],'unit':s['unit'],'source':s['source'],
                    'first_obs':s['first_obs'],'last_obs':s['last_obs'],'n_obs':s['n_obs']})
    slim[rel]=arr
json.dump(slim, open(os.path.join(OUT,'slim.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=0)
files=sorted(slim.keys())
# 5 groups
groups=[[] for _ in range(5)]
for i,f in enumerate(files): groups[i%5].append(f)
json.dump(groups, open(os.path.join(OUT,'groups.json'),'w'))
for gi,g in enumerate(groups):
    ns=sum(len(slim[f]) for f in g)
    print(f'GROUP {gi+1}: {len(g)} files, {ns} series')
    for f in g: print('   ', len(slim[f]), f)

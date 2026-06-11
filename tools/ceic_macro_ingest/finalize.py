import json, os, re, collections
OUT = os.path.dirname(os.path.abspath(__file__))

master = json.load(open(os.path.join(OUT, 'master.json'), encoding='utf-8'))
# index master by (series_id, file) -> record (for obs + n_obs + first/last)
midx = {}
for rel, ss in master.items():
    for s in ss:
        midx[(s['series_id'], rel)] = s

ALLOWED = {
 'id_gdp_by_expenditure','id_gdp_gva_by_industries','id_gdp_deflators','id_consumption',
 'id_investment_capital_allocation','id_income_savings','id_foreign_transactions','id_other_national_accounts',
 'id_balance_of_payments','id_external_debt','id_imports_exports','id_international_investment_position',
 'id_international_reserves','id_central_bank','id_interest_rates','id_exchange_rate_operations',
 'id_money_supply','id_stock_bonds_funds','id_banking','id_government_accounts','id_government_debt_borrowing',
 'id_employment_hours','id_wages_earnings','id_workforce_unemployment','id_business_surveys','id_consumer_surveys',
 'id_cyclical_activity_indices','id_retail_sales','id_personal_expenditures','id_consumer_finances','id_population',
 'id_industrial_production_utilization','id_housing_construction',
 'id_consumer_prices','id_producer_prices','id_capital_markets','id_payment_systems','id_foreign_investment','id_government_revenue',
}
SECTION = {
 'id_gdp_by_expenditure':('National Accounts','GDP by Expenditure'),
 'id_gdp_gva_by_industries':('National Accounts','GDP/GVA by Industry'),
 'id_income_savings':('National Accounts','Incomes & Savings'),
 'id_balance_of_payments':('External Sector','Balance of Payments'),
 'id_external_debt':('External Sector','External Debt'),
 'id_imports_exports':('External Sector','Imports & Exports'),
 'id_international_reserves':('Money & Finance','International Reserves'),
 'id_interest_rates':('Money & Finance','Interest Rates'),
 'id_exchange_rate_operations':('Money & Finance','Exchange Rates & Operations'),
 'id_money_supply':('Money & Finance','Money Supply'),
 'id_banking':('Money & Finance','Banking'),
 'id_capital_markets':('Money & Finance','Capital Markets & Equities'),
 'id_payment_systems':('Money & Finance','Payment & Settlement Systems'),
 'id_government_accounts':('Government Sector','Government Accounts'),
 'id_government_debt_borrowing':('Government Sector','Government Debt & Borrowing'),
 'id_government_revenue':('Government Sector','Government Revenue'),
 'id_workforce_unemployment':('Labor Market','Workforce & Unemployment'),
 'id_wages_earnings':('Labor Market','Wages & Earnings'),
 'id_business_surveys':('Surveys & Forecasts','Business Surveys'),
 'id_consumer_surveys':('Surveys & Forecasts','Consumer Surveys'),
 'id_cyclical_activity_indices':('Surveys & Forecasts','Cyclical & Activity Indices'),
 'id_retail_sales':('Consumer Sector','Retail Sales'),
 'id_industrial_production_utilization':('Industry Sector','Industrial Production & Utilization'),
 'id_consumer_prices':('Prices & Inflation','Consumer Prices (CPI)'),
 'id_producer_prices':('Prices & Inflation','Producer & Wholesale Prices'),
 'id_foreign_investment':('External Sector','Foreign Investment (FDI/PMDN)'),
}

# QA fix: 5 stray industrial series mis-filed under MinimumWage -> industrial production
OVERRIDE = {sid: 'id_industrial_production_utilization' for sid in
            ['506662887','359239887','359240387','359240137','359239147']}

# load agent outputs
recs = []
for n in range(1, 6):
    g = json.load(open(os.path.join(OUT, 'cat_group%d.json' % n), encoding='utf-8'))
    recs.extend(g['series'])
print('merged records:', len(recs))

def clean_desc(d):
    d = re.sub(r'\s+', ' ', str(d or '')).strip().rstrip(':').strip()
    return d

# attach n_obs/file by joining to master via series_id; a rec lacks file, so find best file for its series_id
files_by_sid = collections.defaultdict(list)
for (sid, rel) in midx:
    files_by_sid[sid].append(rel)

final = {}
dropped_dup = 0
for r in recs:
    sid = r['series_id']
    slug = OVERRIDE.get(sid, r['category_slug'])
    if slug not in ALLOWED:
        slug = 'id_other_national_accounts'
    sec, cat = SECTION.get(slug, (r.get('section') or '', r.get('category') or ''))
    # choose canonical source file = the one with max obs for this sid
    best_rel = max(files_by_sid[sid], key=lambda rel: midx[(sid, rel)]['n_obs'])
    mb = midx[(sid, best_rel)]
    rec = {
        'ric': 'CEIC' + sid,
        'series_id': sid,
        'country': 'id',
        'description': clean_desc(r['description']),
        'subcategory': clean_desc(r.get('subcategory') or '')[:60],
        'category_slug': slug,
        'section': sec,
        'category': cat,
        'frequency': r['frequency'],
        'units': r.get('units'),
        'source': r.get('source'),
        'source_file': best_rel,
        'first_obs': mb['first_obs'],
        'last_obs': mb['last_obs'],
        'n_obs': mb['n_obs'],
        'is_poll': False,
    }
    if sid in final:
        dropped_dup += 1
        # keep the one with more obs / prefer existing
        if rec['n_obs'] <= final[sid]['n_obs']:
            continue
    final[sid] = rec

finals = list(final.values())
print('unique final series:', len(finals), '| dup records collapsed:', dropped_dup)
# attach obs and write
with open(os.path.join(OUT, 'final_series.json'), 'w', encoding='utf-8') as fh:
    json.dump(finals, fh, ensure_ascii=False)

# category tree preview
tree = collections.Counter((f['category_slug'], f['section'], f['category']) for f in finals)
print('--- CATEGORY TREE (slug | section | category | n) ---')
for (slug, sec, cat), n in sorted(tree.items()):
    print('%4d  %-34s %-20s %s' % (n, slug, sec, cat))
fd = collections.Counter(f['frequency'] for f in finals)
print('freq:', dict(fd))
tot_obs = sum(f['n_obs'] for f in finals)
print('total obs to load:', tot_obs)
# slug sanity
bad = [f['category_slug'] for f in finals if f['category_slug'] not in ALLOWED]
print('bad slugs:', set(bad))

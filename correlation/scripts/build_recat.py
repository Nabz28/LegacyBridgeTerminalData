"""Build agent4_recat.json — comprehensive IDX-IC sub-industry recategorization for Consumer sectors."""
import json
import os
from collections import Counter

import pandas as pd

# All fetched tickers from parquet
wk = pd.read_parquet("correlation/data/raw/staging/agent4_weekly.parquet")
fetched_ids = set(wk.columns)  # "IDX:XXXX"

recat = {}

# ============================================================
# CONSUMER CYCLICALS (Sector E)
# ============================================================

# Automotive & Components
auto_comp = [
    "ASII", "AUTO", "BOLT", "DRMA", "INDS", "ISAP", "LMAX", "LPIN", "SMSM", "PART", "VKTR", "AEGS", "KAQI",
    "BRAM", "GDYR", "GJTL",
    "IMAS", "MPMX", "HEXA", "UNTR", "ASLC", "BOGA", "CARS", "PMJS", "IMJS",
]
for t in auto_comp:
    recat[f"IDX:{t}"] = "Automotive & Components"

# Apparel & Luxury Goods
apparel = [
    "ERTX", "HRTA", "PBRX", "POLU", "RICY", "TRIS",
    "BATA", "BIMA",
    "ACRO", "ARGO", "BELL", "CNTX", "ESTI", "INDR", "INOV", "MYTX", "POLY", "SBAT", "SPRE", "SRIL", "SSTM", "TFCO", "UNIT",
    "BABY", "MAPA", "MAPI", "ZATA",
]
for t in apparel:
    recat[f"IDX:{t}"] = "Apparel & Luxury Goods"

# Consumer Services (restaurants, education, travel)
consumer_services = [
    "FAST", "PZZA", "RAFI", "MAPB", "LUCY", "BAIK", "CSMI", "DUCK", "ENAK", "PGLI", "PTSP", "FORE",
    "BAYU", "PANR", "PDES", "HAJJ",
    "BMBL", "IDEA", "MERI",
]
for t in consumer_services:
    recat[f"IDX:{t}"] = "Consumer Services"

# Leisure & Recreation
leisure = [
    "PJAA", "BLTZ", "CNMA", "GOLF", "BOLA", "BIKE", "TOYS", "UNTD", "IIKP",
]
for t in leisure:
    recat[f"IDX:{t}"] = "Leisure & Recreation"

# Media & Entertainment
media = [
    "MNCN", "SCMA", "BMTR", "FILM", "MDIA", "NETV", "VIVA", "MARI",
    "FORU", "DOOH", "FUTR",
    "IPTV", "MSKY",
    "ABBA", "DIGI", "TMPO",
    "MSIN", "RAAM", "VERN",
    "EMTK",
]
for t in media:
    recat[f"IDX:{t}"] = "Media & Entertainment"

# Retail (department, specialty, electronics, home improvement)
retail = [
    "LPPF", "RALS", "SONA",
    "ECII", "ERAA", "ERAL", "GLOB", "SLIS", "TRIO", "UFOE",
    "ACES", "BAUT", "CSAP", "DEPO", "KLIN", "TOOL",
    "MKNT", "PMUI", "TELE", "YELO",
    "ZONE",
]
for t in retail:
    recat[f"IDX:{t}"] = "Retail"

# Household Durables
household_dur = [
    "CINT", "GEMA", "LFLO", "MEJA", "MGLV", "OLIV", "SOFA", "WOOD", "CBMF",
    "SCNP",
    "LMPI", "MICE", "KICI",
]
for t in household_dur:
    recat[f"IDX:{t}"] = "Household Durables"

# Hotels & Tourism
hotels = [
    "BUVA", "AKKU", "ARTA", "CLAY", "DFAM", "EAST", "ESTA", "FITT", "GRPH", "GWSA", "HOME", "HOTL",
    "HRME", "JGLE", "JIHD", "JSPT", "KDTN", "KOTA", "KPIG", "MABA", "MINA", "NATO", "NUSA", "PLAN",
    "PNSE", "SNLK", "SHID", "PSKT", "SOTS", "INPP",
]
for t in hotels:
    recat[f"IDX:{t}"] = "Hotels & Tourism"

# ============================================================
# CONSUMER NON-CYCLICALS (Sector D)
# ============================================================

# Food & Beverages
food_bev = [
    # Beverages
    "BEER", "DLTA", "MLBI", "STRK", "WINE",
    "ADES", "ALTO", "CLEO", "GRPM", "SOUL",
    "CAMP", "CMRY", "KEJU", "TGUK", "ULTJ",
    # Processed foods
    "AISA", "BOBA", "BRRC", "COCO", "CEKA", "FOOD", "GOOD", "GUNA", "HOKI",
    "IBOS", "ICBP", "INDF", "ISEA", "MAXI", "MYOR", "NASI", "NAYZ", "PANI", "PMMP", "PSDN", "ROTI",
    "SKBM", "SKLT", "STTP", "TAYS", "YUPI",
    # Food staples retail (supermarkets/distributors)
    "AMRT", "MIDI", "DMND", "KMDS", "PCAR", "WICO", "MPPA", "RANC", "MLPL",
    # Drug retail (D111 - non-cyc adjacent)
    "EPMT", "SDPC", "DAYA",
    # Distributor food
    "TGKA",
]
for t in food_bev:
    recat[f"IDX:{t}"] = "Food & Beverages"

# Poultry & Livestock
poultry = [
    "CPIN", "JPFA", "MAIN", "SIPD", "RLCO",
    "AYAM", "ASHA", "AMMS",
    "WMPP", "WMUU", "UDNG",
]
for t in poultry:
    recat[f"IDX:{t}"] = "Poultry & Livestock"

# Fishery
fishery = [
    "CPRO", "IKAN", "CRAB", "ENZO", "DSFI", "AGAR", "DEWI",
    "DPUM", "NEST",
]
for t in fishery:
    recat[f"IDX:{t}"] = "Fishery"

# Sugar
sugar = [
    "GULA",   # Kencana Murni Agro (sugar)
    "TRGU",   # Tiga Pilar (wheat starch / sweetener)
    "BUDI",   # Budi Starch & Sweetener
    "BEEF",   # Bina Agro Perdana - sometimes sugar-adjacent; keep here as meat
]
# Actually BEEF is livestock/meat — override to Poultry & Livestock
recat["IDX:BEEF"] = "Poultry & Livestock"
for t in ["GULA", "TRGU", "BUDI"]:
    recat[f"IDX:{t}"] = "Sugar"

# Plantation & CPO
plantation = [
    "AALI", "LSIP", "SSMS", "DSNG", "TAPG", "SMAR", "SIMP", "UNSP", "BWPT", "GZCO", "MGRO",
    "SGRO", "STAA", "TLDN", "GOLL", "PSGO", "PGUN", "MAGP", "PALM", "JAWA",
    "ASJT", "ANDI", "CBUT", "FAPA", "IPPE", "JARR", "MKTR", "NSSS", "OILS", "PTPS", "WAPO",
    "TBLA",   # Tunas Baru Lampung - plantation / CPO
    "CKRA",   # plantation
    "BISI",   # agricultural seeds
    "FISH",   # Fishindo / palm/plantation crossover — plantation
]
for t in plantation:
    recat[f"IDX:{t}"] = "Plantation & CPO"

# Tobacco
tobacco = ["GGRM", "HMSP", "ITIC", "WIIM"]
for t in tobacco:
    recat[f"IDX:{t}"] = "Tobacco"

# Personal Care
personal_care = [
    "UNVR", "TCID", "MRAT", "MBTO", "KINO", "VICI",
    "EURO", "FLMC", "MSJA", "NANO", "UCID",
]
for t in personal_care:
    recat[f"IDX:{t}"] = "Personal Care"

# Household Goods
household_goods = ["MDIY"]
for t in household_goods:
    recat[f"IDX:{t}"] = "Household Goods"

# Load universe to validate
with open("correlation/catalog/universe.json") as f:
    universe = json.load(f)
existing_ids = set(s["id"] for s in universe["series"])

# Only keep entries that are fetchable or already in universe
valid_recat = {k: v for k, v in recat.items() if k in fetched_ids or k in existing_ids}

counts = Counter(valid_recat.values())
print("Sub-industry counts:")
for sub, cnt in sorted(counts.items()):
    print(f"  {sub}: {cnt}")
print(f"\nTotal valid mappings: {len(valid_recat)}")
print(f"Total recat entries (before filter): {len(recat)}")

os.makedirs("correlation/catalog/staging", exist_ok=True)
with open("correlation/catalog/staging/agent4_recat.json", "w") as f:
    json.dump(valid_recat, f, indent=2, sort_keys=True)
print("Wrote correlation/catalog/staging/agent4_recat.json")

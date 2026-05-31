"""Apply a .sql file to prod via the Supabase Management API (one transaction).
Reads the Management PAT from brain.vault; never prints it.
Usage: python scripts/legion/_apply_sql.py <path-to.sql>"""
from __future__ import annotations
import sys, json, urllib.request, urllib.error
sys.path.insert(0, "scripts")
from legion._brain import Brain

if len(sys.argv) < 2:
    print("need <path-to.sql>"); sys.exit(2)

sql = open(sys.argv[1], "r", encoding="utf-8").read().replace("﻿", "")
pat = Brain().vault("supabase_management_pat")
REF = "adnubucjlezrtusbicja"

req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{REF}/database/query",
    data=json.dumps({"query": sql}).encode(),
    headers={"Authorization": f"Bearer {pat}", "Content-Type": "application/json",
             "User-Agent": "legion-apply/1.0"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=120) as r:
        print(f"OK {r.status}: {r.read().decode()[:400]}")
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode()[:1500]}")
    sys.exit(1)

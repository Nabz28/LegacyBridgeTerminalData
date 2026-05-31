"""Seed realistic DEMO finance data for LBC (is_demo=true) so the terminal shows
live numbers during review. Posts via post_transaction RPC with a minted admin
JWT (auth.uid() must be non-null). Clear later with: _seed_demo.py --clear
"""
from __future__ import annotations
import sys, json, time, hmac, hashlib, base64, uuid, urllib.request, urllib.error
sys.path.insert(0, "scripts")
from legion._brain import Brain

b = Brain()
ANON = "sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7"
secret = b.vault("supabase_legacy_jwt_secret")


def b64(x): return base64.urlsafe_b64encode(x).rstrip(b"=").decode()


def mint():
    now = int(time.time())
    hdr = {"alg": "HS256", "typ": "JWT"}
    pl = {"sub": str(uuid.uuid4()), "role": "authenticated", "aud": "authenticated",
          "iss": "supabase", "iat": now, "exp": now + 3600, "user_role": "admin"}
    si = b64(json.dumps(hdr, separators=(",", ":")).encode()) + "." + b64(json.dumps(pl, separators=(",", ":")).encode())
    sig = hmac.new(secret.encode(), si.encode(), hashlib.sha256).digest()
    return si + "." + b64(sig)


JWT = mint()


def req(method, path, body=None, profile="finance"):
    data = json.dumps(body).encode() if body is not None else None
    h = {"apikey": ANON, "Authorization": "Bearer " + JWT}
    if method == "GET":
        h["Accept-Profile"] = profile
    else:
        h["Content-Type"] = "application/json"; h["Content-Profile"] = profile; h["Prefer"] = "return=representation"
    r = urllib.request.Request(b.base + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            t = resp.read().decode(); return resp.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


ent = req("GET", "/entities?select=id,code&code=eq.LBC")[1][0]["id"]
accs = {a["code"]: a["id"] for a in req("GET", "/accounts?select=id,code&entity_id=eq." + ent)[1]}


def rpc(fn, args):
    return req("POST", "/rpc/" + fn, args)


if "--clear" in sys.argv:
    code, res = req("DELETE", "/transactions?is_demo=eq.true")
    print("cleared demo txns:", code)
    sys.exit(0)


def post(date, memo, to_code, from_code, amt):
    lines = [{"account_id": accs[to_code], "debit": amt, "credit": 0, "line_order": 0},
             {"account_id": accs[from_code], "debit": 0, "credit": amt, "line_order": 1}]
    code, res = rpc("post_transaction", {"p_entity_id": ent, "p_date": date, "p_memo": memo,
                                         "p_lines": lines, "p_is_demo": True})
    ok = isinstance(res, list) and res and res[0].get("ref")
    print(("OK " + res[0]["ref"]) if ok else ("FAIL " + str(code) + " " + str(res)), "|", memo)


# to_code is debited, from_code credited  (money moves From -> To)
ENTRIES = [
    ("2026-04-02", "Founders paid-in capital",            "1100", "3100", 5_000_000_000),
    ("2026-04-05", "Seed investment into portfolio",      "1300", "1100", 2_000_000_000),
    ("2026-04-10", "Management fee — Q1 mandate",          "1100", "4200", 450_000_000),
    ("2026-04-15", "Office rent — April",                  "5500", "1100", 85_000_000),
    ("2026-04-25", "Team salaries — April",                "5200", "1100", 320_000_000),
    ("2026-04-30", "Bank charges — April",                 "5400", "1100", 3_500_000),
    ("2026-05-03", "Advisory engagement billed",           "1400", "4400", 275_000_000),
    ("2026-05-08", "Management fee — May",                 "1100", "4200", 480_000_000),
    ("2026-05-12", "Realized gain on position exit",       "1100", "4300", 615_000_000),
    ("2026-05-14", "Legal & audit fees accrued",           "5300", "2100", 140_000_000),
    ("2026-05-18", "Advisory invoice collected",           "1100", "1400", 275_000_000),
    ("2026-05-20", "Operating expenses — May",             "5100", "1100", 96_000_000),
    ("2026-05-25", "Team salaries — May",                  "5200", "1100", 335_000_000),
    ("2026-05-27", "Settle legal & audit payable",         "2100", "1100", 140_000_000),
    ("2026-05-28", "Interest income on cash",              "1100", "4100", 22_500_000),
    ("2026-05-30", "Office rent — May",                    "5500", "1100", 85_000_000),
]
for e in ENTRIES:
    post(*e)
print("done — seeded", len(ENTRIES), "demo entries for LBC")

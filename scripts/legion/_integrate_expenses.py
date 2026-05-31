"""Integrate LBC Expense Summary.xlsx into the finance schema (entity LBC).
Posts real (is_demo=false) double-entry transactions via post_transaction.
Memos carry an [IMP] tag + source so the batch is identifiable.
Usage: _integrate_expenses.py        (post)
       _integrate_expenses.py --clear (delete the [IMP] batch)
"""
from __future__ import annotations
import sys, json, time, hmac, hashlib, base64, uuid, urllib.request, urllib.error
sys.path.insert(0, "scripts")
from legion._brain import Brain

b = Brain(); ANON = "sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7"; secret = b.vault("supabase_legacy_jwt_secret")
def bb(x): return base64.urlsafe_b64encode(x).rstrip(b"=").decode()
now = int(time.time()); pl = {"sub": str(uuid.uuid4()), "role": "authenticated", "aud": "authenticated", "iss": "supabase", "iat": now, "exp": now + 3600, "user_role": "admin"}
si = bb(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()) + "." + bb(json.dumps(pl).encode())
JWT = si + "." + bb(hmac.new(secret.encode(), si.encode(), hashlib.sha256).digest())
BASE = b.base

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"apikey": ANON, "Authorization": "Bearer " + JWT}
    if method == "GET": h["Accept-Profile"] = "finance"
    else: h["Content-Type"] = "application/json"; h["Content-Profile"] = "finance"; h["Prefer"] = "return=representation"
    for a in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method), timeout=30) as r:
                t = r.read().decode(); return r.status, (json.loads(t) if t else None)
        except urllib.error.HTTPError as e: return e.code, e.read().decode()[:200]
        except Exception:
            if a == 3: return 0, "NETERR"
            time.sleep(2)

ent = req("GET", "/entities?select=id&code=eq.LBC")[1][0]["id"]
acc = {a["code"]: a["id"] for a in req("GET", "/accounts?select=id,code&entity_id=eq." + ent)[1]}

if "--clear" in sys.argv:
    print("clear [IMP] batch:", req("DELETE", "/transactions?memo=ilike.*%5BIMP%5D*")[0]); sys.exit(0)

# (date, memo, debit_code, credit_code, amount)
INFLOW = "3100"; CASH = "1100"; AP = "2100"; LOAN = "1200"; SUBS = "5600"; MKT = "5700"
ENTRIES = []
def E(d, m, dr, cr, amt): ENTRIES.append((d, "[IMP] " + m, dr, cr, amt))

# --- Capital inflows (DR Cash / CR Paid-in Capital) ---
for d, who, amt in [
    ("2025-11-30", "Kayla Kwok", 1500000), ("2025-11-30", "Muhammad Rizky Narindra", 20000000),
    ("2025-11-30", "Charlie Verchius", 20000000), ("2025-12-01", "Fatma Yusrizal", 20000000),
    ("2025-12-04", "Kayla Kwok", 1500000), ("2025-12-04", "Satya Damba Pramudita", 3000000),
    ("2025-12-08", "Amadeus Bertrand", 10000000), ("2025-12-12", "Nabil Sachio Refat", 5995000),
    ("2025-12-29", "Satya Damba Pramudita", 20000000), ("2026-01-09", "Kayla Kwok", 2500000),
    ("2026-02-27", "Shawn Gabriel", 20000000), ("2026-03-02", "Kayla Kwok", 3050000),
]:
    E(d, "Capital contribution - " + who, CASH, INFLOW, amt)

# --- Paid expenses: Claude AI (= the 3 Rizky bank outflows; deduped) ---
for d in ["2026-03-02", "2026-03-31", "2026-04-05"]:
    E(d, "Claude AI subscription (paid via Rizky bank transfer)", SUBS, CASH, 1700000)

# --- Other bank outflows (ambiguous -> Loans Receivable, FLAGGED) ---
E("2026-01-19", "Withdrawal - Sekar Datri Pramusit (Taqy needed funds) [REVIEW]", LOAN, CASH, 1000000)
E("2026-04-13", "Outflow - Nabil Sachio Refat [REVIEW]", LOAN, CASH, 1700000)

# --- Accounts payable (incurred, unpaid; DR expense / CR AP) ---
for d, m, code, amt in [
    ("2025-11-28", "TradingView Premium (annual, dLocal)", SUBS, 4354572),
    ("2025-11-28", "Hostinger hosting", SUBS, 450216),
    ("2025-12-02", "Bloomberg News (monthly)", SUBS, 169894.56),
    ("2025-12-03", "Hostinger hosting", SUBS, 531468),
    ("2026-01-02", "Bloomberg News (monthly)", SUBS, 170567.13),
    ("2026-02-02", "Bloomberg News (monthly)", SUBS, 171280.46),
    ("2026-02-15", "Pandawa - name card printing", MKT, 61000),
    ("2026-02-15", "OH! PRINT - business cards x5", MKT, 303500),
    ("2026-02-15", "OH! PRINT - business cards x1", MKT, 61500),
    ("2026-02-15", "OH! PRINT - business cards (Everyday Smooth)", MKT, 91500),
    ("2026-02-15", "Global Promosi - card holders x7", MKT, 240500),
    ("2026-02-15", "Global Promosi - card holder x1", MKT, 28900),
    ("2026-03-02", "Bloomberg News (monthly)", SUBS, 171025.47),
    ("2026-04-02", "Bloomberg News (monthly)", SUBS, 173481.20),
]:
    E(d, "A/P - " + m, code, AP, amt)

ok = 0; fail = 0
for d, m, dr, cr, amt in ENTRIES:
    lines = [{"account_id": acc[dr], "debit": amt, "credit": 0, "line_order": 0},
             {"account_id": acc[cr], "debit": 0, "credit": amt, "line_order": 1}]
    code, res = req("POST", "/rpc/post_transaction", {"p_entity_id": ent, "p_date": d, "p_memo": m, "p_lines": lines, "p_is_demo": False})
    if isinstance(res, list) and res and res[0].get("ref"): ok += 1
    else: fail += 1; print("FAIL", code, str(res)[:120], "|", m)
print(f"posted ok={ok} fail={fail} of {len(ENTRIES)}")

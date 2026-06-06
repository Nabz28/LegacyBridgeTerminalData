#!/usr/bin/env python3
"""wacc_stress.py — replicate the equity terminal's WACC engine (launcher/scripts/wacc.jsx)
for a basket of IDX tickers, so we can stress-test whether the WACC values make sense.

Mirrors wacc.jsx exactly: beta = OLS of weekly returns vs JCI over a 104w (2Y) window,
Blume-adjusted; Re = Rf + betaAdj*ERP + size; Rd = Rf + spread (or implied interest/debt);
WACC = wE*Re + wD*Rd*(1-tax). Defaults: Rf 6.6, mERP 4.6, CRP 3.0, tax 22, spread 2.0.

Data: correlation.returns_weekly (anon PostgREST) + equity-statements edge fn (Yahoo .JK).
Stdlib only. Writes a JSON dataset for the critic agents.
    python scripts/wacc_stress.py [out.json]
"""
import sys, json, math, urllib.request, urllib.parse

SB = "https://adnubucjlezrtusbicja.supabase.co"
ANON = "sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7"
H = {"apikey": ANON, "Authorization": "Bearer " + ANON}
MARKET = "IDX:COMPOSITE"

DEF = dict(rf=7.0, mERP=4.6, crp=3.5, size=0.0, tax=22.0, spread=3.0)   # post-fix defaults
WIN = 260  # 5Y default window (weeks) — more stable betas
STAT_TAX = 0.22
RD_FLOOR = 9.0
FIT_MIN = 0.10
CORR_MIN = 0.30
FIN_SECTORS = {"Banks"}

# ~42 names across 9 sectors
UNIVERSE = [
    ("BBCA", "Banks"), ("BBRI", "Banks"), ("BMRI", "Banks"), ("BBNI", "Banks"),
    ("BRIS", "Banks"), ("ARTO", "Banks"), ("BBTN", "Banks"), ("BDMN", "Banks"),
    ("TLKM", "Telco"), ("ISAT", "Telco"), ("EXCL", "Telco"), ("TOWR", "Telco"), ("MTEL", "Telco"),
    ("UNVR", "Consumer"), ("ICBP", "Consumer"), ("INDF", "Consumer"), ("MYOR", "Consumer"),
    ("GGRM", "Consumer"), ("HMSP", "Consumer"), ("KLBF", "Consumer"), ("AMRT", "Consumer"), ("MAPI", "Consumer"),
    ("ADRO", "Coal"), ("PTBA", "Coal"), ("ITMG", "Coal"), ("BYAN", "Coal"), ("MEDC", "Energy"), ("PGAS", "Energy"),
    ("ANTM", "Metals"), ("INCO", "Metals"), ("MDKA", "Metals"), ("TINS", "Metals"), ("NCKL", "Metals"),
    ("ASII", "Industrials"), ("UNTR", "Industrials"), ("SMGR", "Industrials"), ("INTP", "Industrials"),
    ("BSDE", "Property"), ("CTRA", "Property"), ("PWON", "Property"), ("SMRA", "Property"),
    ("GOTO", "Tech"), ("BUKA", "Tech"), ("BREN", "Tech"),
    ("AALI", "Plantation"), ("LSIP", "Plantation"),
]


def get(url, profile=None):
    h = dict(H)
    if profile:
        h["Accept-Profile"] = profile
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=40)
        return json.load(r)
    except Exception as e:
        return {"_err": str(e)}


def returns(series_id):
    u = f"{SB}/rest/v1/returns_weekly?series_id=eq.{urllib.parse.quote(series_id)}&select=date,ret&order=date.asc"
    d = get(u, "correlation")
    return d if isinstance(d, list) else []


def regress(m, s):
    n = min(len(m), len(s))
    if n < 20:
        return None
    sm = sum(m[:n]); ss = sum(s[:n]); mm = sm / n; ms = ss / n
    cov = vm = vs = 0.0
    for i in range(n):
        dm = m[i] - mm; ds = s[i] - ms
        cov += dm * ds; vm += dm * dm; vs += ds * ds
    if vm < 1e-12:
        return None
    beta = cov / vm
    corr = cov / math.sqrt(vm * vs) if vs > 1e-12 else 0.0
    return dict(beta=beta, corr=corr, r2=corr * corr, n=n)


def align(mrows, srows):
    mm = {r["date"]: r["ret"] for r in mrows}
    m, s = [], []
    for r in srows:
        mv = mm.get(r["date"])
        if mv is not None and r["ret"] is not None:
            m.append(mv); s.append(r["ret"])
    return m, s


def slice_win(rows, w):
    return rows[-w:] if w and len(rows) > w else rows


def fundamentals(sym):
    d = get(f"{SB}/functions/v1/equity-statements?ticker={sym}.JK")
    doc = d.get("doc") if isinstance(d, dict) else None
    if not doc:
        return None
    snap = doc.get("snapshot", {}) or {}
    A = (doc.get("statements", {}) or {}).get("annual", {}) or {}
    inc = A.get("income", {}) or {}; bal = A.get("balance", {}) or {}

    def last(o):
        if not o:
            return None
        ks = sorted(o.keys())
        return o[ks[-1]] if ks else None

    pretax = last(inc.get("PretaxIncome")); tax = last(inc.get("TaxProvision")); interest = last(inc.get("InterestExpense"))
    eff = None
    if pretax and tax is not None and pretax != 0:
        eff = tax / pretax
        if not (0 <= eff <= 0.6):
            eff = None
    debt = snap.get("totalDebt")
    if debt is None:
        debt = last(bal.get("TotalDebt"))
    return dict(
        currency=snap.get("currency"), marketCap=snap.get("marketCap"), totalDebt=debt,
        yahooBeta=snap.get("beta"), sector=snap.get("sector"),
        effTax=eff, interest=abs(interest) if interest is not None else None,
    )


def blume(b):
    return 0.67 * b + 0.33 * 1.0


def compute(sym, sector_hint, mkt):
    srows = returns("IDX:" + sym)
    m, s = align(slice_win(mkt, WIN), slice_win(srows, WIN))
    reg = regress(m, s)
    fd = fundamentals(sym) or {}
    betaRaw = reg["beta"] if reg else None
    betaAdj = blume(betaRaw) if betaRaw is not None else None
    E = fd.get("marketCap")
    D = fd.get("totalDebt") or 0
    tax = (fd.get("effTax") * 100) if fd.get("effTax") is not None else DEF["tax"]
    taxf = tax / 100.0
    erp = DEF["mERP"] + DEF["crp"]
    Re = (DEF["rf"] + betaAdj * erp + DEF["size"]) if betaAdj is not None else None
    low_fit = bool(reg) and (reg["r2"] < FIT_MIN or abs(reg["corr"]) < CORR_MIN)
    is_fin = (sector_hint in FIN_SECTORS) or bool(fd.get("sector") and ("financ" in fd["sector"].lower() or "bank" in fd["sector"].lower()))
    interest = fd.get("interest")
    rdImpliedRaw = (interest / D * 100) if (interest and D > 0) else None
    rdImplied = rdImpliedRaw if (rdImpliedRaw is not None and 3 <= rdImpliedRaw <= 20) else None
    rdPre = max(DEF["rf"] + DEF["spread"], RD_FLOOR)
    rdAfter = rdPre * (1 - min(taxf, STAT_TAX))          # tax shield capped at statutory
    V = (E or 0) + D
    if is_fin:                                            # banks valued on cost of equity
        wE, wD, wacc = 1.0, 0.0, Re
    else:
        wE = (E / V) if (E and V > 0) else (1.0 if not E else 0)
        wD = (D / V) if V > 0 else 0
        wacc = (wE * Re + wD * rdAfter) if (Re is not None and V > 0) else None
    return dict(
        sym=sym, sector_hint=sector_hint, sector=fd.get("sector"), currency=fd.get("currency"),
        is_financial=is_fin, beta_low_fit=low_fit,
        n=reg["n"] if reg else 0, r2=round(reg["r2"], 3) if reg else None, corr=round(reg["corr"], 3) if reg else None,
        betaRaw=round(betaRaw, 3) if betaRaw is not None else None,
        betaAdj=round(betaAdj, 3) if betaAdj is not None else None,
        yahooBeta=fd.get("yahooBeta"),
        E=E, D=D, dv=round(wD, 3), de=round(D / E, 3) if (E and E > 0) else None,
        taxPct=round(tax, 1), effTaxUsed=fd.get("effTax") is not None,
        Re=round(Re, 2) if Re is not None else None,
        rdPre=round(rdPre, 2), rdAfter=round(rdAfter, 2), rdImplied=round(rdImplied, 2) if rdImplied is not None else None,
        wacc=round(wacc, 2) if wacc is not None else None,
    )


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "wacc_dataset.json"
    mkt = returns(MARKET)
    print(f"JCI market weeks: {len(mkt)}", flush=True)
    rows = []
    for sym, sec in UNIVERSE:
        r = compute(sym, sec, mkt)
        rows.append(r)
        flag = ("FIN" if r["is_financial"] else "") + (" LOWFIT" if r["beta_low_fit"] else "")
        print(f"{sym:5s} {sec:11s} betaAdj={str(r['betaAdj']):>6} WACC={str(r['wacc']):>6} Re={str(r['Re']):>6} D/V={str(r['dv']):>5} r2={str(r['r2']):>5} {flag}", flush=True)
    meta = dict(defaults=DEF, window_weeks=WIN, erp_total=DEF["mERP"] + DEF["crp"], market_weeks=len(mkt))
    json.dump({"meta": meta, "rows": rows}, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    waccs = [r["wacc"] for r in rows if r["wacc"] is not None]
    print(f"\n{len(rows)} tickers | WACC computed for {len(waccs)} | range {min(waccs):.2f}–{max(waccs):.2f} | wrote {out}")


if __name__ == "__main__":
    main()

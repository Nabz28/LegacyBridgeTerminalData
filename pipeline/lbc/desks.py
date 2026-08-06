"""The 23 desks: baskets, benchmarks, and driver definitions.

Driver tuple: (series_key, label, direction, weight, shared_factor)
  direction +1 = higher series value is bullish for the desk, -1 = bearish.
  shared_factor tags cross-desk common bets (the secular-rates trap check).
Baskets extend management.monitor_templates (template_ids records lineage).
"""

DESKS = [
    # ------------------------------------------------ cyclical industry (9)
    dict(
        id="oil-gas", name="Oil & Gas", basket="cyclical", kind="industry", sort_order=1,
        template_ids=["oil-supermajors"],
        tickers=["XOM", "CVX", "SHEL", "TTE", "BP", "COP", "EOG", "SLB", "MEDC.JK", "PGAS.JK"],
        benchmark="XLE",
        drivers=[
            ("cmd.oil.brent", "Brent", +1, 1.5, None),
            ("cmd.gas.hh", "Henry Hub", +1, 0.7, None),
            ("us.fx.dxy", "Dollar", -1, 0.7, "dollar"),
            ("us.credit.cond", "Credit conditions", +1, 0.6, "credit"),
        ],
    ),
    dict(
        id="coal-power-fuels", name="Coal, Uranium & Power Fuels", basket="cyclical", kind="industry", sort_order=2,
        template_ids=["idx-coal"],
        tickers=["PTBA.JK", "ADRO.JK", "ITMG.JK", "BYAN.JK", "AADI.JK", "GEMS.JK", "INDY.JK", "HRUM.JK", "1088.HK", "1898.HK", "BTU", "CCJ"],
        benchmark="^JKSE",
        drivers=[
            ("cmd.coal.hba", "HBA coal benchmark", +1, 1.5, None),
            ("cmd.gas.hh", "Natgas (substitution)", +1, 0.8, None),
            ("idx.csi300", "China activity", +1, 0.8, "china"),
            ("cmd.oil.brent", "Energy complex", +1, 0.6, None),
        ],
    ),
    dict(
        id="precious-metals", name="Precious Metals", basket="cyclical", kind="industry", sort_order=3,
        template_ids=["gold-miners"],
        tickers=["NEM", "AEM", "B", "GFI", "2899.HK", "MDKA.JK", "BRMS.JK", "WPM", "PAAS", "PSAB.JK"],
        benchmark="GDX",
        drivers=[
            ("cmd.gold", "Gold", +1, 1.5, None),
            ("us.rate.real10", "Real 10y", -1, 1.2, "real_rates"),
            ("us.fx.dxy", "Dollar", -1, 0.8, "dollar"),
            ("pos.cot.gold", "Gold spec positioning", -1, 0.5, None),
        ],
    ),
    dict(
        id="base-battery-bulk", name="Base, Battery & Bulk Metals", basket="cyclical", kind="industry", sort_order=4,
        template_ids=["id-nickel", "global-steel"],
        tickers=["FCX", "SCCO", "BHP", "RIO", "VALE", "NUE", "MT", "5401.T", "005490.KS", "INCO.JK", "NCKL.JK", "MBMA.JK", "ANTM.JK", "AMMN.JK", "KRAS.JK"],
        benchmark="COPX",
        drivers=[
            ("cmd.copper", "Copper", +1, 1.5, None),
            ("idx.csi300", "China activity", +1, 1.0, "china"),
            ("us.fx.dxy", "Dollar", -1, 0.8, "dollar"),
            ("cmd.aluminum", "Aluminum", +1, 0.6, None),
        ],
    ),
    dict(
        id="agri-food", name="Agriculture & Food", basket="cyclical", kind="industry", sort_order=5,
        template_ids=["cpo-plantations"],
        tickers=["ADM", "BG", "MOS", "NTR", "CF", "TSN", "AALI.JK", "LSIP.JK", "DSNG.JK", "TAPG.JK", "SIMP.JK", "SSMS.JK", "F34.SI", "CPIN.JK", "JPFA.JK"],
        benchmark="MOO",
        drivers=[
            ("cmd.soybean", "Soybeans", +1, 1.0, None),
            ("cmd.soyoil", "Soy oil (palm proxy)", +1, 1.0, None),
            ("cmd.corn", "Corn", +1, 0.7, None),
            ("us.fx.dxy", "Dollar", -1, 0.6, "dollar"),
        ],
    ),
    dict(
        id="chemicals-materials", name="Chemicals & Materials", basket="cyclical", kind="industry", sort_order=6,
        template_ids=["idx-petchem"],
        tickers=["DOW", "LYB", "BAS.DE", "DD", "LIN", "APD", "4063.T", "TPIA.JK", "BRPT.JK", "ESSA.JK"],
        benchmark="XLB",
        drivers=[
            ("us.act.avghrs", "Mfg hours worked", +1, 1.0, "global_cycle"),
            ("idx.csi300", "China activity", +1, 0.8, "china"),
            ("cmd.oil.brent", "Feedstock cost", -1, 0.8, None),
            ("us.credit.cond", "Credit conditions", +1, 0.6, "credit"),
        ],
    ),
    dict(
        id="transport-logistics", name="Transport & Logistics", basket="cyclical", kind="industry", sort_order=7,
        template_ids=["us-rails-logistics"],
        tickers=["UNP", "CSX", "UPS", "FDX", "MAERSK-B.CO", "ZIM", "9104.T", "SMDR.JK", "TMAS.JK", "ASSA.JK"],
        benchmark="IYT",
        drivers=[
            ("us.act.cyclical", "Cyclical appetite", +1, 1.0, "global_cycle"),
            ("us.act.avghrs", "Mfg hours worked", +1, 0.8, "global_cycle"),
            ("cmd.oil.brent", "Fuel cost", -1, 0.8, None),
            ("idx.csi300", "China trade pulse", +1, 0.6, "china"),
        ],
    ),
    dict(
        id="autos-mobility", name="Autos & Mobility", basket="cyclical", kind="industry", sort_order=8,
        template_ids=["global-autos"],
        tickers=["TSLA", "TM", "VOW3.DE", "MBG.DE", "BMW.DE", "STLA", "HMC", "1211.HK", "005380.KS", "RACE", "LI", "ASII.JK"],
        benchmark="CARZ",
        drivers=[
            ("us.act.cyclical", "Cyclical appetite", +1, 1.2, None),
            ("us.rate.dgs10", "Financing rates", -1, 0.8, "rates"),
            ("cmd.oil.brent", "Fuel prices", -1, 0.5, None),
            ("us.act.housing", "Big-ticket credit demand", +1, 0.7, None),
        ],
    ),
    dict(
        id="automation-machinery", name="Automation & Machinery", basket="cyclical", kind="industry", sort_order=9,
        template_ids=["jp-exporters"],
        tickers=["CAT", "DE", "ETN", "EMR", "PH", "SIE.DE", "ABBN.SW", "6301.T", "6954.T", "6501.T", "UNTR.JK"],
        benchmark="XLI",
        drivers=[
            ("us.act.avghrs", "Mfg hours worked", +1, 1.0, "global_cycle"),
            ("idx.csi300", "China capex pulse", +1, 0.8, "china"),
            ("fx.usdjpy", "Yen (JP exporter margin)", +1, 0.6, None),
            ("us.rate.dgs10", "Rates", -1, 0.6, "rates"),
        ],
    ),
    # ------------------------------------------------ secular industry (9)
    dict(
        id="semiconductors", name="Semiconductors", basket="secular", kind="industry", sort_order=10,
        template_ids=["semicap"],
        tickers=["TSM", "005930.KS", "000660.KS", "MU", "INTC", "QCOM", "TXN", "ADI", "AMD", "ASML", "AMAT", "LRCX", "KLAC", "8035.T", "2454.TW"],
        benchmark="SOXX",
        drivers=[
            ("tw.tsmc.rev", "TSMC monthly revenue", +1, 1.5, None),
            ("idx.sox", "SOX momentum", +1, 1.0, None),
            ("us.rate.real10", "Real 10y", -1, 0.8, "real_rates"),
            ("idx.twii", "Taiwan market", +1, 0.6, None),
        ],
    ),
    dict(
        id="ai-compute", name="AI & Compute Infrastructure", basket="secular", kind="industry", sort_order=11,
        template_ids=["ai-compute", "datacenter-chain"],
        tickers=["NVDA", "AVGO", "SMCI", "VRT", "ANET", "EQIX", "DLR", "GDS", "AJBU.SI", "DCII.JK"],
        benchmark="SOXX",
        drivers=[
            ("tw.tsmc.rev", "TSMC monthly revenue", +1, 1.2, None),
            ("idx.sox", "SOX momentum", +1, 1.0, None),
            ("us.rate.real10", "Real 10y", -1, 0.8, "real_rates"),
            ("us.credit.cond", "Credit conditions", +1, 0.6, "credit"),
        ],
    ),
    dict(
        id="grid-infrastructure", name="Grid & Infrastructure Services", basket="secular", kind="industry", sort_order=12,
        template_ids=[],
        tickers=["GEV", "PWR", "HUBB", "POWL", "ENR.DE", "PRY.MI", "NKT.CO", "NEE", "DUK", "PGEO.JK", "BREN.JK"],
        benchmark="XLU",
        drivers=[
            ("cmd.copper", "Copper (grid demand)", +1, 0.8, None),
            ("us.rate.dgs10", "Rates", -1, 1.0, "rates"),
            ("us.act.avghrs", "Mfg hours worked", +1, 0.6, "global_cycle"),
            ("cmd.gas.hh", "Power prices", +1, 0.5, None),
        ],
    ),
    dict(
        id="aerospace-defense", name="Aerospace, Defense & Space", basket="secular", kind="industry", sort_order=13,
        template_ids=["global-defense"],
        tickers=["LMT", "RTX", "NOC", "GD", "BA", "GE", "TDG", "HEI", "LHX", "BA.L", "RHM.DE", "HO.PA", "SAF.PA", "RR.L", "AIR.PA"],
        benchmark="ITA",
        drivers=[
            ("us.act.avghrs", "Mfg hours worked", +1, 0.8, "global_cycle"),
            ("cmd.oil.brent", "Airline fuel pressure", -1, 0.5, None),
            ("us.rate.dgs10", "Rates", -1, 0.6, "rates"),
            ("idx.spx", "Risk appetite", +1, 0.7, "beta"),
        ],
    ),
    dict(
        id="software-cyber", name="Infrastructure Software & Cybersecurity", basket="secular", kind="industry", sort_order=14,
        template_ids=["cloud-software", "cybersecurity"],
        tickers=["MSFT", "ORCL", "CRM", "NOW", "SAP", "ADBE", "SNOW", "PLTR", "PANW", "CRWD", "FTNT", "ZS"],
        benchmark="IGV",
        drivers=[
            ("us.rate.real10", "Real 10y", -1, 1.2, "real_rates"),
            ("idx.ndx", "NDX momentum", +1, 1.0, None),
            ("us.fx.dxy", "Dollar (revenue translation)", -1, 0.5, "dollar"),
            ("us.credit.cond", "Credit conditions", +1, 0.5, "credit"),
        ],
    ),
    dict(
        id="platforms-ads-gaming", name="Platforms, Advertising & Gaming", basket="secular", kind="industry", sort_order=15,
        template_ids=["china-tech"],
        tickers=["GOOGL", "META", "NFLX", "SPOT", "0700.HK", "BABA", "PDD", "SE", "GRAB", "GOTO.JK", "7974.T", "035420.KS", "RBLX", "EA"],
        benchmark="QQQ",
        drivers=[
            ("us.act.cyclical", "Cyclical appetite (ad demand)", +1, 0.8, None),
            ("idx.ndx", "Tech tape", +1, 0.8, None),
            ("us.rate.real10", "Real 10y", -1, 0.8, "real_rates"),
            ("idx.hsi", "China platform sentiment", +1, 0.8, "china"),
        ],
    ),
    dict(
        id="healthcare-lifesci", name="Healthcare & Life Sciences", basket="secular", kind="industry", sort_order=16,
        template_ids=["pharma-megacaps", "glp1-metabolic", "medtech-leaders", "asia-hospitals"],
        tickers=["LLY", "NVO", "JNJ", "MRK", "ABBV", "AZN", "NVS", "RHHBY", "PFE", "GSK", "ISRG", "ABT", "MDT", "SYK", "BSX", "SHL.DE", "MIKA.JK", "HEAL.JK", "SILO.JK"],
        benchmark="XLV",
        drivers=[
            ("us.rate.dgs10", "Rates (duration)", -1, 0.8, "rates"),
            ("us.fx.dxy", "Dollar", -1, 0.5, "dollar"),
            ("us.credit.cond", "Credit conditions", +1, 0.5, "credit"),
            ("idx.spx", "Market beta", +1, 0.5, "beta"),
        ],
    ),
    dict(
        id="consumer-brands", name="Consumer Brands", basket="secular", kind="industry", sort_order=17,
        template_ids=["global-luxury", "idx-staples"],
        tickers=["KO", "PG", "PM", "PEP", "NKE", "MCD", "SBUX", "MC.PA", "RMS.PA", "KER.PA", "CFR.SW", "1913.HK", "EL", "ICBP.JK", "INDF.JK", "MYOR.JK", "UNVR.JK", "AMRT.JK", "9983.T"],
        benchmark="XLP",
        drivers=[
            ("us.act.cyclical", "Cyclical appetite", +1, 1.0, None),
            ("us.act.unrate", "Unemployment", -1, 0.8, None),
            ("us.fx.dxy", "Dollar (translation)", -1, 0.6, "dollar"),
            ("cmd.soybean", "Input costs", -1, 0.5, None),
        ],
    ),
    dict(
        id="financial-infrastructure", name="Global Financial Infrastructure", basket="secular", kind="industry", sort_order=18,
        template_ids=["gsib-banks", "global-payments", "exchanges-data"],
        tickers=["JPM", "BAC", "C", "HSBC", "UBS", "BNP.PA", "ING", "8306.T", "D05.SI", "V", "MA", "AXP", "PYPL", "ADYEN.AS", "ICE", "CME", "SPGI", "0388.HK", "DB1.DE"],
        benchmark="XLF",
        drivers=[
            ("us.rate.t10y2y", "Curve", +1, 1.0, "rates"),
            ("us.rate.dgs2", "Short rates (NII)", +1, 0.7, "rates"),
            ("us.credit.cond", "Credit conditions", +1, 1.0, "credit"),
            ("idx.spx", "Volumes & wealth", +1, 0.6, "beta"),
        ],
    ),
    # ------------------------------------------------ country (5)
    dict(
        id="us", name="United States", basket="country", kind="country", sort_order=19,
        template_ids=["us-megacap-8"],
        tickers=["SPY", "QQQ", "IWM"],
        benchmark="SPY",
        drivers=[
            ("us.act.unrate", "Unemployment rate", -1, 1.0, None),
            ("us.act.avghrs", "Mfg hours worked", +1, 0.8, "global_cycle"),
            ("us.credit.cond", "Credit conditions", +1, 1.0, "credit"),
            ("us.vol.vix", "Equity vol", -1, 0.8, None),
            ("us.rate.t10y2y", "Curve", +1, 0.6, "rates"),
            ("us.infl.cpi_core", "Core inflation trend", -1, 0.6, None),
        ],
    ),
    dict(
        id="china-hk-taiwan", name="China, Hong Kong & Taiwan", basket="country", kind="country", sort_order=20,
        template_ids=["china-tech"],
        tickers=["^HSI", "000300.SS", "^TWII", "MCHI"],
        benchmark="MCHI",
        drivers=[
            ("idx.csi300", "CSI 300", +1, 1.0, "china"),
            ("idx.hsi", "Hang Seng", +1, 0.8, "china"),
            ("fx.usdcnh", "CNH (weakness = stress)", -1, 1.0, None),
            ("tw.tsmc.rev", "Taiwan tech pulse", +1, 0.7, None),
            ("cmd.copper", "China demand read", +1, 0.6, None),
        ],
    ),
    dict(
        id="japan-korea", name="Japan & Korea", basket="country", kind="country", sort_order=21,
        template_ids=["jp-exporters", "kr-tech"],
        tickers=["^N225", "^KS11", "EWJ", "EWY"],
        benchmark="EWJ",
        drivers=[
            ("idx.n225", "Nikkei", +1, 0.8, None),
            ("idx.kospi", "KOSPI", +1, 0.8, None),
            ("fx.usdjpy", "Yen", +1, 0.7, None),
            ("fx.usdkrw", "Won (weakness = stress)", -1, 0.7, None),
            ("tw.tsmc.rev", "Regional tech pulse", +1, 0.6, None),
        ],
    ),
    dict(
        id="eurozone", name="Eurozone", basket="country", kind="country", sort_order=22,
        template_ids=[],
        tickers=["^STOXX50E", "^GDAXI", "EZU"],
        benchmark="EZU",
        drivers=[
            ("idx.stoxx", "Euro Stoxx 50", +1, 0.8, None),
            ("eu.act.esi", "Economic sentiment", +1, 1.0, None),
            ("eu.infl.hicp", "HICP vs target", -1, 0.8, None),
            ("eu.rate.dfr", "ECB policy", -1, 0.7, None),
            ("cmd.ngas_ttf", "Energy stress (TTF)", -1, 0.8, None),
        ],
    ),
    dict(
        id="indonesia", name="Indonesia", basket="country", kind="country", sort_order=23,
        template_ids=["idx-bluechips", "idx-big4-banks"],
        tickers=["^JKSE", "EIDO", "BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK"],
        benchmark="EIDO",
        drivers=[
            ("idx.jkse", "JCI", +1, 0.8, None),
            ("fx.usdidr", "Rupiah (weakness = stress)", -1, 1.2, None),
            ("id.flow.foreign", "Foreign flows", +1, 1.0, None),
            ("cmd.coal.hba", "Terms of trade (coal)", +1, 0.7, None),
            ("cmd.oil.brent", "Energy import cost", -1, 0.5, None),
        ],
    ),
]


def desk_map():
    return {d["id"]: d for d in DESKS}


def all_tickers():
    """Every ticker across desk baskets + benchmarks (deduped)."""
    out = {}
    for d in DESKS:
        for t in d["tickers"]:
            out.setdefault(t, d["id"])
        if d.get("benchmark"):
            out.setdefault(d["benchmark"], d["id"])
    return out

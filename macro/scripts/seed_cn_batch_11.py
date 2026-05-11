# seed_cn_batch_11.py
# Topic: Banking, Money Supply, Investment & Capital
# 125 RICs — China bank balance sheets, monetary aggregates, FAI,
# capital formation, exchange rate operations, international reserves.

TIER1: dict[str, dict] = {

    # ------------------------------------------------------------------ #
    #  COMMERCIAL BANK CAPITAL ADEQUACY (quarterly, NFRA / CBIRC)
    # ------------------------------------------------------------------ #

    "aCNCBCRWCA": {
        "meaning": (
            "Credit risk-weighted assets (RWA) of China's commercial banking sector, "
            "published quarterly by the National Financial Regulatory Administration "
            "(NFRA, formerly CBIRC). Under Basel III as implemented by China, credit "
            "RWA is the dominant component of total RWA, covering on-balance-sheet "
            "exposures (loans, bonds, interbank) weighted by counterparty risk class. "
            "The figure is a stock (CNY billions) at quarter-end."
        ),
        "how_to_use": (
            "A rising credit-RWA trend signals expanding loan books and rising capital "
            "consumption; compare with net capital (aCNCBNECPA) to assess whether "
            "capital growth keeps pace. When regulators tighten risk-weight floors "
            "(e.g., for real-estate developer loans post-2021), RWA rises even without "
            "new lending, squeezing capital ratios. Track alongside the system CAR "
            "(aCNCNCXXK/A) and Tier-1 ratio (aCNCBTCARR): a widening gap between "
            "loan growth and RWA growth indicates mix-shift toward lower-risk assets "
            "(e.g., government bonds). Useful for stress-testing: regulators can raise "
            "risk weights on shadow-banking exposures or property loans as a macro-"
            "prudential lever."
        ),
        "related_series": [
            "aCNCBNECPA",   # Net capital
            "aCNCBTCARR",   # Tier-1 CAR
            "aCNCNCXXK/A",  # NPL ratio
            "aCNCBNTCPA",   # Net Tier-1 capital
        ],
    },

    "aCNCBMRWCA": {
        "meaning": (
            "Market risk-weighted assets of China's commercial banks, published "
            "quarterly by NFRA. Market RWA captures trading-book exposures to "
            "interest-rate, equity, FX, and commodity price movements under the "
            "standardised approach (most Chinese banks) or internal models. As a "
            "share of total RWA it remains small (~1-2%) because Chinese banks have "
            "historically limited trading books, but it rises with growth in bond "
            "portfolios, FX derivatives, and interbank lending."
        ),
        "how_to_use": (
            "Monitor for structural shift: as China's capital markets deepen and banks "
            "expand wealth-management and bond-trading operations, market RWA should "
            "grow as a share of total RWA. A sudden jump can indicate increased "
            "proprietary trading or unrealised losses crystallising. Compare with "
            "credit RWA (aCNCBCRWCA) and operational RWA (aCNCBORWCA) to decompose "
            "total capital consumption. In a rising-rate environment, bond portfolio "
            "fair-value losses can push market RWA higher, compressing capital ratios "
            "without any change in lending volumes."
        ),
        "related_series": [
            "aCNCBCRWCA",   # Credit RWA
            "aCNCBORWCA",   # Operational RWA
            "aCNCBNECPA",   # Net capital
            "aCNCBTCARR",   # Tier-1 CAR
        ],
    },

    "aCNCBNECPA": {
        "meaning": (
            "Net capital (eligible regulatory capital) of China's commercial banking "
            "system, reported quarterly by NFRA. This is total regulatory capital after "
            "deductions (goodwill, deferred tax assets, shortfall in loan-loss reserves, "
            "minority interests above threshold) as defined under China's Capital "
            "Management Measures for Commercial Banks — the numerator used to compute "
            "the overall CAR. Expressed in CNY billions; a stock measure at quarter-end."
        ),
        "how_to_use": (
            "Net capital is the buffer absorbing unexpected losses. Divide by total RWA "
            "to get the CAR. Key capital actions that expand net capital: retained "
            "earnings, equity issuance, perpetual bonds (AT1), and subordinated bonds "
            "(Tier 2). Government recapitalisations of Big-6 state banks (as occurred "
            "in 2024 with CNY 500 bn special sovereign bonds) show up as discrete jumps. "
            "Deterioration signals that banks must either raise capital or slow RWA "
            "growth (i.e., lend less). Cross with NIM (aCNCNMRSOQ) to assess organic "
            "capital generation capacity."
        ),
        "related_series": [
            "aCNCBCRWCA",   # Credit RWA
            "aCNCBTCARR",   # Tier-1 CAR
            "aCNCNCXXK/A",  # System NPL ratio
            "aCNCNMRSOQ",   # Net interest margin
        ],
    },

    "aCNCBNCTCA": {
        "meaning": (
            "Net core Tier-1 (CET1) capital of China's commercial banks, published "
            "quarterly by NFRA. CET1 is the highest-quality regulatory capital: paid-in "
            "ordinary share capital plus retained earnings plus eligible reserves, net "
            "of regulatory deductions. China's minimum CET1 ratio is 5% (buffer-"
            "inclusive 7.5% for non-G-SIBs; 8.5%+ for the Big-6 G-SIBs). The stock "
            "figure in CNY billions."
        ),
        "how_to_use": (
            "CET1 is the binding constraint for the largest banks. ICBC, CCB, ABC, BoC, "
            "BoCom, and PSBC carry higher G-SIB surcharges (0.5-1.5 pp), so their CET1 "
            "headroom is narrower. When CET1 approaches minimums, banks front-load "
            "government bond purchases (0% RWA) and reduce corporate lending. Track "
            "alongside core Tier-1 CAR (aCNCNHHUEQ) and new loans (aCNUSENLOAN) to "
            "gauge the capital-lending nexus. Rights issues and dividend suspensions "
            "rebuild CET1; AT1 perpetual bonds do not count here."
        ),
        "related_series": [
            "aCNCNHHUEQ",   # Core Tier-1 CAR ratio
            "aCNCBNTCPA",   # Net Tier-1 capital
            "aCNCNOAVQ",    # Large bank CAR
            "aCNUSENLOAN",  # New loans
        ],
    },

    "aCNCBNTCPA": {
        "meaning": (
            "Net Tier-1 capital of China's commercial banks, quarterly from NFRA. "
            "Tier-1 = CET1 + Additional Tier-1 (AT1) instruments, primarily perpetual "
            "bonds (永续债) issued by Chinese banks since 2019. AT1 can absorb losses "
            "through write-down or conversion before insolvency. Minimum Tier-1 ratio "
            "is 6% (8% buffer-inclusive for non-G-SIBs). The stock in CNY billions."
        ),
        "how_to_use": (
            "The gap between Tier-1 and CET1 capital (aCNCBNCTCA) represents AT1 "
            "outstanding. Growth in this gap reflects the pace of perpetual-bond "
            "issuance — a major offshore and onshore capital-market theme since 2019 "
            "as banks sought non-dilutive capital. Compare Tier-1 CAR (aCNCBTCARR) "
            "with the 6% floor: sustained compression toward minimums signals "
            "possible AT1 issuance or dividend cuts. In a credit downturn, watch "
            "for AT1 coupon-skip triggers which can destabilise market confidence."
        ),
        "related_series": [
            "aCNCBNCTCA",   # CET1 capital
            "aCNCBTCARR",   # Tier-1 CAR ratio
            "aCNCBNECPA",   # Total net capital
            "aCNCNHHUEQ",   # Core Tier-1 CAR
        ],
    },

    "aCNCBORWCA": {
        "meaning": (
            "Operational risk-weighted assets of China's commercial banks, quarterly "
            "from NFRA. Under Basel III, operational RWA is typically computed via the "
            "Basic Indicator or Standardised Approach (a fixed percentage of gross "
            "income averaged over 3 years). It captures capital required against risks "
            "from failed processes, systems, people, and external events — including "
            "fraud, IT failures, and mis-selling."
        ),
        "how_to_use": (
            "Operational RWA grows roughly in line with bank revenues and is less "
            "cyclical than credit RWA. A sudden rise can signal a large operational-"
            "loss event or a methodology change. As Chinese banks expand fee-based "
            "and wealth-management income, operational RWA can grow faster than "
            "credit RWA, changing the capital mix. Monitor alongside total RWA and "
            "net capital (aCNCBNECPA) to understand the full capital consumption "
            "picture. A shift to Basel IV's Standardised Measurement Approach (SMA) "
            "could materially change reported figures."
        ),
        "related_series": [
            "aCNCBCRWCA",   # Credit RWA
            "aCNCBMRWCA",   # Market RWA
            "aCNCBNECPA",   # Net capital
            "aCNCBTCARR",   # Tier-1 CAR
        ],
    },

    "aCNCBTCARR": {
        "meaning": (
            "Tier-1 capital adequacy ratio of China's commercial banking system, "
            "published quarterly by NFRA. Computed as net Tier-1 capital divided by "
            "total risk-weighted assets. The regulatory minimum is 6%; with capital "
            "conservation buffer it is 8% for most banks and up to 9.5%+ for G-SIBs. "
            "The system-wide ratio has generally been in the 11-12% range. "
            "A percentage-point ratio, not a currency stock."
        ),
        "how_to_use": (
            "The Tier-1 CAR is the primary metric watched by NFRA in stress tests and "
            "supervisory reviews. Declining ratios constrain lending growth even when "
            "credit demand is strong — the key binding constraint on monetary "
            "transmission. Cross with new-loan data (aCNUSENLOAN) and TSF flows "
            "(aCNSFLMA) to test whether capital is the binding constraint. When the "
            "PBoC cuts RRR, it frees reserve capital but does not directly improve "
            "CAR; when it recapitalises banks via special bonds, CARs rise mechanically. "
            "Compare large-bank CAR (aCNCNOAVQ) with the system to detect small-bank stress."
        ),
        "related_series": [
            "aCNCNHHUEQ",   # Core Tier-1 CAR
            "aCNCNOAVQ",    # Large-bank CAR
            "aCNCNCXXK/A",  # System NPL ratio
            "aCNUSENLOAN",  # New loans
        ],
    },

    # ------------------------------------------------------------------ #
    #  GOVERNMENT DEPOSITS & MONETARY AUTHORITY BALANCE SHEET
    # ------------------------------------------------------------------ #

    "aCNSRCDGAO": {
        "meaning": (
            "Deposits of government departments and organisations held at depository "
            "institutions (fiscal deposits / 财政存款), monthly from the PBoC. This "
            "captures the consolidated balance of central and local government cash "
            "held at the banking system — not at the PBoC itself. It is a source of "
            "funds for depository institutions on their liability side. Expressed in "
            "CNY billions; a month-end stock."
        ),
        "how_to_use": (
            "Government deposit balances are highly seasonal: they rise when tax "
            "revenues are collected (typically March-April, June, September) and fall "
            "when expenditure is executed (December-January). A larger-than-expected "
            "rise in fiscal deposits effectively tightens liquidity — the money moves "
            "from the private economy into government accounts, reducing bank reserves. "
            "The PBoC often conducts open-market operations (reverse repos, MLF) to "
            "offset seasonal fiscal drains. Compare with PBoC government-deposit data "
            "(aCNMONDGVA) to separate central-vs-local government balances. Track "
            "alongside M1 (which excludes time deposits): a fiscal surplus draining "
            "government deposits suppresses M1 growth."
        ),
        "related_series": [
            "aCNMONDGVA",   # MA liabilities: deposits of government
            "aCNSRCTRSD",   # MFI fiscal deposits
            "aCNSFLMA",     # TSF monthly flow
            "aCNUSENLOAN",  # New loans
        ],
    },

    "aCNUFLTHC": {
        "meaning": (
            "Consumption loans to households from monetary financial institutions "
            "(MFIs), monthly from the PBoC. This is a sub-category of total household "
            "loans, covering auto loans, consumer instalment credit, credit-card "
            "balances, and other personal consumption credit — but excluding mortgage "
            "loans (housing loans). Expressed in CNY billions; a month-end stock."
        ),
        "how_to_use": (
            "Consumption loans are a proxy for household leverage and consumer "
            "confidence. A sustained deceleration signals deleveraging or weak "
            "consumption sentiment — relevant for retail sales and GDP. Post-2022 "
            "the Chinese household sector became cautious: mortgage paydowns exceeded "
            "new borrowing, and consumption-loan growth slowed. Compare with medium "
            "and long-term loans (aCNMLANFC / aCNMNLOAN) to separate mortgage-heavy "
            "demand from consumption credit. A policy easing (lower LPR, 5-year LPR "
            "cuts) primarily boosts mortgages; consumption loans respond more to "
            "income confidence and employment data."
        ),
        "related_series": [
            "aCNMNLOAN",    # Medium & long-term loans
            "aCNHOUSLNA",   # Housing mortgage loans
            "aCNSTLOAN",    # Short-term loans
            "aCNUSENLOAN",  # New loans (total)
        ],
    },

    "aCNMLANFC": {
        "meaning": (
            "Medium and long-term (MLT) loans outstanding at monetary financial "
            "institutions, monthly from the PBoC. MLT loans have maturities exceeding "
            "1 year and include mortgage loans, fixed-asset investment project loans, "
            "infrastructure financing, and medium-term corporate working capital. "
            "This is the dominant tenor bucket of Chinese bank credit, typically "
            "representing ~70% of total loans. Stock in CNY billions at month-end."
        ),
        "how_to_use": (
            "MLT loan growth is the most cyclically sensitive measure of investment "
            "credit demand. A rise in MLT loans to households signals mortgage "
            "uptake; a rise in MLT to enterprises signals infrastructure or "
            "manufacturing capex financing. PBoC 5-year LPR (the mortgage benchmark) "
            "directly affects demand for MLT household loans. When the government "
            "accelerates infrastructure investment (special local government bonds), "
            "MLT enterprise loans expand as policy banks (CDB, ADBC, ExIm) draw down "
            "PSL (aCNLPR1YRR for LPR context). Deceleration in MLT loans in 2022-2024 "
            "reflected real-estate sector stress reducing developer and household credit."
        ),
        "related_series": [
            "aCNMNLOAN",    # MFI medium & long-term loans (quarterly variant)
            "aCNSTLOAN",    # Short-term loans
            "aCNHOUSLNA",   # Housing mortgages
            "aCNLPR1YRR",   # 1-year LPR
        ],
    },

    "aCNMALIBTOT": {
        "meaning": (
            "Total liabilities of the Monetary Authority (PBoC) balance sheet, "
            "monthly from the PBoC Monetary Authority Survey. The liability side "
            "mirrors the asset side: the main components are reserve money (currency "
            "in circulation + bank reserves), government deposits, foreign liabilities, "
            "and bonds issued. This is the broadest single measure of the PBoC's "
            "balance sheet size on the funding side. Stock in CNY billions."
        ),
        "how_to_use": (
            "Total MA liabilities equals total MA assets (aCNMAAST TOT) by definition. "
            "Growth reflects PBoC balance-sheet expansion: historically driven by FX "
            "reserve accumulation (sterilisation era pre-2014), more recently by "
            "domestic lending facilities (MLF, PSL, re-lending). A shrinking PBoC "
            "balance sheet (relative to GDP) suggests reduced monetary stimulus even "
            "if interest rates are cut. Compare with reserve money (aCNMONRESA) to "
            "assess the money-multiplier channel: reserve money is the high-powered "
            "base from which M2 is created."
        ),
        "related_series": [
            "aCNMAAST TOT",  # MA total assets
            "aCNMONRESA",    # Reserve money
            "aCNMONFORA",    # MA FX assets
            "aCNMONDGVA",    # MA govt deposits
        ],
    },

    "aCNMONDGVA": {
        "meaning": (
            "Deposits of the government held at the Monetary Authority (PBoC), monthly "
            "from the PBoC Monetary Authority Survey. This represents central government "
            "fiscal balances deposited directly with the PBoC (the Treasury single "
            "account and similar). It is a liability of the PBoC and an asset of the "
            "Ministry of Finance. Stock in CNY billions at month-end."
        ),
        "how_to_use": (
            "Government deposits at the PBoC are a fiscal-monetary interface: when the "
            "government draws down these deposits to spend, it injects reserves into "
            "the banking system, easing liquidity. Conversely, when the MoF accumulates "
            "deposits (e.g., after a large bond issuance before deployment), banking "
            "system reserves are drained. This is why PBoC OMO often spikes in months "
            "when the MoF issues large bond tranches. Tracking this series against "
            "aCNSRCDGAO (government deposits at commercial banks) provides a complete "
            "picture of fiscal-sector liquidity management."
        ),
        "related_series": [
            "aCNSRCDGAO",   # Govt deposits at depository corporations
            "aCNMALIBTOT",  # Total MA liabilities
            "aCNMONRESA",   # Reserve money
            "aCNMAASTTOT",  # Total MA assets
        ],
    },

    # ------------------------------------------------------------------ #
    #  TOTAL SOCIAL FINANCING — MONTHLY FLOWS (PBoC)
    # ------------------------------------------------------------------ #

    "aCNSFENBMA": {
        "meaning": (
            "Net financing of corporate bonds within Total Social Financing (TSF), "
            "monthly flow reported by the PBoC. This captures new issuance minus "
            "redemptions of corporate bonds (企业债券) — both exchange-listed and "
            "interbank market bonds issued by non-financial corporations. It is a "
            "flow measure in CNY billions; cumulating over 12 months approximates "
            "the annual increment to the stock."
        ),
        "how_to_use": (
            "Corporate bond issuance is a market-based credit channel that "
            "complements bank lending. When bank credit is tight (high LPR, capital "
            "constraints), larger corporates pivot to bond markets; when credit spreads "
            "are wide (e.g., post-default cycles in real estate 2021-2022), bond "
            "issuance contracts and TSF shifts toward bank loans. Compare monthly "
            "with the corporate bond stock series (aCNSFENBSA) and with RMB-loan "
            "flows (aCNSOCFINLO) to understand the bank-vs-market credit split. "
            "PBoC's inclusion of government bonds in TSF since 2019 means corporate "
            "bonds are now a smaller share; their cycle remains an important signal "
            "for credit market stress."
        ),
        "related_series": [
            "aCNSFENBSA",   # Corporate bond stock in TSF
            "aCNSOCFINLO",  # TSF RMB loans monthly
            "aCNSFLMA",     # Total TSF monthly flow
            "aCNSFBABSA",   # Bankers' acceptances in TSF
        ],
    },

    "aCNSFDELMA": {
        "meaning": (
            "Entrusted loans (委托贷款) within TSF, monthly flow from the PBoC. "
            "Entrusted loans are bank-intermediated loans where the actual lender is "
            "a non-bank entity (typically a corporation or local government) and the "
            "bank acts as agent. They were a major shadow-banking channel pre-2017, "
            "used to route credit off-balance-sheet. Regulatory tightening under "
            "the Asset Management Rules (2017-2018) and subsequent crackdowns sharply "
            "reduced new entrusted lending; monthly flows are now often negative "
            "(net contraction). Flow in CNY billions."
        ),
        "how_to_use": (
            "Entrusted loan flows are a shadow-banking barometer. Negative monthly "
            "flows indicate ongoing deleveraging of the shadow-banking system — "
            "disinflationary for credit conditions. If flows turn positive, it signals "
            "possible regulatory relaxation or circumvention. Compare with trust loans "
            "(aCNSFTRLMA) and undiscounted bankers' acceptances (aCNSFBABSA) for a "
            "composite shadow-banking indicator. Rising shadow credit tends to lead "
            "activity by 6-9 months. Cross with TSF total (aCNSFLMA): when on-"
            "balance-sheet bank loans compensate for declining shadow credit, "
            "aggregate financing may remain stable."
        ),
        "related_series": [
            "aCNSFTRLMA",   # Trust loans monthly
            "aCNSFBABSA",   # Bankers' acceptances
            "aCNSFLMA",     # Total TSF
            "aCNSOCFINLO",  # RMB loans in TSF
        ],
    },

    "aCNSFLMA": {
        "meaning": (
            "Total Social Financing (TSF / 社会融资规模) monthly flow, PBoC. TSF is "
            "China's broadest credit-flow measure, covering: RMB bank loans, foreign "
            "currency loans (RMB equivalent), entrusted loans, trust loans, "
            "undiscounted bankers' acceptances, corporate bonds, government bonds "
            "(added 2019), equity financing, ABS, loan write-offs, and others. "
            "Published mid-month for the prior month. Monthly flow in CNY billions; "
            "the stock (累计量) is reported separately."
        ),
        "how_to_use": (
            "TSF is the single most-watched monthly credit indicator for China. "
            "A strong TSF print (especially when driven by bank loans and bonds) "
            "signals credit-easing and typically leads PMI and industrial production "
            "by 3-6 months. The PBoC targets broad credit growth roughly in line with "
            "nominal GDP growth (~8-10% in recent years). When TSF growth exceeds this, "
            "leverage is rising (TSF-to-GDP gap widens, aCNBGAPGMR). Government bond "
            "issuance dominates in fiscal-stimulus quarters. Compare month-on-month "
            "with prior-year (seasonal adjustment matters enormously — January-February "
            "is typically the strongest period due to pre-CNY bank lending quotas)."
        ),
        "related_series": [
            "aCNSOCFINLO",  # RMB loans in TSF
            "aCNSFENBMA",   # Corporate bonds in TSF
            "aCNSFDELMA",   # Entrusted loans
            "aCNSFTRLMA",   # Trust loans
        ],
    },

    "aCNSOCFINLO": {
        "meaning": (
            "RMB loans within Total Social Financing, monthly flow from the PBoC. "
            "This is the single largest TSF component — typically 55-65% of the "
            "monthly total — representing net new renminbi-denominated bank loans "
            "extended by all depository institutions. Distinct from total new loans "
            "(aCNUSENLOAN) in that it is on a TSF-consistent basis and excludes "
            "loans to financial institutions. Monthly flow in CNY billions."
        ),
        "how_to_use": (
            "RMB loans in TSF are the primary transmission channel for PBoC rate "
            "and RRR policy. The annual new-loan quota (信贷额度) is the key "
            "policy lever: banks frontload in January-February. Decompose by: "
            "household (short-term consumption + mortgages) vs enterprise (short-term "
            "working capital + MLT project loans). Weak household mortgage demand "
            "(post-2021 property downturn) is visible here. Enterprise MLT loan "
            "surges in infrastructure-stimulus quarters. Cross with 1-year LPR "
            "(aCNLPR1YRR) for the rate-transmission lag — typically 1-2 quarters."
        ),
        "related_series": [
            "aCNSFLMA",     # Total TSF
            "aCNUSENLOAN",  # Total new loans
            "aCNMLANFC",    # MLT loans stock
            "aCNLPR1YRR",   # 1-year LPR
        ],
    },

    "aCNSFTRLMA": {
        "meaning": (
            "Trust loans (信托贷款) within TSF, monthly flow from the PBoC. Trust "
            "loans are credit extended through trust companies — a major shadow-"
            "banking vehicle pre-2017. Borrowers were typically real-estate developers, "
            "local government financing vehicles (LGFVs), and mining companies that "
            "lacked direct bank access. Like entrusted loans, regulatory tightening "
            "from 2017 onward caused persistent negative flows (net repayment). "
            "Monthly flow in CNY billions."
        ),
        "how_to_use": (
            "Persistent negative trust-loan flows since 2018 have been a structural "
            "drag on TSF, partially offset by government bond issuance. A reversal "
            "to positive would signal regulatory relaxation, likely accompanied by "
            "property-sector bailout measures. Monitor for episodic spikes: when "
            "property developers face liquidity crises (e.g., Evergrande 2021), "
            "trust-product defaults surge, creating systemic risk concerns. Cross "
            "with entrusted loans (aCNSFDELMA) and bankers' acceptances (aCNSFBABSA) "
            "for composite shadow-banking exposure."
        ),
        "related_series": [
            "aCNSFDELMA",   # Entrusted loans
            "aCNSFBABSA",   # Bankers' acceptances
            "aCNSFLMA",     # Total TSF
            "aCNBGAPGMR",   # Credit-to-GDP gap
        ],
    },

    # ------------------------------------------------------------------ #
    #  MFI LOAN AGGREGATES — USES OF FUNDS
    # ------------------------------------------------------------------ #

    "aCNUSELOANG": {
        "meaning": (
            "Year-on-year percentage change in total loans outstanding at monetary "
            "financial institutions (MFIs), monthly from the PBoC. This is the "
            "standard YoY growth rate for aggregate bank credit — one of the most "
            "widely cited monetary statistics in China. A percentage change; the "
            "level stock is reported separately."
        ),
        "how_to_use": (
            "Loan growth YoY is the primary gauge of credit cycle momentum. PBoC "
            "guidance typically targets loan growth slightly above nominal GDP growth "
            "(currently ~8-10%). A deceleration below 8% signals credit contraction "
            "pressure; acceleration above 12% signals potential overheating or "
            "policy-driven stimulus. The series is highly seasonal — base effects in "
            "January-February (strong prior-year quarter) can temporarily suppress "
            "YoY rates. Cross with M2 growth (aCNM2GRTY) as a consistency check: "
            "loan growth and M2 growth are tightly linked because Chinese bank loans "
            "create deposits one-for-one."
        ),
        "related_series": [
            "aCNM2GRTY",    # M2 growth YoY
            "aCNUSENLOAN",  # New loan monthly flow
            "aCNTYLYAR",    # Loans YoY (variant series)
            "aCNSFLMA",     # Total TSF flow
        ],
    },

    "aCNTYLYAR": {
        "meaning": (
            "Year-on-year change in total loans at monetary financial institutions, "
            "monthly from the PBoC — a variant presentation of aggregate bank credit "
            "growth (similar to aCNUSELOANG). May represent the absolute CNY change "
            "versus a year earlier (i.e., an increment) rather than a percentage rate, "
            "depending on Refinitiv mapping. Published alongside PBoC financial "
            "statistics releases."
        ),
        "how_to_use": (
            "Use in conjunction with aCNUSELOANG to reconcile level and rate signals. "
            "If expressed as an absolute YoY increment (CNY bn), it directly measures "
            "the net stock increase — useful for comparing with TSF flows (aCNSFLMA) "
            "to estimate the non-loan portion of TSF. Monitor for structural breaks: "
            "a narrowing gap between new gross loans and net stock change implies "
            "rising loan write-offs or prepayments, consistent with credit-quality "
            "concerns. Also compare with M2 growth (aCNM2GRTY) for monetary "
            "transmission assessment."
        ),
        "related_series": [
            "aCNUSELOANG",  # Loans YoY %
            "aCNUSENLOAN",  # New loans flow
            "aCNM2GRTY",    # M2 growth
            "aCNSFLMA",     # TSF total
        ],
    },

    "aCNMNLOAN": {
        "meaning": (
            "Medium and long-term (MLT) loans outstanding at monetary financial "
            "institutions, monthly from the PBoC. Stock measure of all RMB-denominated "
            "bank loans with original maturity greater than 1 year, including mortgage "
            "loans to households, fixed-asset investment loans to enterprises, "
            "infrastructure project loans, and policy-bank PSL-funded loans. "
            "CNY billions at month-end. (Quarterly counterpart: aCNMLANFC.)"
        ),
        "how_to_use": (
            "MLT loan stock growth is a proxy for investment-cycle momentum. A "
            "slowdown typically precedes a capex downturn by 2-3 quarters as projects "
            "with committed credit drawdowns continue. Decompose household vs enterprise "
            "MLT: in 2022-2024, household MLT contracted as mortgage repayments "
            "exceeded new originations — a first in modern Chinese banking history. "
            "Enterprise MLT remained supported by infrastructure mandates. The "
            "5-year LPR (mortgage benchmark) is the key pricing signal; PSL rate "
            "matters for policy-bank MLT. A rebound in MLT loans is the clearest "
            "leading indicator of property-sector stabilisation."
        ),
        "related_series": [
            "aCNMLANFC",    # MLT loans (quarterly)
            "aCNSTLOAN",    # Short-term loans
            "aCNHOUSLNA",   # Housing mortgages
            "aCNLPR1YRR",   # LPR 1-year
        ],
    },

    "aCNUSENLOAN": {
        "meaning": (
            "New RMB loans (新增贷款) — the monthly flow of gross new bank loans "
            "extended by all depository institutions, reported by the PBoC. This is "
            "the headline credit-flow figure watched most closely by markets on release "
            "day (typically released alongside M2, TSF, and new deposits in the second "
            "week of each month). Expressed in CNY billions; a monthly flow."
        ),
        "how_to_use": (
            "New loans are the single most market-moving Chinese credit release. "
            "January is always the largest month due to annual quota frontloading and "
            "pre-CNY corporate borrowing. Weak February-March data after a strong "
            "January print does not necessarily signal deterioration. Decompose: "
            "household short-term (consumption/credit cards), household MLT "
            "(mortgages), enterprise short-term (working capital), enterprise MLT "
            "(investment), and bills/acceptances (often window-dressing by banks "
            "to meet quotas). A bill-heavy composition with weak MLT signals "
            "quantity-over-quality lending. Cross with LPR (aCNLPR1YRR) for rate "
            "transmission; with M2 (aCNM2GRTY) for multiplier consistency."
        ),
        "related_series": [
            "aCNSFLMA",     # Total TSF
            "aCNSOCFINLO",  # RMB loans in TSF
            "aCNM2GRTY",    # M2 growth
            "aCNLPR1YRR",   # 1-year LPR
        ],
    },

    "aCNSTLOAN": {
        "meaning": (
            "Short-term loans outstanding at monetary financial institutions, "
            "monthly from the PBoC. Covers all RMB bank loans with original maturity "
            "of 1 year or less, including corporate working capital lines, trade "
            "finance, and household consumer credit (credit cards, personal overdrafts). "
            "Excludes bill financing (reported separately). Stock in CNY billions."
        ),
        "how_to_use": (
            "Short-term loans are the most cyclically sensitive credit component — "
            "they expand rapidly when corporate cash-flow demand rises and contract "
            "when activity slows or uncertainty rises. A high share of short-term "
            "loans in new-credit flows can indicate that banks are reluctant to "
            "commit to longer-term risk (precautionary shortening of tenors). "
            "Compare with MLT loans (aCNMNLOAN): a rising ST/MLT ratio signals "
            "credit-cycle caution. Cross with PMI new-orders and trade finance "
            "data — ST trade finance loans expand with export growth and contract "
            "with trade-war disruptions."
        ),
        "related_series": [
            "aCNMNLOAN",    # MLT loans
            "aCNUSENLOAN",  # New loans total
            "aCNSFBABSA",   # Bankers' acceptances
            "aCNLPR1YRR",   # 1-year LPR
        ],
    },

    # ------------------------------------------------------------------ #
    #  TSF QUARTERLY STOCKS (PBoC / Refinitiv)
    # ------------------------------------------------------------------ #

    "aCNSFENBOA": {
        "meaning": (
            "Corporate bonds in Total Social Financing — quarterly outstanding stock, "
            "PBoC/Refinitiv. This is the accumulated stock of net corporate bond "
            "financing included in TSF, updated each quarter. Expressed in CNY "
            "billions. Complements the monthly flow (aCNSFENBMA) for level analysis."
        ),
        "how_to_use": (
            "The stock measure allows calculation of corporate-bond share in total "
            "TSF (aCNSFTOTLA) and tracks the structural deepening of China's bond "
            "market as a credit channel. Rising corporate bond stock relative to "
            "bank loans implies disintermediation — positive for capital-market "
            "development but also a sign of credit re-segmentation (high-quality "
            "issuers accessing bonds; weaker credits relying on banks). Credit "
            "spread monitoring (aCNNYLAA) complements this: rising spreads with "
            "high bond stock signals refinancing risk for lower-rated issuers. "
            "The 2021-2022 real-estate default cycle was visible as the real-estate "
            "sub-component of corporate bond stock contracted."
        ),
        "related_series": [
            "aCNSFENBMA",   # Corporate bonds monthly flow
            "aCNSFTOTLA",   # Total TSF quarterly stock
            "aCNSFRMBLA",   # RMB loans quarterly
            "aCNNYLAA",     # Credit spread proxy
        ],
    },

    "aCNSFDELOA": {
        "meaning": (
            "Entrusted loans within TSF — quarterly outstanding stock, PBoC/Refinitiv. "
            "The accumulated stock of entrusted loan balances counted within the TSF "
            "framework. Since regulatory crackdowns from 2017, this stock has been in "
            "steady decline as old loans mature and new origination is severely "
            "restricted. Stock in CNY billions."
        ),
        "how_to_use": (
            "The declining trajectory of entrusted loan stock is a multi-year "
            "structural story of shadow-banking contraction. Use the quarterly stock "
            "to calculate entrusted loans as a share of total TSF — a falling share "
            "confirms the secular deleveraging of the shadow sector. If the rate of "
            "decline slows, it may foreshadow regulatory accommodation. Cross with "
            "trust loan stock (aCNSFTRLOA) and total TSF (aCNSFTOTLA) to construct "
            "a shadow-banking-within-TSF ratio. A sharp decline in shadow credit "
            "not offset by bank loan growth results in a net tightening of credit "
            "conditions despite easy official rates."
        ),
        "related_series": [
            "aCNSFTRLOA",   # Trust loans quarterly stock
            "aCNSFTOTLA",   # Total TSF quarterly
            "aCNSFDELMA",   # Entrusted loans monthly flow
            "aCNBGAPGMR",   # Credit-to-GDP gap
        ],
    },

    "aCNSFFCLRA": {
        "meaning": (
            "Foreign currency loans (converted to RMB) within TSF — quarterly stock, "
            "PBoC/Refinitiv. This component captures cross-border and domestic "
            "foreign-currency credit extended to non-financial entities, valued in "
            "RMB at the prevailing exchange rate. It reflects China's FX loan market "
            "and can be affected by both credit demand and exchange-rate movements. "
            "Stock in CNY billions."
        ),
        "how_to_use": (
            "FX loans in TSF provide a window into trade-finance and cross-border "
            "borrowing conditions. When CNY appreciates, FX loans in RMB terms "
            "decline even without repayment — a valuation effect that must be "
            "stripped out for volume analysis. Rising FX loan demand can signal "
            "carry-trade dynamics (cheap USD/EUR funding for CNY assets) or expanding "
            "trade credit. A sharp contraction may reflect capital-flow restrictions "
            "or dollar appreciation squeezing RMB-hedging costs. Cross with SAFE "
            "cross-border capital flow data and CNY exchange rate (aCNXRUSD) for "
            "full interpretation."
        ),
        "related_series": [
            "aCNSFFCLSA",   # FX loans in TSF monthly stock
            "aCNSFTOTLA",   # Total TSF quarterly
            "aCNXRUSD",     # USD/CNY exchange rate
            "aCNCRESA",     # FX reserves
        ],
    },

    "aCNSFTOTLA": {
        "meaning": (
            "Total Social Financing outstanding stock — quarterly, PBoC/Refinitiv. "
            "This is the accumulated stock of all TSF components: RMB loans, FX loans, "
            "entrusted loans, trust loans, bankers' acceptances, corporate bonds, "
            "government bonds, equity financing, ABS, and others. The most "
            "comprehensive measure of credit in the Chinese economy. TSF stock as "
            "a share of GDP exceeded 290% by 2024. Stock in CNY billions."
        ),
        "how_to_use": (
            "TSF stock / nominal GDP is the broadest leverage ratio for China's "
            "real economy. The BIS credit-to-GDP gap (aCNBGAPGMR) compares this "
            "to a trend — a positive gap above 10pp has historically preceded "
            "banking crises globally. For monetary policy, the PBoC monitors TSF "
            "stock growth as a policy target. In 2024 guidance, PBoC indicated that "
            "TSF stock growth of ~8% was consistent with economic growth and "
            "inflation targets. Quarterly data allows clean GDP-ratio computation; "
            "for flow momentum use aCNSFLMA."
        ),
        "related_series": [
            "aCNSFLMA",     # Monthly flow
            "aCNSFRMBLA",   # RMB loans quarterly stock
            "aCNBGAPGMR",   # BIS credit-GDP gap
            "aCNM2GRTY",    # M2 growth
        ],
    },

    "aCNSFRMBLA": {
        "meaning": (
            "RMB loans within TSF — quarterly outstanding stock, PBoC/Refinitiv. "
            "The accumulated stock of renminbi bank loans counted within the TSF "
            "framework, comprising all depository institution RMB lending to the "
            "real economy (households, non-financial enterprises, government entities). "
            "This is the largest single TSF component (~60% of total stock). "
            "Stock in CNY billions."
        ),
        "how_to_use": (
            "RMB loan stock growth is the primary driver of M2 money supply in China "
            "because each new loan creates a corresponding deposit. The loan-to-deposit "
            "ratio (aCNCNIBIQ) constrains how much banks can lend against existing "
            "deposits. Track alongside total TSF (aCNSFTOTLA) to compute RMB loans' "
            "share: a declining share suggests bond markets and shadow credit are "
            "growing faster. A rising share post-2020 reflects shadow-banking "
            "contraction and bank-loan dominance. PBoC RRR cuts and LPR reductions "
            "directly stimulate this series. Cross with credit-to-GDP gap (aCNBGAPGMR) "
            "for leverage sustainability analysis."
        ),
        "related_series": [
            "aCNSOCFINLO",  # RMB loans monthly flow
            "aCNSFTOTLA",   # Total TSF stock
            "aCNCNIBIQ",    # Deposit-loan ratio
            "aCNBGAPGMR",   # Credit-GDP gap
        ],
    },

    "aCNSFSNFEA": {
        "meaning": (
            "Equity financing of domestic non-financial enterprises within TSF — "
            "quarterly stock, PBoC/Refinitiv. This captures the cumulative stock of "
            "equity capital raised by non-financial companies on domestic stock "
            "markets (A-share IPOs and secondary offerings on Shanghai and Shenzhen "
            "exchanges) as counted in TSF. A small but structurally important component "
            "as China deepens its capital markets. Stock in CNY billions."
        ),
        "how_to_use": (
            "Equity financing in TSF signals the direct funding contribution of "
            "domestic stock markets to the real economy — as opposed to secondary "
            "market trading. Growth in this component reflects market conditions "
            "(bull markets generate more IPO proceeds), regulatory IPO approval "
            "pace (CSRC controls issuance), and policy priorities (STAR Market for "
            "tech; ChiNext for growth companies). Cross with the monthly flow "
            "(aCNSFSNFSA) for recent momentum. When equity financing grows rapidly, "
            "corporate leverage (debt-to-equity) should improve — a positive signal "
            "for bank credit quality."
        ),
        "related_series": [
            "aCNSFSNFSA",   # Equity financing monthly
            "aCNSFTOTLA",   # Total TSF quarterly
            "aCNSFENBOA",   # Corporate bonds quarterly
            "aCNSFRMBLA",   # RMB loans quarterly
        ],
    },

    "aCNSFTRLOA": {
        "meaning": (
            "Trust loans within TSF — quarterly outstanding stock, PBoC/Refinitiv. "
            "The accumulated stock of trust-company-intermediated credit included in "
            "TSF. As with entrusted loans, this stock has been declining since the "
            "2017-2018 shadow-banking regulatory tightening. Stock in CNY billions."
        ),
        "how_to_use": (
            "The trust-loan stock contraction is one of the defining structural forces "
            "in Chinese credit markets since 2018. Track the quarterly decline rate: "
            "an accelerating pace of contraction tightens credit conditions for LGFV "
            "and property borrowers who were heavily reliant on trust finance. Cross "
            "with entrusted loan stock (aCNSFDELOA) for total shadow-banking-within-"
            "TSF. As trust loans decline, watch whether the credit gap is filled by "
            "special local government bonds or bank loans — the substitution pattern "
            "determines the macro-fiscal impact. In 2024, LGFV debt swaps partially "
            "converted trust liabilities into explicit government obligations."
        ),
        "related_series": [
            "aCNSFDELOA",   # Entrusted loans quarterly
            "aCNSFTRLMA",   # Trust loans monthly flow
            "aCNSFTOTLA",   # Total TSF quarterly
            "aCNBGAPGMR",   # BIS credit-GDP gap
        ],
    },

    # ------------------------------------------------------------------ #
    #  MFI SOURCES OF FUNDS / OTHER ITEMS
    # ------------------------------------------------------------------ #

    "aCNSRCTRSD": {
        "meaning": (
            "Fiscal deposits (财政存款) at monetary financial institutions — sources "
            "of funds, monthly from the PBoC. Represents the consolidated balance "
            "of government accounts (central + local) held at all depository "
            "institutions (including the PBoC). When fiscal deposits rise, liquidity "
            "is drained from the private sector; when they fall (fiscal expansion), "
            "liquidity is injected. Stock in CNY billions. (Closely related to "
            "aCNSRCDGAO but may use broader institutional coverage.)"
        ),
        "how_to_use": (
            "Fiscal deposit seasonality is the largest predictable liquidity driver "
            "in China's money markets. Tax season peaks (March-April VAT and income "
            "tax; June corporate tax) drain deposits; year-end government spending "
            "sprees inject them. The PBoC sets overnight and 7-day reverse repo rates "
            "partly in response to fiscal deposit movements. A larger-than-expected "
            "build-up of fiscal deposits (government hoarding) is effectively a "
            "fiscal tightening. Track against aCNMONDGVA (PBoC-held government "
            "deposits) to see how much goes on- versus off-PBoC-balance-sheet."
        ),
        "related_series": [
            "aCNMONDGVA",   # MA government deposits
            "aCNSRCDGAO",   # Deposits of government depts
            "aCNMONRESA",   # Reserve money
            "aCNUSENLOAN",  # New loans
        ],
    },

    "aCNLONFINEN": {
        "meaning": (
            "Loans to non-financial enterprises and other sectors by MFIs, monthly "
            "from the PBoC. This measures the total stock of RMB bank credit "
            "extended to the non-financial corporate sector (state-owned enterprises, "
            "private companies) plus other non-household, non-financial borrowers "
            "(e.g., NGOs, self-employed individuals). One of the key decompositions "
            "of total MFI loans between household and enterprise borrowers. "
            "Stock in CNY billions."
        ),
        "how_to_use": (
            "Enterprise loans drive the investment cycle. In China, SOE borrowing "
            "dominates this series — SOEs benefit from implicit government guarantees, "
            "lower perceived credit risk, and policy-bank co-financing. Private "
            "enterprises (民营企业) face a structural financing gap (higher rates, "
            "shorter maturities, collateral requirements). Policy signals to expand "
            "private-enterprise credit access often appear here as a broadening of "
            "the enterprise loan base. Cross with MLT loans (aCNMNLOAN) to assess "
            "investment intent; with short-term loans (aCNSTLOAN) for working-capital "
            "demand. Weakness here amid strong government bond issuance signals "
            "crowding-out of private credit."
        ),
        "related_series": [
            "aCNMNLOAN",    # MLT loans
            "aCNSTLOAN",    # Short-term loans
            "aCNUFLTHC",    # Household consumption loans
            "aCNUSENLOAN",  # New loans total
        ],
    },

    "aCNMAASTTOT": {
        "meaning": (
            "Total assets of the Monetary Authority (PBoC), monthly from the PBoC "
            "Monetary Authority Survey. Components: foreign assets (the dominant item "
            "— FX reserves held by the PBoC), claims on government (PBoC direct "
            "lending to MoF, very limited in China), claims on other depository "
            "corporations (MLF, SLF, re-lending, PSL), claims on other financial "
            "corporations, and other assets. This is the PBoC balance sheet total. "
            "Stock in CNY billions."
        ),
        "how_to_use": (
            "PBoC total assets are a measure of the monetary base injection. Pre-2014, "
            "total assets expanded rapidly as the PBoC accumulated FX reserves via "
            "sterilised intervention. Post-2014, FX asset growth plateaued; domestic "
            "lending facilities (MLF, PSL, re-lending) became the primary expansion "
            "driver — a structural shift from passive (FX-driven) to active (policy-"
            "rate-driven) base-money creation. Compare with aCNMAASTTOT and reserve "
            "money (aCNMONRESA): the gap between total assets and reserve money "
            "reflects non-monetary liabilities (government deposits, bonds issued, "
            "foreign liabilities). Rapid growth in claims on ODCs (aCNMONDECA) "
            "without a corresponding expansion in reserve money signals PBoC "
            "liquidity provision being hoarded as excess reserves."
        ),
        "related_series": [
            "aCNMONFORA",   # MA foreign exchange assets
            "aCNMONDECA",   # MA claims on ODCs
            "aCNMONRESA",   # Reserve money
            "aCNMALIBTOT",  # MA total liabilities
        ],
    },

    "aCNUSELOAN": {
        "meaning": (
            "Total loans outstanding at monetary financial institutions — quarterly "
            "stock, PBoC. The aggregate of all RMB and foreign currency loans "
            "extended by all depository institutions to all sectors of the economy "
            "(households, enterprises, government). This is the broadest bank-credit "
            "stock measure available at quarterly frequency, complementing the "
            "monthly new-loan flow (aCNUSENLOAN). Stock in CNY billions."
        ),
        "how_to_use": (
            "The quarterly stock allows cleaner GDP-ratio analysis (loan-to-GDP) "
            "versus the noisy monthly new-loan data. Compute as a share of nominal "
            "GDP to track leverage cycles. Cross with TSF stock (aCNSFTOTLA): the "
            "spread between MFI total loans and TSF RMB loans (aCNSFRMBLA) reflects "
            "financial-institution-to-institution lending, interbank credit, and FX "
            "loans not captured in TSF. A rising loan/GDP ratio alongside slowing "
            "nominal GDP signals deteriorating credit efficiency (decreasing credit "
            "multiplier per unit of new output)."
        ),
        "related_series": [
            "aCNUSENLOAN",  # Monthly new loans flow
            "aCNSFRMBLA",   # TSF RMB loans quarterly
            "aCNSFTOTLA",   # Total TSF quarterly
            "aCNBGAPGMR",   # BIS credit-GDP gap
        ],
    },

    # ------------------------------------------------------------------ #
    #  ODCS (OTHER DEPOSITORY CORPORATIONS SURVEY) & SOCIAL FINANCING STOCKS
    # ------------------------------------------------------------------ #

    "aCNFICBBD": {
        "meaning": (
            "Central bank bonds held by other depository corporations (ODCs — "
            "commercial banks), from the PBoC Other Depository Corporations Survey, "
            "monthly. These are PBoC-issued sterilisation bonds (央票, central bank "
            "bills) held on commercial bank balance sheets as assets. Issuance of "
            "central bank bills was the primary PBoC sterilisation tool pre-2013; "
            "since then the stock has largely matured and has not been fully replaced. "
            "Stock in CNY billions."
        ),
        "how_to_use": (
            "A declining stock of central bank bills reflects the unwinding of the "
            "earlier sterilisation era. When this stock falls (bills mature, PBoC "
            "does not re-issue), the freed reserves expand bank lending capacity — "
            "an indirect easing. If PBoC were to resume large-scale bill issuance, "
            "it would tighten reserve conditions and is typically a signal of "
            "renewed sterilisation pressure from FX inflows. Monitor alongside "
            "aCNMAASTTOT and aCNMONFORA: when FX assets rise rapidly and this "
            "series also rises, it signals sterilised intervention."
        ),
        "related_series": [
            "aCNMAASTTOT",  # MA total assets
            "aCNMONFORA",   # MA FX assets
            "aCNMONRESA",   # Reserve money
            "aCNCRESA",     # Foreign exchange reserves (SAFE)
        ],
    },

    "aCNSFDELSA": {
        "meaning": (
            "Entrusted loans — outstanding stock within Social Financing (TSF), "
            "monthly from the PBoC. This is the end-of-month stock of entrusted "
            "loan balances as reported in the TSF framework. It provides monthly "
            "frequency for what is also reported quarterly (aCNSFDELOA). "
            "Stock in CNY billions."
        ),
        "how_to_use": (
            "Use monthly stock data to track the pace of shadow-banking contraction "
            "at higher frequency than the quarterly series. A flattening or uptick "
            "in the monthly stock would be an early signal of regulatory relaxation "
            "before quarterly data confirms. Cross-check with entrusted loan monthly "
            "flow (aCNSFDELMA): net flow = stock change (approximately, adjusted for "
            "FX valuation). When entrusted loan stock declines rapidly, displaced "
            "borrowers (typically LGFVs and developers) either access bond markets "
            "or face credit stress — watch aCNSFENBSA for the substitution effect."
        ),
        "related_series": [
            "aCNSFDELMA",   # Entrusted loans monthly flow
            "aCNSFDELOA",   # Entrusted loans quarterly stock
            "aCNSFTRLMA",   # Trust loans flow
            "aCNSFLMA",     # Total TSF
        ],
    },

    "aCNSFSNFSA": {
        "meaning": (
            "Equity financing of domestic non-financial enterprises within Social "
            "Financing — monthly outstanding stock, PBoC. Tracks the cumulative "
            "equity capital raised via domestic A-share listings and secondary "
            "offerings. Monthly frequency version of the quarterly series "
            "(aCNSFSNFEA). Stock in CNY billions."
        ),
        "how_to_use": (
            "Monthly equity financing stock allows tracking of IPO pipeline "
            "momentum at higher frequency. A surge in monthly additions reflects "
            "CSRC approval of a backlog of IPO applications and active secondary "
            "issuance — typically coincides with buoyant equity market conditions. "
            "Structural rise in equity financing as a share of TSF signals capital-"
            "market deepening and potential corporate deleveraging. Cross with "
            "SSE/SZSE trading volumes and the STAR Market performance. Also relevant "
            "to aggregate capital formation: equity financing supplements retained "
            "earnings as a corporate investment funding source."
        ),
        "related_series": [
            "aCNSFSNFEA",   # Equity financing quarterly
            "aCNSFENBSA",   # Corporate bonds monthly stock
            "aCNSFLMA",     # Total TSF flow
            "aCNCNIDFCM",   # SSE 180 monthly low (equity market proxy)
        ],
    },

    "aCNSFFCLSA": {
        "meaning": (
            "Foreign currency loans (RMB equivalent) within Social Financing — "
            "monthly outstanding stock, PBoC. Monthly frequency version of the "
            "quarterly stock (aCNSFFCLRA). Captures all FX-denominated loans to "
            "the domestic real economy, converted to CNY at spot rate. "
            "Stock in CNY billions."
        ),
        "how_to_use": (
            "FX loan stock fluctuates with both credit volumes and the USD/CNY "
            "exchange rate — when CNY weakens, the CNY value of outstanding FX "
            "loans rises (adverse balance-sheet effect for unhedged borrowers). "
            "A declining FX loan stock may reflect genuine repayment, CNY "
            "appreciation, or regulatory restrictions on FX borrowing. Monthly "
            "data flags when the PBoC adjusts FX loan macro-prudential rules "
            "(e.g., cross-border financing leverage ratios). Cross with aCNXRUSD "
            "to separate volume from FX valuation effects."
        ),
        "related_series": [
            "aCNSFFCLRA",   # FX loans quarterly
            "aCNXRUSD",     # USD/CNY rate
            "aCNCRESA",     # FX reserves
            "aCNSFLMA",     # Total TSF
        ],
    },

    "aCNSFENBSA": {
        "meaning": (
            "Net financing of corporate bonds within Social Financing — monthly "
            "outstanding stock, PBoC. The accumulated stock of corporate bond "
            "net financing counted in TSF at month-end. Complements the monthly "
            "flow (aCNSFENBMA) and quarterly stock (aCNSFENBOA). Stock in CNY billions."
        ),
        "how_to_use": (
            "Track monthly to monitor corporate bond market trends in real time. "
            "A contraction in this stock (net redemptions exceeding new issuance) "
            "signals either tight credit spreads deterring issuers, rollover risk, "
            "or sector-specific distress (e.g., property developer bonds post-2021). "
            "Compare with RMB loan stock (aCNSFRMBSA) to gauge bank-vs-bond "
            "credit balance. When corporate bond issuance replaces shadow-banking "
            "channels (trusts/entrusted), it is a more transparent, market-priced "
            "form of credit. Rising defaults in this stock are visible through "
            "credit-spread widening even before PBoC data is published."
        ),
        "related_series": [
            "aCNSFENBMA",   # Corp bonds monthly flow
            "aCNSFENBOA",   # Corp bonds quarterly stock
            "aCNSFRMBSA",   # RMB loans monthly stock
            "aCNSFLMA",     # Total TSF
        ],
    },

    "aCNSFRMBSA": {
        "meaning": (
            "RMB loans within Social Financing — monthly outstanding stock, PBoC. "
            "Month-end stock of all renminbi bank loans to the real economy counted "
            "within the TSF framework. Monthly frequency counterpart to the quarterly "
            "series (aCNSFRMBLA). The dominant TSF component (~60% of total stock). "
            "Stock in CNY billions."
        ),
        "how_to_use": (
            "Monthly RMB loan stock allows tracking of the primary credit channel at "
            "full frequency. Growth rate (YoY %) mirrors aCNUSELOANG. Cross with "
            "total TSF stock to compute RMB loans' share: structural rise in this "
            "share post-2018 confirms shadow-banking retreat and bank-loan dominance. "
            "Monthly flow implied by stock change (delta) cross-checks with reported "
            "new loans (aCNUSENLOAN) — persistent discrepancies may reflect FX loan "
            "conversions or write-off activity. This series and M2 (aCNM2GRTY) "
            "are the two most watched PBoC monetary releases."
        ),
        "related_series": [
            "aCNSOCFINLO",  # RMB loans TSF monthly flow
            "aCNSFRMBLA",   # RMB loans quarterly stock
            "aCNM2GRTY",    # M2 growth
            "aCNUSENLOAN",  # New loans
        ],
    },

    "aCNSFBABSA": {
        "meaning": (
            "Undiscounted bankers' acceptances (未贴现银行承兑汇票) within Social "
            "Financing — monthly outstanding stock, PBoC. Bankers' acceptances are "
            "short-term trade-finance instruments (typically 6-month maturity) "
            "guaranteed by a bank. 'Undiscounted' means they have not been "
            "rediscounted into the formal loan book — they remain off-balance-sheet "
            "credit. Included in TSF to capture this quasi-credit. Stock in CNY billions."
        ),
        "how_to_use": (
            "Undiscounted bankers' acceptances are a leading indicator of trade and "
            "manufacturing credit demand — they surge when corporates need short-term "
            "trade finance and banks are willing to underwrite. A rise in BA stock "
            "alongside weak loan data suggests banks are substituting off-balance-"
            "sheet instruments to meet credit demand without consuming capital. "
            "Conversely, a sharp BA contraction (as occurred in 2018-2019 under "
            "shadow-banking rules) tightens conditions for SMEs reliant on trade "
            "finance. Cross with short-term loans (aCNSTLOAN) and entrusted loans "
            "(aCNSFDELSA) for a comprehensive short-term credit picture."
        ),
        "related_series": [
            "aCNSFBABMA",   # BAs monthly flow (if available)
            "aCNSTLOAN",    # Short-term loans
            "aCNSFDELSA",   # Entrusted loans stock
            "aCNSFLMA",     # Total TSF
        ],
    },

    # ------------------------------------------------------------------ #
    #  BIS CREDIT-TO-GDP GAP & DOMESTIC FINANCE RATIOS
    # ------------------------------------------------------------------ #

    "aCNBGAPGMR": {
        "meaning": (
            "China's credit-to-GDP gap — actual private-non-financial-sector credit-"
            "to-GDP ratio minus its long-run trend, published quarterly by the Bank "
            "for International Settlements (BIS). A positive gap means credit has "
            "grown faster than GDP trend, signalling potential financial vulnerability. "
            "The BIS flags a gap above +10 percentage points as a systemic banking "
            "stress warning. Expressed in percentage points."
        ),
        "how_to_use": (
            "The credit-to-GDP gap is one of the most reliable early-warning "
            "indicators of banking crises. China's gap peaked above +20pp in 2016 "
            "and has moderated since, but remains elevated by international standards. "
            "A rising gap concurrent with slowing GDP growth (as in 2023-2024) signals "
            "rising credit intensity of growth — diminishing returns on leverage. "
            "Use alongside TSF stock/GDP (aCNSFTOTLA), system NPL ratio (aCNCNCXXK/A), "
            "and NIM compression (aCNCNMRSOQ) to build a banking-stability scorecard. "
            "PBoC macro-prudential tightening (LTV limits, shadow-banking rules) is "
            "partly aimed at reducing this gap."
        ),
        "related_series": [
            "aCNSFTOTLA",   # TSF total quarterly stock
            "aCNCNCXXK/A",  # System NPL ratio
            "aCNCNMRSOQ",   # Net interest margin
            "aCNM2GRTY",    # M2 growth
        ],
    },

    # ------------------------------------------------------------------ #
    #  COMMERCIAL BANK PERFORMANCE RATIOS (quarterly, NFRA)
    # ------------------------------------------------------------------ #

    "aCNCNHHUEQ": {
        "meaning": (
            "Core Tier-1 (CET1) capital adequacy ratio of China's commercial banking "
            "system, quarterly from NFRA. The ratio of CET1 capital to total risk-"
            "weighted assets. Regulatory minimum: 5% (7.5% with buffers for non-"
            "G-SIBs; 8.5%+ for Big-6 G-SIBs). System-wide ratio has been ~10-11%. "
            "A percentage ratio."
        ),
        "how_to_use": (
            "CET1 CAR is the binding constraint for capital-hungry banks. When it "
            "approaches minimums, dividend cuts, rights issues, or lending restraint "
            "follow. The Big-6 banks (ICBC, CCB, ABC, BoC, BoCom, PSBC) face higher "
            "G-SIB surcharges; their CET1 ratios are typically lower than the system "
            "average because they dominate system assets. A divergence between the "
            "system CET1 (this series) and large-bank CET1 signals small-bank stress "
            "or large-bank improvement. Cross with risk-weighted assets (aCNCBCRWCA) "
            "to understand whether ratio changes are capital-driven or RWA-driven."
        ),
        "related_series": [
            "aCNCBNCTCA",   # Net CET1 capital stock
            "aCNCBTCARR",   # Tier-1 CAR
            "aCNCNOAVQ",    # Large bank total CAR
            "aCNCNCXXK/A",  # NPL ratio
        ],
    },

    "aCNCNHUVTQ": {
        "meaning": (
            "Cost-to-income ratio (费用收入比) of China's commercial banking system, "
            "quarterly from NFRA. Measures operating expenses as a percentage of "
            "operating income (net interest income + non-interest income). Chinese "
            "banks have historically had relatively low cost ratios (~30-35%) due to "
            "the wide NIM and cheap retail funding base. Rising ratios signal "
            "efficiency deterioration or revenue compression."
        ),
        "how_to_use": (
            "Cost-to-income deterioration can stem from either rising costs (branch "
            "expansion, technology investment, salary inflation) or falling revenue "
            "(NIM compression from rate cuts). In 2022-2024, PBoC-mandated LPR cuts "
            "and deposit-rate floors compressed NIM, pushing cost ratios higher even "
            "with controlled costs. Monitor alongside NIM (aCNCNMRSOQ) to diagnose "
            "cause. A rising cost ratio reduces retained earnings and thus organic "
            "CET1 capital generation — tightening the capital-lending nexus. Large "
            "banks tend to have higher cost ratios (branch networks) than joint-stock "
            "banks; CMB (招商银行) benchmarks best-in-class retail efficiency."
        ),
        "related_series": [
            "aCNCNMRSOQ",   # Net interest margin
            "aCNCNHXSFQ",   # Large bank asset profit margin
            "aCNCNHHUEQ",   # CET1 CAR
            "aCNCNCXXK/A",  # NPL ratio
        ],
    },

    "aCNCNIBIQ": {
        "meaning": (
            "Commercial bank deposit-loan ratio (贷款/存款比率) — quarterly from "
            "NFRA. This measures total loans as a percentage of total deposits. "
            "China abolished the formal 75% ceiling on this ratio in 2015, but banks "
            "still monitor it as a liquidity indicator. A high ratio (~85-90%+) "
            "signals tight funding and may require wholesale market borrowing. "
            "A percentage ratio."
        ),
        "how_to_use": (
            "The deposit-loan ratio is a funding-liquidity gauge. A rising ratio "
            "means banks are lending more aggressively relative to their deposit "
            "base, increasing reliance on interbank funding — which is more volatile. "
            "When PBoC cuts RRR, it directly frees reserves for lending without "
            "requiring more deposits. In an environment of deposit competition "
            "(WMPs, money market funds drawing funds away from bank deposits), the "
            "deposit base can stagnate even as loans grow — pushing up this ratio. "
            "Cross with M2 (aCNM2GRTY) and new loans (aCNUSENLOAN): when loans grow "
            "faster than deposits, money velocity is accelerating, often preceding "
            "inflation or asset-price pressure."
        ),
        "related_series": [
            "aCNUSELOAN",   # Total loans stock
            "aCNM2GRTY",    # M2 (deposits proxy)
            "aCNCNMRSOQ",   # NIM
            "aCNCRR",       # Required reserve ratio
        ],
    },

    "aCNCNGLDPQ": {
        "meaning": (
            "Loan loss provision balance (贷款损失准备) of commercial banks — "
            "quarterly from NFRA. The absolute stock of provisions set aside to "
            "cover expected and unexpected credit losses on the loan portfolio. "
            "Chinese regulators require a minimum provision coverage ratio (拨备覆盖率) "
            "of 150% of NPLs and a minimum provision rate (拨贷比) of 2.5% of total "
            "loans. Stock in CNY billions."
        ),
        "how_to_use": (
            "The provision stock is the first line of defence against credit losses "
            "and a measure of forward-looking caution. A rising provision stock (from "
            "provisioning charges) reduces current-period profit but strengthens the "
            "balance sheet. Track alongside the provision coverage ratio (aCNCNQNJDQ) "
            "and NPL ratio (aCNCNCXXK/A): a declining coverage ratio despite rising "
            "NPLs signals that provisioning is not keeping pace with deterioration — "
            "a red flag for capital erosion. In 2024, some Chinese banks were allowed "
            "to release excess provisions as a policy tool to support profitability "
            "and thus lending capacity."
        ),
        "related_series": [
            "aCNCNQNJDQ",   # Provision coverage ratio
            "aCNCNCXXK/A",  # NPL ratio
            "aCNCNLJFQ",    # Large bank NPL ratio
            "aCNCNHHUEQ",   # CET1 CAR
        ],
    },

    "aCNCNQNJDQ": {
        "meaning": (
            "Loan provision rate (拨贷比) of commercial banks — quarterly from NFRA. "
            "The ratio of total loan-loss provisions to total gross loans outstanding, "
            "expressed as a percentage. Regulatory minimum: 2.5%. This measures "
            "how much of the total loan book is covered by provisions, regardless "
            "of the level of NPLs — a static reserve-adequacy metric."
        ),
        "how_to_use": (
            "The provision rate is a balance-sheet resilience indicator. A ratio "
            "approaching the 2.5% floor means banks have little room to build "
            "further provisions without impairing profitability or capital. During "
            "credit booms (rapid loan growth), the provision rate can fall "
            "mechanically even if absolute provision stocks rise, creating hidden "
            "vulnerability. Compare with provision coverage (aCNCNGLDPQ / NPL stock) "
            "for a complete picture. Regulatory forbearance — allowing banks to "
            "maintain ratios just above minimums — is a signal of system-wide stress "
            "management. Monitor alongside NIM (aCNCNMRSOQ) for banks' capacity to "
            "absorb provisioning costs through current income."
        ),
        "related_series": [
            "aCNCNGLDPQ",   # Provision balance
            "aCNCNJQAXQ",   # Foreign bank provision coverage
            "aCNCNCXXK/A",  # NPL ratio
            "aCNCNMRSOQ",   # NIM
        ],
    },

    "aCNCNMRSOQ": {
        "meaning": (
            "Net interest margin (NIM / 净息差) of China's commercial banking system "
            "— quarterly from NFRA. Measures net interest income as a percentage of "
            "average interest-earning assets. Chinese bank NIMs have been compressed "
            "by repeated LPR cuts (loan-side) while deposit-rate cuts have lagged "
            "(liability-side stickiness). System NIM fell below 1.7% by 2024 — a "
            "historic low and below the 1.8% regulatory 'warning line'. Percentage."
        ),
        "how_to_use": (
            "NIM is the single most important profitability driver for Chinese banks. "
            "NIM compression reduces: (1) organic CET1 generation via retained "
            "earnings; (2) provisioning capacity; (3) dividend sustainability. "
            "The asymmetric rate-cut transmission (LPR falls faster than deposit "
            "rates) is a structural feature of China's system. PBoC guidance in 2024 "
            "emphasised preserving bank profitability as a precondition for sustainable "
            "credit support. Cross with cost-to-income (aCNCNHUVTQ) and ROA "
            "(aCNCNHXSFQ) to assess the full profitability picture. A NIM below 1.5% "
            "would signal severe sector distress."
        ),
        "related_series": [
            "aCNCNHUVTQ",   # Cost-to-income ratio
            "aCNCNHXSFQ",   # Large bank ROA
            "aCNLPR1YRR",   # 1-year LPR (loan pricing)
            "aCNCRR",       # RRR (funding cost driver)
        ],
    },

    "aCNCNJUESQ": {
        "meaning": (
            "Commercial bank RMB excess reserve ratio (超额准备金率) — quarterly from "
            "NFRA/PBoC. Measures excess reserves (reserves above the required reserve "
            "requirement) as a percentage of RMB deposits. A high excess reserve "
            "ratio signals that banks are holding more liquidity than required — "
            "either due to weak loan demand, risk aversion, or abundant PBoC "
            "liquidity injections. A percentage."
        ),
        "how_to_use": (
            "The excess reserve ratio is a real-time gauge of banking system liquidity "
            "and the effectiveness of monetary transmission. When excess reserves are "
            "high (e.g., post-RRR cuts, post-year-end PBoC injections), the monetary "
            "policy stance is accommodative. When banks park excess reserves at the "
            "PBoC (earning the excess reserve rate, 0.35%) rather than lending them "
            "out, it signals 'liquidity trap' dynamics — rate cuts are not transmitting "
            "into credit. Compare with new loans (aCNUSENLOAN): rising excess reserves "
            "alongside flat new loans confirms demand-side weakness. This is the "
            "Chinese equivalent of the US 'reserves at Fed' debate."
        ),
        "related_series": [
            "aCNCRR",       # Required reserve ratio
            "aCNMONRESA",   # Total reserve money
            "aCNUSENLOAN",  # New loans
            "aCNLPR1YRR",   # LPR
        ],
    },

    "aCNCNJQAXQ": {
        "meaning": (
            "Provision coverage ratio of foreign banks operating in China — quarterly "
            "from NFRA. Measures loan-loss provisions as a percentage of non-performing "
            "loans for the foreign-bank sub-sector. Foreign banks include subsidiaries "
            "of HSBC, Citibank, Standard Chartered, BNP Paribas, Deutsche Bank, and "
            "others licensed in China. Foreign banks account for less than 2% of "
            "Chinese banking system assets."
        ),
        "how_to_use": (
            "Foreign bank provision coverage is a niche but useful cross-reference: "
            "foreign banks tend to follow more conservative IFRS-based provisioning "
            "standards, making their coverage ratios a benchmark for best practice. "
            "If foreign bank coverage diverges sharply from domestic bank coverage "
            "(aCNCNQNJDQ), it may reflect regulatory arbitrage or different loan "
            "portfolio risk profiles. Foreign bank NPL ratios (aCNCNKUQ) are "
            "typically lower due to selective (blue-chip and MNC) client focus. "
            "Monitor for signals from the global banking sector transmitting to "
            "China operations."
        ),
        "related_series": [
            "aCNCNKUQ",     # Foreign bank NPL ratio
            "aCNCNQNJDQ",   # System provision rate
            "aCNCNCXXK/A",  # System NPL ratio
            "aCNCNGLDPQ",   # Provision balance
        ],
    },

    "aCNCNHXSFQ": {
        "meaning": (
            "Asset profit margin (ROA, 资产利润率) of large commercial banks — "
            "quarterly from NFRA. Return on total assets for the Big-6 state-owned "
            "commercial banks: ICBC, CCB, ABC, BoC, BoCom, PSBC. Typically around "
            "0.7-1.0% pre-NIM compression; compressed to ~0.6-0.8% by 2024. "
            "A percentage ratio (annualised)."
        ),
        "how_to_use": (
            "Large-bank ROA is a key profitability metric and indirectly determines "
            "capital self-sufficiency. When ROA exceeds the dividend payout rate, "
            "banks grow retained earnings organically. Large SOE banks are politically "
            "constrained on dividend cuts and face additional policy mandates (support "
            "SME lending, below-market rate loans to infrastructure). Their ROA "
            "therefore tends to be a lower bound for system profitability. Cross with "
            "NIM (aCNCNMRSOQ) and cost-to-income (aCNCNHUVTQ) to decompose: NIM "
            "compression and stable costs = ROA compression. A sustained ROA below "
            "0.5% would necessitate state recapitalisation."
        ),
        "related_series": [
            "aCNCNMRSOQ",   # NIM
            "aCNCNHUVTQ",   # Cost-to-income
            "aCNCNOAVQ",    # Large bank total CAR
            "aCNCNLJFQ",    # Large bank NPL ratio
        ],
    },

    "aCNCNOAVQ": {
        "meaning": (
            "Capital adequacy ratio (CAR) of large commercial banks — quarterly from "
            "NFRA. Total regulatory capital (Tier 1 + Tier 2) as a percentage of "
            "risk-weighted assets for the Big-6 G-SIBs. These banks face higher "
            "minimum CARs (11.5-12%+) due to G-SIB surcharges. System-wide large-"
            "bank CAR typically runs ~16-17%. Percentage."
        ),
        "how_to_use": (
            "Large-bank CAR directly governs how much credit the six dominant "
            "institutions (controlling ~50% of system assets) can extend. Government "
            "recapitalisations via special sovereign bonds (as in 2024) directly "
            "boost this ratio. Compare with system-wide CAR (aCNCBTCARR) and Tier-1 "
            "ratio (aCNCBTCARR): a widening gap between large-bank and system-wide "
            "CAR signals small/regional bank stress. When large-bank CAR is "
            "comfortable, PBoC is more willing to cut RRR further. NFRA stress tests "
            "use this ratio as a key scenario output."
        ),
        "related_series": [
            "aCNCBTCARR",   # System Tier-1 CAR
            "aCNCNHHUEQ",   # System CET1 CAR
            "aCNCNHXSFQ",   # Large bank ROA
            "aCNCNLJFQ",    # Large bank NPL ratio
        ],
    },

    "aCNCNLJFQ": {
        "meaning": (
            "Non-performing loan (NPL) ratio of large commercial banks — quarterly "
            "from NFRA. Ratio of NPL balance (loans classified as substandard, "
            "doubtful, or loss) to total gross loans for the Big-6 state banks. "
            "Large-bank NPL ratios (~1.2-1.5%) tend to be lower than the system "
            "average (~1.5-1.7%) due to their diverse portfolios and stronger "
            "government-sector exposure. Percentage."
        ),
        "how_to_use": (
            "Large-bank NPL ratios are the most-watched credit-quality metric given "
            "systemic importance. A rising ratio signals deteriorating loan portfolios "
            "in infrastructure, property, or corporate lending. True NPL ratios are "
            "subject to question due to loan restructuring and extend-and-pretend "
            "practices; watch the 'special mention loan' category (关注类贷款) for "
            "early warning. Cross with provision coverage (aCNCNGLDPQ/aCNCNQNJDQ): "
            "if NPLs rise faster than provisioning, capital erosion accelerates. "
            "The real estate developer loan sub-segment has been the primary NPL "
            "driver since 2021."
        ),
        "related_series": [
            "aCNCNCXXK/A",  # System NPL ratio
            "aCNCNKUQ",     # Foreign bank NPL
            "aCNCNGLDPQ",   # Provision balance
            "aCNCNOAVQ",    # Large bank CAR
        ],
    },

    "aCNCNCXXK/A": {
        "meaning": (
            "Non-performing loan (NPL) ratio of China's commercial banking system "
            "— quarterly from NFRA. Headline asset quality indicator: ratio of NPL "
            "balance to total gross loans for all commercial banks (including large "
            "state banks, joint-stock banks, city commercial banks, rural commercial "
            "banks, foreign banks). System NPL ratio has been maintained ~1.5-1.7% "
            "through the 2018-2024 credit cycle, though analysts suspect actual "
            "impaired loans are higher. Percentage."
        ),
        "how_to_use": (
            "The system NPL ratio is central to banking-stability assessments. "
            "The PBoC and NFRA publish this quarterly with bank-category breakdowns. "
            "Elevated city and rural commercial bank NPLs (often 3-5%) are masked "
            "by large state-bank dilution. Cross with provision coverage and capital "
            "ratios (aCNCBTCARR, aCNCNHHUEQ) for solvency analysis. The BIS credit-"
            "to-GDP gap (aCNBGAPGMR) provides the forward-looking leverage context. "
            "When NPLs rise, banks tighten credit standards (higher collateral "
            "requirements, shorter maturities), amplifying the credit cycle downturn. "
            "Policy interventions include NPL securitisation, distressed-debt transfers "
            "to AMCs (Huarong, Cinda, Orient, Great Wall), and state recapitalisation."
        ),
        "related_series": [
            "aCNCNLJFQ",    # Large bank NPL
            "aCNCNKUQ",     # Foreign bank NPL
            "aCNCNGLDPQ",   # Provision balance
            "aCNBGAPGMR",   # Credit-GDP gap
        ],
    },

    "aCNCNKUQ": {
        "meaning": (
            "NPL ratio of foreign banks operating in China — quarterly from NFRA. "
            "Ratio of non-performing loans to total loans for the foreign-bank "
            "sub-sector. Foreign banks in China typically maintain lower NPL ratios "
            "(often <1%) due to their focus on MNC clients, trade finance, and "
            "premium corporate banking — lower exposure to SME and real-estate "
            "developer risk. Percentage."
        ),
        "how_to_use": (
            "Foreign bank NPL ratios provide a benchmark for credit quality under "
            "international banking standards and serve as a cross-check for the "
            "domestic banking system. A sudden rise in foreign bank NPLs would "
            "signal a broader credit event affecting even blue-chip counterparties. "
            "Monitor alongside the provision coverage ratio (aCNCNJQAXQ). Given the "
            "small share of system assets, this series is less macro-relevant but "
            "matters for investors assessing foreign-bank China operations. It can "
            "signal shifts in cross-border lending appetite."
        ),
        "related_series": [
            "aCNCNJQAXQ",   # Foreign bank provision coverage
            "aCNCNCXXK/A",  # System NPL ratio
            "aCNCNLJFQ",    # Large bank NPL ratio
            "aCNCNIBIQ",    # Deposit-loan ratio
        ],
    },


    # ------------------------------------------------------------------ #
    #  FISCAL / BUDGET EXPENDITURE
    # ------------------------------------------------------------------ #

    "aCNCNLWQQM": {
        "meaning": (
            "General budget expenditure on housing insurance (住房保障支出) — monthly "
            "cumulative, current prices, published by the Ministry of Finance (MoF). "
            "This captures central and local government spending on affordable housing "
            "programs, shantytown redevelopment, public rental housing construction, "
            "and housing subsidies for low-income households. A flow (cumulative YTD) "
            "in CNY billions."
        ),
        "how_to_use": (
            "Housing insurance expenditure is a fiscal policy lever for the property "
            "sector — distinct from private real-estate development. Acceleration in "
            "this line item signals government commitment to social housing supply "
            "and is closely related to PSL-funded shantytown redevelopment programs. "
            "When the PBoC extends PSL to policy banks (CDB, ADBC), the proceeds "
            "fund shantytown compensation, which in turn drives housing demand in "
            "lower-tier cities. Track alongside real-estate FAI (aCNCNGKLZM and "
            "related series) and PSL balance to assess the government's housing "
            "stabilisation strategy. A surge here during a property downturn is a "
            "counter-cyclical policy signal."
        ),
        "related_series": [
            "aCNCNGKLZM",   # RE sales, residential, Shandong
            "aCNCNQJPUM",   # Commercial housing sales
            "aCNHOUSLNA",   # Housing mortgage loans
            "aCNLPR1YRR",   # LPR (mortgage pricing)
        ],
    },

    "aCNCNMTF": {
        "meaning": (
            "General budget expenditure on tourism management and service — annual, "
            "Ministry of Finance. Captures government spending on tourism industry "
            "administration, scenic area development, and tourism-related public "
            "services. A small but structurally growing budget line reflecting "
            "China's push to develop domestic tourism as a consumption driver. "
            "Annual flow in CNY billions."
        ),
        "how_to_use": (
            "Tourism expenditure is a niche fiscal indicator relevant to the services "
            "sector and consumption-upgrading narrative. Cross with domestic tourism "
            "revenue data (NBS) and retail sales to assess whether fiscal support "
            "translates into sector growth. In post-COVID recovery (2023), tourism "
            "spending surged. Annual frequency limits real-time use; better used "
            "for structural policy analysis. Monitor for policy emphasis shifts — "
            "in 2024-2025, stimulus packages included dedicated tourism vouchers "
            "and infrastructure grants."
        ),
        "related_series": [
            "aCNCNQJPUM",   # Commercial housing sales (consumption proxy)
            "aCNCNLWQQM",   # Housing insurance expenditure
            "aCNCNVNIHQ",   # Car sales (consumption)
            "aCNCNQZQQ",    # NEV sales
        ],
    },

    # ------------------------------------------------------------------ #
    #  INDUSTRIAL PRODUCTION & SALES RATES (quarterly, NBS)
    #  These are NBS industrial output survey sub-indicators
    # ------------------------------------------------------------------ #

    "aCNCNBESSQ": {
        "meaning": (
            "Agricultural NPK compound fertilizer production-and-sales rate "
            "(产销率) — quarterly from the NBS. The production-sales rate measures "
            "the share of output that was sold in the same period (sales / "
            "production × 100%), indicating inventory build or drawdown. For NPK "
            "fertilizer (nitrogen-phosphorus-potassium compounds), this reflects "
            "agricultural input demand cycles. A percentage."
        ),
        "how_to_use": (
            "A production-sales rate below 100% means unsold inventory is accumulating "
            "(production overshooting demand); above 100% means inventory drawdown. "
            "For agricultural chemicals, demand peaks in spring planting (Q1-Q2) and "
            "autumn (Q3). Monitor for supply-demand imbalances signalling price "
            "pressure in agricultural inputs. Cross with commodity and food price "
            "data for agricultural CPI transmission. Not a primary macro indicator "
            "but useful for sector analysis of the chemical industry and agricultural "
            "supply chain."
        ),
        "related_series": [
            "aCNCNRFVGQ",   # Alumina production-sales rate
            "aCNCNXATXQ",   # Cement production-sales rate
            "aCNCNQRSJQ",   # Calcium carbide production-sales rate
            "aCNCNXXMQ",    # Synthetic ammonia production-sales rate
        ],
    },

    "aCNCNRFVGQ": {
        "meaning": (
            "Alumina production-and-sales rate — quarterly from the NBS. "
            "Alumina is the intermediate product between bauxite mining and "
            "aluminium smelting. The production-sales rate indicates whether "
            "alumina smelters are running ahead of downstream demand from "
            "aluminium producers. China is the world's largest alumina producer "
            "and consumer. A percentage."
        ),
        "how_to_use": (
            "Alumina production-sales rate is a leading indicator for Chinese "
            "aluminium output — relevant for construction, automotive, and "
            "packaging sectors. A declining rate signals inventory build in the "
            "alumina-aluminium supply chain, typically a bearish signal for "
            "aluminium prices on the SHFE. Cross with alumina sales volume "
            "(aCNCNAYNMQ) and non-ferrous metals production-sales rate "
            "(aCNCNQYMQ) for sector-wide context. Monitor during periods of "
            "power rationing (smelter curtailments) which can rapidly shift "
            "the supply-demand balance."
        ),
        "related_series": [
            "aCNCNAYNMQ",   # Alumina sales
            "aCNCNQYMQ",    # Non-ferrous metals production-sales rate
            "aCNCNMYOUQ",   # Iron ore sales
            "aCNCNZMSQ",    # Pig iron production-sales rate
        ],
    },

    "aCNCNAYNMQ": {
        "meaning": (
            "Alumina sales volume — quarterly from the NBS. Absolute sales "
            "of alumina (氧化铝) in physical units (typically 10,000 tonnes) "
            "by enterprises above designated size. This flow measure complements "
            "the production-sales rate (aCNCNRFVGQ) with an absolute volume signal. "
            "Quarterly flow."
        ),
        "how_to_use": (
            "Alumina sales growth tracks downstream aluminium demand. Strong "
            "alumina sales signal robust construction and automotive output — "
            "both key end-use sectors. During infrastructure-stimulus phases "
            "(high government spending on roads, railways, power grids), alumina "
            "and aluminium demand surges. Cross with PMI sub-indices for metals "
            "and with real-estate FAI data to identify the primary demand driver. "
            "Also monitor for export trends: China's aluminium exports face "
            "trade barriers, making domestic demand the primary volume driver."
        ),
        "related_series": [
            "aCNCNRFVGQ",   # Alumina production-sales rate
            "aCNCNQYMQ",    # Non-ferrous metals production-sales rate
            "aCNCNZMSQ",    # Pig iron production-sales rate
            "aCNCNMYOUQ",   # Iron ore sales
        ],
    },

    "aCNCNHERAQ": {
        "meaning": (
            "Business investment climate index for the real estate industry "
            "(房地产业企业家信心指数 or similar) — quarterly from NBS. A sentiment "
            "index measuring business confidence among real-estate development "
            "companies regarding the investment outlook. Compiled from NBS "
            "enterprise surveys. An index level (base 100 = neutral/average)."
        ),
        "how_to_use": (
            "This sentiment index is a forward-looking indicator for real estate "
            "investment — often leading actual FAI by 1-2 quarters. A sustained "
            "decline below the neutral level (as seen 2021-2024 during the "
            "Evergrande and sector deleveraging crisis) signals further retrenchment "
            "in developer investment, new construction starts, and land purchases. "
            "Cross with commercial housing sales (aCNCNQJPUM) and housing mortgage "
            "loans (aCNHOUSLNA) to validate: confidence typically precedes actual "
            "transactions. Also compare with the manufacturing investment climate "
            "index — divergence indicates sector-specific vs economy-wide stress."
        ),
        "related_series": [
            "aCNCNQJPUM",   # Commercial housing sales
            "aCNCNGKLZM",   # RE sales Shandong
            "aCNHOUSLNA",   # Housing mortgage loans
            "aCNCNMRSOQ",   # Bank NIM (bank lending stance)
        ],
    },

    "aCNCNQRSJQ": {
        "meaning": (
            "Calcium carbide (电石, 300 litres/kg grade) production-and-sales rate "
            "— quarterly, NBS. Calcium carbide is a critical feedstock for the "
            "polyvinyl chloride (PVC) and acetylene chemicals industry. The "
            "production-sales rate reflects supply-demand balance in China's "
            "carbide-PVC supply chain. A percentage."
        ),
        "how_to_use": (
            "Calcium carbide demand is driven primarily by the PVC sector, which "
            "is itself driven by construction (pipes, flooring, profiles). A "
            "declining production-sales rate signals weak PVC demand, typically "
            "correlated with a real-estate downturn. China uses a unique carbide-"
            "route PVC process (dominant in Xinjiang) due to coal availability. "
            "Cross with cement sales (aCNCNVUBAQ) and construction-related FAI for "
            "a comprehensive building-materials demand picture. Not a primary macro "
            "indicator but signals early changes in construction pipeline."
        ),
        "related_series": [
            "aCNCNKICEQ",   # Calcium carbide production-sales rate (variant)
            "aCNCNRNKQQ",   # Calcium carbide sales
            "aCNCNXATXQ",   # Cement production-sales rate
            "aCNCNVUBAQ",   # Cement sales
        ],
    },

    "aCNCNKICEQ": {
        "meaning": (
            "Calcium carbide (300 litres/kg) production-and-sales rate — quarterly, "
            "NBS. A variant series to aCNCNQRSJQ covering the same commodity "
            "(calcium carbide at 300 litre/kg standard). May reflect a different "
            "enterprise-size threshold or compilation method. Percentage."
        ),
        "how_to_use": (
            "Use in tandem with aCNCNQRSJQ to cross-check the calcium carbide "
            "production-sales rate. Divergence between the two series may reflect "
            "methodology differences or coverage changes. As with the companion "
            "series, interpret in the context of PVC and construction demand. "
            "When both series agree on direction, the signal is more robust. "
            "Track alongside carbide sales (aCNCNRNKQQ) for volume confirmation."
        ),
        "related_series": [
            "aCNCNQRSJQ",   # Calcium carbide production-sales rate
            "aCNCNRNKQQ",   # Calcium carbide sales
            "aCNCNVUBAQ",   # Cement sales
            "aCNCNXATXQ",   # Cement production-sales rate
        ],
    },

    "aCNCNVNIHQ": {
        "meaning": (
            "Car (automobile) sales — quarterly from the NBS. Total sales volume "
            "of passenger cars and commercial vehicles by enterprises above "
            "designated size in China. China is the world's largest auto market "
            "(over 30 million units per year). Quarterly flow in physical units "
            "(10,000 units) or CNY value."
        ),
        "how_to_use": (
            "Car sales are a bellwether for consumer confidence and household "
            "wealth effects. They are highly sensitive to policy incentives: "
            "purchase tax cuts (2022-2023), trade-in subsidies, license plate "
            "lotteries in major cities, and EV purchase subsidies all drive "
            "step-changes in volumes. Cross with NEV sales (aCNCNQZQQ) to track "
            "the combustion-to-electric transition: NEV share exceeded 50% by "
            "2024. Auto sales also drive steel, aluminium, rubber, and electronics "
            "demand. Cross with retail sales data for consumer-spending confirmation."
        ),
        "related_series": [
            "aCNCNQZQQ",    # NEV sales
            "aCNCNPJLDQ",   # Rubber tire production-sales rate
            "aCNCNJHZLQ",   # Room air conditioner sales
            "aCNCNLDRXQ",   # Clothing sales
        ],
    },

    "aCNCNXATXQ": {
        "meaning": (
            "Cement production-and-sales rate — quarterly, NBS. The share of "
            "cement output sold in the same quarter, measured as a percentage. "
            "China produces ~55% of global cement. The production-sales rate "
            "signals whether production is running ahead of demand or "
            "inventories are being drawn down. A percentage."
        ),
        "how_to_use": (
            "Cement production-sales rate is a real-time gauge of construction "
            "activity. A declining rate (inventory build) signals slowing "
            "construction starts — consistent with real-estate deleveraging or "
            "seasonal slowdowns. A rate >100% (inventory draw) signals robust "
            "demand, often seen in peak construction seasons (March-May, "
            "September-November) or infrastructure stimulus surges. Cross with "
            "cement sales volume (aCNCNVUBAQ), commercial housing sales (aCNCNQJPUM), "
            "and infrastructure FAI. Cement is one of the most reliable activity "
            "proxies because it is difficult to store and cannot be imported easily."
        ),
        "related_series": [
            "aCNCNVUBAQ",   # Cement sales
            "aCNCNQJPUM",   # Commercial housing sales
            "aCNCNZMSQ",    # Pig iron production-sales rate
            "aCNCNHERAQ",   # RE business climate index
        ],
    },

    "aCNCNVUBAQ": {
        "meaning": (
            "Cement sales volume — quarterly, NBS. Absolute sales of cement by "
            "enterprises above designated size, typically in 10,000 tonnes. "
            "China's annual cement consumption ~2 billion tonnes. Flow series "
            "in physical units. A companion to the production-sales rate "
            "(aCNCNXATXQ)."
        ),
        "how_to_use": (
            "Cement sales growth tracks the construction and infrastructure cycle "
            "with high fidelity. Structural deceleration in cement volumes from "
            "2022 onward reflects: (1) real-estate sector contraction; (2) "
            "maturing infrastructure investment; (3) efficiency improvements "
            "reducing cement intensity. Compare with steel (pig iron aCNCNZMSQ) "
            "and glass production for a comprehensive building-materials demand "
            "picture. Also relevant for carbon emissions tracking — cement is "
            "a major CO2 source; volume declines contribute to China's emissions "
            "reduction pathway."
        ),
        "related_series": [
            "aCNCNXATXQ",   # Cement production-sales rate
            "aCNCNZMSQ",    # Pig iron production-sales rate
            "aCNCNMYOUQ",   # Iron ore sales
            "aCNCNQJPUM",   # Housing sales
        ],
    },

    "aCNCNLDRXQ": {
        "meaning": (
            "Clothing sales — quarterly, NBS. Sales of apparel and textile products "
            "by enterprises above designated size. Includes garments, knitwear, and "
            "accessories produced by China's vast textile and apparel industry. "
            "Quarterly flow in CNY billions or physical units."
        ),
        "how_to_use": (
            "Clothing sales are a consumption indicator, sensitive to household "
            "income, consumer confidence, and seasonal factors (spring/summer and "
            "autumn/winter restocking). Cross with broader retail sales, services "
            "consumption, and clothing CPI. Strong clothing sales growth supports "
            "the domestic-demand rebalancing narrative. China's apparel industry "
            "faces structural headwinds from cost increases and competition from "
            "Southeast Asian producers; domestic sales trends may diverge from "
            "production/export trends. Also note: e-commerce (Alibaba, JD, Pinduoduo) "
            "has shifted sales channels significantly."
        ),
        "related_series": [
            "aCNCNVNIHQ",   # Car sales
            "aCNCNJHZLQ",   # Air conditioner sales
            "aCNCNVKPHQ",   # Dairy sales
            "aCNCNUNPGQ",   # Soft drink sales
        ],
    },

    "aCNCNCESAQ": {
        "meaning": (
            "Dairy products production-and-sales rate — quarterly, NBS. "
            "The proportion of dairy output sold in the period. China's dairy "
            "industry (led by Mengniu, Yili) is a significant consumer staples "
            "sector. A declining rate signals dairy inventory accumulation, "
            "typically reflecting weak consumer demand or seasonal patterns. "
            "A percentage."
        ),
        "how_to_use": (
            "Dairy production-sales rate signals consumer demand and shelf-life "
            "inventory dynamics. A rate well below 100% suggests oversupply — "
            "relevant for raw milk (奶源) pricing and upstream dairy farmer "
            "profitability. Cross with dairy sales (aCNCNVKPHQ) for volume "
            "context. Structural growth in dairy consumption tracks urbanisation "
            "and rising per-capita income. Food safety concerns (melamine scandal "
            "legacy) can cause sharp demand disruptions — watch for divergence "
            "from trend."
        ),
        "related_series": [
            "aCNCNVKPHQ",   # Dairy sales
            "aCNCNUNPGQ",   # Soft drink sales
            "aCNCNLDRXQ",   # Clothing sales
            "aCNCNVNIHQ",   # Car sales
        ],
    },

    "aCNCNVKPHQ": {
        "meaning": (
            "Dairy products sales volume — quarterly, NBS. Absolute sales of "
            "dairy products (liquid milk, yogurt, cheese, etc.) by enterprises "
            "above designated size. Flow in CNY billions or physical units (tonnes). "
            "Companion to production-sales rate (aCNCNCESAQ)."
        ),
        "how_to_use": (
            "Dairy sales track the food and beverage consumption sub-sector. "
            "Growth in dairy sales is a marker of middle-class consumption "
            "upgrading — relevant for CPI food components and household income "
            "elasticity analysis. Cross with retail sales data (NBS) and the "
            "consumer-goods sub-sectors (air conditioners, clothing, soft drinks) "
            "for a broad consumption picture. In stimulus-driven consumption "
            "recovery phases, food/beverage sales tend to recover later than "
            "durables."
        ),
        "related_series": [
            "aCNCNCESAQ",   # Dairy production-sales rate
            "aCNCNUNPGQ",   # Soft drink sales
            "aCNCNLDRXQ",   # Clothing sales
            "aCNCNJHZLQ",   # Air conditioner sales
        ],
    },

    "aCNCNCWXQ": {
        "meaning": (
            "Ethylene production-and-sales rate — quarterly, NBS. Ethylene "
            "(乙烯) is the key olefin feedstock for polyethylene (PE), PVC, "
            "polystyrene, and other petrochemicals. China has aggressively expanded "
            "domestic ethylene cracking capacity. The production-sales rate reflects "
            "supply-demand balance in China's petrochemical industry. A percentage."
        ),
        "how_to_use": (
            "Ethylene production-sales rate signals downstream petrochemical "
            "demand — packaging (PE film, PET), construction (PVC), and consumer "
            "goods (polystyrene). A declining rate signals inventory build, "
            "typically correlated with weak industrial output or consumer demand. "
            "China's rapid capacity expansion (new integrated refinery-cracker "
            "complexes in Zhejiang, Guangdong, Shandong) means production can "
            "outrun demand, creating persistent oversupply pressure. Cross with "
            "industrial production data and export competitiveness indicators for "
            "Chinese petrochemical exports."
        ),
        "related_series": [
            "aCNCNQRSJQ",   # Calcium carbide production-sales rate
            "aCNCNXXMQ",    # Synthetic ammonia production-sales rate
            "aCNCNJYKYQ",   # Sulfuric acid production-sales rate
            "aCNCNZGNBQ",   # Liquor production-sales rate
        ],
    },

    "aCNCNQXGNQ": {
        "meaning": (
            "Excavator production-and-sales rate — quarterly, NBS. Share of "
            "excavator output sold in the quarter. China is the world's largest "
            "excavator market; major producers include SANY (三一重工), XCMG, "
            "Zoomlion, Caterpillar China, and Komatsu China. The production-sales "
            "rate indicates whether the industry is building or drawing down "
            "inventory. A percentage."
        ),
        "how_to_use": (
            "Excavator production-sales rates are a leading construction and "
            "infrastructure activity indicator. Excavator sales (aCNCNIQREQ) "
            "are closely tracked by investors as a real-time proxy for "
            "construction starts and infrastructure project commencement. A "
            "declining production-sales rate signals order softness before it "
            "appears in official FAI data. Cross with cement sales (aCNCNVUBAQ) "
            "and steel/pig iron (aCNCNZMSQ) for consistent construction signal. "
            "Excavator operating hours (SANY publishes monthly IoT data) provide "
            "additional real-time insight."
        ),
        "related_series": [
            "aCNCNGFGOQ",   # Excavator production-sales rate (variant)
            "aCNCNIQREQ",   # Excavator sales
            "aCNCNVUBAQ",   # Cement sales
            "aCNCNJCIVQ",   # Metal cutting machine tool production-sales rate
        ],
    },

    "aCNCNGFGOQ": {
        "meaning": (
            "Excavator production-and-sales rate — quarterly, NBS. Variant "
            "series to aCNCNQXGNQ covering the same product (excavators/挖掘机). "
            "May reflect different enterprise size or product sub-category "
            "classification. Cross-reference with the companion series for "
            "consistency. Percentage."
        ),
        "how_to_use": (
            "Use alongside aCNCNQXGNQ for robustness. As with the primary series, "
            "interpret as a construction-activity leading indicator. Divergence "
            "between the two variants warrants investigation into data compilation "
            "methodology. When both agree, the signal is reliable. Cross with "
            "excavator sales (aCNCNIQREQ) for volume confirmation and with "
            "generator sales (aCNCNBLIRQ) for a broader capital-equipment demand "
            "picture."
        ),
        "related_series": [
            "aCNCNQXGNQ",   # Excavator production-sales rate
            "aCNCNIQREQ",   # Excavator sales
            "aCNCNBLIRQ",   # Generator sales
            "aCNCNJCIVQ",   # Metal cutting machine production-sales rate
        ],
    },

    "aCNCNIQREQ": {
        "meaning": (
            "Excavator sales volume — quarterly, NBS. Absolute units (or value) "
            "of excavators sold by enterprises above designated size. China's "
            "monthly excavator sales data (CCMA) is one of the most watched "
            "high-frequency activity proxies for construction and infrastructure. "
            "Quarterly NBS data provides official validation of CCMA estimates. "
            "Flow in units or CNY billions."
        ),
        "how_to_use": (
            "Excavator sales growth is a real economy leading indicator. A YoY "
            "recovery in excavator sales typically precedes a construction recovery "
            "by 1-2 quarters, as contractors place equipment orders ahead of "
            "project commencement. Cross with infrastructure FAI and real-estate "
            "starts data. Also export-relevant: Chinese excavator makers (SANY, "
            "XCMG) have expanded globally — rising exports partially decouple "
            "production from domestic demand. Domestic vs export sales split is "
            "key for macro interpretation."
        ),
        "related_series": [
            "aCNCNQXGNQ",   # Excavator production-sales rate
            "aCNCNGFGOQ",   # Excavator production-sales rate (variant)
            "aCNCNVUBAQ",   # Cement sales
            "aCNCNBLIRQ",   # Generator sales
        ],
    },

    "aCNCNBLIRQ": {
        "meaning": (
            "Generator set (power generation equipment) sales — quarterly, NBS. "
            "Sales of diesel, gas, and other generator sets by enterprises above "
            "designated size. China is a major global generator manufacturer "
            "(Weichai, YUCHAI, Cummins China). Quarterly flow in CNY billions "
            "or physical units."
        ),
        "how_to_use": (
            "Generator sales reflect backup power demand (industrial parks, "
            "data centres, hospitals) and export demand to emerging markets. "
            "Domestic demand spikes during power shortages (as in 2021-2022 "
            "coal shortage episodes). Export growth signals rising global "
            "infrastructure investment appetite. Cross with power generation "
            "data and electricity demand/supply balance. Data centre expansion "
            "(driven by AI and cloud computing) is a structural demand driver "
            "for backup power. Cross with NEV (aCNCNQZQQ) and other capital "
            "equipment series."
        ),
        "related_series": [
            "aCNCNPIXUQ",   # Generator production-sales rate
            "aCNCNIQREQ",   # Excavator sales
            "aCNCNJCIVQ",   # Metal cutting machine production-sales rate
            "aCNCNQXGNQ",   # Excavator production-sales rate
        ],
    },

    "aCNCNPIXUQ": {
        "meaning": (
            "Generator set production-and-sales rate — quarterly, NBS. Share "
            "of generator output sold in the same quarter. Reflects supply-demand "
            "balance in China's power generation equipment sector. A percentage."
        ),
        "how_to_use": (
            "Interpret alongside generator sales (aCNCNBLIRQ). A high production-"
            "sales rate (above ~95%) signals robust demand, as is typical during "
            "power shortage episodes or strong export cycles. A declining rate "
            "signals inventory build — either demand has peaked or production "
            "has overshot. Useful for industrial production capacity utilisation "
            "analysis. Cross with industrial electricity consumption data and "
            "grid investment to understand the demand context."
        ),
        "related_series": [
            "aCNCNBLIRQ",   # Generator sales
            "aCNCNQXGNQ",   # Excavator production-sales rate
            "aCNCNJCIVQ",   # Metal cutting machine production-sales rate
            "aCNCNXHLWQ",   # Mobile phone production-sales rate
        ],
    },

    "aCNCNJCGOQ": {
        "meaning": (
            "Household washing machine sales — quarterly, NBS. Sales of domestic "
            "washing machines (洗衣机) by enterprises above designated size. "
            "Major producers: Haier, Midea, Little Swan, Samsung China. "
            "China is both the world's largest producer and consumer of washing "
            "machines. Quarterly flow in 10,000 units or CNY billions."
        ),
        "how_to_use": (
            "White goods (washing machines, refrigerators, air conditioners) "
            "are a classic consumer-durables demand indicator. Washing machine "
            "sales correlate with new home completions and household formation "
            "(post-marriage purchases). The real-estate downturn (2022-2024) "
            "is therefore visible as a structural drag on white goods. Policy "
            "trade-in subsidies (以旧换新) have been used to stimulate replacement "
            "demand. Cross with air conditioner sales (aCNCNJHZLQ) and the "
            "broader consumption indicators."
        ),
        "related_series": [
            "aCNCNJHZLQ",   # Air conditioner sales
            "aCNCNVNIHQ",   # Car sales
            "aCNCNQJPUM",   # Commercial housing sales
            "aCNCNLDRXQ",   # Clothing sales
        ],
    },

    "aCNCNMLF": {
        "meaning": (
            "Industry added value, agriculture sector, Anren County (安仁县) — "
            "annual from local statistical authorities. A county-level agricultural "
            "value-added indicator for Anren County, Hunan Province. Reflects "
            "primary industry output at a sub-provincial micro level. Annual flow "
            "in CNY millions."
        ),
        "how_to_use": (
            "This is a highly granular, county-level agricultural series with "
            "limited direct macro relevance. Use for local economic analysis of "
            "Hunan Province's agricultural counties or as a disaggregated input "
            "for regional GDP analysis. At the macro level, track the national "
            "agricultural value-added (NBS) instead. The annual frequency and "
            "local scope mean this series is most relevant for regional investment "
            "analysis or local government fiscal capacity assessment."
        ),
        "related_series": [
            "aCNCNAGHM",    # Industry added value, agriculture, Lin'an
            "aCNCNERHR",    # Industry added value, animal husbandry, Jiayu
            "aCNCNPSPC",    # Catering revenue, HK/Macau/Taiwan investment
            "aCNCNFLET",    # Resident savings deposit, Yushe County
        ],
    },

    "aCNCNAGHM": {
        "meaning": (
            "Industry added value, agriculture sector, Lin'an District (临安区) "
            "— annual from local NBS. Agricultural value-added for Lin'an District, "
            "Hangzhou, Zhejiang Province. Lin'an is known for bamboo, tea (Tianmu "
            "Mountain), and forestry products. Annual flow in CNY millions."
        ),
        "how_to_use": (
            "County/district-level agricultural series; primarily useful for "
            "Zhejiang regional economic analysis or Hangzhou sub-district comparisons. "
            "Lin'an District's agricultural structure (bamboo, tea, forestry) means "
            "this series tracks niche agri sectors with limited national significance. "
            "At macro level, use national agricultural output data. For local "
            "government bond and fiscal analysis, district-level value-added data "
            "feeds into creditworthiness assessments."
        ),
        "related_series": [
            "aCNCNMLF",     # Agriculture, Anren County
            "aCNCNERHR",    # Animal husbandry, Jiayu County
            "aCNCNFLET",    # Savings deposits, Yushe County
            "aCNCNPSPC",    # Catering revenue HK/Macau co
        ],
    },

    "aCNCNERHR": {
        "meaning": (
            "Industry added value, animal husbandry sector, Jiayu County (嘉鱼县) "
            "— annual from local NBS. Animal husbandry (livestock, poultry) "
            "value-added for Jiayu County, Xianning, Hubei Province. Annual flow "
            "in CNY millions."
        ),
        "how_to_use": (
            "Granular county-level animal husbandry data. Jiayu County is in "
            "Hubei, an agriculturally significant province (major hog producer). "
            "This series tracks local animal husbandry output — relevant for "
            "understanding local pork/poultry supply chains and CPI food components "
            "at the micro level. At macro level, national hog inventory (NBS/MoA) "
            "and pork prices (NDRC) are the primary signals. Use this series for "
            "hyper-local Hubei agricultural analysis or LGFV fiscal base assessment."
        ),
        "related_series": [
            "aCNCNMLF",     # Agriculture, Anren County
            "aCNCNAGHM",    # Agriculture, Lin'an District
            "aCNCNFLET",    # Savings deposits, Yushe County
            "aCNCNDNQB",    # RE completions, Hainan
        ],
    },

    "aCNCNMYOUQ": {
        "meaning": (
            "Iron ore raw ore sales — quarterly, NBS. Sales of domestically mined "
            "iron ore (原矿) by enterprises above designated size. China is a major "
            "iron ore producer but relies heavily on Australian and Brazilian imports "
            "(Rio Tinto, BHP, Vale) due to low domestic ore grades (~15-20% Fe vs "
            "62%+ imported). Quarterly flow in 10,000 tonnes or CNY billions."
        ),
        "how_to_use": (
            "Domestic iron ore sales track Chinese steel industry raw material "
            "demand. Rising domestic ore production and sales signal higher "
            "steelmaking activity and/or strategic import substitution efforts. "
            "However, domestic ore is costly to upgrade, so its share of total "
            "steel inputs remains limited. Cross with pig iron production-sales "
            "rate (aCNCNZMSQ) and cement sales (aCNCNVUBAQ) for a steel-output "
            "and construction-demand picture. Also monitor SHFE iron ore futures "
            "and Dalian Commodity Exchange (DCE) iron ore contracts — these are "
            "more timely signals."
        ),
        "related_series": [
            "aCNCNZMSQ",    # Pig iron production-sales rate
            "aCNCNAYNMQ",   # Alumina sales
            "aCNCNQYMQ",    # Non-ferrous metals production-sales rate
            "aCNCNVUBAQ",   # Cement sales
        ],
    },

    "aCNCNPSPC": {
        "meaning": (
            "Main income of catering companies above designated size — Hong Kong, "
            "Macau and Taiwan investment enterprises — annual from NBS. Captures "
            "catering (餐饮) revenue generated by HK/Macao/Taiwan-invested restaurant "
            "chains and food service enterprises operating in mainland China. "
            "Annual flow in CNY millions."
        ),
        "how_to_use": (
            "This is a structural indicator of HK/Macau/Taiwan investment in "
            "mainland China's food service sector — relevant for understanding "
            "cross-strait and cross-border business investment flows. Consumer "
            "spending patterns in catering track tourism, business travel, and "
            "leisure consumption. Annual frequency limits real-time use. More "
            "useful for assessing the business environment for HK-invested "
            "enterprises than as a macro indicator. Cross with total retail sales "
            "catering sub-category for context."
        ),
        "related_series": [
            "aCNCNVKPHQ",   # Dairy sales
            "aCNCNUNPGQ",   # Soft drink sales
            "aCNCNMLF",     # Agriculture, Anren County
            "aCNCNFLET",    # Savings deposits, Yushe County
        ],
    },

    "aCNCNJCIVQ": {
        "meaning": (
            "Metal cutting machine tool production-and-sales rate — quarterly, NBS. "
            "Share of metal cutting machine output (lathes, milling machines, "
            "grinding machines, machining centres) sold in the same quarter. "
            "Machine tools are a proxy for manufacturing investment — 'machines that "
            "make machines.' A percentage."
        ),
        "how_to_use": (
            "Metal cutting machine tool production-sales rate is a capital goods "
            "leading indicator. Manufacturers invest in machine tools ahead of "
            "production expansion; a rising sales rate signals broad manufacturing "
            "capex intent. Cross with industrial production and manufacturing PMI. "
            "China's machine tool industry has been strategically upgraded under "
            "Made in China 2025; domestic substitution of Japanese and German "
            "imports is a policy priority. A rising production-sales rate for "
            "high-end CNC machining centres is a particularly positive structural "
            "signal. Cross with excavator sales (aCNCNIQREQ) for a capital "
            "equipment demand composite."
        ),
        "related_series": [
            "aCNCNIQREQ",   # Excavator sales
            "aCNCNQXGNQ",   # Excavator production-sales rate
            "aCNCNBLIRQ",   # Generator sales
            "aCNCNPIXUQ",   # Generator production-sales rate
        ],
    },

    "aCNCNXHLWQ": {
        "meaning": (
            "Mobile communication handset (mobile phone) production-and-sales rate "
            "— quarterly, NBS. Share of mobile phone output sold in the quarter. "
            "China is the world's largest mobile phone manufacturer and consumer. "
            "A percentage. Covers handsets produced by domestic brands (Huawei, "
            "Xiaomi, OPPO, vivo) and foreign brands with China factories."
        ),
        "how_to_use": (
            "Mobile phone production-sales rate signals consumer electronics demand "
            "cycles. A declining rate (inventory build) correlates with weak consumer "
            "spending or a replacement-cycle slowdown. Cross with the sales volume "
            "series (aCNCNCGNJQ) and broader retail electronics sales. Geopolitical "
            "factors are especially relevant: US entity-list restrictions on Huawei "
            "cause abrupt demand-supply dislocations. Domestic brand recovery "
            "(post-Huawei chip restrictions) and 5G upgrade cycles drive periodic "
            "demand surges. Cross with semiconductor import data for supply-chain "
            "dependencies."
        ),
        "related_series": [
            "aCNCNBIPMQ",   # Mobile phone production-sales rate (variant)
            "aCNCNGNJQ",    # Mobile phone sales
            "aCNCNQZQQ",    # NEV sales
            "aCNCNVNIHQ",   # Car sales
        ],
    },

    "aCNCNBIPMQ": {
        "meaning": (
            "Mobile communication handset production-and-sales rate — quarterly, "
            "NBS. Variant series to aCNCNXHLWQ covering the same product. May "
            "reflect different enterprise-size threshold or product sub-category. "
            "A percentage."
        ),
        "how_to_use": (
            "Use alongside aCNCNXHLWQ for cross-validation of the mobile handset "
            "production-sales rate signal. Consistent directional moves across "
            "both series confirm the demand trend. The mobile phone market is "
            "highly concentrated at the top (premium segment: Huawei, Apple) "
            "with intense competition in mid-range (Xiaomi, OPPO, vivo). Policy "
            "signals for domestic semiconductor self-sufficiency (SMIC capacity "
            "expansion) are relevant for supply-side interpretation."
        ),
        "related_series": [
            "aCNCNXHLWQ",   # Mobile phone production-sales rate
            "aCNCNGNJQ",    # Mobile phone sales
            "aCNCNJCGOQ",   # Washing machine sales
            "aCNCNJHZLQ",   # Air conditioner sales
        ],
    },

    "aCNCNGNJQ": {
        "meaning": (
            "Mobile communication handset (mobile phone) sales volume — quarterly, "
            "NBS. Absolute sales of mobile phones by enterprises above designated "
            "size in China. China's smartphone market: ~280-300 million units per "
            "year. Quarterly flow in 10,000 units or CNY billions."
        ),
        "how_to_use": (
            "Mobile phone sales volume tracks the consumer electronics replacement "
            "cycle and 5G upgrade trajectory. Strong sales growth is consistent "
            "with consumer confidence and income growth. The US-Huawei conflict "
            "created structural shifts: Apple gained share in premium, domestic "
            "brands consolidated in mid-range. Cross with semiconductor import "
            "volumes (customs data) and display panel output for supply chain "
            "verification. Also relevant for TMT sector investment analysis "
            "(semiconductor, display, battery supply chains)."
        ),
        "related_series": [
            "aCNCNXHLWQ",   # Mobile phone production-sales rate
            "aCNCNBIPMQ",   # Mobile phone production-sales rate (variant)
            "aCNCNJCGOQ",   # Washing machine sales
            "aCNCNQZQQ",    # NEV sales
        ],
    },

    "aCNCNQZQQ": {
        "meaning": (
            "New energy vehicle (NEV / 新能源汽车) sales — quarterly, NBS. "
            "Sales of battery electric vehicles (BEV) and plug-in hybrid electric "
            "vehicles (PHEV) by enterprises above designated size. China surpassed "
            "50% NEV penetration by late 2024. Key players: BYD (#1 globally), "
            "SAIC, Geely, NIO, Li Auto, Xpeng, Tesla China. Quarterly flow."
        ),
        "how_to_use": (
            "NEV sales are one of the most strategically significant Chinese "
            "manufacturing and consumer series. Rising NEV penetration implies: "
            "(1) reduced gasoline demand (cross with oil import data); (2) surging "
            "lithium, cobalt, nickel, and battery demand; (3) automotive-sector "
            "disruption globally. Policy context: purchase subsidies phased out "
            "2022-2023 but exemptions from purchase tax and license plate "
            "restrictions remain. Cross with car sales total (aCNCNVNIHQ) to "
            "compute NEV penetration rate. Also relevant: charging infrastructure "
            "investment as infrastructure FAI component."
        ),
        "related_series": [
            "aCNCNVNIHQ",   # Total car sales
            "aCNCNPJLDQ",   # Rubber tire production-sales rate
            "aCNCNGNJQ",    # Mobile phone sales
            "aCNCNIQREQ",   # Excavator sales (capital goods comparison)
        ],
    },

    "aCNCNQJFU": {
        "meaning": (
            "Other depository institutions liabilities: paid-in capital (实收资本) "
            "— annual from PBoC. The total paid-in equity capital contributed by "
            "shareholders to other depository corporations (commercial banks, credit "
            "cooperatives, non-bank deposit-taking institutions), as reported in "
            "the balance sheet. Annual stock in CNY billions."
        ),
        "how_to_use": (
            "Paid-in capital at depository institutions tracks the equity injection "
            "history — both from initial establishment and subsequent capital raises. "
            "Annual frequency limits real-time use; more relevant for structural "
            "analysis of the banking system's ownership composition and capital "
            "adequacy trends. Compare with retained earnings to assess internal "
            "vs external capital generation. State bank recapitalisations (MoF "
            "injecting capital via special bonds) appear as discrete increases. "
            "Cross with CET1 capital stock (aCNCBNCTCA) for consistency."
        ),
        "related_series": [
            "aCNCBNCTCA",   # Net CET1 capital
            "aCNCBNTCPA",   # Net Tier-1 capital
            "aCNCNOAVQ",    # Large bank CAR
            "aCNCNHHUEQ",   # CET1 CAR
        ],
    },

    "aCNCNPTBYQ": {
        "meaning": (
            "Paint production-and-sales rate — quarterly, NBS. Share of paint "
            "(涂料) output sold in the same quarter. China is the world's largest "
            "paint producer. Major players: Nippon (Japan), Akzo Nobel, SKSHU "
            "(三棵树), Oriental Yuhong (东方雨虹). A percentage."
        ),
        "how_to_use": (
            "Paint production-sales rate is a real-estate construction and "
            "renovation activity indicator — paint is applied in the final stages "
            "of building construction and renovation. A declining rate (inventory "
            "build) signals either a construction slowdown (new builds) or weak "
            "renovation demand (household income constraint). Cross with cement "
            "sales (aCNCNVUBAQ) and commercial housing sales (aCNCNQJPUM): if "
            "cement sales are declining but paint is stable, renovation demand "
            "is compensating for weak new-build activity."
        ),
        "related_series": [
            "aCNCNHYVRQ",   # Paint production-sales rate (variant)
            "aCNCNKPGZQ",   # Paint sales
            "aCNCNXATXQ",   # Cement production-sales rate
            "aCNCNVUBAQ",   # Cement sales
        ],
    },

    "aCNCNHYVRQ": {
        "meaning": (
            "Paint production-and-sales rate — quarterly, NBS. Variant series "
            "to aCNCNPTBYQ covering the same product (paints/coatings). "
            "May reflect different product sub-category (e.g., industrial coatings "
            "vs decorative paints) or enterprise-size threshold. A percentage."
        ),
        "how_to_use": (
            "Cross-reference with aCNCNPTBYQ for consistency. Divergence may "
            "indicate that one covers architectural coatings and the other "
            "industrial/automotive coatings — different demand drivers. Industrial "
            "coatings track manufacturing and shipbuilding activity; architectural "
            "coatings track construction. Identify which sub-category this series "
            "represents and interpret accordingly. Both are useful for construction "
            "and industrial output analysis."
        ),
        "related_series": [
            "aCNCNPTBYQ",   # Paint production-sales rate
            "aCNCNKPGZQ",   # Paint sales
            "aCNCNXATXQ",   # Cement production-sales rate
            "aCNCNCWXQ",    # Ethylene production-sales rate
        ],
    },

    "aCNCNKPGZQ": {
        "meaning": (
            "Paint sales volume — quarterly, NBS. Absolute sales of paints and "
            "coatings by enterprises above designated size. Flow in 10,000 tonnes "
            "or CNY billions. Companion to production-sales rate (aCNCNPTBYQ, "
            "aCNCNHYVRQ)."
        ),
        "how_to_use": (
            "Paint sales volume tracks the construction and renovation cycle with "
            "a lag relative to housing starts (paint is applied near completion). "
            "Structural demand growth from: new construction, renovation cycles, "
            "industrial maintenance painting, automotive OEM/refinish. Cross with "
            "housing completions data (NBS) and commercial housing transaction "
            "volumes (aCNCNQJPUM). Export competitiveness of Chinese paint "
            "manufacturers in emerging markets is also a factor for aggregate "
            "production."
        ),
        "related_series": [
            "aCNCNPTBYQ",   # Paint production-sales rate
            "aCNCNHYVRQ",   # Paint production-sales rate (variant)
            "aCNCNVUBAQ",   # Cement sales
            "aCNCNQJPUM",   # Commercial housing sales
        ],
    },

    "aCNCNYRQQ": {
        "meaning": (
            "Phosphate fertilizer (purified / 折纯量) sales — quarterly, NBS. "
            "Sales of phosphate fertilizer (主要是磷酸二铵/MAP and磷酸一铵/DAP) "
            "in pure nutrient equivalent (P2O5). China is the world's largest "
            "phosphate fertilizer producer and exporter. Quarterly flow in "
            "10,000 tonnes (P2O5 equivalent)."
        ),
        "how_to_use": (
            "Phosphate fertilizer sales track agricultural input cycles and "
            "export market demand. Domestic sales peak in spring planting season "
            "(Q1-Q2). Export volumes are significant — China's phosphate export "
            "policy (export taxes, quotas) directly affects global fertilizer "
            "prices (e.g., 2021-2022 export curbs). Cross with NPK fertilizer "
            "(aCNCNBESSQ) and synthetic ammonia (aCNCNXXMQ) for a comprehensive "
            "fertilizer sector picture. Agricultural input cost pressures feed "
            "into food CPI with a lag."
        ),
        "related_series": [
            "aCNCNBESSQ",   # NPK fertilizer production-sales rate
            "aCNCNXXMQ",    # Synthetic ammonia production-sales rate
            "aCNCNJYKYQ",   # Sulfuric acid production-sales rate
            "aCNCNCWXQ",    # Ethylene production-sales rate
        ],
    },

    "aCNCNZMSQ": {
        "meaning": (
            "Pig iron (生铁) production-and-sales rate — quarterly, NBS. Share "
            "of pig iron output sold in the same quarter. Pig iron is the first "
            "stage of the iron-steel value chain (blast furnace output before "
            "basic oxygen furnace steelmaking). A declining rate signals blast "
            "furnace overproduction relative to downstream steel mill demand. "
            "A percentage."
        ),
        "how_to_use": (
            "Pig iron production-sales rate is an upstream steel industry indicator. "
            "A declining rate signals either weak steel demand (construction "
            "downturn, export slowdown) or blast furnace curtailments lagging "
            "demand weakness. Cross with iron ore sales (aCNCNMYOUQ) and cement "
            "sales (aCNCNVUBAQ) for a full steel-and-construction demand picture. "
            "China's steel sector oversupply — with output of ~1 billion tonnes/year "
            "vs flat domestic demand — means pig iron production-sales rates "
            "are chronically under pressure. Government production limits "
            "(超低排放 ultra-low emission mandates) affect supply-side dynamics."
        ),
        "related_series": [
            "aCNCNMYOUQ",   # Iron ore sales
            "aCNCNVUBAQ",   # Cement sales
            "aCNCNXATXQ",   # Cement production-sales rate
            "aCNCNAYNMQ",   # Alumina sales
        ],
    },

    "aCNCNZGNBQ": {
        "meaning": (
            "Liquor (白酒, 65-degree commodity volume) production-and-sales rate "
            "— quarterly, NBS. Share of baijiu (Chinese white spirits) output "
            "at 65% alcohol by volume (ABV) equivalent sold in the quarter. "
            "China's baijiu market is dominated by Kweichow Moutai, Wuliangye, "
            "Luzhou Laojiao, etc. A percentage."
        ),
        "how_to_use": (
            "Baijiu production-sales rate is an unusual but informative indicator: "
            "as a premium consumer discretionary product, it reflects corporate "
            "entertainment spending and gift-giving cycles (Spring Festival, "
            "National Day). A declining rate signals weak business entertainment "
            "demand — consistent with an anti-corruption campaign (Xi Jinping's "
            "2012 crackdown) or economic slowdown. When the ratio rises sharply, "
            "it signals premium consumption recovery. Cross with broader retail "
            "sales (food/beverage) and catering (restaurant) data."
        ),
        "related_series": [
            "aCNCNVKPHQ",   # Dairy sales
            "aCNCNUNPGQ",   # Soft drink sales
            "aCNCNCESAQ",   # Dairy production-sales rate
            "aCNCNLDRXQ",   # Clothing sales
        ],
    },

    # ------------------------------------------------------------------ #
    #  REAL ESTATE SECTOR (monthly, NBS)
    # ------------------------------------------------------------------ #

    "aCNCNGKLZM": {
        "meaning": (
            "Real estate development — housing sales, residential houses under "
            "construction, Shandong Province — monthly cumulative, NBS. Tracks "
            "the sales value or area of residential properties currently under "
            "construction (期房/pre-sale) in Shandong, China's third-largest "
            "provincial economy. Cumulative YTD in CNY billions or 10,000 sq m."
        ),
        "how_to_use": (
            "Shandong is a bellwether provincial real estate market due to its "
            "size and diversified economy (manufacturing + agriculture + services). "
            "Rising under-construction sales in Shandong signal healthy developer "
            "pre-sales and construction progress. Post-2021 developer liquidity "
            "crisis (Evergrande, Country Garden), pre-sales of under-construction "
            "properties collapsed nationally. Cross with commercial housing "
            "completions and national housing sales (aCNCNQJPUM). Cumulative "
            "YTD format means the series inflects as calendar-year progresses — "
            "use YoY growth rates or month-on-month changes."
        ),
        "related_series": [
            "aCNCNQJPUM",   # National commercial housing sales
            "aCNCNTOASM",   # RE sales, Central Region
            "aCNCNHERAQ",   # RE business climate index
            "aCNHOUSLNA",   # Housing mortgage loans
        ],
    },

    "aCNCNZOZRM": {
        "meaning": (
            "Real estate development — commercial premises (商业营业用房) sales, "
            "East Region (东部地区) — monthly cumulative, NBS. Tracks sales of "
            "commercial retail/office premises in China's eastern coastal region "
            "(Guangdong, Zhejiang, Jiangsu, Shanghai, Shandong, Fujian, etc.). "
            "Cumulative YTD in CNY billions or 10,000 sq m."
        ),
        "how_to_use": (
            "Commercial premises sales in the East region measure the retail and "
            "office property cycle in China's most economically dynamic provinces. "
            "The East is most exposed to external demand (export industries), "
            "foreign investment, and e-commerce-driven warehousing and logistics. "
            "A sustained decline in East commercial property sales signals "
            "business investment caution and excess office/retail supply (already "
            "a chronic problem post-COVID e-commerce shift). Cross with national "
            "commercial housing data (aCNCNQJPUM) and property FAI."
        ),
        "related_series": [
            "aCNCNQJPUM",   # National commercial housing sales
            "aCNCNLDDEM",   # Commercial premises, Guangdong
            "aCNCNSJOEM",   # Existing house, Central Region
            "aCNCNHERAQ",   # RE business climate
        ],
    },

    "aCNCNLDDEM": {
        "meaning": (
            "Real estate development — commercial premises sales, Guangdong Province "
            "— monthly cumulative, NBS. Guangdong is China's largest provincial "
            "economy (GDP ~CNY 13 trillion) and the heart of the Pearl River Delta "
            "manufacturing hub. Commercial property sales here reflect the province's "
            "industrial, services, and logistics real estate demand. Cumulative YTD."
        ),
        "how_to_use": (
            "Guangdong commercial property is influenced by: (1) manufacturing "
            "industrial parks (factory real estate); (2) Guangzhou/Shenzhen "
            "office and retail; (3) cross-border trade logistics (Dongguan, "
            "Foshan). A decline signals weakening business confidence and investment. "
            "Guangdong's commercial real estate market is closely tied to tech "
            "sector health (Shenzhen tech hub) and export manufacturing. Cross "
            "with Guangdong trade data and FDI flows. The Greater Bay Area "
            "integration policy is a structural demand driver."
        ),
        "related_series": [
            "aCNCNZOZRM",   # Commercial premises, East
            "aCNCNTWMRM",   # Commercial premises, Hainan
            "aCNCNCPCIM",   # Commercial premises, Liaoning
            "aCNCNQJPUM",   # National commercial housing
        ],
    },

    "aCNCNTWMRM": {
        "meaning": (
            "Real estate development — commercial premises sales, Hainan Province "
            "— monthly cumulative, NBS. Hainan is a special case: China designated "
            "it a free trade port (自由贸易港) in 2018, driving speculative real "
            "estate demand and tourism-property investment. Commercial premises "
            "include resort hotels, tourism commercial properties, and free-trade "
            "zone office space. Cumulative YTD."
        ),
        "how_to_use": (
            "Hainan commercial property reflects free-trade port policy momentum "
            "and tourism-property speculation. Policy announcements (tariff-free "
            "zones, financial pilot programs) drive discrete jumps. Cross with "
            "villa/luxury property completions (aCNCNDNQB) for the high-end "
            "market. Regulatory crackdowns on speculative buying (purchase "
            "restrictions, non-resident buying bans) cause sharp contractions. "
            "Not representative of national commercial property trends — use "
            "national data (aCNCNQJPUM) for macro analysis."
        ),
        "related_series": [
            "aCNCNDNQB",    # RE completions, villas, Hainan
            "aCNCNZOZRM",   # Commercial premises, East
            "aCNCNQJPUM",   # National commercial housing
            "aCNCNHERAQ",   # RE business climate
        ],
    },

    "aCNCNCPCIM": {
        "meaning": (
            "Real estate development — commercial premises sales, Liaoning Province "
            "— monthly cumulative, NBS. Liaoning is an old industrial base (东北 "
            "Northeast region) experiencing demographic decline and property market "
            "contraction. Commercial premises sales here reflect the structural "
            "challenges of China's Rust Belt property markets. Cumulative YTD."
        ),
        "how_to_use": (
            "Liaoning commercial property sales reflect the Northeast's structural "
            "economic challenges: population outflows, SOE-dependent industrial "
            "economy, weak private sector. This series typically underperforms "
            "national averages. Use to benchmark against coastal markets "
            "(aCNCNLDDEM, aCNCNZOZRM) to quantify the regional divergence in "
            "China's property cycle. Policy context: Northeast Revitalisation "
            "Strategy fiscal transfers may temporarily boost real estate activity. "
            "Cross with Shenyang/Dalian housing data for sub-regional detail."
        ),
        "related_series": [
            "aCNCNZOZRM",   # Commercial premises, East
            "aCNCNLDDEM",   # Commercial premises, Guangdong
            "aCNCNQJPUM",   # National commercial housing
            "aCNCNSJOEM",   # Existing house, Central
        ],
    },

    "aCNCNYMAM": {
        "meaning": (
            "Real estate development — office building (办公楼) sales, East Region "
            "— monthly cumulative, NBS. Sales of newly developed office space in "
            "China's eastern coastal provinces. Covers primarily Grade-A and "
            "Grade-B commercial office properties in cities like Shanghai, Hangzhou, "
            "Nanjing, Shenzhen, Guangzhou. Cumulative YTD in CNY billions or "
            "10,000 sq m."
        ),
        "how_to_use": (
            "East office sales reflect corporate demand for workspace — tied to "
            "financial services, tech, and professional services sectors. Post-"
            "COVID, remote-work trends and tech-sector consolidation (regulatory "
            "crackdown on Ant, Didi, Alibaba 2021-2022) caused persistent office "
            "vacancy rises and price declines in East-coast cities. Cross with "
            "office property under-construction data (aCNCNQLARM) and rent index. "
            "Also relevant: policy support for commercial real estate (REIT "
            "expansion, C-REITs for office/logistics)."
        ),
        "related_series": [
            "aCNCNQLARM",   # Office under construction, Central
            "aCNCNWOHZM",   # Office under construction, Yunnan
            "aCNCNUXLM",    # Office existing, Xinjiang
            "aCNCNZOZRM",   # Commercial premises, East
        ],
    },

    "aCNCNQLARM": {
        "meaning": (
            "Real estate development — office building under construction, Central "
            "Region (中部地区) — monthly cumulative, NBS. Office buildings currently "
            "in the construction phase (not yet completed/sold) in provinces like "
            "Henan, Hubei, Hunan, Anhui, Jiangxi, Shanxi. Cumulative YTD in "
            "10,000 sq m or CNY billions."
        ),
        "how_to_use": (
            "Central Region office under-construction data tracks the pipeline "
            "of future supply — an overhang indicator for the office market. "
            "A large pipeline relative to current absorption rates signals future "
            "vacancy rises and price pressure. Central provinces have been "
            "urbanising rapidly (Wuhan, Zhengzhou, Changsha emerged as major "
            "office markets). Cross with East region office sales (aCNCNYMAM) "
            "to compare pipeline vs absorption. Policy context: Central Region "
            "industrial transfers from coastal provinces boost commercial real "
            "estate demand over medium term."
        ),
        "related_series": [
            "aCNCNYMAM",    # Office sales, East
            "aCNCNWOHZM",   # Office under construction, Yunnan
            "aCNCNTOASM",   # Housing under construction, Central
            "aCNCNSJOEM",   # Existing house, Central
        ],
    },

    "aCNCNWOHZM": {
        "meaning": (
            "Real estate development — office building under construction, Yunnan "
            "Province — monthly cumulative, NBS. Office space in construction "
            "phase in Yunnan, a southwestern province with Kunming as capital. "
            "Yunnan's economy is driven by tourism, tobacco, non-ferrous metals, "
            "and growing logistics (Belt and Road corridor to Southeast Asia). "
            "Cumulative YTD."
        ),
        "how_to_use": (
            "Yunnan office under-construction data provides a window into the "
            "Southwest's commercial real estate cycle. Yunnan's property market "
            "is smaller and less liquid than tier-1 or East Coast markets. "
            "BRI-related infrastructure investment and Kunming's emergence as "
            "a logistics hub are structural demand drivers. Cross with provincial "
            "GDP and fixed asset investment data for macro context. Not a primary "
            "macro indicator — more relevant for Yunnan-specific LGFV or property "
            "developer analysis."
        ),
        "related_series": [
            "aCNCNQLARM",   # Office under construction, Central
            "aCNCNYMAM",    # Office sales, East
            "aCNCNUXLM",    # Office existing, Xinjiang
            "aCNCNTWMRM",   # Commercial premises, Hainan
        ],
    },

    "aCNCNUXLM": {
        "meaning": (
            "Real estate development — office building, existing (现房) stock, "
            "Xinjiang Uyghur Autonomous Region — monthly cumulative, NBS. "
            "Sales of completed, ready-for-delivery (existing) office properties "
            "in Xinjiang. Existing home sales (现房) carry lower pre-delivery "
            "risk than off-plan (期房). Cumulative YTD."
        ),
        "how_to_use": (
            "Xinjiang's property market is driven by its unique political economy: "
            "significant government and military investment, energy and resource "
            "sector development, and strategic infrastructure under BRI. Existing "
            "office property sales reflect actual delivery of completed projects. "
            "The shift from pre-sale to existing-home sales (regulatory push "
            "post-2023) reduces developer funding but increases buyer protection. "
            "Cross with Xinjiang investment data. Geopolitical context "
            "(sanctions risk for suppliers) affects foreign developer presence. "
            "Limited macro relevance beyond regional analysis."
        ),
        "related_series": [
            "aCNCNWOHZM",   # Office under construction, Yunnan
            "aCNCNKXDXM",   # Existing house, Shanghai
            "aCNCNFDTZM",   # Existing house, Tianjin
            "aCNCNTJGRM",   # Existing house, Shaanxi
        ],
    },

    "aCNCNDNQB": {
        "meaning": (
            "Real estate enterprises — completion sets of villas and high-end "
            "apartments (别墅、高档公寓), Hainan Province — annual, NBS. "
            "Count of villa and luxury apartment units completed in Hainan, "
            "China's premier tropical resort and free-trade destination. "
            "Annual flow in units (sets)."
        ),
        "how_to_use": (
            "Hainan luxury property completions are a niche indicator of high-end "
            "real estate supply and speculative investment dynamics. Hainan "
            "purchase restrictions (non-resident ban, social security requirements) "
            "constrain demand to domestic wealthy investors and free-trade-zone "
            "workers. Large completion volumes relative to transactions indicate "
            "oversupply and price pressure. Cross with Hainan commercial premises "
            "sales (aCNCNTWMRM) and villa sales data. In context of free-trade "
            "port policy, luxury real estate has been a policy concern for "
            "speculation risk."
        ),
        "related_series": [
            "aCNCNTWMRM",   # Commercial premises, Hainan
            "aCNCNQJPUM",   # National commercial housing sales
            "aCNCNGKLZM",   # RE sales, Shandong
            "aCNCNHERAQ",   # RE business climate
        ],
    },

    "aCNCNQJPUM": {
        "meaning": (
            "Commercial housing sales (商品房销售额) — national, monthly cumulative, "
            "NBS. Total sales revenue from new commercial residential, office, and "
            "commercial properties across all regions. One of the most important "
            "NBS real estate series. Cumulative YTD in CNY billions; derive monthly "
            "increments by differencing."
        ),
        "how_to_use": (
            "National commercial housing sales are the primary real-estate demand "
            "indicator. Annual new housing sales peaked at ~CNY 18 trillion (2021) "
            "and fell to ~CNY 10 trillion (2024) — the steepest contraction since "
            "modern data began. Key policy transmissions: 5-year LPR cuts directly "
            "reduce mortgage costs; down-payment ratio reductions increase buyer "
            "pool; city-level purchase restrictions determine eligible buyer universe. "
            "Cross with housing mortgage loans (aCNHOUSLNA) for financing demand, "
            "cement/steel for construction activity, and developer bond markets for "
            "funding stress. The series feeds directly into household wealth effects "
            "and consumer confidence."
        ),
        "related_series": [
            "aCNHOUSLNA",   # Housing mortgage loans
            "aCNCNHERAQ",   # RE business climate
            "aCNCNGKLZM",   # RE sales, Shandong
            "aCNCNTOASM",   # RE under construction, Central
        ],
    },

    "aCNCNRGTTM": {
        "meaning": (
            "Real estate — commercial housing sales area, Changsha city (长沙市) "
            "— monthly cumulative, NBS or local bureau. Changsha, capital of Hunan "
            "Province, is notable as a city that maintained stricter property "
            "purchase restrictions even during the 2023-2024 national easing wave. "
            "Sales area in 10,000 sq m, cumulative YTD."
        ),
        "how_to_use": (
            "Changsha housing sales area is a micro-level market indicator for "
            "one of China's fastest-growing cities (GDP growth above national "
            "average). Changsha's strict purchase controls (房住不炒 policy) "
            "make it a test case for 'normal' price stabilisation without "
            "speculative distortion. Compare Changsha with national data to "
            "assess whether policy divergence produces better outcomes. Also "
            "relevant for Hunan Province FAI and local government fiscal capacity. "
            "Cross with national housing data (aCNCNQJPUM)."
        ),
        "related_series": [
            "aCNCNQJPUM",   # National commercial housing sales
            "aCNCNJRGHM",   # Housing under construction, Beijing
            "aCNCNGKLZM",   # Housing under construction, Shandong
            "aCNHOUSLNA",   # Housing mortgage loans
        ],
    },

    "aCNCNJRGHM": {
        "meaning": (
            "Real estate — commercial housing sales, residential houses under "
            "construction, Beijing Municipality — monthly cumulative, NBS. "
            "Pre-sale (off-plan) residential transactions in Beijing, China's "
            "capital and one of the most closely regulated property markets. "
            "Cumulative YTD in CNY billions or 10,000 sq m."
        ),
        "how_to_use": (
            "Beijing is a tier-1 market benchmark. Under-construction sales in "
            "Beijing reflect: (1) developer confidence in pipeline delivery; "
            "(2) buyer willingness to commit to long-dated pre-delivery. "
            "Post-2021 developer distress reduced pre-sale activity as buyers "
            "feared non-delivery. Beijing's market is supply-constrained "
            "(suburban greenfield limits) and demand-rich (population, income). "
            "Cross with national housing data (aCNCNQJPUM) and Shanghai existing "
            "home sales (aCNCNKXDXM) to gauge tier-1 vs national divergence."
        ),
        "related_series": [
            "aCNCNKXDXM",   # Existing house, Shanghai
            "aCNCNQJPUM",   # National commercial housing
            "aCNCNTOASM",   # Under construction, Central
            "aCNCNHERAQ",   # RE business climate
        ],
    },

    "aCNCNTOASM": {
        "meaning": (
            "Real estate — commercial housing sales, residential houses under "
            "construction, Central Region — monthly cumulative, NBS. Pre-sale "
            "residential transactions in China's central provinces (Hubei, Hunan, "
            "Henan, Anhui, Jiangxi, Shanxi). The Central Region has been among "
            "the most stressed in the 2021-2024 property downturn due to higher "
            "developer leverage and weaker household income growth. Cumulative YTD."
        ),
        "how_to_use": (
            "Central Region housing under construction is a key indicator of the "
            "breadth of China's property downturn — the crisis spread from coastal "
            "developer exposures to inland markets. Cross with East Region data "
            "(aCNCNZOZRM) and national sales (aCNCNQJPUM) to assess convergence "
            "or divergence in the recovery. Central Region local government fiscal "
            "revenues are highly land-sale dependent, making housing sales a "
            "leading indicator for LGFV financing stress and local government "
            "special bond capacity."
        ),
        "related_series": [
            "aCNCNQJPUM",   # National commercial housing
            "aCNCNSJOEM",   # Existing house, Central
            "aCNCNZOZRM",   # Commercial premises, East
            "aCNCNGKLZM",   # Housing under construction, Shandong
        ],
    },

    "aCNCNSJOEM": {
        "meaning": (
            "Real estate — commercial housing sales, existing houses (现房), "
            "Central Region — monthly cumulative, NBS. Sales of completed, "
            "ready-for-delivery residential properties in central provinces. "
            "Existing home sales avoid pre-delivery risk and typically carry "
            "a price premium over off-plan. Cumulative YTD."
        ),
        "how_to_use": (
            "Existing home sales in the Central Region indicate the secondary/resale "
            "market and completed-inventory drawdown. Policy shift toward existing "
            "home sales (regulators restricting pre-sale practices post-2023) "
            "should cause this series to gain share versus under-construction sales. "
            "Cross with aCNCNTOASM (under-construction, Central) to track this "
            "structural shift. Strong existing-home sales alongside weak pre-sales "
            "signal buyers' distrust of developers — a prolonged structural change. "
            "Implications for developer cash flows (existing homes provide less "
            "pre-financing than pre-sales)."
        ),
        "related_series": [
            "aCNCNTOASM",   # Under construction, Central
            "aCNCNTJGRM",   # Existing house, Shaanxi
            "aCNCNKXDXM",   # Existing house, Shanghai
            "aCNCNFDTZM",   # Existing house, Tianjin
        ],
    },

    "aCNCNTJGRM": {
        "meaning": (
            "Real estate — commercial housing sales, existing house, Shaanxi Province "
            "— monthly cumulative, NBS. Existing/ready-for-delivery residential "
            "property sales in Shaanxi (Xi'an capital), a Northwest province with "
            "a large aerospace, defence, and education sector. Cumulative YTD."
        ),
        "how_to_use": (
            "Shaanxi's property market is driven by Xi'an's rapid urbanisation "
            "and population inflows (major university city, policy pilot zone). "
            "Xi'an's existing home sales outperformed national averages in parts "
            "of 2023-2024 due to population growth. Cross with provincial FAI "
            "and local government fiscal data for a complete picture. Not a "
            "primary macro indicator; useful for regional property market "
            "comparisons and LGFV analysis for Shaanxi local government bonds."
        ),
        "related_series": [
            "aCNCNSJOEM",   # Existing house, Central
            "aCNCNKXDXM",   # Existing house, Shanghai
            "aCNCNFDTZM",   # Existing house, Tianjin
            "aCNCNQJPUM",   # National commercial housing
        ],
    },

    "aCNCNKXDXM": {
        "meaning": (
            "Real estate — commercial housing sales, existing house, Shanghai "
            "Municipality — monthly cumulative, NBS. Existing/completed property "
            "sales in Shanghai, China's financial hub and most expensive property "
            "market. Average prices exceed CNY 60,000/sq m; total transactions "
            "among the highest nationally. Cumulative YTD."
        ),
        "how_to_use": (
            "Shanghai existing home sales are a tier-1 market bellwether and "
            "a leading indicator of policy-easing effectiveness. Each policy "
            "relaxation (purchase restriction loosening, down payment cuts, "
            "LPR cuts) creates an immediate transaction volume response in "
            "Shanghai before spreading to lower-tier markets. Cross with "
            "Beijing under-construction data (aCNCNJRGHM) and national data "
            "(aCNCNQJPUM). Shanghai housing price indices (NBS 70-city survey) "
            "complement this volume data. Wealth effects for Shanghai homeowners "
            "are disproportionately large."
        ),
        "related_series": [
            "aCNCNJRGHM",   # Under construction, Beijing
            "aCNCNSJOEM",   # Existing house, Central
            "aCNCNFDTZM",   # Existing house, Tianjin
            "aCNCNQJPUM",   # National commercial housing
        ],
    },

    "aCNCNFDTZM": {
        "meaning": (
            "Real estate — commercial housing sales, existing house, Tianjin "
            "Municipality — monthly cumulative, NBS. Existing residential "
            "property sales in Tianjin, a major port city adjacent to Beijing. "
            "Tianjin's property market has been among the most stressed in "
            "northern China — prices fell significantly from 2017 peaks due to "
            "policy tightening and LGFV fiscal stress. Cumulative YTD."
        ),
        "how_to_use": (
            "Tianjin is a case study in northern China's property cycle extremes: "
            "rapid expansion fuelled by Beijing spillover demand (2013-2017), "
            "then severe correction. LGFV fiscal stress in Tianjin (multiple "
            "credit events in infrastructure SOEs) compounded the property "
            "downturn. Cross with other northern markets (Beijing aCNCNJRGHM) "
            "and with national data (aCNCNQJPUM). Recovery lags southern and "
            "central markets. Relevant for LGFV credit analysis and Northern "
            "China economic divergence from national trends."
        ),
        "related_series": [
            "aCNCNKXDXM",   # Existing house, Shanghai
            "aCNCNSJOEM",   # Existing house, Central
            "aCNCNTJGRM",   # Existing house, Shaanxi
            "aCNCNQJPUM",   # National commercial housing
        ],
    },

    # ------------------------------------------------------------------ #
    #  COUNTY-LEVEL / MISC
    # ------------------------------------------------------------------ #

    "aCNCNFLET": {
        "meaning": (
            "Resident savings deposit balance, Yushe County (榆社县) — annual, "
            "local statistical bureau. Total savings deposits held by residents "
            "in Yushe County, Shanxi Province. Annual stock in CNY millions. "
            "Yushe is a small, primarily agricultural and coal-mining county in "
            "central Shanxi."
        ),
        "how_to_use": (
            "County-level savings deposit data is the most granular household "
            "financial position indicator available in China. Yushe's deposits "
            "reflect rural household savings behaviour in Shanxi's coalfield "
            "economy. Rising deposits signal wealth accumulation (coal boom years) "
            "or precautionary saving (economic uncertainty). At macro level, "
            "use national resident deposits (PBoC) or urban vs rural savings "
            "data. Useful for micro-level credit analysis of rural credit "
            "cooperatives and rural commercial bank deposit bases."
        ),
        "related_series": [
            "aCNCNMLF",     # Agriculture, Anren County
            "aCNCNAGHM",    # Agriculture, Lin'an District
            "aCNCNERHR",    # Animal husbandry, Jiayu
            "aCNCNPSPC",    # Catering revenue HK/Macau
        ],
    },

    "aCNCNJHZLQ": {
        "meaning": (
            "Room air conditioner (房间空调器) sales — quarterly, NBS. Sales of "
            "residential and light commercial air conditioning units. China is the "
            "world's largest AC market and producer (Gree, Midea, Haier control "
            "~60% global production). Quarterly flow in 10,000 units or CNY billions."
        ),
        "how_to_use": (
            "Air conditioner sales are both a consumer-demand indicator (seasonal "
            "summer spike in Q2-Q3) and a construction activity indicator (new "
            "home fit-outs). Strong AC sales signal robust residential investment "
            "and consumer spending. Cross with car sales (aCNCNVNIHQ) and white "
            "goods for a composite consumer durables picture. Also relevant for "
            "electricity demand analysis: AC usage is the primary driver of summer "
            "peak power demand, relevant for coal supply and utility analysis. "
            "Trade policy (US tariffs on Chinese ACs) affects export volumes."
        ),
        "related_series": [
            "aCNCNJCGOQ",   # Washing machine sales
            "aCNCNVNIHQ",   # Car sales
            "aCNCNQZQQ",    # NEV sales
            "aCNCNLDRXQ",   # Clothing sales
        ],
    },

    "aCNCNPJLDQ": {
        "meaning": (
            "Rubber tire production-and-sales rate — quarterly, NBS. Share of "
            "rubber tire (橡胶轮胎) output sold in the quarter. China is the "
            "world's largest tire manufacturer. Major producers: Zhongce Rubber "
            "(中策), Aeolus, Linglong, Triangle, plus Michelin/Bridgestone China. "
            "A percentage."
        ),
        "how_to_use": (
            "Tire production-sales rate signals automotive and commercial vehicle "
            "demand. OEM (original equipment) tire demand tracks new vehicle "
            "production; replacement tire demand tracks the in-use vehicle fleet. "
            "Cross with car sales (aCNCNVNIHQ) and NEV (aCNCNQZQQ). Global "
            "tire exports are significant: US/EU anti-dumping tariffs on Chinese "
            "tires affect export volumes. Rising e-commerce logistics vehicle "
            "fleets are a structural growth driver for replacement tires. "
            "Cross with rubber raw material (natural + synthetic) imports."
        ),
        "related_series": [
            "aCNCNFWQQ",    # Rubber tire production-sales rate (variant)
            "aCNCNVNIHQ",   # Car sales
            "aCNCNQZQQ",    # NEV sales
            "aCNCNCWXQ",    # Ethylene production-sales rate (synthetic rubber feedstock)
        ],
    },

    "aCNCNFWQQ": {
        "meaning": (
            "Rubber tire production-and-sales rate — quarterly, NBS. Variant "
            "series to aCNCNPJLDQ, covering the same product. May reflect "
            "different enterprise classification (e.g., all-steel heavy truck "
            "tires vs semi-steel passenger car tires) or enterprise-size threshold. "
            "A percentage."
        ),
        "how_to_use": (
            "Cross-reference with aCNCNPJLDQ. If one covers truck tires and the "
            "other covers passenger car tires, they will have different cyclical "
            "drivers: truck tires track logistics and freight volume; passenger "
            "tires track consumer automotive. A divergence between the two may "
            "signal different end-use demand cycles. Both remain relevant for "
            "automotive sector analysis and rubber commodity demand forecasting."
        ),
        "related_series": [
            "aCNCNPJLDQ",   # Rubber tire production-sales rate
            "aCNCNVNIHQ",   # Car sales
            "aCNCNQZQQ",    # NEV sales
            "aCNCNCWXQ",    # Ethylene (synthetic rubber feedstock)
        ],
    },

    "aCNCNRNKQQ": {
        "meaning": (
            "Calcium carbide (电石, 300 litres/kg) sales — quarterly, NBS. "
            "Absolute sales volume of calcium carbide at standard purity grade. "
            "Companion to the production-sales rate series (aCNCNQRSJQ, aCNCNKICEQ). "
            "Flow in 10,000 tonnes or CNY billions."
        ),
        "how_to_use": (
            "Calcium carbide sales track the PVC and acetylene chemical industry's "
            "activity level. Cross with the production-sales rate to understand "
            "whether volume changes reflect demand or inventory dynamics. Cross "
            "with construction data (cement sales aCNCNVUBAQ, housing sales "
            "aCNCNQJPUM) given PVC's construction end-use. Also cross with power "
            "coal prices and Xinjiang electricity tariffs: calcium carbide smelting "
            "is energy-intensive and concentrated in Xinjiang due to cheap coal "
            "power. Power rationing events directly hit carbide output."
        ),
        "related_series": [
            "aCNCNQRSJQ",   # Calcium carbide production-sales rate
            "aCNCNKICEQ",   # Calcium carbide production-sales rate (variant)
            "aCNCNXXMQ",    # Synthetic ammonia production-sales rate
            "aCNCNVUBAQ",   # Cement sales
        ],
    },

    "aCNCNUNPGQ": {
        "meaning": (
            "Soft drink (软饮料) sales — quarterly, NBS. Sales of carbonated "
            "drinks, fruit juices, bottled water, functional beverages, and "
            "other non-alcoholic beverages by enterprises above designated size. "
            "China is a large and growing soft drink market. Quarterly flow in "
            "CNY billions or tonnes."
        ),
        "how_to_use": (
            "Soft drink sales are a consumption indicator with seasonal patterns "
            "(summer peak Q2-Q3 for cold drinks, year-round for health beverages). "
            "Cross with dairy sales (aCNCNVKPHQ) and clothing (aCNCNLDRXQ) for a "
            "broad consumer staples picture. The shift from carbonates to health "
            "beverages (low-sugar, functional drinks) reflects consumption upgrading. "
            "Strong soft-drink sales amid weak car/property data signal a bifurcated "
            "consumption picture (necessities vs discretionary). Also cross with "
            "sugar and PET packaging (petrochemical) import data."
        ),
        "related_series": [
            "aCNCNVKPHQ",   # Dairy sales
            "aCNCNLDRXQ",   # Clothing sales
            "aCNCNJHZLQ",   # Air conditioner sales
            "aCNCNZGNBQ",   # Liquor production-sales rate
        ],
    },

    "aCNCNJYKYQ": {
        "meaning": (
            "Sulfuric acid (硫酸, 100% discount) production-and-sales rate — "
            "quarterly, NBS. Share of sulfuric acid output sold in the quarter, "
            "expressed on a 100% purity basis. Sulfuric acid is the world's most "
            "widely produced industrial chemical — used in phosphate fertilizers, "
            "metallurgy, chemical processing, and battery acid. A percentage."
        ),
        "how_to_use": (
            "Sulfuric acid is a 'barometer' chemical — its production tracks broad "
            "industrial activity. In China: dominant end-use is phosphate fertilizer "
            "production (aCNCNYRQQ), with secondary uses in non-ferrous metals "
            "smelting (aCNCNQYMQ), titanium dioxide, and battery manufacturing. "
            "Rising production-sales rate signals broad industrial demand. "
            "A declining rate may indicate either weak fertilizer demand or "
            "metallurgy slowdown. Cross with NPK fertilizer and mining data. "
            "Also: new-energy battery sector (lithium iron phosphate cathode "
            "manufacturing) is a growing end-use."
        ),
        "related_series": [
            "aCNCNBESSQ",   # NPK fertilizer production-sales rate
            "aCNCNYRQQ",    # Phosphate fertilizer sales
            "aCNCNXXMQ",    # Synthetic ammonia production-sales rate
            "aCNCNQYMQ",    # Non-ferrous metals production-sales rate
        ],
    },

    "aCNCNXXMQ": {
        "meaning": (
            "Synthetic ammonia (合成氨) production-and-sales rate — quarterly, NBS. "
            "Share of synthetic ammonia output sold in the quarter. Synthetic ammonia "
            "is the feedstock for urea, ammonium nitrate, and other nitrogen "
            "fertilizers, as well as industrial chemicals. A percentage."
        ),
        "how_to_use": (
            "Synthetic ammonia tracks the nitrogen fertilizer cycle and chemical "
            "industry activity. Demand is highly seasonal (fertilizer application "
            "seasons). China produces ammonia primarily from coal via gasification "
            "(unlike gas-based routes in Europe), making natural gas price shocks "
            "less relevant here but coal price relevant. Cross with urea export data "
            "(China periodically restricts urea exports to protect domestic supply) "
            "and NPK fertilizer (aCNCNBESSQ). Also: ammonia is an emerging clean "
            "fuel and hydrogen carrier — long-term demand implications from energy "
            "transition."
        ),
        "related_series": [
            "aCNCNBESSQ",   # NPK fertilizer production-sales rate
            "aCNCNJYKYQ",   # Sulfuric acid production-sales rate
            "aCNCNYRQQ",    # Phosphate fertilizer sales
            "aCNCNCWXQ",    # Ethylene production-sales rate
        ],
    },

    "aCNCNQYMQ": {
        "meaning": (
            "Ten non-ferrous metals production-and-sales rate (十种有色金属产销率) "
            "— quarterly, NBS. Composite production-sales rate for the ten main "
            "non-ferrous metals: copper, aluminium, lead, zinc, nickel, tin, "
            "antimony, mercury, magnesium, and titanium. A percentage."
        ),
        "how_to_use": (
            "This composite rate is an industrial metals demand barometer. "
            "Declining rate signals inventory build across non-ferrous metals "
            "simultaneously — a broad industrial slowdown signal. Aluminium "
            "dominates by volume; copper is most macro-sensitive (construction "
            "+ electronics + EVs). Cross with individual metal series (aCNCNAYNMQ "
            "for alumina/aluminium) and with global commodity prices (LME, SHFE). "
            "China's non-ferrous output growth coupled with a declining sales rate "
            "suggests exports are required to clear supply — watching for export "
            "restrictions or anti-dumping responses. Cross with PMI metals-output "
            "sub-index for high-frequency cross-validation."
        ),
        "related_series": [
            "aCNCNAYNMQ",   # Alumina sales
            "aCNCNRFVGQ",   # Alumina production-sales rate
            "aCNCNZMSQ",    # Pig iron production-sales rate
            "aCNCNMYOUQ",   # Iron ore sales
        ],
    },

    # ------------------------------------------------------------------ #
    #  SSE 180 INDEX & FX DEPOSITS
    # ------------------------------------------------------------------ #

    "aCNCNIDFCM": {
        "meaning": (
            "SSE 180 Index (上证180指数) — monthly low — Shanghai Stock Exchange. "
            "The SSE 180 Index tracks the 180 largest and most liquid A-share "
            "stocks on the Shanghai Stock Exchange by free-float market cap, "
            "earnings, and liquidity screens. Monthly low captures the intra-month "
            "trough price level of the index — a risk-off indicator. An index "
            "level (base 1000 = Dec 31, 2002)."
        ),
        "how_to_use": (
            "The SSE 180 monthly low measures downside volatility in China's "
            "largest-cap equity market. A series of declining monthly lows signals "
            "persistent bear-market sentiment. Cross with the broader SSE Composite "
            "and CSI 300 for index-level context. The SSE 180 is the underlying "
            "for major ETF products (SSE 180 ETF). Equity market performance is "
            "increasingly relevant for PBoC and CSRC policy: 2024 saw 'national "
            "team' stabilisation (Central Huijin buying ETFs) timed to arrest "
            "declining monthly lows. Cross with M1 and corporate deposit growth "
            "— rising equity markets increase corporate deposit activity."
        ),
        "related_series": [
            "aCNSFSNFSA",   # Equity financing in TSF
            "aCNCNQJPUM",   # Housing sales (wealth effect comparison)
            "aCNM2GRTY",    # M2 growth
            "aCNUSENLOAN",  # New loans
        ],
    },

    "aCNCNXVWOM": {
        "meaning": (
            "Foreign currency deposits at deposit-type financial institutions "
            "(存款类金融机构外币存款) — monthly, PBoC. Total foreign-currency "
            "denominated deposits held at all depository corporations by households, "
            "enterprises, and government entities. Expressed in USD billions "
            "or CNY equivalent at period-end exchange rate."
        ),
        "how_to_use": (
            "Foreign currency deposit trends are a proxy for domestic FX demand "
            "and capital-flight sentiment. Rising FX deposits signal that households "
            "and enterprises are converting CNY into foreign currency — a "
            "depreciatory pressure on CNY. PBoC monitors this closely and "
            "may adjust FX deposit interest rate guidance (cap on FX deposit "
            "rates) to manage incentives. Cross with CNY exchange rate (aCNXRUSD): "
            "depreciation expectations amplify FX deposit demand. Also cross "
            "with SAFE capital flow data and FX reserves (aCNCRESA) to triangulate "
            "overall capital flow pressures."
        ),
        "related_series": [
            "aCNXRUSD",     # USD/CNY exchange rate
            "aCNCRESA",     # FX reserves
            "aCNSFFCLSA",   # FX loans in TSF
            "aCNMONFORA",   # MA foreign exchange assets
        ],
    },

    # ------------------------------------------------------------------ #
    #  HOUSING MORTGAGE & MONETARY AUTHORITY ASSETS
    # ------------------------------------------------------------------ #

    "aCNHOUSLNA": {
        "meaning": (
            "Housing mortgage loans (个人住房贷款) outstanding — quarterly, PBoC. "
            "Total stock of residential mortgage loans extended by all depository "
            "institutions to individuals. In China, mortgages are predominantly "
            "variable-rate, priced at the 5-year LPR plus a spread (currently at "
            "historic low spreads). Stock in CNY trillions/billions. Peaked around "
            "CNY 38-39 trillion in 2022 and has been declining as repayments exceed "
            "new originations."
        ),
        "how_to_use": (
            "Mortgage loan stock is the largest single household liability in China "
            "and drives wealth effects and consumer spending. A contracting mortgage "
            "stock (first observed in 2022-2023) is historically unprecedented and "
            "signals: (1) very weak new home purchase demand; (2) rising early "
            "repayments by over-leveraged households. This creates a structural "
            "headwind for bank NIM (aCNCNMRSOQ) and asset growth. Policy response: "
            "5-year LPR cuts reduce monthly payments for existing mortgage holders "
            "(automatic reset), providing consumption support. Cross with commercial "
            "housing sales (aCNCNQJPUM) for the lead-lag relationship."
        ),
        "related_series": [
            "aCNCNQJPUM",   # Commercial housing sales
            "aCNMLANFC",    # MLT loans (mortgages are largest component)
            "aCNLPR1YRR",   # LPR (5-year version prices mortgages)
            "aCNCNMRSOQ",   # Bank NIM
        ],
    },

    "aCNMONDECA": {
        "meaning": (
            "Monetary Authority assets: claims on other depository corporations "
            "(对其他存款性公司债权) — monthly, PBoC Monetary Authority Survey. "
            "This is the PBoC's lending to the commercial banking system via all "
            "liquidity facilities: MLF (Medium-term Lending Facility), SLF "
            "(Standing Lending Facility), re-lending (再贷款), re-discount (再贴现), "
            "PSL (Pledged Supplementary Lending), and reverse repos. A stock "
            "measure of PBoC-to-bank credit outstanding. CNY billions."
        ),
        "how_to_use": (
            "Claims on ODCs is the most direct measure of PBoC active liquidity "
            "provision. A rising stock indicates expanding MLF/PSL/re-lending "
            "balances — the PBoC is injecting structural liquidity. The post-2014 "
            "shift from FX-driven base money (aCNMONFORA) to domestic-facility-"
            "driven base money (this series) is a defining structural change in "
            "Chinese monetary policy. Monitor MLF maturity calendar: large MLF "
            "rollovers in any month signal whether the PBoC is maintaining or "
            "withdrawing structural liquidity. The MLF rate (preceding the LPR "
            "publication) anchors 1-year LPR (aCNLPR1YRR). Cross with aCNMAASTTOT "
            "to compute ODC claims share of total PBoC assets."
        ),
        "related_series": [
            "aCNMAASTTOT",  # Total MA assets
            "aCNMONFORA",   # MA FX assets
            "aCNMONRESA",   # Reserve money
            "aCNLPR1YRR",   # 1-year LPR
        ],
    },

    "aCNMONFORA": {
        "meaning": (
            "Monetary Authority assets: foreign exchange (外汇) — monthly, PBoC "
            "Monetary Authority Survey. This is the CNY book value of foreign "
            "exchange assets held on the PBoC balance sheet — effectively the "
            "PBoC's portion of China's international reserves. It is the largest "
            "single PBoC asset (~60-70% of total). Changes reflect FX purchases/"
            "sales (intervention) plus valuation changes (bond prices, exchange "
            "rate moves of non-USD holdings). CNY billions."
        ),
        "how_to_use": (
            "aCNMONFORA is the primary channel through which FX intervention affects "
            "base money. When the PBoC buys USD (to prevent CNY appreciation), it "
            "credits bank reserves — expanding the monetary base. The reverse is "
            "true for sales (capital outflow defence). Changes in this series "
            "combined with changes in claims on ODCs (aCNMONDECA) give the full "
            "picture of base-money creation sources. Compare with SAFE-reported "
            "FX reserves (aCNCRESA): the difference reflects: (1) reserves held by "
            "SAFE outside PBoC balance sheet; (2) state-owned bank FX holdings; "
            "(3) derivative positions. Post-2014, this series stabilised as PBoC "
            "reduced FX intervention frequency."
        ),
        "related_series": [
            "aCNCRESA",     # SAFE FX reserves
            "aCNMAASTTOT",  # Total MA assets
            "aCNMONDECA",   # Claims on ODCs
            "aCNXRUSD",     # USD/CNY exchange rate
        ],
    },

    "aCNMONRESA": {
        "meaning": (
            "Monetary Authority liabilities: reserve money (储备货币) — monthly, "
            "PBoC Monetary Authority Survey. Reserve money = currency in circulation "
            "(M0) + commercial bank reserves held at the PBoC (required + excess "
            "reserves) + deposits of other financial corporations. This is the "
            "monetary base (M0 base) — the high-powered money from which the "
            "banking system creates M2 via the credit/money multiplier. "
            "Stock in CNY billions."
        ),
        "how_to_use": (
            "Reserve money is the foundation of China's monetary system. PBoC RRR "
            "cuts directly affect how much of reserve money can be transformed into "
            "loans (by reducing required reserves and freeing excess reserves for "
            "lending). The money multiplier (M2 / reserve money) reflects financial "
            "intermediation efficiency — it rises when banks lend aggressively and "
            "falls when they hoard liquidity. Cross with M2 (aCNM2GRTY) to compute "
            "the multiplier. A rising reserve money without commensurate M2 growth "
            "signals hoarding (low multiplier) — consistent with Japan-style liquidity "
            "trap dynamics. PBoC excess reserve rate (aCNCNJUESQ) cross-checks this."
        ),
        "related_series": [
            "aCNM2GRTY",    # M2 growth (multiplied aggregate)
            "aCNMAASTTOT",  # Total MA assets
            "aCNMONDECA",   # Claims on ODCs
            "aCNCRR",       # Required reserve ratio
        ],
    },

}

# seed_cn_batch_07.py
# Topic: Foreign Transactions — CIBM bond & money markets
# 125 RICs covering China Interbank Bond Market trading data

TIER1: dict[str, dict] = {

    "aCNATBRDXP": {
        "subcategory": "Cash Bond Transactions — Activity Ranking",
        "units": "Number of deals",
        "meaning": "Monthly count of deals for the top-ranked actively traded bond (No. 1 by deal count) on the China Interbank Bond Market (CIBM), as reported by the National Interbank Funding Center (NIFC). Captures the single most-traded security in outright cash bond transactions each month.",
        "how_to_use": "Use to identify which security dominates interbank cash bond trading in a given month. A persistently high deal count for a single bond signals strong price-discovery demand or benchmark status. Sharp spikes often coincide with auction settlement windows for CGBs or policy financial bonds. Compare against trading-volume counterpart (aCNATBXXUA) to assess average deal size.",
        "related_series": ["aCNATBXXUA", "aCNCBTZTMA", "aCNCBTLNWA", "aCNCNJHJGM"],
    },

    "aCNATBXXUA": {
        "subcategory": "Cash Bond Transactions — Activity Ranking",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for the top-ranked actively traded bond (No. 1 by volume) on the CIBM, reported by NIFC. Reflects the notional value of outright cash bond transactions for the single most-liquid security each month.",
        "how_to_use": "Pair with aCNATBRDXP (deal count) to derive average deal size for the market's most active bond. A widening gap between deal count rank and volume rank implies block trades. Sudden volume concentration in one bond may precede index rebalancing or central-bank open-market operations. Monitor around Treasury bond auction dates.",
        "related_series": ["aCNATBRDXP", "aCNCBTZTMA", "aCNCBSTHOA", "aCNCNJHJGM"],
    },

    "aCNBLTLNWA": {
        "subcategory": "Bond Lending Transactions — Volume by Instrument",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume of bond lending (债券借贷) transactions in negotiable certificates of deposit (NCDs / 同业存单) on the CIBM, reported by NIFC. Bond lending is a securities-lending mechanism where the lender temporarily transfers bond ownership and receives collateral or a fee.",
        "how_to_use": "Rising NCD lending volume signals demand for short-term collateral or short-selling activity in the interbank deposit receipt market. Compare with cash-bond NCD volume (aCNCBTHWJA) to gauge whether NCDs are being actively lent or outright traded. Elevated lending around quarter-end often reflects banks managing regulatory liquidity ratios (LCR, NSFR).",
        "related_series": ["aCNCBTHWJA", "aCNBLTZTMA", "aCNRFSPQOR", "aCNLPR1YRR"],
    },

    "aCNBLTZTMA": {
        "subcategory": "Bond Lending Transactions — Volume by Instrument",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume of bond lending (债券借贷) transactions in medium-term notes (MTNs / 中期票据) on the CIBM, reported by NIFC. MTNs are corporate debt instruments with maturities typically between 1 and 10 years, issued by non-financial corporates via the interbank market.",
        "how_to_use": "MTN lending volume reflects institutional demand to borrow corporate paper for short-selling or hedging credit exposure. An increase may signal rising credit-spread volatility or hedging needs ahead of MTN maturity clusters. Compare with MTN cash-bond volume (aCNCBSSGEA) and MTN yield (aCNRFSPJIR) to assess whether lending activity precedes repricing.",
        "related_series": ["aCNCBSSGEA", "aCNBLTLNWA", "aCNRFSPJIR", "aCNLPR1YRR"],
    },

    "aCNGCPUPZP": {
        "subcategory": "Cash Bond Transactions — Deals by Institution Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond (现券) transactions by urban commercial banks (城市商业银行) on the CIBM, reported by NIFC. Urban commercial banks are mid-tier city-level lenders, a tier below the large state-owned banks and joint-stock banks.",
        "how_to_use": "Urban commercial bank activity is a proxy for regional liquidity conditions and credit appetite outside the major financial centers. A surge in their deal count relative to large commercial banks (aCNCBPRSEA) suggests regional banks are either deploying excess liquidity or rebalancing portfolios. Watch for divergence from joint-stock bank activity (aCNGCPPOLP) as a signal of tiered funding stress.",
        "related_series": ["aCNGCPJQFP", "aCNGCPPOLP", "aCNCBTZUMA", "aCNLPR1YRR"],
    },

    "aCNIRSYEOP": {
        "subcategory": "Cash Bond Transactions — Deals by Tenor",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions with remaining maturity of 10 to 15 years (inclusive of 15y) on the CIBM, reported by NIFC. Covers outright secondary-market purchases and sales across all bond types in this tenor bucket.",
        "how_to_use": "The 10–15y tenor bucket captures demand for bonds just beyond the benchmark 10Y CGB. Rising deal count here relative to the 7–10y bucket (aCNIRSJOWP) indicates duration extension — often driven by insurance companies and pension funds seeking long-dated assets. Compare yield (aCNBLTEUBR) with the 7–10y yield for curve steepness signals.",
        "related_series": ["aCNIRSJOWP", "aCNIRSWTYP", "aCNBLTEUBR", "aCNCNJHJGM"],
    },

    "aCNIRSWTYP": {
        "subcategory": "Cash Bond Transactions — Deals by Tenor",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions with remaining maturity of 15 to 20 years (inclusive of 20y) on the CIBM, reported by NIFC. This ultra-long segment is dominated by Treasury bonds and policy financial bonds.",
        "how_to_use": "Activity in the 15–20y segment is a key gauge of insurance company and pension fund asset-liability management. Increased deal count alongside falling yields (aCNBLTDDDR) suggests liability-driven buying. Compare deal count with the 10–15y (aCNIRSYEOP) and 20–30y (aCNIRSKVTP) buckets to track where demand is concentrated on the long end.",
        "related_series": ["aCNIRSYEOP", "aCNIRSKVTP", "aCNBLTDDDR", "aCNCNJHJGM"],
    },

    "aCNIRSWFHP": {
        "subcategory": "Cash Bond Transactions — Deals by Tenor",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions with remaining maturity of 1 to 3 years (inclusive of 3y) on the CIBM, reported by NIFC. This segment is the most actively traded short-to-medium tenor, capturing bank treasury, money market fund, and wealth management product (WMP) activity.",
        "how_to_use": "The 1–3y bucket is the core of interbank liquidity management. High deal count signals active portfolio turnover by commercial banks rolling short-duration assets. Compare volume (aCNCBSJGLA) and yield (aCNIRSONDR) to assess whether activity is driven by rate expectations or regulatory liquidity needs. Divergence from the sub-1y bucket (aCNIRSPJXP) indicates shifts in preferred duration.",
        "related_series": ["aCNIRSPJXP", "aCNIRSCZKP", "aCNIRSONDR", "aCNLPR1YRR"],
    },

    "aCNIRSKVTP": {
        "subcategory": "Cash Bond Transactions — Deals by Tenor",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions with remaining maturity of 20 to 30 years (inclusive of 30y) on the CIBM, reported by NIFC. The 30Y CGB is the longest standard benchmark on the yield curve.",
        "how_to_use": "The 20–30y segment is highly sensitive to PBoC monetary policy signals and long-term inflation expectations. In 2024, strong demand pushed 30Y CGB yields below 2.5%, prompting PBoC warnings about duration risk. Elevated deal count at record-low yields signals forced buying by insurance and pension mandates. Compare with the 15–20y bucket (aCNIRSWTYP) and the >30y bucket (aCNIRSIEVP).",
        "related_series": ["aCNIRSWTYP", "aCNIRSIEVP", "aCNBLTEFHR", "aCNCNJHJGM"],
    },

    "aCNIRSCZKP": {
        "subcategory": "Cash Bond Transactions — Deals by Tenor",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions with remaining maturity of 3 to 5 years (inclusive of 5y) on the CIBM, reported by NIFC. The 5Y tenor is a standard benchmark for policy bank bonds and local government bonds.",
        "how_to_use": "The 3–5y bucket bridges money market and duration investment. Strong activity signals that banks and fund managers are extending duration incrementally. Compare yield (aCNIRSJJDR) against the 1–3y yield (aCNIRSONDR) to measure the term premium. Rising deals here alongside LPR cuts (aCNLPR1YRR) indicates markets pricing in sustained easing.",
        "related_series": ["aCNIRSWFHP", "aCNIRSTOWP", "aCNIRSJJDR", "aCNLPR1YRR"],
    },

    "aCNIRSTOWP": {
        "subcategory": "Cash Bond Transactions — Deals by Tenor",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions with remaining maturity of 5 to 7 years (inclusive of 7y) on the CIBM, reported by NIFC. The 7Y tenor is a secondary benchmark for Treasury bonds and policy bank debt.",
        "how_to_use": "The 5–7y bucket is sensitive to shifts in medium-term growth and fiscal policy expectations. Compare deal count and yield (aCNIRSFPJR) with the flanking 3–5y (aCNIRSCZKP) and 7–10y (aCNIRSJOWP) buckets to identify where the yield curve is steepening or flattening. Active repositioning in this bucket often precedes corporate bond issuance in the same tenor.",
        "related_series": ["aCNIRSCZKP", "aCNIRSJOWP", "aCNIRSFPJR", "aCNCNJHJGM"],
    },

    "aCNIRSJOWP": {
        "subcategory": "Cash Bond Transactions — Deals by Tenor",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions with remaining maturity of 7 to 10 years (inclusive of 10y) on the CIBM, reported by NIFC. The 10Y CGB is China's primary sovereign benchmark rate.",
        "how_to_use": "The 7–10y bucket is the most strategically important tenor for gauging market views on long-term monetary policy. High deal count around the 10Y CGB benchmark reflects active price discovery. Compare yield (aCNBLTVJER) with PBoC's MLF rate and the 1Y LPR (aCNLPR1YRR). In 2024, the 10Y CGB yield fell to record lows near 1.6%, reflecting deflationary pressure and demand for safe assets.",
        "related_series": ["aCNIRSTOWP", "aCNIRSYEOP", "aCNBLTVJER", "aCNCNJHJGM"],
    },

    "aCNBLTQIWP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in asset management company bonds (资产管理公司债) on the CIBM, reported by NIFC. These are bonds issued by the four major state-owned asset management companies (AMCs): Huarong, Cinda, Orient, and Great Wall, which manage distressed assets.",
        "how_to_use": "AMC bond activity reflects market appetite for quasi-sovereign credit with implicit government backing. Elevated deal count may signal that investors are parking liquidity in AMC bonds as a yield pickup over CGBs with low perceived credit risk. Watch for repricing relative to policy bank bonds (aCNCBTLNWA) as a gauge of implicit sovereign support credibility.",
        "related_series": ["aCNCBSSDJA", "aCNBLTZNEP", "aCNRFFCAGR", "aCNCNJHJGM"],
    },

    "aCNBLTLGGP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in asset-backed notes (ABN / 资产支持票据) on the CIBM, reported by NIFC. ABNs are debt instruments backed by receivables or other assets, issued through the interbank market by non-financial corporates.",
        "how_to_use": "ABN deal count is a proxy for structured credit market liquidity. Low deal counts indicate this is a niche, buy-and-hold segment. Compare with ABS deal count (aCNBLTYDNP) to assess overall structured credit activity. Rising activity may signal improved investor appetite for corporate credit risk or supply from infrastructure-related receivables securitization.",
        "related_series": ["aCNBLTYDNP", "aCNCBSMXAA", "aCNRFFPFLR", "aCNLPR1YRR"],
    },

    "aCNBLTYDNP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in asset-backed securities (ABS / 资产支持证券) on the CIBM, reported by NIFC. CIBM ABS includes credit-card receivables, auto loans, RMBS, and CLO tranches issued by banks and non-bank originators.",
        "how_to_use": "ABS deal count reflects secondary-market liquidity in structured products. China's ABS market is predominantly a primary-issuance market with thin secondary trading — deal count here is relatively low. A significant uptick signals either risk-on conditions or regulatory incentives for banks to securitize and de-risk balance sheets. Compare with ABN activity (aCNBLTLGGP) and ABS yield (aCNRFSBYOR).",
        "related_series": ["aCNBLTLGGP", "aCNCBSBKEA", "aCNRFSBYOR", "aCNLPR1YRR"],
    },

    "aCNBLTBDWP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in auto financial company bonds (汽车金融公司债) on the CIBM, reported by NIFC. These are bonds issued by auto finance subsidiaries of major automakers (e.g., SAIC Finance, BMW Automotive Finance China).",
        "how_to_use": "Auto financial company bond trading is a niche segment reflecting consumer credit conditions. Rising deal count may signal increased secondary liquidity as issuance volumes grow with auto sales. Compare yield (aCNRFFFIJR) against commercial bank bonds to measure the marginal credit premium for non-bank financial institution issuers. Useful for monitoring consumer credit sector funding costs.",
        "related_series": ["aCNCBSQPEA", "aCNRFFFIJR", "aCNBLTGTMP", "aCNLPR1YRR"],
    },

    "aCNBLTQMOP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in negotiable certificates of deposit (NCDs / 同业存单) on the CIBM, reported by NIFC. NCDs are standardized short-to-medium term (1M–1Y) interbank deposit instruments issued by banks.",
        "how_to_use": "NCD deal count is a key indicator of interbank funding market activity. NCDs are the primary short-term liability management tool for joint-stock and city commercial banks. High deal count alongside rising NCD yields signals tightening interbank liquidity. Compare yield (aCNRFSPQOR) with DR007 to assess the funding cost premium for non-big-four banks. NCD volume dwarfs most other segments.",
        "related_series": ["aCNCBTHWJA", "aCNBLTLNWA", "aCNRFSPQOR", "aCNLPR1YRR"],
    },

    "aCNBLTIQFP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in commercial paper (CP / 商业票据) on the CIBM, reported by NIFC. CP here refers to interbank market commercial paper (non-bank-accepted bills), distinct from exchange-traded CP.",
        "how_to_use": "CP deal count tracks ultra-short corporate funding activity. Compare with short-term commercial paper (SCP, aCNBLTRQDP) which has tenure under 270 days. Rising CP deal counts alongside spread compression over CGB T-bills signals strong corporate credit demand. Watch during periods of tightening bank credit — companies shift to direct market funding via CP.",
        "related_series": ["aCNBLTRQDP", "aCNCBSLPVA", "aCNRFSBKHR", "aCNLPR1YRR"],
    },

    "aCNBLTNBHP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in corporate bonds (公司债) on the CIBM, reported by NIFC. Corporate bonds are exchange-registered but also traded on the interbank market, issued by listed and unlisted companies under CSRC/NAFMII rules.",
        "how_to_use": "Corporate bond deal count reflects credit market appetite and secondary liquidity. Compare with MTN deals (aCNBLTCQWP) — MTNs dominate the CIBM corporate credit space while exchange-listed corporate bonds have separate venues. Rising CIBM corporate bond deals may reflect cross-market arbitrage. Compare yield (aCNRFSIKGR) against policy financial bond yield for the corporate credit spread.",
        "related_series": ["aCNBLTCQWP", "aCNCBSMDBA", "aCNRFSIKGR", "aCNLPR1YRR"],
    },

    "aCNRFFNTZP": {
        "subcategory": "Cash Bond Transactions — Deals by Interest-Rate Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in discount-rate bonds (贴现债券) on the CIBM, reported by NIFC. Discount-rate bonds are zero-coupon instruments sold at a price below par; return is the difference between purchase price and face value at maturity.",
        "how_to_use": "Discount bond deals predominantly cover T-bills (国库券) and short-term corporate paper. Compare with zero-coupon deals (aCNRFFHLVP) to differentiate tenor. Rising discount bond activity signals demand for ultra-short safe assets — often a flight-to-quality indicator. Compare yield (aCNGCPXCUR) against DR007 repo rates to assess relative value of holding versus lending cash.",
        "related_series": ["aCNRFFHLVP", "aCNRFFNIXP", "aCNGCPXCUR", "aCNLPR1YRR"],
    },

    "aCNRFFNIXP": {
        "subcategory": "Cash Bond Transactions — Deals by Interest-Rate Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in fixed-rate bonds (固定利率债) on the CIBM, reported by NIFC. Fixed-rate bonds include the majority of Treasury bonds, policy financial bonds, and most corporate credit instruments.",
        "how_to_use": "Fixed-rate bond deal count dominates overall CIBM volumes, as most benchmark securities pay fixed coupons. Comparing fixed-rate (aCNRFFNIXP) versus floating-rate (aCNRFFASIP) deal counts reveals duration risk appetite — investors shift to floating when rate uncertainty rises. Track yield (aCNRFOYEKR) to assess rate expectations embedded in the most liquid segment.",
        "related_series": ["aCNRFFASIP", "aCNRFFHLVP", "aCNRFOYEKR", "aCNCNJHJGM"],
    },

    "aCNRFFASIP": {
        "subcategory": "Cash Bond Transactions — Deals by Interest-Rate Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in floating-rate bonds (浮动利率债) on the CIBM, reported by NIFC. Floating-rate bonds typically reference the 1Y LPR, SHIBOR, or the central bank's benchmark deposit rate.",
        "how_to_use": "Rising floating-rate bond activity relative to fixed-rate (aCNRFFNIXP) signals that investors are hedging against interest-rate uncertainty or seeking protection in a rising-rate environment. In China's 2024 rate-cutting cycle, floating-rate issuance fell as issuers locked in low fixed rates. Compare yield (aCNRFOHNTR) and volume (aCNCBOQVJA) for spread dynamics.",
        "related_series": ["aCNRFFNIXP", "aCNCBOQVJA", "aCNRFOHNTR", "aCNLPR1YRR"],
    },

    "aCNBLTIRKP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in foreign sovereign government RMB bonds (外国主权政府人民币债券 / Panda bonds — sovereign) on the CIBM, reported by NIFC. These are RMB-denominated bonds issued by foreign central governments in China's domestic market.",
        "how_to_use": "Sovereign Panda bond deal count is a niche but symbolically important indicator of RMB internationalization progress. Key sovereign issuers include South Korea, Hungary, Poland, and African Development Bank member states. Rising deal count signals improving foreign sovereign access and secondary liquidity. Compare with foreign local government RMB bond activity and monitor alongside CIBM foreign investor holdings data.",
        "related_series": ["aCNCBSLXAA", "aCNRFFQAYR", "aCNBLTZNEP", "aCNCNJHJGM"],
    },

    "aCNBLTVGNP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in green notes (绿色票据) on the CIBM, reported by NIFC. Green notes are ESG-labeled debt instruments issued by corporates and financial institutions to finance environmental projects, verified under NAFMII green bond standards.",
        "how_to_use": "Green note deal count tracks secondary market development of China's green finance market. Compare with overall MTN/CP activity to gauge the green premium (or greenium) — green instruments often trade at slightly lower yields. Rising deal count alongside policy announcements on carbon markets (national ETS) or green finance incentives signals ESG-driven demand. Compare yield (aCNRFFMTXR) against conventional corporate bonds.",
        "related_series": ["aCNCBSQNXA", "aCNRFFMTXR", "aCNBLTCQWP", "aCNLPR1YRR"],
    },

    "aCNBLTPMIP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in hybrid capital bonds (混合资本债) on the CIBM, reported by NIFC. Hybrid capital bonds are deeply subordinated instruments issued by banks that combine debt and equity features, qualifying as Additional Tier 1 (AT1) or Tier 2 regulatory capital.",
        "how_to_use": "Hybrid capital bond deal count reflects investor appetite for bank subordinated risk. These instruments carry write-down or conversion triggers if the issuing bank's capital ratio falls below thresholds. Compare with Tier-2 capital instrument deals (aCNBLTRKDP) and perpetual capital bond deals (aCNBLTPNAP) for the full subordinated capital stack picture. Yield spread (aCNRFFAQRR) over senior bank bonds gauges perceived systemic risk.",
        "related_series": ["aCNBLTRKDP", "aCNBLTPNAP", "aCNRFFAQRR", "aCNCNJHJGM"],
    },

    "aCNBLTBNQP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in insurance company capital supplementary bonds (保险公司资本补充债券) on the CIBM, reported by NIFC. These are subordinated bonds issued by insurance companies to supplement their solvency capital under CBIRC regulations.",
        "how_to_use": "Insurance company capital bond deal count is a niche indicator of the secondary market for non-bank financial institution capital instruments. Low deal counts reflect the buy-and-hold nature of this segment. Elevated activity may signal investor concerns about insurer solvency ratios or regulatory capital changes under the China Risk-Oriented Solvency System (C-ROSS II). Compare yields against bank hybrid capital bonds (aCNRFFAQRR).",
        "related_series": ["aCNBLTPMIP", "aCNBLTRKDP", "aCNRFFAQRR", "aCNLPR1YRR"],
    },

    "aCNRFFTLAP": {
        "subcategory": "Cash Bond Transactions — Deals by Interest-Rate Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions broken down by interest-bearing mode (计息方式), aggregating all interest-bearing categories on the CIBM, reported by NIFC. This is the headline total across fixed, floating, discount, and zero-coupon bond transactions.",
        "how_to_use": "Use as the denominator for calculating the share of each interest-rate type (fixed: aCNRFFNIXP, floating: aCNRFFASIP, discount: aCNRFFNTZP, zero-coupon: aCNRFFHLVP). A rising fixed-rate share signals duration extension and rate lock-in behavior. Useful for normalization when comparing across different bond-type deal counts. Complements the volume equivalent (aCNCBOFFUA).",
        "related_series": ["aCNRFFNIXP", "aCNRFFASIP", "aCNRFFNTZP", "aCNCBOFFUA"],
    },

    "aCNGCPPOLP": {
        "subcategory": "Cash Bond Transactions — Deals by Institution Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions by joint-stock commercial banks (股份制商业银行) on the CIBM, reported by NIFC. Joint-stock banks (e.g., China Merchants Bank, CITIC Bank, Ping An Bank) are private or mixed-ownership banks with national licenses, a tier below the six large state-owned banks.",
        "how_to_use": "Joint-stock bank activity reflects the behavior of China's most dynamic commercial banking segment. These banks are more aggressive in asset-liability management and bond portfolio optimization than large state-owned banks. Rising deal count relative to large commercial banks (aCNGCPJQFP) signals increased proprietary trading or liquidity management activity. Compare yield dynamics (aCNCBTVVTR) for pricing differentiation.",
        "related_series": ["aCNGCPJQFP", "aCNGCPUPZP", "aCNCBTYNVA", "aCNCBTVVTR"],
    },

    "aCNGCPJQFP": {
        "subcategory": "Cash Bond Transactions — Deals by Institution Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions by large commercial banks (大型商业银行) on the CIBM, reported by NIFC. Large commercial banks include the Big Six state-owned banks: ICBC, CCB, ABC, BOC, BoCom, and Postal Savings Bank.",
        "how_to_use": "Large commercial bank deal count is the single most important indicator of institutional bond demand on the CIBM, as these six banks collectively hold the largest domestic bond portfolios. A sharp increase often reflects policy-driven bond buying (e.g., supporting Treasury bond issuance quotas) or pre-emptive duration positioning ahead of PBoC rate moves. Compare volume (aCNCBPRSEA) for average deal size.",
        "related_series": ["aCNGCPPOLP", "aCNGCPUPZP", "aCNCBPRSEA", "aCNCNJHJGM"],
    },

    "aCNIRSPJXP": {
        "subcategory": "Cash Bond Transactions — Deals by Tenor",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions with remaining maturity of less than or equal to 1 year on the CIBM, reported by NIFC. This is the shortest-duration bucket, covering T-bills, short-term CP, NCDs, and other money market instruments.",
        "how_to_use": "Sub-1Y deal count is the most sensitive indicator of money market conditions in the bond space. A surge signals cash-rich institutions deploying short-duration liquidity. Compare yield (aCNIRSOLDR) against overnight and 7-day repo rates (DR007) to measure the term premium for holding sub-1Y bonds over pure repo. Rising relative to longer tenors signals a flight to shorter duration.",
        "related_series": ["aCNIRSWFHP", "aCNIRSONDR", "aCNIRSOLDR", "aCNLPR1YRR"],
    },

    "aCNBLTCQWP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in medium-term notes (MTNs / 中期票据) on the CIBM, reported by NIFC. MTNs are the dominant corporate debt instrument in China's interbank market, issued by non-financial enterprises under NAFMII registration with maturities of 1–10 years.",
        "how_to_use": "MTN deal count is the primary gauge of corporate credit market activity on the CIBM. Compare with corporate bond deals (aCNBLTNBHP) and CP deals (aCNBLTIQFP) for the full corporate credit picture. MTN yield (aCNRFSPJIR) versus policy financial bond yield (from aCNCBTLNWA) gives the corporate credit spread. Rising deal count alongside spread compression signals risk-on conditions for corporate credit.",
        "related_series": ["aCNBLTNBHP", "aCNBLTIQFP", "aCNRFSPJIR", "aCNLPR1YRR"],
    },

    "aCNIRSIEVP": {
        "subcategory": "Cash Bond Transactions — Deals by Tenor",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions with remaining maturity of more than 30 years on the CIBM, reported by NIFC. This ultra-long segment covers 50Y Treasury bonds and any bonds exceeding the standard 30Y benchmark.",
        "how_to_use": "Ultra-long (>30Y) bond activity is almost exclusively driven by insurance companies and pension funds managing very long-dated liabilities. China began regularly issuing 50Y Treasury bonds in 2023 to develop the ultra-long end of the curve. Compare deal count and yield (aCNBLTVYHR) with the 20–30y bucket (aCNIRSKVTP). Low deal counts indicate thin liquidity and wide bid-ask spreads.",
        "related_series": ["aCNIRSKVTP", "aCNBLTVYHR", "aCNBLTEFHR", "aCNCNJHJGM"],
    },

    "aCNBLTJUGP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in other financial bonds (其他金融债) on the CIBM, reported by NIFC. This residual category covers financial bonds not classified elsewhere — including bonds issued by financial leasing companies, consumer finance companies, and other licensed financial institutions.",
        "how_to_use": "Other financial bond activity is a catch-all for non-standard financial institution debt. Rising deal count may signal regulatory changes expanding the eligible issuer universe or investor appetite for yield pickup in less liquid credits. Compare yields (aCNRFFIFPR) against commercial bank bonds and policy financial bonds (aCNCBTLNWA) for spread hierarchy.",
        "related_series": ["aCNCBSCKVA", "aCNRFFIFPR", "aCNBLTZNEP", "aCNLPR1YRR"],
    },

    "aCNBLTEBSP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions aggregated across all bond types (债券类型合计) on the CIBM, reported by NIFC. This is the headline total deal count for the 'other bond types' residual category in the bond-type breakdown.",
        "how_to_use": "Use as a cross-check against the institutional breakdown total (aCNCBTDONP) and the tenor breakdown total (aCNIRSSJMP). Persistent growth in this residual category suggests new instrument types entering active secondary trading. Helps identify whether reported deal count changes are broad-based or concentrated in specific instrument types.",
        "related_series": ["aCNCBTDONP", "aCNGCPFORP", "aCNIRSSJMP", "aCNCNJHJGM"],
    },

    "aCNGCPZJRP": {
        "subcategory": "Cash Bond Transactions — Deals by Institution Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions by other institution types (其他机构类型) on the CIBM, reported by NIFC. Residual category covering non-bank financial participants such as trust companies, financial asset management companies, and others not captured in standard institution buckets.",
        "how_to_use": "Monitor this residual category for signals of non-bank financial institution (NBFI) activity. Rising deal count by 'other institutions' may reflect shadow banking entities accessing the CIBM or new participant categories being added to NIFC reporting. Compare with securities company deal count (aCNGCPTRAP) for overall NBFI activity. The volume equivalent (aCNCBTRYVA) gives notional context.",
        "related_series": ["aCNGCPTRAP", "aCNGCPUPZP", "aCNCBTRYVA", "aCNLPR1YRR"],
    },

    "aCNBLTPNAP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in perpetual capital bonds (永续资本债) on the CIBM, reported by NIFC. Perpetual capital bonds have no fixed maturity date; the issuer (typically a large commercial bank or SOE) has the option to defer interest payments and extend perpetually, qualifying as Additional Tier 1 (AT1) capital.",
        "how_to_use": "Perpetual capital bond deals are a gauge of bank capital market depth and AT1 investor confidence. Compare with hybrid capital bond (aCNBLTPMIP) and Tier-2 capital instrument (aCNBLTRKDP) deals for the full capital instrument picture. China's AT1 perpetual bond market grew sharply after ICBC and CCB issued large volumes post-2019. Yield spread (aCNCBSGKKA volume) versus senior bonds reflects call extension and coupon-deferral risks.",
        "related_series": ["aCNBLTPMIP", "aCNBLTRKDP", "aCNCBSGKKA", "aCNCNJHJGM"],
    },

    "aCNBLTZNEP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in policy financial bonds (政策性金融债) on the CIBM, reported by NIFC. Policy financial bonds are issued by China's three policy banks: China Development Bank (CDB), Agricultural Development Bank of China (ADBC), and Export-Import Bank of China (Eximbank).",
        "how_to_use": "Policy financial bond deal count is the second most important bond category after Treasury bonds for gauging government-directed credit. CDB bonds are particularly important as quasi-sovereign instruments with marginally higher yields than CGBs. Compare deal count with Treasury bond deals (aCNBLTOQVP) for relative sovereign credit demand. Policy bank bond yields are key benchmarks for corporate credit pricing. Rising deal count accompanies fiscal stimulus packages.",
        "related_series": ["aCNBLTOQVP", "aCNCBTLNWA", "aCNBLTJUGP", "aCNCNJHJGM"],
    },

    "aCNBLTFXUP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in project revenue bonds (项目收益债) on the CIBM, reported by NIFC. Project revenue bonds are issued by special-purpose vehicles (SPVs) backed by revenues from infrastructure or utility projects, a structured form of quasi-municipal financing.",
        "how_to_use": "Project revenue bond deal count signals secondary market liquidity for project-backed debt. This segment sits between local government bonds (backed by fiscal revenues) and corporate bonds, with repayment tied to specific project cash flows. Rising deal count may reflect regulatory support for direct project financing as an alternative to local government financing vehicles (LGFVs). Compare yield against LGFV bonds and policy bank bonds.",
        "related_series": ["aCNCBSDQUA", "aCNBLTZGRP", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNBLTZGRP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in project revenue notes (项目收益票据) on the CIBM, reported by NIFC. Project revenue notes are shorter-term instruments backed by project revenues, registered under NAFMII's interbank framework, distinct from the longer-dated project revenue bonds.",
        "how_to_use": "Compare deal count with project revenue bonds (aCNBLTFXUP) to assess demand across the tenor spectrum for project-backed debt. Notes typically have shorter maturities, making them more accessible to bank treasury desks managing shorter duration. Rising activity signals pipeline of infrastructure projects seeking capital market financing. Volume data (aCNCBSJXUA) provides notional context.",
        "related_series": ["aCNBLTFXUP", "aCNCBSJXUA", "aCNCBSDQUA", "aCNLPR1YRR"],
    },

    "aCNGCPMZKP": {
        "subcategory": "Cash Bond Transactions — Deals by Institution Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions by rural commercial banks and rural cooperatives (农村商业银行及农村合作金融机构) on the CIBM, reported by NIFC. Rural commercial banks are locally-focused lenders serving county-level and agricultural communities.",
        "how_to_use": "Rural commercial bank activity on the CIBM reflects the degree to which smaller, regional financial institutions are accessing capital markets for investment and liquidity management. Their deal count is typically low relative to large commercial banks, but rising activity may signal PBoC policy channels are transmitting through the rural financial system. Compare with urban commercial bank (aCNGCPUPZP) activity. Volume data: aCNCBTKIHA.",
        "related_series": ["aCNGCPUPZP", "aCNGCPJQFP", "aCNCBTKIHA", "aCNLPR1YRR"],
    },

    "aCNGCPTRAP": {
        "subcategory": "Cash Bond Transactions — Deals by Institution Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions by securities companies (证券公司) on the CIBM, reported by NIFC. Securities companies participate as both market makers and proprietary traders, and also facilitate client bond orders on the interbank market.",
        "how_to_use": "Securities company deal count is a proxy for non-bank financial institution activity and proprietary trading. Rising relative to banks signals NBFIs are driving price discovery — often associated with momentum-driven duration bets. Compare with insurance company and fund activity using the 'other institutions' proxy (aCNGCPZJRP). Securities company bond issuance (aCNBLTGTMP) adds context on whether they are net buyers or issuers.",
        "related_series": ["aCNBLTGTMP", "aCNGCPZJRP", "aCNCBTWTWA", "aCNCNJHJGM"],
    },

    "aCNBLTGTMP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in securities company bonds (证券公司债) on the CIBM, reported by NIFC. These are bonds issued by Chinese brokerage firms to fund their operations, including proprietary trading, margin lending, and investment banking.",
        "how_to_use": "Securities company bond deal count reflects secondary market liquidity for broker-dealer debt. Compare yield against bank financial bonds to assess the premium for securities firm credit risk. During equity market downturns, securities company bond spreads typically widen as margin lending book quality deteriorates. Compare with securities company commercial paper (aCNBLTGNNP) for the short-term funding counterpart.",
        "related_series": ["aCNBLTGNNP", "aCNCBSHHYA", "aCNGCPTRAP", "aCNLPR1YRR"],
    },

    "aCNBLTGNNP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in securities company commercial paper (证券公司短期融资券) on the CIBM, reported by NIFC. These are short-term (typically up to 91 days) unsecured CP instruments issued by securities companies for working capital and short-term funding needs.",
        "how_to_use": "Securities company CP deal count signals the short-term funding activity of China's brokerage sector. Spikes in deal count often coincide with equity market rallies when brokers need to fund rapid expansion of margin lending. Compare with securities company bond deals (aCNBLTGTMP) for the tenor composition of brokerage funding. Volume data (aCNCBSPSYA) provides notional scale.",
        "related_series": ["aCNBLTGTMP", "aCNCBSPSYA", "aCNBLTIQFP", "aCNLPR1YRR"],
    },

    "aCNBLTRQDP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in short-term commercial paper (SCP / 短期融资券) on the CIBM, reported by NIFC. SCP are unsecured corporate debt instruments with maturities of up to 270 days, issued by non-financial enterprises under NAFMII registration.",
        "how_to_use": "SCP deal count is a high-frequency proxy for corporate short-term funding conditions. Rising deals amid spread widening over T-bills signals corporate credit stress. SCP is the shortest-duration corporate instrument on the CIBM and is particularly sensitive to rolling-risk dynamics — compare deal count with CP (aCNBLTIQFP) and monitor SCP yield (aCNRFSCBJA for volume; yield context from aCNRFSBKHR) for funding-cost trends.",
        "related_series": ["aCNBLTIQFP", "aCNRFSCBJA", "aCNBLTCQWP", "aCNLPR1YRR"],
    },

    "aCNCBTDSNP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "frequency_note": "Quarterly (P3M)",
        "meaning": "Quarterly deal count for cash bond transactions in standardized notes (标准化票据) on the CIBM, reported by NIFC. Standardized notes are an innovative instrument introduced by PBoC in 2020, where banks bundle non-standardized credit claims (trade receivables, supply-chain receivables) into standardized interbank securities.",
        "how_to_use": "Standardized note deal count tracks the development of China's supply-chain finance securitization market. Quarterly frequency reflects the nascent nature of this market. Rising deal count signals PBoC's supply-chain finance initiative gaining traction among SME-focused banks. Compare with ABS (aCNBLTYDNP) and ABN (aCNBLTLGGP) as the three structured-finance channels on the CIBM. Volume: aCNCBTDSNA.",
        "related_series": ["aCNCBTDSNA", "aCNBLTYDNP", "aCNBLTLGGP", "aCNLPR1YRR"],
    },

    "aCNBLTRKDP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in Tier-2 capital instruments (二级资本工具) on the CIBM, reported by NIFC. Tier-2 capital instruments are subordinated bonds issued by banks with maturities typically of 10 years (callable at year 5), qualifying as Tier-2 regulatory capital under Basel III / China's CBIRC capital rules.",
        "how_to_use": "Tier-2 capital deal count reflects market appetite for bank subordinated debt one level above senior bonds but below AT1/perpetual. Compare with perpetual capital bond deals (aCNBLTPNAP) and hybrid capital deals (aCNBLTPMIP) for the full bank capital structure picture. Yield spread over senior bank bonds reflects the subordination premium. Key signals: rising deals with spread tightening indicates demand exceeds supply; spread widening signals credit deterioration concerns.",
        "related_series": ["aCNBLTPNAP", "aCNBLTPMIP", "aCNCBSPDBA", "aCNCNJHJGM"],
    },

    "aCNBLTOQVP": {
        "subcategory": "Cash Bond Transactions — Deals by Bond Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in Treasury bonds (CGBs / 国债) on the CIBM, reported by NIFC. CGBs are sovereign bonds issued by China's Ministry of Finance and are the risk-free benchmark for the entire Chinese fixed-income market.",
        "how_to_use": "CGB deal count is the most important single indicator of sovereign secondary market activity on the CIBM. Surges coincide with: (1) settlement of new CGB auctions, (2) Bloomberg Barclays/FTSE WGBI index rebalancing, (3) Bond Connect foreign investor inflows. Monitor alongside the 10Y CGB yield (aCNCNJHJGM) — high deal counts at record-low yields signal forced institutional buying. Volume equivalent: aCNCBTZTMA.",
        "related_series": ["aCNCBTZTMA", "aCNBLTZNEP", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNRFFHLVP": {
        "subcategory": "Cash Bond Transactions — Deals by Interest-Rate Type",
        "units": "Number of deals",
        "meaning": "Monthly deal count for cash bond transactions in zero-coupon bonds (零息债券) on the CIBM, reported by NIFC. Zero-coupon bonds pay no periodic interest; return is the discount between purchase price and face value at maturity.",
        "how_to_use": "Zero-coupon bond deals are a small CIBM subset — mainly Treasury strips and certain structured instruments. An increase signals demand for pure duration exposure without reinvestment risk, typically from insurance companies matching zero-coupon-like liabilities. Compare with discount-rate deals (aCNRFFNTZP) — discount bonds are shorter-dated. Volume: aCNCBOQQBA.",
        "related_series": ["aCNRFFNTZP", "aCNRFFNIXP", "aCNCBOQQBA", "aCNCNJHJGM"],
    },

    "aCNCBTDONP": {
        "subcategory": "Cash Bond Transactions — Deals Headline",
        "units": "Number of deals",
        "meaning": "Monthly total deal count for all cash bond transactions by bond type on the CIBM, reported by NIFC. Headline aggregate across Treasury bonds, policy financial bonds, corporate credit, structured products, and all other instrument categories.",
        "how_to_use": "Primary headline indicator for CIBM cash bond secondary market depth. Compare year-on-year for market deepening trends. Seasonality: dips in January (Lunar New Year), surges around quarter-ends. Cross-check against institutional total (aCNGCPFORP) and tenor total (aCNIRSSJMP) for data consistency. Volume equivalent: aCNCBSTHOA.",
        "related_series": ["aCNCBSTHOA", "aCNGCPFORP", "aCNIRSSJMP", "aCNCNJHJGM"],
    },

    "aCNGCPFORP": {
        "subcategory": "Cash Bond Transactions — Deals Headline",
        "units": "Number of deals",
        "meaning": "Monthly total deal count for all cash bond transactions by institution type on the CIBM, reported by NIFC. Aggregates across large commercial banks, joint-stock banks, urban commercial banks, rural banks, securities companies, and all other participants.",
        "how_to_use": "Cross-check against bond-type total (aCNCBTDONP) and tenor total (aCNIRSSJMP) for data integrity. The institutional breakdown reveals whether activity is policy-driven (concentrated in large state-owned banks) or market-driven (broad participation across institution tiers). A rising securities company share signals NBFI-driven price discovery. Volume equivalent: aCNCBTVMRA.",
        "related_series": ["aCNCBTDONP", "aCNCBTVMRA", "aCNIRSSJMP", "aCNCNJHJGM"],
    },

    "aCNIRSSJMP": {
        "subcategory": "Cash Bond Transactions — Deals Headline",
        "units": "Number of deals",
        "meaning": "Monthly total deal count for all cash bond transactions by payback period (tenor) on the CIBM, reported by NIFC. Aggregates across all tenor buckets from sub-1Y through >30Y.",
        "how_to_use": "Headline for the tenor-breakdown series. Calculate each bucket's share (e.g., aCNIRSWFHP / aCNIRSSJMP) to derive the duration distribution of market activity. A rising 1–3Y share during easing cycles reflects short-duration positioning. Volume equivalent: aCNCBSKAJA. Pairs with YTM bucket data to construct an implied transaction-weighted yield curve.",
        "related_series": ["aCNCBSKAJA", "aCNCBTDONP", "aCNGCPFORP", "aCNCNJHJGM"],
    },

    "aCNCBSYHIA": {
        "subcategory": "Cash Bond Transactions — Volume by Tenor",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions with remaining maturity of 10 to 15 years (inclusive of 15y) on the CIBM, reported by NIFC.",
        "how_to_use": "Compare with deal count (aCNIRSYEOP) to derive average trade size in the 10–15y segment — large values indicate institutional block trades. Rising volume alongside rising yield (aCNBLTEUBR) suggests forced selling; rising volume with falling yield indicates liability-driven buying by insurance companies. Complements the 7–10y bucket (aCNCBSRPHA) for building the long-end volume term structure.",
        "related_series": ["aCNIRSYEOP", "aCNCBSRPHA", "aCNBLTEUBR", "aCNCNJHJGM"],
    },

    "aCNCBSNSOA": {
        "subcategory": "Cash Bond Transactions — Volume by Tenor",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions with remaining maturity of 15 to 20 years (inclusive of 20y) on the CIBM, reported by NIFC.",
        "how_to_use": "The 15–20y volume bucket reflects long-duration demand primarily from insurance companies matching long-dated policy liabilities. Compare with 10–15y (aCNCBSYHIA) and 20–30y (aCNCBSZXGA) to identify where long-end demand is concentrated. Volume growth with stable or falling yield (aCNBLTDDDR) indicates persistent liability-driven buying flows that PBoC has flagged as a systemic risk concern.",
        "related_series": ["aCNCBSYHIA", "aCNCBSZXGA", "aCNBLTDDDR", "aCNCNJHJGM"],
    },

    "aCNCBSJGLA": {
        "subcategory": "Cash Bond Transactions — Volume by Tenor",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions with remaining maturity of 1 to 3 years (inclusive of 3y) on the CIBM, reported by NIFC.",
        "how_to_use": "The 1–3y bucket is typically the highest-volume tenor for active commercial bank treasury management and money market funds. Compare deal count (aCNIRSWFHP) for average trade size. A high volume-to-deal ratio indicates block trades by large state-owned banks. Compare yield (aCNIRSONDR) against sub-1Y (aCNIRSOLDR) for the short-end term premium.",
        "related_series": ["aCNIRSWFHP", "aCNCBSNGDA", "aCNIRSONDR", "aCNLPR1YRR"],
    },

    "aCNCBSZXGA": {
        "subcategory": "Cash Bond Transactions — Volume by Tenor",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions with remaining maturity of 20 to 30 years (inclusive of 30y) on the CIBM, reported by NIFC. The 30Y CGB is China's longest standard benchmark.",
        "how_to_use": "Critical for monitoring PBoC's long-duration risk intervention framework. In 2024, PBoC borrowed CGBs from banks to sell and push yields higher when 30Y CGB yields fell to historic lows near 2.1%. High volume at record-low yields signals forced institutional buying. Compare with 15–20y (aCNCBSNSOA) and yield data (aCNBLTEFHR). Watch for PBoC bond-borrowing operations as counter-cyclical signals.",
        "related_series": ["aCNIRSKVTP", "aCNCBSNSOA", "aCNBLTEFHR", "aCNCNJHJGM"],
    },

    "aCNCBSLNOA": {
        "subcategory": "Cash Bond Transactions — Volume by Tenor",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions with remaining maturity of 3 to 5 years (inclusive of 5y) on the CIBM, reported by NIFC.",
        "how_to_use": "The 3–5y bucket bridges money market and duration investment. Strong volume here relative to flanking buckets signals incremental duration extension — typical of early-cycle easing. Compare yield (aCNIRSJJDR) and deal count (aCNIRSCZKP) for average trade size. Policy bank 5Y bonds set the key pricing benchmark in this segment.",
        "related_series": ["aCNCBSJGLA", "aCNCBSKSHA", "aCNIRSJJDR", "aCNLPR1YRR"],
    },

    "aCNCBSKSHA": {
        "subcategory": "Cash Bond Transactions — Volume by Tenor",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions with remaining maturity of 5 to 7 years (inclusive of 7y) on the CIBM, reported by NIFC.",
        "how_to_use": "The 5–7y segment captures activity around secondary benchmark tenors. Compare with 3–5y (aCNCBSLNOA) and 7–10y (aCNCBSRPHA) to identify demand migration across the curve belly. Activity typically rises after 7Y CGB or CDB bond auctions settle into secondary trading. Use yield (aCNIRSFPJR) and deal count (aCNIRSTOWP) to calculate average transaction prices.",
        "related_series": ["aCNCBSLNOA", "aCNCBSRPHA", "aCNIRSFPJR", "aCNCNJHJGM"],
    },

    "aCNCBSRPHA": {
        "subcategory": "Cash Bond Transactions — Volume by Tenor",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions with remaining maturity of 7 to 10 years (inclusive of 10y) on the CIBM, reported by NIFC. Anchored by the on-the-run 10Y CGB benchmark.",
        "how_to_use": "The 7–10y volume bucket is strategically central to CIBM price discovery. Monitor for correlation with Bond Connect foreign inflows — foreign investors concentrate heavily in 10Y CGBs. Compare transaction-weighted yield (aCNBLTVJER) with the published 10Y CGB rate (aCNCNJHJGM). A large divergence suggests off-the-run premium or roll effects around auction cycles.",
        "related_series": ["aCNCBSKSHA", "aCNCBSYHIA", "aCNBLTVJER", "aCNCNJHJGM"],
    },

    "aCNCBSSDJA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in asset management company bonds on the CIBM, reported by NIFC. Bonds issued by the four major state-owned AMCs: Huarong, Cinda, Orient, and Great Wall.",
        "how_to_use": "AMC bond volume is small but signals demand for quasi-sovereign yield pickup. Compare deal count (aCNBLTQIWP) for average trade size — block trades suggest large institutional buyers. Monitor spread versus CGB (aCNCNJHJGM) as an indicator of implicit government support credibility. The 2021 Huarong restructuring episode caused sharp spread widening — a reminder that the implicit guarantee is not unconditional.",
        "related_series": ["aCNBLTQIWP", "aCNRFFCAGR", "aCNCBTLNWA", "aCNCNJHJGM"],
    },

    "aCNCBSMXAA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in asset-backed notes (ABN) on the CIBM, reported by NIFC.",
        "how_to_use": "ABN volume tracks secondary liquidity for corporate receivables-backed notes. Low volume relative to issuance size confirms buy-and-hold behavior. Rising volume signals improving secondary market depth, reducing future issuance costs. Compare with ABS volume (aCNCBSBKEA). Yield benchmark: aCNRFFPFLR. Compare deal count (aCNBLTLGGP).",
        "related_series": ["aCNBLTLGGP", "aCNCBSBKEA", "aCNRFFPFLR", "aCNLPR1YRR"],
    },

    "aCNCBSBKEA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in asset-backed securities (ABS) on the CIBM, reported by NIFC.",
        "how_to_use": "ABS secondary volume tracks China's securitization market depth. Volume rises after PBoC/CBIRC policy signals supporting securitization as a bank capital-relief tool. Compare deal count (aCNBLTYDNP) for average deal size. Yield (aCNRFSBYOR) versus senior bank bonds measures the structured-credit premium. Compare with ABN volume (aCNCBSMXAA).",
        "related_series": ["aCNBLTYDNP", "aCNCBSMXAA", "aCNRFSBYOR", "aCNLPR1YRR"],
    },

    "aCNCBSQPEA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in auto financial company bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Auto financial company bond volume correlates with auto sales cycles. Compare yield (aCNRFFFIJR) against commercial bank bonds for the issuer-type credit spread. Rising volume signals this niche segment is gaining secondary market traction. Compare deal count (aCNBLTBDWP).",
        "related_series": ["aCNBLTBDWP", "aCNRFFFIJR", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNCBTHWJA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in negotiable certificates of deposit (NCDs / 同业存单) on the CIBM, reported by NIFC.",
        "how_to_use": "NCD cash bond volume is among the largest single-instrument segments by value. Spikes at month-end and quarter-end reflect bank liquidity ratio management. NCD yield (aCNRFSPQOR) versus DR007 gives the bank funding premium for non-Big-Six banks. Compare with bond lending of NCDs (aCNBLTLNWA) for total NCD market activity. Deal count: aCNBLTQMOP.",
        "related_series": ["aCNBLTQMOP", "aCNBLTLNWA", "aCNRFSPQOR", "aCNLPR1YRR"],
    },

    "aCNCBSLPVA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in commercial paper (CP) on the CIBM, reported by NIFC.",
        "how_to_use": "CP volume tracks short-term corporate funding activity. Compare with SCP volume (aCNRFSCBJA). Rising volume alongside spread compression signals strong corporate demand and adequate investor appetite. Yield (aCNRFSBKHR) versus T-bill rates gives the corporate money-market credit spread. Deal count: aCNBLTIQFP.",
        "related_series": ["aCNBLTIQFP", "aCNRFSCBJA", "aCNRFSBKHR", "aCNLPR1YRR"],
    },

    "aCNCBSMDBA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in corporate bonds (公司债) on the CIBM, reported by NIFC.",
        "how_to_use": "Corporate bond volume is a secondary indicator versus MTN dominance (aCNCBSSGEA). Rising CIBM corporate bond volume may signal cross-market arbitrage between exchange-listed and interbank corporate bonds. Yield (aCNRFSIKGR) versus policy financial bonds gives the corporate credit spread. Deal count: aCNBLTNBHP.",
        "related_series": ["aCNBLTNBHP", "aCNCBSSGEA", "aCNRFSIKGR", "aCNLPR1YRR"],
    },

    "aCNCBOHAEA": {
        "subcategory": "Cash Bond Transactions — Volume by Interest-Rate Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in discount-rate bonds on the CIBM, reported by NIFC. Dominated by Treasury bills and short-term corporate paper.",
        "how_to_use": "High volume with falling discount yields (aCNGCPXCUR) signals safe-haven demand. Compare with zero-coupon volume (aCNCBOQQBA) and fixed-rate volume (aCNCBOATYA) to calculate discount bonds' share of total activity. Deal count: aCNRFFNTZP.",
        "related_series": ["aCNRFFNTZP", "aCNCBOATYA", "aCNGCPXCUR", "aCNLPR1YRR"],
    },

    "aCNCBOATYA": {
        "subcategory": "Cash Bond Transactions — Volume by Interest-Rate Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in fixed-rate bonds on the CIBM, reported by NIFC. Largest single category by notional value, encompassing most CGBs, policy bank bonds, and corporate credit.",
        "how_to_use": "Fixed-rate volume dominates total CIBM turnover. Compare with floating-rate (aCNCBOQVJA) — rising fixed-rate share signals confidence in a stable or declining rate path. Yield (aCNRFOYEKR) tracks the average fixed-income market rate. Total interest-bearing volume: aCNCBOFFUA. Deal count: aCNRFFNIXP.",
        "related_series": ["aCNRFFNIXP", "aCNCBOQVJA", "aCNRFOYEKR", "aCNCNJHJGM"],
    },

    "aCNCBOQVJA": {
        "subcategory": "Cash Bond Transactions — Volume by Interest-Rate Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in floating-rate bonds on the CIBM, reported by NIFC.",
        "how_to_use": "A rising share of floating-rate volume versus fixed-rate (aCNCBOATYA) signals rate-uncertainty hedging. In China's 2024 rate-cutting cycle, floating-rate volumes declined as issuers locked in low fixed rates. Compare yield (aCNRFOHNTR) for the current floating-rate benchmark level. Deal count: aCNRFFASIP.",
        "related_series": ["aCNRFFASIP", "aCNCBOATYA", "aCNRFOHNTR", "aCNLPR1YRR"],
    },

    "aCNCBSLXAA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in foreign sovereign government RMB bonds (sovereign Panda bonds) on the CIBM, reported by NIFC.",
        "how_to_use": "Sovereign Panda bond volume is a key RMB internationalization indicator. Small but symbolically important: rising volume signals improving offshore confidence in RMB-denominated sovereign assets. Compare deal count (aCNBLTIRKP) for average deal size. Yield versus CGB (aCNCNJHJGM) measures the Panda sovereign spread — historically near-zero for investment-grade sovereign issuers.",
        "related_series": ["aCNBLTIRKP", "aCNRFFQAYR", "aCNCBTZTMA", "aCNCNJHJGM"],
    },

    "aCNCBSQNXA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in green notes on the CIBM, reported by NIFC.",
        "how_to_use": "Green note volume tracks secondary market development of China's green finance market. Calculate as a share of total MTN/CP volume to measure ESG market penetration. Compare yield (aCNRFFMTXR) versus conventional bonds for the greenium. Monitor alongside PBoC green finance incentive programs. Deal count: aCNBLTVGNP.",
        "related_series": ["aCNBLTVGNP", "aCNRFFMTXR", "aCNCBSSGEA", "aCNLPR1YRR"],
    },

    "aCNCBSUCMA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in hybrid capital bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Hybrid capital bond volume reflects secondary depth for bank AT1 and deeply subordinated instruments. Compare deal count (aCNBLTPMIP) for average deal size. Spread over senior bank bonds measures the subordination and loss-absorption premium. Monitor around major bank capital announcements. Compare with Tier-2 volume (aCNCBSPDBA) and perpetual capital volume (aCNCBSGKKA).",
        "related_series": ["aCNBLTPMIP", "aCNRFFAQRR", "aCNCBSPDBA", "aCNCNJHJGM"],
    },

    "aCNCBOFFUA": {
        "subcategory": "Cash Bond Transactions — Volume by Interest-Rate Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly total trading volume for all cash bond transactions by interest-bearing mode on the CIBM, reported by NIFC. Aggregates fixed-rate, floating-rate, discount, and zero-coupon bond volumes.",
        "how_to_use": "Headline volume for the interest-rate-type breakdown. Calculate each category's share (e.g., aCNCBOATYA / aCNCBOFFUA) to reveal CIBM structural composition. Cross-check against bond-type total (aCNCBSTHOA) and institution-type total (aCNCBTVMRA) for data consistency. A rising fixed-rate share signals duration extension and rate lock-in behavior.",
        "related_series": ["aCNCBOATYA", "aCNCBOQVJA", "aCNCBSTHOA", "aCNCNJHJGM"],
    },

    "aCNCBTYNVA": {
        "subcategory": "Cash Bond Transactions — Volume by Institution Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions by joint-stock commercial banks on the CIBM, reported by NIFC.",
        "how_to_use": "Joint-stock bank volume tracks the most active commercial bank tier in secondary bond trading. Compare deal count (aCNGCPPOLP) for average deal size. Joint-stock banks tend to be more active relative to balance sheet size than large state-owned banks — a proxy for proprietary trading intensity. Rising volume during easing periods reflects duration extension strategies. Compare with large commercial bank volume (aCNCBPRSEA).",
        "related_series": ["aCNGCPPOLP", "aCNCBPRSEA", "aCNCBTVVTR", "aCNLPR1YRR"],
    },

    "aCNCBPRSEA": {
        "subcategory": "Cash Bond Transactions — Volume by Institution Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions by large commercial banks (Big Six state-owned banks) on the CIBM, reported by NIFC.",
        "how_to_use": "Large commercial bank volume is typically the largest single institutional category on the CIBM. Surges often reflect policy-directed bond buying (MoF Treasury quota absorption) or pre-announced monetary transmission. Compare with joint-stock bank volume (aCNCBTYNVA) — if large banks dominate, activity is policy-driven rather than price-discovery driven. Compare deal count (aCNGCPJQFP) for average deal size.",
        "related_series": ["aCNGCPJQFP", "aCNCBTYNVA", "aCNCBTZTMA", "aCNCNJHJGM"],
    },

    "aCNCBSNGDA": {
        "subcategory": "Cash Bond Transactions — Volume by Tenor",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions with remaining maturity of less than or equal to 1 year on the CIBM, reported by NIFC.",
        "how_to_use": "Sub-1Y volume is the bond market's money market equivalent. Rising volume signals institutional preference for short-duration capital deployment. Compare yield (aCNIRSOLDR) against DR007 — when sub-1Y bond YTM exceeds DR007, bonds offer better risk-adjusted return than pure cash. High sub-1Y share versus longer tenors indicates risk-off or liquidity-management-driven trading. Deal count: aCNIRSPJXP.",
        "related_series": ["aCNIRSPJXP", "aCNCBSJGLA", "aCNIRSOLDR", "aCNLPR1YRR"],
    },

    "aCNCBSSGEA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in medium-term notes (MTNs / 中期票据) on the CIBM, reported by NIFC. MTNs are the flagship corporate debt instrument of China's interbank market.",
        "how_to_use": "MTN volume is the primary indicator of corporate credit market activity on the CIBM, accounting for the largest share of non-sovereign secondary turnover. Rising volume alongside spread compression (MTN yield aCNRFSPJIR minus policy bank bond yield) signals risk-on for corporate credit. Compare with SCP volume (aCNRFSCBJA) and corporate bond volume (aCNCBSMDBA). Deal count: aCNBLTCQWP.",
        "related_series": ["aCNBLTCQWP", "aCNRFSPJIR", "aCNCBSMDBA", "aCNLPR1YRR"],
    },

    "aCNCBSJVFA": {
        "subcategory": "Cash Bond Transactions — Volume by Tenor",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions with remaining maturity of more than 30 years on the CIBM, reported by NIFC. Covers 50Y Treasury bonds and bonds exceeding 30 years.",
        "how_to_use": "Ultra-long (>30Y) volume is thin but policy-significant, covering China's 50Y CGB issuance program launched in 2023. Compare deal count (aCNIRSIEVP) for average deal size — large average sizes indicate insurance company block trades for liability matching. Monitor yield (aCNBLTVYHR) for compression below 2% — a systemic risk signal flagged by PBoC in its 2024 long-bond market interventions.",
        "related_series": ["aCNIRSIEVP", "aCNCBSZXGA", "aCNBLTVYHR", "aCNCNJHJGM"],
    },

    "aCNCBSCKVA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in other financial bonds on the CIBM, reported by NIFC. Residual category for non-standard financial institution bonds not classified in mainstream categories.",
        "how_to_use": "Other financial bond volume is typically small and illiquid. Compare deal count (aCNBLTJUGP) for average deal size. A rising volume share signals new categories of licensed financial institutions gaining CIBM access or regulatory changes expanding eligible issuers. Yield (aCNRFFIFPR) versus mainstream financial bonds measures the niche-segment liquidity premium.",
        "related_series": ["aCNBLTJUGP", "aCNRFFIFPR", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNCBSVVRA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for the residual other bond types category on the CIBM, reported by NIFC.",
        "how_to_use": "Residual to close the bond-type volume breakdown. A growing residual may indicate new instrument types entering active secondary trading before formal reclassification in NIFC reporting. Cross-check with deal count residual (aCNBLTEBSP). Normalizing as a share of total volume (aCNCBSTHOA) helps identify whether CIBM instrument diversification is expanding over time.",
        "related_series": ["aCNBLTEBSP", "aCNCBSTHOA", "aCNCBTVMRA", "aCNCNJHJGM"],
    },

    "aCNCBTRYVA": {
        "subcategory": "Cash Bond Transactions — Volume by Institution Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for the residual other institution types category on the CIBM, reported by NIFC. Captures trust companies, financial asset management companies, and emerging participant types.",
        "how_to_use": "The other institution volume residual tracks NBFI deepening of CIBM participation. A rising share suggests shadow banking entities or new regulated entrants expanding market access. Monitor during shadow banking regulation cycles — tightening typically reduces this category's volume. Cross-check with deal count (aCNGCPZJRP). Compare with securities company volume (aCNCBTWTWA) for total NBFI context.",
        "related_series": ["aCNGCPZJRP", "aCNGCPTRAP", "aCNCBTVMRA", "aCNLPR1YRR"],
    },

    "aCNCBSGKKA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in perpetual capital bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Perpetual bond volume tracks secondary market depth for China's AT1 capital instrument market. Compare deal count (aCNBLTPNAP) for average deal size. Thin secondary volume relative to issuance confirms buy-and-hold institutional ownership. Rising volume alongside yield spread widening signals concern about call extension or coupon deferral risk. Compare with hybrid capital volume (aCNCBSUCMA) and Tier-2 volume (aCNCBSPDBA).",
        "related_series": ["aCNBLTPNAP", "aCNCBSUCMA", "aCNCBSPDBA", "aCNCNJHJGM"],
    },

    "aCNCBTLNWA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in policy financial bonds (政策性金融债 — CDB, ADBC, Eximbank) on the CIBM, reported by NIFC.",
        "how_to_use": "Policy financial bond volume is consistently among the top-three by notional value on the CIBM. CDB bonds trade at 20–40bp spread over equivalent-tenor CGBs. Compare deal count (aCNBLTZNEP). Rising volume during fiscal stimulus periods reflects financing of national investment programs. The CDB 5Y/10Y yield is a reference for LGFV and SOE bond pricing. Monitor alongside government infrastructure investment announcements.",
        "related_series": ["aCNBLTZNEP", "aCNCBTZTMA", "aCNCBSSDJA", "aCNCNJHJGM"],
    },

    "aCNCBSDQUA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in project revenue bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Project revenue bond volume tracks secondary liquidity for project-backed infrastructure debt. Compare deal count (aCNBLTFXUP) for average deal size. Thin volume is typical given instrument complexity. Rising volume indicates investor confidence in the revenue-bond framework as an alternative to LGFV debt. Compare yield against local government bonds and policy bank bonds for the project-finance credit hierarchy.",
        "related_series": ["aCNBLTFXUP", "aCNCBSJXUA", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNCBSJXUA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in project revenue notes (shorter-dated, NAFMII-registered) on the CIBM, reported by NIFC.",
        "how_to_use": "Compare with project revenue bond volume (aCNCBSDQUA) to assess demand across the tenor spectrum for project-backed credit. Rising note volume relative to bonds suggests investor preference for shorter maturities — a risk-aversion signal for project-specific cash-flow uncertainty. Track alongside local government special bond issuance data. Deal count: aCNBLTZGRP.",
        "related_series": ["aCNBLTZGRP", "aCNCBSDQUA", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNCBTKIHA": {
        "subcategory": "Cash Bond Transactions — Volume by Institution Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions by rural commercial banks and rural cooperatives on the CIBM, reported by NIFC.",
        "how_to_use": "Rural bank CIBM volume reflects financial deepening and improved rural institution market access. Monitor around targeted RRR cuts for rural banks — released reserves are often deployed into bonds. Compare deal count (aCNGCPMZKP) for average deal size. Compare with urban commercial bank volume (aCNCBTZUMA) — urban banks hold proportionally larger bond portfolios.",
        "related_series": ["aCNGCPMZKP", "aCNCBTZUMA", "aCNCBTYNVA", "aCNLPR1YRR"],
    },

    "aCNCBTWTWA": {
        "subcategory": "Cash Bond Transactions — Volume by Institution Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions by securities companies on the CIBM, reported by NIFC.",
        "how_to_use": "Securities company volume captures broker-dealer proprietary trading and market-making. Rising volume relative to banks signals increasing NBFI price discovery. Securities companies are key underwriting intermediaries — their secondary volume is a leading indicator of primary market conditions. Compare deal count (aCNGCPTRAP). Cross-reference with securities company bond issuance (aCNBLTGTMP) for net position context.",
        "related_series": ["aCNGCPTRAP", "aCNCBTYNVA", "aCNCBTRYVA", "aCNCNJHJGM"],
    },

    "aCNCBSHHYA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in securities company bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Securities company bond volume reflects secondary liquidity for brokerage debt. Compare deal count (aCNBLTGTMP) for average deal size. During equity market stress, brokerage bond spreads widen as investors reprice sector credit risk — compare yield against commercial bank bonds for the broker-bank credit spread. Compare with securities company CP volume (aCNCBSPSYA) for tenor composition.",
        "related_series": ["aCNBLTGTMP", "aCNCBSPSYA", "aCNCBTWTWA", "aCNLPR1YRR"],
    },

    "aCNCBSPSYA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in securities company commercial paper on the CIBM, reported by NIFC.",
        "how_to_use": "Securities company CP volume tracks short-term broker-dealer funding activity. Volume spikes during equity market rallies as brokers fund margin lending expansion. Rising CP relative to bond volume (aCNCBSHHYA) signals short-term funding pressure. Cross-reference with overall CP volume (aCNCBSLPVA) to assess the securities sector's market share. Deal count: aCNBLTGNNP.",
        "related_series": ["aCNBLTGNNP", "aCNCBSHHYA", "aCNCBSLPVA", "aCNLPR1YRR"],
    },

    "aCNRFSCBJA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in short-term commercial paper (SCP / 短期融资券, up to 270 days) on the CIBM, reported by NIFC.",
        "how_to_use": "SCP volume is the most liquid corporate short-term benchmark on the CIBM. Rising volume signals strong corporate funding demand at the ultra-short end. During credit stress, SCP volume drops sharply as roll-over risk rises. Compare deal count (aCNBLTRQDP). Cross-reference with CP (aCNCBSLPVA) and MTN (aCNCBSSGEA) for the full corporate funding picture.",
        "related_series": ["aCNBLTRQDP", "aCNCBSLPVA", "aCNCBSSGEA", "aCNLPR1YRR"],
    },

    "aCNCBTDSNA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "frequency_note": "Quarterly (P3M)",
        "meaning": "Quarterly trading volume for cash bond transactions in standardized notes (标准化票据) on the CIBM, reported by NIFC. Standardized notes bundle supply-chain receivables into interbank securities, a PBoC 2020 initiative for SME financing.",
        "how_to_use": "Quarterly frequency reflects this market's nascent stage. Compare with deal count (aCNCBTDSNP). Rising volume signals PBoC's supply-chain finance securitization initiative gaining traction. Compare with ABS (aCNCBSBKEA) and ABN (aCNCBSMXAA) as the three structured-finance channels on the CIBM. Monitor alongside PBoC inclusive finance and supply-chain finance policy announcements.",
        "related_series": ["aCNCBTDSNP", "aCNCBSBKEA", "aCNCBSMXAA", "aCNLPR1YRR"],
    },

    "aCNCBSPDBA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in Tier-2 capital instruments on the CIBM, reported by NIFC. Tier-2 bonds are subordinated 10Y (callable at 5Y) bank capital instruments under Basel III / CBIRC rules.",
        "how_to_use": "Tier-2 capital volume reflects secondary depth for bank subordinated debt. Compare deal count (aCNBLTRKDP) for average deal size. Yield spread over senior bank bonds measures the subordination premium. Compare with perpetual capital (aCNCBSGKKA) and hybrid capital (aCNCBSUCMA) volumes for the full bank capital structure picture. Rising volume with widening spreads signals credit deterioration concerns.",
        "related_series": ["aCNBLTRKDP", "aCNCBSGKKA", "aCNCBSUCMA", "aCNCNJHJGM"],
    },

    "aCNCBTZTMA": {
        "subcategory": "Cash Bond Transactions — Volume by Bond Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in Treasury bonds (CGBs / 国债) on the CIBM, reported by NIFC.",
        "how_to_use": "CGB volume is the benchmark for total CIBM activity depth. Surges coincide with primary auction settlement, Bond Connect foreign inflows, and index rebalancing. Compare deal count (aCNBLTOQVP) for average trade size. High CGB volume at record-low yields (aCNCNJHJGM near 1.6% in 2024) signals policy-induced deflation dynamics. Compare with PBoC OMO, MLF rate trajectory, and MoF fiscal expansion announcements.",
        "related_series": ["aCNBLTOQVP", "aCNCBTLNWA", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNCBTZUMA": {
        "subcategory": "Cash Bond Transactions — Volume by Institution Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions by urban commercial banks (城市商业银行) on the CIBM, reported by NIFC.",
        "how_to_use": "Urban commercial bank volume tracks regional banking sector bond activity. Compare deal count (aCNGCPUPZP) for average deal size. Rising volume relative to large commercial banks signals broader institutional participation. Urban banks concentrate in shorter-duration bonds. Monitor around regional debt risk events — urban bank risk appetite can contract sharply during regional financial stress episodes (Baoshang Bank 2019, Hengfeng Bank).",
        "related_series": ["aCNGCPUPZP", "aCNCBTKIHA", "aCNCBTYNVA", "aCNLPR1YRR"],
    },

    "aCNCBOQQBA": {
        "subcategory": "Cash Bond Transactions — Volume by Interest-Rate Type",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly trading volume for cash bond transactions in zero-coupon bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Zero-coupon bond volume is a small CIBM subset. Rising volume signals demand for pure duration exposure without reinvestment risk — typically from insurance companies matching zero-coupon-like liabilities (single-premium endowment products). Compare with discount bond volume (aCNCBOHAEA). Deal count: aCNRFFHLVP. Yield context from tenor-bucket YTM series.",
        "related_series": ["aCNRFFHLVP", "aCNCBOHAEA", "aCNCBOATYA", "aCNCNJHJGM"],
    },

    "aCNCBSTHOA": {
        "subcategory": "Cash Bond Transactions — Volume Headline",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly total trading volume for all cash bond transactions by bond type on the CIBM, reported by NIFC. Headline aggregate across all instrument categories.",
        "how_to_use": "Primary headline volume indicator for CIBM secondary market activity. Use to calculate instrument-type market shares and normalize bond-type volume trends. Cross-check against institution-type total (aCNCBTVMRA) and tenor total (aCNCBSKAJA). Year-on-year growth measures market deepening. Seasonal dips around Lunar New Year and surges around quarter-ends are typical.",
        "related_series": ["aCNCBTVMRA", "aCNCBSKAJA", "aCNCBTDONP", "aCNCNJHJGM"],
    },

    "aCNCBTVMRA": {
        "subcategory": "Cash Bond Transactions — Volume Headline",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly total trading volume for all cash bond transactions by institution type on the CIBM, reported by NIFC.",
        "how_to_use": "Headline for the institution-type volume breakdown. Calculate each institution's share to monitor structural shifts in CIBM participation. A rising securities company or foreign bank share signals market structure evolution. Cross-check against bond-type total (aCNCBSTHOA) and tenor total (aCNCBSKAJA). Compare with deal count total (aCNGCPFORP) for average deal size by institution type.",
        "related_series": ["aCNCBSTHOA", "aCNCBSKAJA", "aCNGCPFORP", "aCNCNJHJGM"],
    },

    "aCNCBSKAJA": {
        "subcategory": "Cash Bond Transactions — Volume Headline",
        "units": "CNY 100 million (亿元)",
        "meaning": "Monthly total trading volume for all cash bond transactions by payback period (tenor) on the CIBM, reported by NIFC. Aggregates across all tenor buckets from sub-1Y through >30Y.",
        "how_to_use": "Headline for the tenor volume breakdown. Calculate each tenor bucket's share to construct a volume-weighted duration profile of CIBM activity. Compare with deal count total (aCNIRSSJMP) for average deal size by tenor — larger average deal sizes at long tenors confirm block-trading dominance by insurance companies and pension funds. Cross-check against bond-type (aCNCBSTHOA) and institution-type (aCNCBTVMRA) totals.",
        "related_series": ["aCNCBSTHOA", "aCNCBTVMRA", "aCNIRSSJMP", "aCNCNJHJGM"],
    },

    "aCNBLTEUBR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Tenor",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity (YTM) for cash bond transactions with remaining maturity of 10 to 15 years on the CIBM, reported by NIFC. Transaction-weighted average across all bond types in this tenor bucket.",
        "how_to_use": "The 10–15y YTM captures the long end of the yield curve just beyond the 10Y benchmark. Compare with the 7–10y YTM (aCNBLTVJER) to measure the 10s/15s spread — a gauge of long-duration risk premium. Spread widening suggests term premium expansion (rising inflation expectations or fiscal risk). Compare with 15–20y YTM (aCNBLTDDDR) for the long-end slope. Monitor alongside insurance sector asset-liability management dynamics.",
        "related_series": ["aCNBLTVJER", "aCNBLTDDDR", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNBLTDDDR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Tenor",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions with remaining maturity of 15 to 20 years on the CIBM, reported by NIFC.",
        "how_to_use": "The 15–20y YTM is critical for insurance company liability-driven investing. Compare with 10–15y (aCNBLTEUBR) for the 15s/20s term spread. Sustained compression toward the 10Y level indicates demand-driven flattening — a signal of excess long-duration buying. Yields falling below 2.5% in this segment prompted PBoC market intervention discussions in 2024. Volume context: aCNCBSNSOA.",
        "related_series": ["aCNBLTEUBR", "aCNBLTEFHR", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNIRSONDR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Tenor",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions with remaining maturity of 1 to 3 years on the CIBM, reported by NIFC.",
        "how_to_use": "The 1–3y YTM is the most actively referenced short-to-medium rate for commercial bank portfolio management and WMP (wealth management product) pricing. Compare with sub-1Y YTM (aCNIRSOLDR) for the short-end term premium. Compare with the 3–5y YTM (aCNIRSJJDR) to track curve shape in the policy-sensitive belly. A flattening of the sub-1Y to 3Y segment signals market anticipation of PBoC rate cuts.",
        "related_series": ["aCNIRSOLDR", "aCNIRSJJDR", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNBLTEFHR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Tenor",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions with remaining maturity of 20 to 30 years on the CIBM, reported by NIFC. Includes the 30Y CGB — China's longest standard benchmark.",
        "how_to_use": "The 20–30y YTM is the key monitoring rate for PBoC's long-bond market intervention. In 2024, PBoC borrowed CGBs from commercial banks to sell in the secondary market when 30Y yields fell near 2.1%. Yield compression here signals structural deflation demand from pension and insurance mandates. Compare with 15–20y (aCNBLTDDDR) and >30y (aCNBLTVYHR) for ultra-long curve dynamics. Volume: aCNCBSZXGA.",
        "related_series": ["aCNBLTDDDR", "aCNBLTVYHR", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNIRSJJDR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Tenor",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions with remaining maturity of 3 to 5 years on the CIBM, reported by NIFC.",
        "how_to_use": "The 3–5y YTM is the bellwether for medium-term rate expectations. Compare with 1–3y YTM (aCNIRSONDR) for the short-to-medium term premium. Compare with 5–7y YTM (aCNIRSFPJR) to assess whether the curve is steepening or flattening in the policy-transmission zone. Policy bank 5Y bonds set the reference for LGFV and local government bond pricing. A narrowing 1Y–5Y spread signals front-end easing bias. Volume: aCNCBSLNOA.",
        "related_series": ["aCNIRSONDR", "aCNIRSFPJR", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNIRSFPJR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Tenor",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions with remaining maturity of 5 to 7 years on the CIBM, reported by NIFC.",
        "how_to_use": "The 5–7y YTM is a secondary benchmark between the policy-sensitive 5Y and the headline 10Y. Compare with 3–5y YTM (aCNIRSJJDR) and 7–10y YTM (aCNBLTVJER) to detect inflection points in the medium-to-long transition. Corporate bond and LGFV issuers often target this tenor, making this a direct reference for credit spread calculations. Volume: aCNCBSKSHA.",
        "related_series": ["aCNIRSJJDR", "aCNBLTVJER", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNBLTVJER": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Tenor",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions with remaining maturity of 7 to 10 years (inclusive of 10y) on the CIBM, reported by NIFC. Includes the on-the-run 10Y CGB benchmark.",
        "how_to_use": "The 7–10y transaction-weighted YTM is a market-based check on the published 10Y CGB yield (aCNCNJHJGM). Divergence suggests off-the-run premium or roll effects around auction cycles. This is the most policy-relevant maturity — PBoC monitors for excessive compression. Compare with MLF rate and OMO 7-day reverse repo as the short-end policy anchor. In 2024, this YTM compressed to near 1.6% reflecting deflationary demand dynamics. Volume: aCNCBSRPHA.",
        "related_series": ["aCNIRSFPJR", "aCNBLTEUBR", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNRFFCAGR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in asset management company bonds on the CIBM, reported by NIFC.",
        "how_to_use": "AMC bond YTM versus CGB (aCNCNJHJGM) at equivalent tenor gives the quasi-sovereign credit spread. Historically near-zero given implicit government backing, but stress events (Huarong 2021 restructuring) can cause sharp spread widening. A rising spread is an early warning for sovereign contingent liability concerns. Compare volume (aCNCBSSDJA) and deal count (aCNBLTQIWP) for transaction frequency at each yield level.",
        "related_series": ["aCNBLTQIWP", "aCNCBSSDJA", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNRFFPFLR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in asset-backed notes (ABN) on the CIBM, reported by NIFC.",
        "how_to_use": "ABN YTM versus comparable senior bank bonds or policy bank bonds measures the structured credit spread. A persistently elevated ABN yield versus conventional bonds signals thin secondary liquidity and limited price discovery. Spread compression indicates maturing secondary market development. Compare with ABS YTM (aCNRFSBYOR) and volume (aCNCBSMXAA).",
        "related_series": ["aCNRFSBYOR", "aCNCBSMXAA", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNRFSBYOR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in asset-backed securities (ABS) on the CIBM, reported by NIFC.",
        "how_to_use": "ABS YTM versus senior bank bonds measures the structured credit premium. In China's CIBM, senior ABS tranches typically trade close to senior bank bond yields given bank originator implicit support. Rising spreads signal stress in underlying asset pools (consumer credit, SME loans, auto receivables). Compare with ABN YTM (aCNRFFPFLR) and deal count (aCNBLTYDNP).",
        "related_series": ["aCNRFFPFLR", "aCNCBSBKEA", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNRFFFIJR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in auto financial company bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Auto financial company bond YTM versus commercial bank bonds measures the non-bank financial institution credit spread. Rising spread signals perceived higher default risk for auto finance subsidiaries — often correlated with auto sector sales slowdowns or parent company financial stress. Compare with securities company bond yields for the broader NBFI credit spread landscape. Volume context: aCNCBSQPEA.",
        "related_series": ["aCNBLTBDWP", "aCNCBSQPEA", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNRFSPQOR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in negotiable certificates of deposit (NCDs) on the CIBM, reported by NIFC.",
        "how_to_use": "NCD YTM is a key interbank funding cost indicator for non-Big-Six banks. The NCD–DR007 spread is a widely-used measure of interbank liquidity tightness. Spikes signal stress in bank funding — particularly for joint-stock and city commercial banks reliant on NCD issuance. Compare with PBoC's 7-day OMO reverse repo rate trajectory. Volume: aCNCBTHWJA. Deal count: aCNBLTQMOP.",
        "related_series": ["aCNCBTHWJA", "aCNBLTQMOP", "aCNLPR1YRR", "aCNCNJHJGM"],
    },

    "aCNRFSBKHR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in commercial paper (CP) on the CIBM, reported by NIFC.",
        "how_to_use": "CP YTM versus T-bill rates gives the corporate money-market credit spread. Spread widening signals deteriorating corporate credit conditions or companies shifting to CP as bank lending tightens. Compare with SCP and MTN YTM (aCNRFSPJIR) for the full corporate funding curve. Rising CP yields relative to NCD yields (aCNRFSPQOR) signal non-financial corporate stress relative to bank stress. Volume: aCNCBSLPVA.",
        "related_series": ["aCNBLTIQFP", "aCNCBSLPVA", "aCNRFSPJIR", "aCNLPR1YRR"],
    },

    "aCNRFSIKGR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in corporate bonds (公司债) on the CIBM, reported by NIFC.",
        "how_to_use": "Corporate bond YTM versus policy financial bond yields gives the CIBM corporate credit spread. Compare with MTN YTM (aCNRFSPJIR) — corporate bonds and MTNs should trade at similar credit levels for the same issuer quality tier, but cross-market technical factors can cause temporary divergence. Rising spread signals corporate credit stress or risk-off sentiment. Volume: aCNCBSMDBA.",
        "related_series": ["aCNBLTNBHP", "aCNRFSPJIR", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNGCPXCUR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in discount-rate bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Discount bond YTM is the annualized return on Treasury bills and short-term discount instruments. Compare against DR007 repo rates: a discount bond YTM below DR007 signals strong safe-asset demand and potential collateral shortage. A YTM above DR007 indicates weak bond demand relative to repo. Key indicator for money market conditions in the interbank system. Volume: aCNCBOHAEA.",
        "related_series": ["aCNRFFNTZP", "aCNCBOHAEA", "aCNLPR1YRR", "aCNCNJHJGM"],
    },

    "aCNRFOYEKR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in fixed-rate bonds on the CIBM, reported by NIFC. Aggregated across all maturities for fixed-coupon instruments.",
        "how_to_use": "Fixed-rate bond YTM is the headline aggregate yield indicator for the CIBM. Changes reflect the combined effect of policy rate moves and duration-weighted market sentiment. Compare with floating-rate YTM (aCNRFOHNTR) to see the fixed-floating differential — a proxy for rate expectations. Compare trend with PBoC OMO 7-day reverse repo and MLF rate as policy anchors. Volume: aCNCBOATYA.",
        "related_series": ["aCNRFFNIXP", "aCNRFOHNTR", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNRFOHNTR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in floating-rate bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Floating-rate bond YTM reflects the current level of the reference rate (1Y LPR, SHIBOR, or benchmark deposit rate) plus spread. Compare with fixed-rate YTM (aCNRFOYEKR) — when floating YTM is close to fixed YTM, the market expects rates to stay flat. A lower floating YTM than fixed implies further rate cuts expected. Volume: aCNCBOQVJA. Deal count: aCNRFFASIP.",
        "related_series": ["aCNRFFASIP", "aCNRFOYEKR", "aCNLPR1YRR", "aCNCNJHJGM"],
    },

    "aCNRFFQAYR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in foreign sovereign government RMB bonds (sovereign Panda bonds) on the CIBM, reported by NIFC.",
        "how_to_use": "Sovereign Panda bond YTM versus comparable-tenor CGB (aCNCNJHJGM) gives the sovereign Panda spread. Historically near-zero for high-grade sovereign issuers (South Korea, EU member states) given the implicit safety of sovereign backing in domestic RMB. A non-trivial positive spread signals that CIBM investors price in sovereign credit differentiation. Narrowing spreads signal deeper Panda bond market integration and growing RMB internationalization.",
        "related_series": ["aCNBLTIRKP", "aCNCBSLXAA", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNRFFMTXR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in green notes on the CIBM, reported by NIFC.",
        "how_to_use": "Green note YTM versus conventional MTN/CP of equivalent tenor and credit quality gives the greenium. A negative spread (green notes yielding less) confirms ESG investor demand creating a pricing advantage for green issuers. A zero or positive spread indicates underdeveloped ESG investor base. PBoC's green finance incentive policies (collateral eligibility, relending facilities) tend to compress the greenium over time. Volume: aCNCBSQNXA.",
        "related_series": ["aCNBLTVGNP", "aCNCBSQNXA", "aCNRFSPJIR", "aCNLPR1YRR"],
    },

    "aCNRFFAQRR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in hybrid capital bonds on the CIBM, reported by NIFC.",
        "how_to_use": "Hybrid capital bond YTM versus senior bank bonds measures the AT1/hybrid subordination spread. This spread incorporates: (1) loss-absorption risk (write-down or conversion triggers), (2) coupon deferral optionality, (3) perpetual call-extension risk. Widening spread signals deteriorating bank capital confidence or regulatory capital rule changes (Basel III finalization, CBIRC capital rules). Compare with Tier-2 volume (aCNCBSPDBA) and perpetual volume (aCNCBSGKKA) for full capital stack spread hierarchy.",
        "related_series": ["aCNBLTPMIP", "aCNCBSUCMA", "aCNCBTLNWA", "aCNCNJHJGM"],
    },

    "aCNGCPZJMR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Interest-Rate Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for all cash bond transactions by interest-bearing mode on the CIBM, reported by NIFC. Aggregated across fixed, floating, discount, and zero-coupon instruments.",
        "how_to_use": "The interest-bearing-mode aggregate YTM tracks long-run trends in China's overall interbank bond market pricing level. Useful for cross-cycle comparisons of CIBM yield evolution. Compare with tenor-bucket YTMs for shape decomposition. Cross-reference with PBoC policy rate trajectory (OMO, MLF, LPR) to measure the transmission lag from policy decisions to market yields. Complements the deal count aggregate (aCNRFFTLAP) and volume aggregate (aCNCBOFFUA).",
        "related_series": ["aCNRFOYEKR", "aCNRFOHNTR", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNCBTVVTR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Institution Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions by joint-stock commercial banks on the CIBM, reported by NIFC. Reflects the average yield at which joint-stock banks execute secondary market bond transactions.",
        "how_to_use": "Compare joint-stock bank transaction YTM against large commercial bank YTM (aCNCBTZTYR) — joint-stock banks tend to trade at slightly higher YTMs reflecting their concentration in higher-yielding credit instruments (corporate bonds, NCDs) relative to state-owned banks' preference for CGBs. A converging spread may indicate large state-owned banks moving into higher-yield assets. Compare with volume (aCNCBTYNVA) for trading intensity context.",
        "related_series": ["aCNCBTZTYR", "aCNCBTYNVA", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNCBTZTYR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Institution Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions by large commercial banks (Big Six state-owned banks) on the CIBM, reported by NIFC.",
        "how_to_use": "Large commercial bank transaction YTM tends to be lower than joint-stock banks (aCNCBTVVTR), reflecting their concentration in CGBs and policy bank bonds. A rising large-bank YTM may signal that Big Six are shifting into higher-yield corporate or local government bonds — a risk appetite shift worth monitoring for credit market implications. Compare volume (aCNCBPRSEA) and deal count (aCNGCPJQFP) for scale of transactions at each yield level.",
        "related_series": ["aCNCBTVVTR", "aCNCBPRSEA", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNIRSOLDR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Tenor",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions with remaining maturity of less than or equal to 1 year on the CIBM, reported by NIFC.",
        "how_to_use": "Sub-1Y YTM is the bond market's money market rate. Compare against DR007 (PBoC's benchmark 7-day depository repo rate): when sub-1Y bond YTM exceeds DR007, bonds offer better risk-adjusted return than pure cash, driving demand. In liquidity crises, this relationship inverts. Key indicator for money market conditions and PBoC short-end policy transmission. Volume: aCNCBSNGDA. Deal count: aCNIRSPJXP.",
        "related_series": ["aCNIRSONDR", "aCNCBSNGDA", "aCNLPR1YRR", "aCNCNJHJGM"],
    },

    "aCNRFSPJIR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in medium-term notes (MTNs) on the CIBM, reported by NIFC.",
        "how_to_use": "MTN YTM is the primary benchmark for corporate credit pricing on the CIBM. The MTN–CDB spread (MTN YTM minus equivalent-tenor CDB bond yield) is China's most-cited corporate credit spread indicator. Spread widening signals corporate credit stress or rising default concerns. Compare AAA versus AA-rated MTN yields for credit tier differentiation. MTN YTM is used to price new LGFV bond issuance and as a direct input to DCF models for Chinese corporate valuations. Volume: aCNCBSSGEA.",
        "related_series": ["aCNBLTCQWP", "aCNCBSSGEA", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNBLTVYHR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Tenor",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions with remaining maturity of more than 30 years on the CIBM, reported by NIFC. Covers 50Y Treasury bonds and any instruments exceeding 30 years.",
        "how_to_use": "The >30Y YTM is China's most extreme long-end indicator. Falling below 2% signals structural deflationary demand from insurance and pension mandates. PBoC intervened aggressively in 2024 when ultra-long yields approached historic lows. Compare with 20–30y YTM (aCNBLTEFHR) for ultra-long curve slope. Low volumes (aCNCBSJVFA) mean YTM can be volatile — interpret against deal count (aCNIRSIEVP) for data reliability.",
        "related_series": ["aCNBLTEFHR", "aCNCBSJVFA", "aCNCNJHJGM", "aCNLPR1YRR"],
    },

    "aCNRFFIFPR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for cash bond transactions in other financial bonds on the CIBM, reported by NIFC. Residual category covering non-standard financial institution bonds.",
        "how_to_use": "Other financial bond YTM versus mainstream financial bonds (commercial bank, policy bank) measures the liquidity and credit premium for niche financial institution debt. A consistently elevated spread signals that CIBM participants require compensation for holding less-liquid or less-understood issuer bonds. Monitor for spread compression as new issuer categories gain mainstream institutional acceptance. Volume: aCNCBSCKVA.",
        "related_series": ["aCNBLTJUGP", "aCNCBSCKVA", "aCNCBTLNWA", "aCNLPR1YRR"],
    },

    "aCNRFFTYFR": {
        "subcategory": "Cash Bond Transactions — Yield to Maturity by Bond Type",
        "units": "Percent per annum (%)",
        "meaning": "Monthly average yield-to-maturity for the residual other bond types category in cash bond transactions on the CIBM, reported by NIFC.",
        "how_to_use": "Residual YTM for the other bond types category provides context on the yield level of instruments not yet formally categorized in NIFC reporting. Compare with mainstream bond-type YTMs (fixed: aCNRFOYEKR, MTN: aCNRFSPJIR) to assess whether the residual category trades at a premium or discount. A rising residual YTM may signal that newer, riskier instruments are entering this catch-all bucket as the CIBM instrument universe expands.",
        "related_series": ["aCNBLTEBSP", "aCNCBSVVRA", "aCNRFOYEKR", "aCNLPR1YRR"],
    },

}

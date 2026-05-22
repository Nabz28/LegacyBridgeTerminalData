// Validate every candidate macro/market indicator by test-fetching it through
// the series-proxy edge fn (FRED / DBnomics / Yahoo). Writes the survivors to
// macro-catalog-valid.json and prints an INVALID report so we prune dead IDs
// before wiring them into the macro-refresh catalog.
//
// Usage: node scripts/validate-macro-catalog.js

const fs = require("fs");
const path = require("path");
const PROXY = "https://adnubucjlezrtusbicja.supabase.co/functions/v1/series-proxy";
const ANON = "sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7";

// region | subcategory | label | unit | source | id | tv | transform | freq
const C = [
  // ---------- UNITED STATES (FRED) ----------
  ["us_fed_funds","United States","Monetary & Rates","Fed Funds Rate","%","FRED","DFF","","level","daily"],
  ["us_sofr","United States","Monetary & Rates","SOFR","%","FRED","SOFR","","level","daily"],
  ["us_3m","United States","Monetary & Rates","US 3M Treasury","%","FRED","DGS3MO","","level","daily"],
  ["us_2y","United States","Monetary & Rates","US 2Y Treasury","%","FRED","DGS2","","level","daily"],
  ["us_5y","United States","Monetary & Rates","US 5Y Treasury","%","FRED","DGS5","","level","daily"],
  ["us_10y","United States","Monetary & Rates","US 10Y Treasury","%","FRED","DGS10","TVC:US10Y","level","daily"],
  ["us_30y","United States","Monetary & Rates","US 30Y Treasury","%","FRED","DGS30","TVC:US30Y","level","daily"],
  ["us_2s10s","United States","Monetary & Rates","2s10s Spread","%","FRED","T10Y2Y","","level","daily"],
  ["us_3m10y","United States","Monetary & Rates","3M-10Y Spread","%","FRED","T10Y3M","","level","daily"],
  ["us_real_10y","United States","Monetary & Rates","10Y Real Yield (TIPS)","%","FRED","DFII10","","level","daily"],
  ["us_be_10y","United States","Monetary & Rates","10Y Breakeven","%","FRED","T10YIE","","level","daily"],
  ["us_be_5y","United States","Monetary & Rates","5Y Breakeven","%","FRED","T5YIE","","level","daily"],
  ["us_5y5y","United States","Inflation","5y5y Fwd Inflation","%","FRED","T5YIFR","","level","daily"],
  ["us_cpi","United States","Inflation","US CPI","%","FRED","CPIAUCSL","","yoy","monthly"],
  ["us_core_cpi","United States","Inflation","US Core CPI","%","FRED","CPILFESL","","yoy","monthly"],
  ["us_pce","United States","Inflation","US PCE","%","FRED","PCEPI","","yoy","monthly"],
  ["us_core_pce","United States","Inflation","US Core PCE","%","FRED","PCEPILFE","","yoy","monthly"],
  ["us_ppi","United States","Inflation","US PPI Final Demand","%","FRED","PPIFIS","","yoy","monthly"],
  ["us_real_gdp","United States","Growth & Activity","US Real GDP","$bn","FRED","GDPC1","","level","quarterly"],
  ["us_indpro","United States","Growth & Activity","Industrial Production","%","FRED","INDPRO","","yoy","monthly"],
  ["us_retail","United States","Growth & Activity","Retail Sales","%","FRED","RSAFS","","yoy","monthly"],
  ["us_durables","United States","Growth & Activity","Durable Goods Orders","%","FRED","DGORDER","","yoy","monthly"],
  ["us_caputil","United States","Growth & Activity","Capacity Utilization","%","FRED","TCU","","level","monthly"],
  ["us_unrate","United States","Labor","US Unemployment","%","FRED","UNRATE","","level","monthly"],
  ["us_u6","United States","Labor","U-6 Underemployment","%","FRED","U6RATE","","level","monthly"],
  ["us_payems","United States","Labor","Nonfarm Payrolls","k","FRED","PAYEMS","","level","monthly"],
  ["us_claims","United States","Labor","Initial Jobless Claims","k","FRED","ICSA","","level","weekly"],
  ["us_cont_claims","United States","Labor","Continued Claims","k","FRED","CCSA","","level","weekly"],
  ["us_jolts","United States","Labor","JOLTS Job Openings","k","FRED","JTSJOL","","level","monthly"],
  ["us_ahe","United States","Labor","Avg Hourly Earnings","%","FRED","CES0500000003","","yoy","monthly"],
  ["us_lfpr","United States","Labor","Participation Rate","%","FRED","CIVPART","","level","monthly"],
  ["us_housing_starts","United States","Housing","Housing Starts","k","FRED","HOUST","","level","monthly"],
  ["us_permits","United States","Housing","Building Permits","k","FRED","PERMIT","","level","monthly"],
  ["us_existing_sales","United States","Housing","Existing Home Sales","k","FRED","EXHOSLUSM495S","","level","monthly"],
  ["us_new_sales","United States","Housing","New Home Sales","k","FRED","HSN1F","","level","monthly"],
  ["us_case_shiller","United States","Housing","Case-Shiller 20-City","%","FRED","SPCS20RSA","","yoy","monthly"],
  ["us_mortgage_30y","United States","Housing","30Y Mortgage Rate","%","FRED","MORTGAGE30US","","level","weekly"],
  ["us_fed_debt","United States","Fiscal & Debt","Federal Public Debt","$bn","FRED","GFDEBTN","","level","quarterly"],
  ["us_deficit","United States","Fiscal & Debt","Federal Surplus/Deficit","$bn","FRED","MTSDS133FMS","","level","monthly"],
  ["us_debt_gdp","United States","Fiscal & Debt","Debt as % of GDP","%","FRED","GFDEGDQ188S","","level","quarterly"],
  ["us_m2","United States","Money & Credit","M2 Money Stock","%","FRED","M2SL","","yoy","monthly"],
  ["us_ci_loans","United States","Money & Credit","C&I Loans","%","FRED","BUSLOANS","","yoy","weekly"],
  ["us_consumer_credit","United States","Money & Credit","Consumer Credit","%","FRED","TOTALSL","","yoy","monthly"],
  ["us_nfci","United States","Money & Credit","Chicago Fed NFCI","idx","FRED","NFCI","","level","weekly"],
  ["us_trade_balance","United States","External & Trade","Trade Balance","$bn","FRED","BOPGSTB","","level","monthly"],
  ["us_current_account","United States","External & Trade","Current Account","$bn","FRED","IEABC","","level","quarterly"],
  ["us_usd_broad","United States","External & Trade","USD Broad Index","idx","FRED","DTWEXBGS","","level","daily"],
  ["us_umich","United States","Surveys & Sentiment","UMich Sentiment","idx","FRED","UMCSENT","","level","monthly"],
  ["us_umich_infexp","United States","Surveys & Sentiment","UMich 1Y Inflation Exp","%","FRED","MICH","","level","monthly"],
  ["us_philly_fed","United States","Surveys & Sentiment","Philly Fed Mfg","idx","FRED","GACDISA066MSFRBPHI","","level","monthly"],
  // ---------- GLOBAL / DM ----------
  ["ea_dep_rate","Global","Euro Area","ECB Deposit Rate","%","FRED","ECBDFR","","level","daily"],
  ["ea_mro","Global","Euro Area","ECB Main Refi Rate","%","FRED","ECBMRRFR","","level","daily"],
  ["ea_hicp","Global","Euro Area","Euro Area HICP","%","FRED","CP0000EZ19M086NEST","","yoy","monthly"],
  ["ea_core_hicp","Global","Euro Area","Euro Area Core HICP","%","FRED","00XFUNEZ19M086NEST","","yoy","monthly"],
  ["ea_unrate","Global","Euro Area","Euro Area Unemployment","%","FRED","LRHUTTTTEZM156S","","level","monthly"],
  ["ea_10y","Global","Euro Area","Euro Area 10Y Yield","%","FRED","IRLTLT01EZM156N","","level","monthly"],
  ["de_hicp","Global","Germany","Germany HICP","%","FRED","CP0000DEM086NEST","","yoy","monthly"],
  ["de_10y","Global","Germany","Germany 10Y Bund","%","FRED","IRLTLT01DEM156N","TVC:DE10Y","level","monthly"],
  ["jp_boj_rate","Global","Japan","BoJ Policy Rate","%","FRED","IRSTCB01JPM156N","","level","monthly"],
  ["jp_cpi","Global","Japan","Japan CPI","%","FRED","JPNCPIALLMINMEI","","yoy","monthly"],
  ["jp_gdp","Global","Japan","Japan Real GDP","$bn","FRED","JPNRGDPEXP","","yoy","quarterly"],
  ["jp_10y","Global","Japan","Japan 10Y JGB","%","FRED","IRLTLT01JPM156N","TVC:JP10Y","level","monthly"],
  ["uk_sonia","Global","United Kingdom","UK SONIA","%","FRED","IUDSOIA","","level","daily"],
  ["uk_cpi","Global","United Kingdom","UK CPI","%","FRED","GBRCPIALLMINMEI","","yoy","monthly"],
  ["uk_unrate","Global","United Kingdom","UK Unemployment","%","FRED","LRHUTTTTGBM156S","","level","monthly"],
  ["uk_10y","Global","United Kingdom","UK 10Y Gilt","%","FRED","IRLTLT01GBM156N","TVC:GB10Y","level","monthly"],
  ["g_oecd_cli_us","Global","Global Aggregates","OECD CLI · US","idx","DBnomics","OECD/DSD_STES@DF_CLI/USA.M.LI.IX._Z.AA.IX._Z.H","","level","monthly"],
  // ---------- INDONESIA ----------
  ["id_bi_rate","Indonesia","Monetary & Rates","BI Policy Rate","%","DBnomics","BIS/WS_CBPOL/M.ID","","level","monthly"],
  ["id_policy_imf","Indonesia","Monetary & Rates","Policy Rate (IMF)","%","DBnomics","IMF/IFS/M.ID.FPOLM_PA","","level","monthly"],
  ["id_interbank_3m","Indonesia","Monetary & Rates","3M Interbank (JIBOR proxy)","%","FRED","IR3TIB01IDM156N","","level","monthly"],
  ["id_lending_rate","Indonesia","Monetary & Rates","Bank Lending Rate","%","DBnomics","IMF/IFS/M.ID.FILR_PA","","level","monthly"],
  ["id_deposit_rate","Indonesia","Monetary & Rates","Bank Deposit Rate","%","DBnomics","IMF/IFS/M.ID.FIDR_PA","","level","monthly"],
  ["id_cpi_yoy","Indonesia","Inflation","Indonesia CPI (YoY)","%","FRED","CPALTT01IDM659N","","level","monthly"],
  ["id_cpi_index","Indonesia","Inflation","Indonesia CPI Index","%","FRED","IDNCPIALLMINMEI","","yoy","monthly"],
  ["id_gdp_real_q","Indonesia","Growth & Activity","Real GDP (SA)","%","DBnomics","IMF/IFS/Q.ID.NGDP_R_SA_XDC","","yoy","quarterly"],
  ["id_fiscal_balance","Indonesia","Fiscal & Government","Govt Balance (% GDP)","%","DBnomics","IMF/WEO:latest/IDN.GGXCNL_NGDP","","level","quarterly"],
  ["id_govt_debt","Indonesia","Fiscal & Government","Govt Debt (% GDP)","%","DBnomics","IMF/WEO:latest/IDN.GGXWDG_NGDP","","level","quarterly"],
  ["id_exports","Indonesia","External & Trade","Exports (FOB)","$mn","DBnomics","IMF/IFS/M.ID.TXG_FOB_USD","","level","monthly"],
  ["id_imports","Indonesia","External & Trade","Imports (CIF)","$mn","DBnomics","IMF/IFS/M.ID.TMG_CIF_USD","","level","monthly"],
  ["id_fx_reserves","Indonesia","External & Trade","FX Reserves","$mn","DBnomics","IMF/IFS/M.ID.RAFA_USD","","level","monthly"],
  ["id_current_account","Indonesia","External & Trade","Current Account (% GDP)","%","DBnomics","IMF/WEO:latest/IDN.BCA_NGDPD","","level","quarterly"],
  ["id_m2","Indonesia","Money & Credit","Broad Money M2","%","DBnomics","IMF/IFS/M.ID.FMB_XDC","","yoy","monthly"],
  ["id_bank_credit","Indonesia","Money & Credit","Bank Credit (claims)","%","DBnomics","IMF/IFS/M.ID.FDSBT_XDC","","yoy","monthly"],
  ["id_share_price","Indonesia","Markets","Indonesia Share Price Idx","idx","FRED","SPASTT01IDM661N","IDX:COMPOSITE","level","monthly"],
  ["id_usdidr_m","Indonesia","Markets","USD/IDR (monthly avg)","Rp","FRED","CCUSMA02IDM618N","FX_IDC:USDIDR","level","monthly"],
  // ---------- CHINA ----------
  ["cn_policy_rate","China","Monetary & Rates","PBoC Policy Rate","%","DBnomics","BIS/WS_CBPOL/M.CN","","level","monthly"],
  ["cn_discount_rate","China","Monetary & Rates","PBoC Discount Rate","%","FRED","INTDSRCNM193N","","level","monthly"],
  ["cn_interbank_3m","China","Monetary & Rates","3M Interbank (SHIBOR proxy)","%","FRED","IR3TIB01CNM156N","","level","monthly"],
  ["cn_lending_rate","China","Monetary & Rates","Benchmark Lending Rate","%","DBnomics","IMF/IFS/M.CN.FILR_PA","","level","monthly"],
  ["cn_deposit_rate","China","Monetary & Rates","Benchmark Deposit Rate","%","DBnomics","IMF/IFS/M.CN.FIDR_PA","","level","monthly"],
  ["cn_cpi_yoy","China","Inflation","China CPI (YoY)","%","FRED","CPALTT01CNM659N","","level","monthly"],
  ["cn_cpi_idx","China","Inflation","China CPI (NBS)","idx","DBnomics","NBS/M_A010101/A01010101","","level","monthly"],
  ["cn_ppi_idx","China","Inflation","China PPI (NBS)","idx","DBnomics","NBS/M_A010801/A01080101","","level","monthly"],
  ["cn_ip_yoy","China","Growth & Activity","Industrial Production (YoY)","%","DBnomics","NBS/M_A0201/A020101","","level","monthly"],
  ["cn_retail_yoy","China","Growth & Activity","Retail Sales (YoY)","%","DBnomics","NBS/M_A0701/A070103","","level","monthly"],
  ["cn_fai_ytd","China","Growth & Activity","Fixed Asset Investment (YTD)","%","DBnomics","NBS/M_A0402/A040205","","level","monthly"],
  ["cn_pmi_mfg","China","Growth & Activity","Mfg PMI (NBS)","idx","DBnomics","NBS/M_A0B01/A0B0101","","level","monthly"],
  ["cn_pmi_nonmfg","China","Growth & Activity","Non-Mfg PMI (NBS)","idx","DBnomics","NBS/M_A0B02/A0B0201","","level","monthly"],
  ["cn_property_inv","China","Property","Real Estate Investment (YTD)","%","DBnomics","NBS/M_A0601/A060102","","level","monthly"],
  ["cn_floor_sold","China","Property","Floor Space Sold (YTD)","idx","DBnomics","NBS/M_A0608/A060801","","level","monthly"],
  ["cn_exports_usd","China","External & Trade","Exports (USD)","$bn","FRED","XTEXVA01CNM664S","","level","monthly"],
  ["cn_imports_usd","China","External & Trade","Imports (USD)","$bn","FRED","XTIMVA01CNM664S","","level","monthly"],
  ["cn_trade_balance","China","External & Trade","Net Trade (OECD)","$bn","FRED","XTNTVA01CNM664S","","level","monthly"],
  ["cn_fx_reserves","China","External & Trade","FX Reserves (ex gold)","$bn","FRED","TRESEGCNM052N","","level","monthly"],
  ["cn_m2_yoy","China","Money & Credit","M2 (YoY)","%","DBnomics","NBS/M_A0D01/A0D0102","","level","monthly"],
  ["cn_m1_yoy","China","Money & Credit","M1 (YoY)","%","DBnomics","NBS/M_A0D01/A0D0104","","level","monthly"],
  ["cn_reer","China","Markets","China REER (BIS)","idx","FRED","RBCNBIS","","level","monthly"],
  ["cn_share_price","China","Markets","China Share Price Idx","idx","FRED","SPASTT01CNM661N","TVC:SSEC","level","monthly"],
  // ---------- COMMODITIES (Yahoo) ----------
  ["wti","Commodities","Energy","WTI Crude","$","YAHOO","CL=F","NYMEX:CL1!","level","daily"],
  ["brent","Commodities","Energy","Brent Crude","$","YAHOO","BZ=F","TVC:UKOIL","level","daily"],
  ["natgas","Commodities","Energy","Natural Gas","$","YAHOO","NG=F","NYMEX:NG1!","level","daily"],
  ["gasoline","Commodities","Energy","RBOB Gasoline","$","YAHOO","RB=F","NYMEX:RB1!","level","daily"],
  ["heating_oil","Commodities","Energy","Heating Oil","$","YAHOO","HO=F","NYMEX:HO1!","level","daily"],
  ["gold","Commodities","Precious Metals","Gold","$","YAHOO","GC=F","TVC:GOLD","level","daily"],
  ["silver","Commodities","Precious Metals","Silver","$","YAHOO","SI=F","TVC:SILVER","level","daily"],
  ["platinum","Commodities","Precious Metals","Platinum","$","YAHOO","PL=F","TVC:PLATINUM","level","daily"],
  ["palladium","Commodities","Precious Metals","Palladium","$","YAHOO","PA=F","TVC:PALLADIUM","level","daily"],
  ["copper","Commodities","Base & Ferrous Metals","Copper","$","YAHOO","HG=F","CAPITALCOM:COPPER","level","daily"],
  ["aluminum","Commodities","Base & Ferrous Metals","Aluminum","$","YAHOO","ALI=F","","level","daily"],
  ["iron_ore","Commodities","Base & Ferrous Metals","Iron Ore 62% CFR","$","YAHOO","TIO=F","","level","daily"],
  ["steel_hrc","Commodities","Base & Ferrous Metals","US HRC Steel","$","YAHOO","HRC=F","","level","daily"],
  ["lithium_etf","Commodities","Battery & Critical","Lithium/Battery (LIT ETF)","$","YAHOO","LIT","AMEX:LIT","level","daily"],
  ["corn","Commodities","Agriculture","Corn","$","YAHOO","ZC=F","CAPITALCOM:CORN","level","daily"],
  ["wheat","Commodities","Agriculture","Wheat","$","YAHOO","ZW=F","CAPITALCOM:WHEAT","level","daily"],
  ["soybeans","Commodities","Agriculture","Soybeans","$","YAHOO","ZS=F","CAPITALCOM:SOYBEANS","level","daily"],
  ["soybean_oil","Commodities","Agriculture","Soybean Oil","$","YAHOO","ZL=F","","level","daily"],
  ["soybean_meal","Commodities","Agriculture","Soybean Meal","$","YAHOO","ZM=F","","level","daily"],
  ["rough_rice","Commodities","Agriculture","Rough Rice","$","YAHOO","ZR=F","","level","daily"],
  ["oats","Commodities","Agriculture","Oats","$","YAHOO","ZO=F","","level","daily"],
  ["coffee","Commodities","Softs","Coffee (Arabica)","$","YAHOO","KC=F","CAPITALCOM:COFFEE","level","daily"],
  ["sugar","Commodities","Softs","Sugar No.11","$","YAHOO","SB=F","CAPITALCOM:SUGAR","level","daily"],
  ["cocoa","Commodities","Softs","Cocoa","$","YAHOO","CC=F","CAPITALCOM:COCOA","level","daily"],
  ["cotton","Commodities","Softs","Cotton No.2","$","YAHOO","CT=F","CAPITALCOM:COTTON","level","daily"],
  ["orange_juice","Commodities","Softs","Orange Juice","$","YAHOO","OJ=F","","level","daily"],
  ["live_cattle","Commodities","Livestock","Live Cattle","$","YAHOO","LE=F","","level","daily"],
  ["lean_hogs","Commodities","Livestock","Lean Hogs","$","YAHOO","HE=F","","level","daily"],
  ["feeder_cattle","Commodities","Livestock","Feeder Cattle","$","YAHOO","GF=F","","level","daily"],
  ["sp_gsci","Commodities","Commodity Indices","S&P GSCI","$","YAHOO","^SPGSCI","","level","daily"],
  ["bcom","Commodities","Commodity Indices","Bloomberg Commodity Idx","$","YAHOO","^BCOM","","level","daily"],
  // ---------- FX (Yahoo) ----------
  ["eurusd","FX","USD Majors","EUR/USD","","YAHOO","EURUSD=X","FX:EURUSD","level","daily"],
  ["usdjpy","FX","USD Majors","USD/JPY","","YAHOO","JPY=X","FX:USDJPY","level","daily"],
  ["gbpusd","FX","USD Majors","GBP/USD","","YAHOO","GBPUSD=X","FX:GBPUSD","level","daily"],
  ["audusd","FX","USD Majors","AUD/USD","","YAHOO","AUDUSD=X","FX:AUDUSD","level","daily"],
  ["usdcad","FX","USD Majors","USD/CAD","","YAHOO","CAD=X","FX:USDCAD","level","daily"],
  ["usdchf","FX","USD Majors","USD/CHF","","YAHOO","USDCHF=X","FX:USDCHF","level","daily"],
  ["dxy","FX","Dollar Index","US Dollar Index","","YAHOO","DX-Y.NYB","TVC:DXY","level","daily"],
  ["usdcny","FX","Asia FX","USD/CNY","","YAHOO","CNY=X","FX_IDC:USDCNY","level","daily"],
  ["usdidr","FX","Asia FX","USD/IDR","","YAHOO","IDR=X","FX_IDC:USDIDR","level","daily"],
  ["usdinr","FX","Asia FX","USD/INR","","YAHOO","INR=X","FX_IDC:USDINR","level","daily"],
  ["usdkrw","FX","Asia FX","USD/KRW","","YAHOO","KRW=X","FX_IDC:USDKRW","level","daily"],
  ["usdsgd","FX","Asia FX","USD/SGD","","YAHOO","SGD=X","FX:USDSGD","level","daily"],
  ["usdmyr","FX","Asia FX","USD/MYR","","YAHOO","MYR=X","FX_IDC:USDMYR","level","daily"],
  ["usdthb","FX","Asia FX","USD/THB","","YAHOO","THB=X","FX_IDC:USDTHB","level","daily"],
  ["usdbrl","FX","EM FX","USD/BRL","","YAHOO","BRL=X","FX_IDC:USDBRL","level","daily"],
  ["usdmxn","FX","EM FX","USD/MXN","","YAHOO","MXN=X","FX:USDMXN","level","daily"],
  ["usdzar","FX","EM FX","USD/ZAR","","YAHOO","ZAR=X","FX:USDZAR","level","daily"],
  // ---------- EQUITY INDICES (Yahoo) ----------
  ["spx","Equity Indices","US","S&P 500","","YAHOO","^GSPC","FOREXCOM:SPXUSD","level","daily"],
  ["ndx","Equity Indices","US","Nasdaq 100","","YAHOO","^NDX","FOREXCOM:NSXUSD","level","daily"],
  ["dji","Equity Indices","US","Dow Jones","","YAHOO","^DJI","FOREXCOM:DJI","level","daily"],
  ["rut","Equity Indices","US","Russell 2000","","YAHOO","^RUT","TVC:RUT","level","daily"],
  ["dax","Equity Indices","Developed","DAX","","YAHOO","^GDAXI","XETR:DAX","level","daily"],
  ["ftse","Equity Indices","Developed","FTSE 100","","YAHOO","^FTSE","TVC:UKX","level","daily"],
  ["cac","Equity Indices","Developed","CAC 40","","YAHOO","^FCHI","","level","daily"],
  ["nikkei","Equity Indices","Developed","Nikkei 225","","YAHOO","^N225","INDEX:NKY","level","daily"],
  ["kospi","Equity Indices","Developed","KOSPI","","YAHOO","^KS11","KRX:KOSPI","level","daily"],
  ["asx","Equity Indices","Developed","ASX 200","","YAHOO","^AXJO","","level","daily"],
  ["estoxx50","Equity Indices","Developed","Euro Stoxx 50","","YAHOO","^STOXX50E","","level","daily"],
  ["shcomp","Equity Indices","China & HK","Shanghai Composite","","YAHOO","000001.SS","TVC:SSEC","level","daily"],
  ["csi300","Equity Indices","China & HK","CSI 300","","YAHOO","000300.SS","","level","daily"],
  ["hsi","Equity Indices","China & HK","Hang Seng","","YAHOO","^HSI","TVC:HSI","level","daily"],
  ["jci","Equity Indices","ASEAN & India","Jakarta Composite","","YAHOO","^JKSE","IDX:COMPOSITE","level","daily"],
  ["psei","Equity Indices","ASEAN & India","PSEi (Philippines)","","YAHOO","PSEI.PS","","level","daily"],
  ["klci","Equity Indices","ASEAN & India","FTSE Bursa KLCI","","YAHOO","^KLSE","","level","daily"],
  ["nifty","Equity Indices","ASEAN & India","Nifty 50","","YAHOO","^NSEI","","level","daily"],
  ["sensex","Equity Indices","ASEAN & India","BSE Sensex","","YAHOO","^BSESN","","level","daily"],
  ["vix","Equity Indices","Volatility","VIX","","YAHOO","^VIX","TVC:VIX","level","daily"],
  // ---------- RATES (Yahoo market yields) ----------
  ["ust_3m_y","Rates","US Curve","US 13W T-Bill Yield","","YAHOO","^IRX","TVC:US03MY","level","daily"],
  ["ust_5y_y","Rates","US Curve","US 5Y Yield","","YAHOO","^FVX","TVC:US05Y","level","daily"],
  ["ust_10y_y","Rates","US Curve","US 10Y Yield","","YAHOO","^TNX","TVC:US10Y","level","daily"],
  ["ust_30y_y","Rates","US Curve","US 30Y Yield","","YAHOO","^TYX","TVC:US30Y","level","daily"],
  // ---------- CRYPTO (Yahoo) ----------
  ["btc","Crypto","Major","Bitcoin","$","YAHOO","BTC-USD","BINANCE:BTCUSDT","level","daily"],
  ["eth","Crypto","Major","Ethereum","$","YAHOO","ETH-USD","BINANCE:ETHUSDT","level","daily"],
  ["sol","Crypto","Major","Solana","$","YAHOO","SOL-USD","BINANCE:SOLUSDT","level","daily"],
  ["bnb","Crypto","Major","BNB","$","YAHOO","BNB-USD","BINANCE:BNBUSDT","level","daily"],
  ["xrp","Crypto","Major","XRP","$","YAHOO","XRP-USD","BINANCE:XRPUSDT","level","daily"],
  ["ada","Crypto","Major","Cardano","$","YAHOO","ADA-USD","BINANCE:ADAUSDT","level","daily"],
  ["doge","Crypto","Major","Dogecoin","$","YAHOO","DOGE-USD","BINANCE:DOGEUSDT","level","daily"],
  ["avax","Crypto","Major","Avalanche","$","YAHOO","AVAX-USD","BINANCE:AVAXUSDT","level","daily"],
];

const cand = C.map((r) => ({ key: r[0], region: r[1], subcategory: r[2], label: r[3], unit: r[4], source: r[5], id: r[6], tv: r[7], transform: r[8], freq: r[9] }));

async function test(c) {
  const yqs = c.source === "YAHOO" ? "&range=5y&interval=1d" : "";
  try {
    const r = await fetch(`${PROXY}?source=${encodeURIComponent(c.source)}&id=${encodeURIComponent(c.id)}${yqs}`, { headers: { apikey: ANON, Authorization: "Bearer " + ANON } });
    const j = await r.json().catch(() => ({}));
    const obs = Array.isArray(j.obs) ? j.obs : [];
    return { ok: r.ok && obs.length > 0, count: obs.length, last: obs.length ? obs[obs.length - 1].value : null };
  } catch (e) { return { ok: false, count: 0, err: String(e) }; }
}

(async () => {
  const valid = [], invalid = [];
  for (const c of cand) {
    const t = await test(c);
    if (t.ok) { valid.push({ ...c, _count: t.count, _last: t.last }); }
    else { invalid.push({ key: c.key, source: c.source, id: c.id, count: t.count, err: t.err }); }
    process.stdout.write(t.ok ? "." : "X");
    await new Promise((r) => setTimeout(r, 140));
  }
  console.log(`\n\nVALID ${valid.length} / ${cand.length}  ·  INVALID ${invalid.length}`);
  console.log("INVALID:", invalid.map((i) => `${i.key}(${i.source}:${i.id})`).join("  "));
  fs.writeFileSync(path.join(__dirname, "macro-catalog-valid.json"), JSON.stringify(valid, null, 1));
  console.log("\nwrote macro-catalog-valid.json");
})();

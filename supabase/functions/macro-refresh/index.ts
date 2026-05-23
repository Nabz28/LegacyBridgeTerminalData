// macro-refresh — daily live macro + cross-asset dashboard refresh.
//
// Pulls a curated catalog (~245 indicators) from FRED, DBnomics, and Yahoo
// Finance, computes display value / prior / change / sparkline, and upserts
// into macro.live_indicators (then prunes keys no longer in the catalog).
// Invoked daily by pg_cron (migration 0009) and callable on demand.
// Catalog curated + validated 2026-05-22. Commodity complex expanded
// 2026-05-23 (palm oil/CPO, coal, LNG, base metals, fertilizers/pupuk,
// grains, softs, agri raw materials, meat/seafood, IMF indices via FRED
// IMF + World Bank pink-sheet). Secrets: FRED_API_KEY.

const FRED_KEY = Deno.env.get("FRED_API_KEY") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Transform = "level" | "yoy";
type Source = "FRED" | "DBnomics" | "YAHOO";
interface Ind {
  key: string; region: string; category: string; label: string;
  unit: string; source: Source; series_id: string; tv_symbol: string;
  transform: Transform; freq: string; sort: number;
}

// [key, region, subcategory, label, unit, source, id, tv_symbol, transform, freq]
const RAW: string[][] = [
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
  ["cn_policy_rate","China","Monetary & Rates","PBoC Policy Rate","%","DBnomics","BIS/WS_CBPOL/M.CN","","level","monthly"],
  ["cn_discount_rate","China","Monetary & Rates","PBoC Discount Rate","%","FRED","INTDSRCNM193N","","level","monthly"],
  ["cn_interbank_3m","China","Monetary & Rates","3M Interbank (SHIBOR proxy)","%","FRED","IR3TIB01CNM156N","","level","monthly"],
  ["cn_lending_rate","China","Monetary & Rates","Benchmark Lending Rate","%","DBnomics","IMF/IFS/M.CN.FILR_PA","","level","monthly"],
  ["cn_deposit_rate","China","Monetary & Rates","Benchmark Deposit Rate","%","DBnomics","IMF/IFS/M.CN.FIDR_PA","","level","monthly"],
  ["cn_cpi_yoy","China","Inflation","China CPI (YoY)","%","FRED","CPALTT01CNM659N","","level","monthly"],
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
  // --- Energy (Yahoo futures = live daily; FRED IMF/WB = monthly global benchmarks) ---
  ["wti","Commodities","Energy","WTI Crude","$","YAHOO","CL=F","NYMEX:CL1!","level","daily"],
  ["brent","Commodities","Energy","Brent Crude","$","YAHOO","BZ=F","TVC:UKOIL","level","daily"],
  ["natgas","Commodities","Energy","Natural Gas (Henry Hub)","$","YAHOO","NG=F","NYMEX:NG1!","level","daily"],
  ["gasoline","Commodities","Energy","RBOB Gasoline","$","YAHOO","RB=F","NYMEX:RB1!","level","daily"],
  ["heating_oil","Commodities","Energy","Heating Oil","$","YAHOO","HO=F","NYMEX:HO1!","level","daily"],
  ["wb_coal_au","Commodities","Energy","Coal · Australia (Newcastle)","$/mt","FRED","PCOALAUUSDM","","level","monthly"],
  ["wb_lng_jp","Commodities","Energy","LNG · Japan import","$/mmbtu","FRED","PNGASJPUSDM","","level","monthly"],
  ["wb_natgas_eu","Commodities","Energy","Natural Gas · Europe (TTF)","$/mmbtu","FRED","PNGASEUUSDM","","level","monthly"],
  // --- Precious Metals ---
  ["gold","Commodities","Precious Metals","Gold","$","YAHOO","GC=F","TVC:GOLD","level","daily"],
  ["silver","Commodities","Precious Metals","Silver","$","YAHOO","SI=F","TVC:SILVER","level","daily"],
  ["platinum","Commodities","Precious Metals","Platinum","$","YAHOO","PL=F","TVC:PLATINUM","level","daily"],
  ["palladium","Commodities","Precious Metals","Palladium","$","YAHOO","PA=F","TVC:PALLADIUM","level","daily"],
  // --- Industrial Metals (Indonesia: nickel & tin are major export earners) ---
  ["copper","Commodities","Industrial Metals","Copper","$","YAHOO","HG=F","CAPITALCOM:COPPER","level","daily"],
  ["aluminum","Commodities","Industrial Metals","Aluminum","$","YAHOO","ALI=F","","level","daily"],
  ["iron_ore","Commodities","Industrial Metals","Iron Ore 62% CFR","$","YAHOO","TIO=F","","level","daily"],
  ["steel_hrc","Commodities","Industrial Metals","US HRC Steel","$","YAHOO","HRC=F","","level","daily"],
  ["wb_nickel","Commodities","Industrial Metals","Nickel · LME","$/mt","FRED","PNICKUSDM","","level","monthly"],
  ["wb_tin","Commodities","Industrial Metals","Tin · LME","$/mt","FRED","PTINUSDM","","level","monthly"],
  ["wb_zinc","Commodities","Industrial Metals","Zinc · LME","$/mt","FRED","PZINCUSDM","","level","monthly"],
  ["wb_lead","Commodities","Industrial Metals","Lead · LME","$/mt","FRED","PLEADUSDM","","level","monthly"],
  ["wb_uranium","Commodities","Industrial Metals","Uranium","$/lb","FRED","PURANUSDM","","level","monthly"],
  // --- Battery & Critical ---
  ["lithium_etf","Commodities","Battery & Critical","Lithium/Battery (LIT ETF)","$","YAHOO","LIT","AMEX:LIT","level","daily"],
  // --- Palm Oil & Vegetable Oils (Indonesia: world's #1 CPO producer) ---
  ["wb_palm_oil","Commodities","Palm Oil & Veg Oils","Palm Oil (CPO)","$/mt","FRED","PPOILUSDM","","level","monthly"],
  ["soybeans","Commodities","Palm Oil & Veg Oils","Soybeans","$","YAHOO","ZS=F","CAPITALCOM:SOYBEANS","level","daily"],
  ["soybean_oil","Commodities","Palm Oil & Veg Oils","Soybean Oil","$","YAHOO","ZL=F","","level","daily"],
  ["soybean_meal","Commodities","Palm Oil & Veg Oils","Soybean Meal","$","YAHOO","ZM=F","","level","daily"],
  ["wb_sunflower_oil","Commodities","Palm Oil & Veg Oils","Sunflower Oil","$/mt","FRED","PSUNOUSDM","","level","monthly"],
  ["wb_rapeseed_oil","Commodities","Palm Oil & Veg Oils","Rapeseed Oil","$/mt","FRED","PROILUSDM","","level","monthly"],
  ["wb_groundnut_oil","Commodities","Palm Oil & Veg Oils","Groundnut Oil","$/mt","FRED","PGNUTSUSDM","","level","monthly"],
  // --- Grains & Staple Food ---
  ["corn","Commodities","Grains & Food","Corn (CBOT)","$","YAHOO","ZC=F","CAPITALCOM:CORN","level","daily"],
  ["wheat","Commodities","Grains & Food","Wheat (CBOT)","$","YAHOO","ZW=F","CAPITALCOM:WHEAT","level","daily"],
  ["rough_rice","Commodities","Grains & Food","Rough Rice (CBOT)","$","YAHOO","ZR=F","","level","daily"],
  ["oats","Commodities","Grains & Food","Oats","$","YAHOO","ZO=F","","level","daily"],
  ["wb_rice","Commodities","Grains & Food","Rice · Thai 5%","$/mt","FRED","PRICENPQUSDM","","level","monthly"],
  ["wb_maize","Commodities","Grains & Food","Maize · World","$/mt","FRED","PMAIZMTUSDM","","level","monthly"],
  ["wb_wheat","Commodities","Grains & Food","Wheat · World (HRW)","$/mt","FRED","PWHEAMTUSDM","","level","monthly"],
  ["wb_barley","Commodities","Grains & Food","Barley","$/mt","FRED","PBARLUSDM","","level","monthly"],
  // --- Softs & Beverages (Indonesia: top robusta coffee producer) ---
  ["coffee","Commodities","Softs & Beverages","Coffee (Arabica)","$","YAHOO","KC=F","CAPITALCOM:COFFEE","level","daily"],
  ["sugar","Commodities","Softs & Beverages","Sugar No.11","$","YAHOO","SB=F","CAPITALCOM:SUGAR","level","daily"],
  ["cocoa","Commodities","Softs & Beverages","Cocoa","$","YAHOO","CC=F","CAPITALCOM:COCOA","level","daily"],
  ["orange_juice","Commodities","Softs & Beverages","Orange Juice","$","YAHOO","OJ=F","","level","daily"],
  ["wb_coffee_robusta","Commodities","Softs & Beverages","Coffee · Robusta","$/kg","FRED","PCOFFROBUSDM","","level","monthly"],
  ["wb_tea","Commodities","Softs & Beverages","Tea · avg auctions","$/kg","FRED","PTEAUSDM","","level","monthly"],
  ["wb_sugar_world","Commodities","Softs & Beverages","Sugar · World (ISA)","¢/lb","FRED","PSUGAISAUSDM","","level","monthly"],
  ["wb_bananas","Commodities","Softs & Beverages","Bananas","$/mt","FRED","PBANSOPUSDM","","level","monthly"],
  ["wb_oranges","Commodities","Softs & Beverages","Oranges","$/kg","FRED","PORANGUSDM","","level","monthly"],
  // --- Agricultural Raw Materials (Indonesia: #2 natural rubber producer) ---
  ["cotton","Commodities","Agri Raw Materials","Cotton No.2","$","YAHOO","CT=F","CAPITALCOM:COTTON","level","daily"],
  ["wb_rubber","Commodities","Agri Raw Materials","Rubber · SGP/MYS","$/kg","FRED","PRUBBUSDM","","level","monthly"],
  ["wb_cotton","Commodities","Agri Raw Materials","Cotton · A Index","¢/lb","FRED","PCOTTINDUSDM","","level","monthly"],
  ["wb_wool_coarse","Commodities","Agri Raw Materials","Wool · coarse","¢/kg","FRED","PWOOLCUSDM","","level","monthly"],
  ["wb_logs","Commodities","Agri Raw Materials","Hardwood Logs","$/m3","FRED","PLOGSKUSDM","","level","monthly"],
  ["wb_sawnwood","Commodities","Agri Raw Materials","Sawnwood · Malaysia","$/m3","FRED","PSAWMALUSDM","","level","monthly"],
  // --- Fertilizers / Pupuk (World Bank pink-sheet annual benchmarks) ---
  ["wb_urea","Commodities","Fertilizers","Urea (E. Europe bulk)","$/mt","DBnomics","WB/commodity_prices/FUREA_EE_BULK-1W","","level","annual"],
  ["wb_dap","Commodities","Fertilizers","DAP · Diammonium Phosphate","$/mt","DBnomics","WB/commodity_prices/FDAP-1W","","level","annual"],
  ["wb_potash","Commodities","Fertilizers","Potassium Chloride (Potash)","$/mt","DBnomics","WB/commodity_prices/FPOTASH-1W","","level","annual"],
  ["wb_phosrock","Commodities","Fertilizers","Phosphate Rock","$/mt","DBnomics","WB/commodity_prices/FPHOSROCK-1W","","level","annual"],
  ["wb_tsp","Commodities","Fertilizers","Triple Superphosphate (TSP)","$/mt","DBnomics","WB/commodity_prices/FTSP-1W","","level","annual"],
  ["wb_fert_idx","Commodities","Fertilizers","Fertilizers Index (2010=100)","idx","DBnomics","WB/commodity_prices/FIFERTILIZERS-1W","","level","annual"],
  // --- Meat & Seafood (Indonesia: major shrimp exporter) ---
  ["live_cattle","Commodities","Meat & Seafood","Live Cattle","$","YAHOO","LE=F","","level","daily"],
  ["lean_hogs","Commodities","Meat & Seafood","Lean Hogs","$","YAHOO","HE=F","","level","daily"],
  ["feeder_cattle","Commodities","Meat & Seafood","Feeder Cattle","$","YAHOO","GF=F","","level","daily"],
  ["wb_beef","Commodities","Meat & Seafood","Beef","¢/lb","FRED","PBEEFUSDM","","level","monthly"],
  ["wb_poultry","Commodities","Meat & Seafood","Poultry (chicken)","¢/lb","FRED","PPOULTUSDM","","level","monthly"],
  ["wb_shrimp","Commodities","Meat & Seafood","Shrimp","$/kg","FRED","PSHRIUSDM","","level","monthly"],
  ["wb_salmon","Commodities","Meat & Seafood","Salmon","$/kg","FRED","PSALMUSDM","","level","monthly"],
  ["wb_lamb","Commodities","Meat & Seafood","Lamb","¢/lb","FRED","PLAMBUSDM","","level","monthly"],
  // --- Commodity Indices ---
  ["sp_gsci","Commodities","Commodity Indices","S&P GSCI","$","YAHOO","^SPGSCI","","level","daily"],
  ["bcom","Commodities","Commodity Indices","Bloomberg Commodity Idx","$","YAHOO","^BCOM","","level","daily"],
  ["wb_idx_all","Commodities","Commodity Indices","IMF All Commodities","idx","FRED","PALLFNFINDEXM","","level","monthly"],
  ["wb_idx_energy","Commodities","Commodity Indices","IMF Energy","idx","FRED","PNRGINDEXM","","level","monthly"],
  ["wb_idx_food","Commodities","Commodity Indices","IMF Food","idx","FRED","PFOODINDEXM","","level","monthly"],
  ["wb_idx_metals","Commodities","Commodity Indices","IMF Metals","idx","FRED","PMETAINDEXM","","level","monthly"],
  ["wb_idx_industrial","Commodities","Commodity Indices","IMF Industrial Inputs","idx","FRED","PINDUINDEXM","","level","monthly"],
  ["wb_idx_agri_raw","Commodities","Commodity Indices","IMF Agri Raw Materials","idx","FRED","PRAWMINDEXM","","level","monthly"],
  ["wb_idx_beverages","Commodities","Commodity Indices","IMF Beverages","idx","FRED","PBEVEINDEXM","","level","monthly"],
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
  ["ust_3m_y","Rates","US Curve","US 13W T-Bill Yield","","YAHOO","^IRX","TVC:US03MY","level","daily"],
  ["ust_5y_y","Rates","US Curve","US 5Y Yield","","YAHOO","^FVX","TVC:US05Y","level","daily"],
  ["ust_10y_y","Rates","US Curve","US 10Y Yield","","YAHOO","^TNX","TVC:US10Y","level","daily"],
  ["ust_30y_y","Rates","US Curve","US 30Y Yield","","YAHOO","^TYX","TVC:US30Y","level","daily"],
  ["btc","Crypto","Major","Bitcoin","$","YAHOO","BTC-USD","BINANCE:BTCUSDT","level","daily"],
  ["eth","Crypto","Major","Ethereum","$","YAHOO","ETH-USD","BINANCE:ETHUSDT","level","daily"],
  ["sol","Crypto","Major","Solana","$","YAHOO","SOL-USD","BINANCE:SOLUSDT","level","daily"],
  ["bnb","Crypto","Major","BNB","$","YAHOO","BNB-USD","BINANCE:BNBUSDT","level","daily"],
  ["xrp","Crypto","Major","XRP","$","YAHOO","XRP-USD","BINANCE:XRPUSDT","level","daily"],
  ["ada","Crypto","Major","Cardano","$","YAHOO","ADA-USD","BINANCE:ADAUSDT","level","daily"],
  ["doge","Crypto","Major","Dogecoin","$","YAHOO","DOGE-USD","BINANCE:DOGEUSDT","level","daily"],
  ["avax","Crypto","Major","Avalanche","$","YAHOO","AVAX-USD","BINANCE:AVAXUSDT","level","daily"],
];

const CATALOG: Ind[] = RAW.map((r, i) => ({
  key: r[0], region: r[1], category: r[2], label: r[3], unit: r[4],
  source: r[5] as Source, series_id: r[6], tv_symbol: r[7],
  transform: r[8] as Transform, freq: r[9], sort: i,
}));

interface Obs { date: string; value: number } // newest first

function normPeriod(p: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  if (/^\d{4}-\d{2}$/.test(p)) return `${p}-01`;
  const q = p.match(/^(\d{4})-Q([1-4])$/);
  if (q) return `${q[1]}-${String((Number(q[2]) - 1) * 3 + 1).padStart(2, "0")}-01`;
  if (/^\d{4}$/.test(p)) return `${p}-01-01`;
  return p;
}

async function fredObs(seriesId: string): Promise<Obs[]> {
  const u = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}` +
    `&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=600`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`FRED ${seriesId} HTTP ${r.status}`);
  const j = await r.json();
  return (j.observations ?? [])
    .filter((o: { value: string }) => o.value !== "." && o.value !== "")
    .map((o: { date: string; value: string }) => ({ date: o.date, value: Number(o.value) }));
}

async function dbnomicsObs(seriesPath: string): Promise<Obs[]> {
  const u = `https://api.db.nomics.world/v22/series/${seriesPath}?observations=1&limit=1`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`DBnomics ${seriesPath} HTTP ${r.status}`);
  const j = await r.json();
  const doc = j?.series?.docs?.[0];
  if (!doc) throw new Error(`DBnomics ${seriesPath} no-docs`);
  const periods: string[] = doc.period ?? [];
  const values: (number | null)[] = doc.value ?? [];
  const out: Obs[] = [];
  for (let i = periods.length - 1; i >= 0; i--) {            // chronological -> newest first
    const v = values[i];
    if (v === null || v === undefined || Number.isNaN(Number(v))) continue;
    out.push({ date: normPeriod(periods[i]), value: Number(v) });
  }
  return out;
}

async function yahooObs(ticker: string): Promise<Obs[]> {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2y`;
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LBC-macro/1.0)" } });
  if (!r.ok) throw new Error(`Yahoo ${ticker} HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const ts: number[] = res?.timestamp ?? [];
  const close: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? [];
  const out: Obs[] = [];
  for (let i = ts.length - 1; i >= 0; i--) {                 // newest first
    const v = close[i];
    if (v === null || v === undefined || Number.isNaN(Number(v))) continue;
    out.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), value: Number(v) });
  }
  return out;
}

const sparkLen = (freq: string) => (freq === "daily" ? 60 : freq === "weekly" ? 40 : freq === "quarterly" ? 16 : 24);

function buildRow(ind: Ind, obs: Obs[]) {
  const now = new Date().toISOString();
  const base = {
    key: ind.key, region: ind.region, category: ind.category, label: ind.label,
    unit: ind.unit, source: ind.source, series_id: ind.series_id, tv_symbol: ind.tv_symbol || null,
    transform: ind.transform, freq: ind.freq, sort_order: ind.sort, updated_at: now,
  };
  if (!obs.length) return { ...base, latest_date: null, latest_value: null, prev_value: null, change_abs: null, change_pct: null, spark: [] };

  if (ind.transform === "yoy") {
    const yoyAt = (i: number) => {
      const cur = obs[i], prior = obs[i + 12];
      if (!cur || !prior || !prior.value) return null;
      return { date: cur.date, v: (cur.value / prior.value - 1) * 100 };
    };
    const series: { date: string; v: number }[] = [];
    const span = sparkLen(ind.freq);
    for (let i = Math.min(span, obs.length - 13); i >= 0; i--) {
      const p = yoyAt(i);
      if (p) series.push(p);
    }
    const latest = series[series.length - 1] ?? null;
    const prev = series[series.length - 2] ?? null;
    return {
      ...base,
      latest_date: latest?.date ?? null,
      latest_value: latest ? Number(latest.v.toFixed(2)) : null,
      prev_value: prev ? Number(prev.v.toFixed(2)) : null,
      change_abs: latest && prev ? Number((latest.v - prev.v).toFixed(2)) : null,
      change_pct: null,
      spark: series.map((p) => ({ d: p.date, v: Number(p.v.toFixed(2)) })),
    };
  }

  const span = sparkLen(ind.freq);
  const window = obs.slice(0, span).reverse();
  const latest = obs[0], prev = obs[1] ?? null;
  return {
    ...base,
    latest_date: latest.date,
    latest_value: Number(latest.value.toFixed(4)),
    prev_value: prev ? Number(prev.value.toFixed(4)) : null,
    change_abs: prev ? Number((latest.value - prev.value).toFixed(4)) : null,
    change_pct: prev && prev.value ? Number(((latest.value / prev.value - 1) * 100).toFixed(2)) : null,
    spark: window.map((o) => ({ d: o.date, v: Number(o.value.toFixed(4)) })),
  };
}

async function withRetry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
}

async function upsert(rows: unknown[]) {
  const r = await fetch(`${SB_URL}/rest/v1/live_indicators`, {
    method: "POST",
    headers: {
      apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`,
      "Content-Type": "application/json", "Content-Profile": "macro",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`upsert HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

// Remove keys that are no longer in the catalog (old indicators).
async function pruneStale(keepKeys: string[]) {
  const g = await fetch(`${SB_URL}/rest/v1/live_indicators?select=key`, {
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Accept-Profile": "macro" },
  });
  if (!g.ok) return;
  const cur: { key: string }[] = await g.json();
  const keep = new Set(keepKeys);
  const stale = cur.map((c) => c.key).filter((k) => !keep.has(k));
  if (!stale.length) return;
  await fetch(`${SB_URL}/rest/v1/live_indicators?key=in.(${stale.map(encodeURIComponent).join(",")})`, {
    method: "DELETE",
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Profile": "macro" },
  });
}

Deno.serve(async () => {
  if (!FRED_KEY || !SB_URL || !SB_SERVICE) {
    return new Response(JSON.stringify({ ok: false, error: "missing env (FRED_API_KEY / SUPABASE_*)" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const rows: unknown[] = [];
  const errors: Record<string, string> = {};

  // World Bank pink-sheet series carry forward projections (out to 2030); IMF/
  // FRED + Yahoo can briefly carry an as-yet-incomplete print. Trim so the card
  // shows the latest *actual* observation, never a forecast.
  const TODAY = new Date().toISOString().slice(0, 10);
  const CUR_YEAR_START = `${TODAY.slice(0, 4)}-01-01`;

  for (const ind of CATALOG) {
    try {
      let obs = await withRetry(() =>
        ind.source === "FRED" ? fredObs(ind.series_id)
          : ind.source === "YAHOO" ? yahooObs(ind.series_id)
            : dbnomicsObs(ind.series_id));
      const isPinkSheet = ind.source === "DBnomics" && ind.series_id.includes("commodity_prices");
      // pink-sheet = annual + projections → keep only completed years; others → drop any future-dated obs
      obs = isPinkSheet ? obs.filter((o) => o.date < CUR_YEAR_START) : obs.filter((o) => o.date <= TODAY);
      rows.push(buildRow(ind, obs));
    } catch (e) {
      errors[ind.key] = e instanceof Error ? e.message : String(e);
      rows.push(buildRow(ind, []));   // still upsert the row (blank) so the card exists
    }
    await new Promise((r) => setTimeout(r, 70));
  }

  try {
    // upsert in chunks to keep request bodies sane
    for (let i = 0; i < rows.length; i += 60) await upsert(rows.slice(i, i + 60));
    await pruneStale(CATALOG.map((c) => c.key));
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, upserted: 0, error: e instanceof Error ? e.message : String(e), fetchErrors: errors }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true, upserted: rows.length, total: CATALOG.length, errorCount: Object.keys(errors).length, errors }), { headers: { "Content-Type": "application/json" } });
});

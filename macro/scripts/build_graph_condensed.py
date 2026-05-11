"""Build catalog/_graph_condensed.json — INVESTOR-FOCUSED macro influence graph
laid out as a bordered 2D map of macro regions.

Layout: each RIC belongs to a `region` (one of ~10 macro super-clusters).
Each region has a fixed center on the canvas. Members are placed in a small
local grid around their region center. The renderer draws a rounded-rectangle
border around each region's members with the region label at the top.

Run from repo root:  python scripts/build_graph_condensed.py
"""

from __future__ import annotations

import json
import math
import os
import random
import sys
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _resolve_country() -> str:
    if "--country" in sys.argv:
        i = sys.argv.index("--country")
        if i + 1 < len(sys.argv):
            cc = sys.argv[i + 1].lower()
            del sys.argv[i:i + 2]
            os.environ["RIC_COUNTRY"] = cc
            return cc
    return os.environ.get("RIC_COUNTRY", "us").lower()


COUNTRY = _resolve_country()
CATALOG_DIR = os.path.join(REPO_ROOT, "catalog", COUNTRY)
OUTPUT_PATH = os.path.join(CATALOG_DIR, "_graph_condensed.json")


# ============================================================================
#  REGIONS — super-clusters with fixed positions on the macro map
# ============================================================================
# Each region: id -> {label, color, center_x, center_y, member_clusters/optional}
# The renderer draws a rounded-rect border around the bounding box of all
# nodes belonging to a region, with the label rendered at the top.

REGIONS = {
    # 4 cols × 3 rows. Spaced widely so clusters can spread inside each border
    # without colliding with neighboring regions.
    "leading":   {"label": "LEADING & SENTIMENT",  "color": "#eab308", "cx":  -3600, "cy": -1900},
    "labor":     {"label": "LABOR MARKET",         "color": "#22c55e", "cx":  -1200, "cy": -1900},
    "inflation": {"label": "INFLATION",            "color": "#ff8a00", "cx":   1200, "cy": -1900},
    "fed_money": {"label": "FED & MONEY",          "color": "#ec4899", "cx":   3600, "cy": -1900},

    "external":  {"label": "EXTERNAL & FX",        "color": "#fb923c", "cx":  -3600, "cy":     0},
    "demand":    {"label": "DEMAND & CONSUMER",    "color": "#0ea5e9", "cx":  -1200, "cy":     0},
    "wages":     {"label": "WAGES & PRODUCTIVITY", "color": "#15803d", "cx":   1200, "cy":     0},
    "rates_eq":  {"label": "RATES & EQUITIES",     "color": "#a855f7", "cx":   3600, "cy":     0},

    "energy":    {"label": "ENERGY",               "color": "#dc2626", "cx":  -3600, "cy":  1900},
    "housing":   {"label": "HOUSING",              "color": "#a855f7", "cx":  -1200, "cy":  1900},
    "credit":    {"label": "CREDIT & BANKING",     "color": "#06b6d4", "cx":   1200, "cy":  1900},
    "aggregate": {"label": "AGGREGATE & FISCAL",   "color": "#7c3aed", "cx":   3600, "cy":  1900},
}


# ============================================================================
#  CONDENSED RIC LIST — investor watch (~160 RICs)
# ============================================================================
# Each entry: {ric, name, cluster, importance, region}
#   importance: 1=headline, 2=major, 3=minor

CONDENSED: list[dict] = [

    # ---------- LEADING & SENTIMENT ----------
    {"ric": "aUSCSIUM",      "name": "UMich Sentiment",        "cluster": "surveys", "importance": 1, "region": "leading"},
    {"ric": "aUSCONCFEX",    "name": "UMich Expectations",     "cluster": "surveys", "importance": 2, "region": "leading"},
    {"ric": "aUSCONCF/A",    "name": "Conf Board Confidence",  "cluster": "surveys", "importance": 1, "region": "leading"},
    {"ric": "aUSCONCE/A",    "name": "CB Expectations",        "cluster": "surveys", "importance": 1, "region": "leading"},
    {"ric": "aUSCONCFP/A",   "name": "CB Present Situation",   "cluster": "surveys", "importance": 2, "region": "leading"},
    {"ric": "aUSNPMI/A",     "name": "ISM Mfg PMI",            "cluster": "surveys", "importance": 1, "region": "leading"},
    {"ric": "aUSNMFGPMI",    "name": "ISM Services PMI",       "cluster": "surveys", "importance": 1, "region": "leading"},
    {"ric": "aUSPFEDB/A",    "name": "Philly Fed Mfg",         "cluster": "surveys", "importance": 1, "region": "leading"},
    {"ric": "aUSCLEAD/A",    "name": "CB Leading Index",       "cluster": "surveys", "importance": 1, "region": "leading"},
    {"ric": "aUSCOINDIF/A",  "name": "CB Coincident Index",    "cluster": "surveys", "importance": 2, "region": "leading"},
    {"ric": "aUSLAG/A",      "name": "CB Lagging Index",       "cluster": "surveys", "importance": 3, "region": "leading"},
    {"ric": "aUSCFNA",       "name": "Chicago Fed CFNAI",      "cluster": "gdp",     "importance": 1, "region": "leading"},
    {"ric": "aUSNYWER",      "name": "NY Fed Weekly",          "cluster": "gdp",     "importance": 2, "region": "leading"},
    {"ric": "aUSCBBKLER",    "name": "BBK Leading",            "cluster": "gdp",     "importance": 3, "region": "leading"},
    {"ric": "aUSCBBKCOR",    "name": "BBK Coincident",         "cluster": "gdp",     "importance": 3, "region": "leading"},
    {"ric": "aUSCBBKGPR",    "name": "BBK Monthly GDP",        "cluster": "gdp",     "importance": 2, "region": "leading"},
    {"ric": "aUSEMPTR",      "name": "CB Employment Trends",   "cluster": "surveys", "importance": 2, "region": "leading"},
    {"ric": "aUSIBDECOP",    "name": "RCM/TIPP Optimism",      "cluster": "surveys", "importance": 3, "region": "leading"},
    {"ric": "aUSHMKT/A",     "name": "NAHB Builder Index",     "cluster": "housing_act", "importance": 1, "region": "leading"},
    {"ric": "aUSRSAHMN/A",   "name": "Sahm Rule",              "cluster": "unemployment", "importance": 1, "region": "leading"},

    # ---------- LABOR MARKET ----------
    {"ric": "aUSNFARM/A",    "name": "Nonfarm Payrolls",       "cluster": "employment", "importance": 1, "region": "labor"},
    {"ric": "aUSEMPADP/A",   "name": "ADP Payrolls",           "cluster": "employment", "importance": 2, "region": "labor"},
    {"ric": "aUSNFARMP/A",   "name": "Private Payrolls",       "cluster": "employment", "importance": 2, "region": "labor"},
    {"ric": "aUSUNTOTR",     "name": "Unemployment Rate",      "cluster": "unemployment", "importance": 1, "region": "labor"},
    {"ric": "aUSLABFRE/A",   "name": "Labor Participation",    "cluster": "unemployment", "importance": 1, "region": "labor"},
    {"ric": "aUSEMPR/A",     "name": "Emp-Pop Ratio",          "cluster": "unemployment", "importance": 2, "region": "labor"},
    {"ric": "aUSJOBC/A",     "name": "Initial Claims",         "cluster": "unemployment", "importance": 1, "region": "labor"},
    {"ric": "aUSJOBCC/A",    "name": "Continuing Claims",      "cluster": "unemployment", "importance": 2, "region": "labor"},
    {"ric": "aUSJOBCC4W/A",  "name": "Continuing Claims 4w",   "cluster": "unemployment", "importance": 3, "region": "labor"},
    {"ric": "aUSJOLTAO",     "name": "JOLTS Openings",         "cluster": "employment", "importance": 1, "region": "labor"},
    {"ric": "aUSJBQUITO/A",  "name": "JOLTS Quits",            "cluster": "employment", "importance": 2, "region": "labor"},

    # ---------- WAGES & PRODUCTIVITY ----------
    {"ric": "aUSEARNH/A",    "name": "AHE Level",              "cluster": "wages", "importance": 1, "region": "wages"},
    {"ric": "aUSAHVEA",      "name": "AHE YoY",                "cluster": "wages", "importance": 1, "region": "wages"},
    {"ric": "aUSWAGESB/A",   "name": "AHE Private YoY",        "cluster": "wages", "importance": 1, "region": "wages"},
    {"ric": "aUSEARN/CA",    "name": "Real AHE",               "cluster": "wages", "importance": 2, "region": "wages"},
    {"ric": "aUSEMPCI/A",    "name": "ECI Total Comp",         "cluster": "wages", "importance": 1, "region": "wages"},
    {"ric": "aUSEMPCAR",     "name": "ECI QoQ",                "cluster": "wages", "importance": 1, "region": "wages"},
    {"ric": "aUSECWNS/A",    "name": "ECI Wages & Salaries",   "cluster": "wages", "importance": 2, "region": "wages"},
    {"ric": "aUSULCNF/A",    "name": "Unit Labor Costs",       "cluster": "wages", "importance": 2, "region": "wages"},
    {"ric": "aUSOUTNF/A",    "name": "Productivity Nonfarm",   "cluster": "wages", "importance": 2, "region": "wages"},
    {"ric": "aUSPHOPBUS/A",  "name": "Productivity Business",  "cluster": "wages", "importance": 2, "region": "wages"},

    # ---------- DEMAND & CONSUMER ----------
    {"ric": "aUSCRETF/C",    "name": "Retail Sales Total",     "cluster": "consumption", "importance": 1, "region": "demand"},
    {"ric": "aUSCRETPE/A",   "name": "Retail Sales MoM",       "cluster": "consumption", "importance": 1, "region": "demand"},
    {"ric": "aUSCRETYE/A",   "name": "Retail Sales YoY",       "cluster": "consumption", "importance": 2, "region": "demand"},
    {"ric": "aUSRSLSFS/A",   "name": "Retail inc Food Svc",    "cluster": "consumption", "importance": 2, "region": "demand"},
    {"ric": "aUSRLCOA",      "name": "Retail Control Group",   "cluster": "consumption", "importance": 1, "region": "demand"},
    {"ric": "aUSGPC/CA",     "name": "Real PCE Level",         "cluster": "consumption", "importance": 1, "region": "demand"},
    {"ric": "aUSGPCSAR",     "name": "Real PCE MoM",           "cluster": "consumption", "importance": 1, "region": "demand"},
    {"ric": "aUSGPYD",       "name": "Real DPI",               "cluster": "consumption", "importance": 1, "region": "demand"},
    {"ric": "aUSGPYD/A",     "name": "Nominal DPI",            "cluster": "consumption", "importance": 2, "region": "demand"},
    {"ric": "aUSNS06L2",     "name": "Saving Rate",            "cluster": "consumption", "importance": 1, "region": "demand"},
    {"ric": "aUSVHLS",       "name": "Light Vehicle Sales",    "cluster": "auto", "importance": 1, "region": "demand"},
    {"ric": "aUSCARSOA",     "name": "Total Car Sales",        "cluster": "auto", "importance": 2, "region": "demand"},
    {"ric": "aUSPCARRVO/A",  "name": "Auto Inventory Days",    "cluster": "auto", "importance": 2, "region": "demand"},
    {"ric": "aUSDAPRODP",    "name": "Auto Production",        "cluster": "auto", "importance": 3, "region": "demand"},

    # ---------- INFLATION ----------
    {"ric": "aUSCPIYYR",     "name": "Headline CPI YoY",       "cluster": "inflation", "importance": 1, "region": "inflation"},
    {"ric": "aUSCPI",        "name": "Headline CPI Level",     "cluster": "inflation", "importance": 1, "region": "inflation"},
    {"ric": "aUSCPFYAR",     "name": "Core CPI YoY",           "cluster": "inflation", "importance": 1, "region": "inflation"},
    {"ric": "aUSCPIXFE/A",   "name": "Core CPI Level",         "cluster": "inflation", "importance": 1, "region": "inflation"},
    {"ric": "aUSPCEMAR",     "name": "Core PCE MoM",           "cluster": "inflation", "importance": 1, "region": "inflation"},
    {"ric": "aUSPCE2AR",     "name": "Core PCE YoY",           "cluster": "inflation", "importance": 1, "region": "inflation"},
    {"ric": "aUSPCEYAR",     "name": "Headline PCE YoY",       "cluster": "inflation", "importance": 1, "region": "inflation"},
    {"ric": "aUSPCEAR",      "name": "Headline PCE MoM",       "cluster": "inflation", "importance": 2, "region": "inflation"},
    {"ric": "aUSPFDAR",      "name": "PPI Final Demand YoY",   "cluster": "inflation", "importance": 1, "region": "inflation"},
    {"ric": "aUSPFDEAR",     "name": "PPI Final Demand MoM",   "cluster": "inflation", "importance": 2, "region": "inflation"},
    {"ric": "aUSPFDGAR",     "name": "Core PPI YoY",           "cluster": "inflation", "importance": 2, "region": "inflation"},
    {"ric": "aUSPFDEMDE/A",  "name": "PPI Level",              "cluster": "inflation", "importance": 2, "region": "inflation"},
    {"ric": "aUSIMPP",       "name": "Import Prices",          "cluster": "inflation", "importance": 2, "region": "inflation"},
    {"ric": "aUSIMPAR",      "name": "Import Prices MoM",      "cluster": "inflation", "importance": 3, "region": "inflation"},
    {"ric": "aUSEXPP",       "name": "Export Prices",          "cluster": "inflation", "importance": 3, "region": "inflation"},
    {"ric": "aUSEXPAR",      "name": "Export Prices MoM",      "cluster": "inflation", "importance": 3, "region": "inflation"},
    {"ric": "aUSINFEXM1Y",   "name": "UMich 1Y Inf Exp",       "cluster": "inflation", "importance": 1, "region": "inflation"},
    {"ric": "aUSINFEXM5Y",   "name": "UMich 5Y Inf Exp",       "cluster": "inflation", "importance": 1, "region": "inflation"},

    # ---------- FED & MONEY ----------
    {"ric": "aUSFEDFUND",    "name": "Fed Funds Eff",          "cluster": "fed", "importance": 1, "region": "fed_money"},
    {"ric": "aUSFEDFUNDT",   "name": "Fed Funds Target",       "cluster": "fed", "importance": 1, "region": "fed_money"},
    {"ric": "aUSIORAR",      "name": "IORB",                   "cluster": "fed", "importance": 2, "region": "fed_money"},
    {"ric": "aUSRRPAR",      "name": "ON RRP",                 "cluster": "fed", "importance": 2, "region": "fed_money"},
    {"ric": "aUSDISWPCRM",   "name": "Discount Window",        "cluster": "fed", "importance": 3, "region": "fed_money"},
    {"ric": "aUSPRIME",      "name": "Bank Prime Rate",        "cluster": "fed", "importance": 2, "region": "fed_money"},
    {"ric": "aUSCMS2B/A",    "name": "M2 Level",               "cluster": "money", "importance": 1, "region": "fed_money"},
    {"ric": "aUSCMS2YB/A",   "name": "M2 YoY",                 "cluster": "money", "importance": 1, "region": "fed_money"},
    {"ric": "aUSCMS1B/A",    "name": "M1 Level",               "cluster": "money", "importance": 2, "region": "fed_money"},
    {"ric": "aUSCMS0B/A",    "name": "M0 / Base",              "cluster": "money", "importance": 2, "region": "fed_money"},
    {"ric": "aUSMAAAAAA",    "name": "Monetary Base H.3",      "cluster": "money", "importance": 2, "region": "fed_money"},
    {"ric": "aUSMEMSVE/A",   "name": "M2 Velocity",            "cluster": "money", "importance": 2, "region": "fed_money"},

    # ---------- RATES & EQUITIES ----------
    {"ric": "aUSEBM10Y",     "name": "10Y Treasury Yield",     "cluster": "treasury", "importance": 1, "region": "rates_eq"},
    {"ric": "aUSGBOND",      "name": "20Y Treasury Yield",     "cluster": "treasury", "importance": 2, "region": "rates_eq"},
    {"ric": "aUSLIDXIR10",   "name": "10Y - FF Spread",        "cluster": "treasury", "importance": 1, "region": "rates_eq"},
    {"ric": "aUSCRCDACR",    "name": "Credit Card APR",        "cluster": "consumer_credit", "importance": 1, "region": "rates_eq"},
    {"ric": "aUSSPCOM",      "name": "S&P 500",                "cluster": "equity", "importance": 1, "region": "rates_eq"},
    {"ric": "aUSSPRPER",     "name": "S&P 500 CAPE",           "cluster": "equity", "importance": 1, "region": "rates_eq"},
    {"ric": "aUSSPDIVY",     "name": "S&P Dividend Yield",     "cluster": "equity", "importance": 2, "region": "rates_eq"},
    {"ric": "aUSSPREPS",     "name": "S&P 500 EPS",            "cluster": "equity", "importance": 2, "region": "rates_eq"},
    {"ric": "aUSSPMDPS",     "name": "S&P 500 Dividends",      "cluster": "equity", "importance": 3, "region": "rates_eq"},

    # ---------- EXTERNAL & FX ----------
    {"ric": "aUSCXTWF/C",    "name": "USD Trade-Weighted",     "cluster": "fx", "importance": 1, "region": "external"},
    {"ric": "aUSCXTWYF",     "name": "USD TWI YoY",            "cluster": "fx", "importance": 2, "region": "external"},
    {"ric": "aUSCXTRF/C",    "name": "USD Real TWI",           "cluster": "fx", "importance": 2, "region": "external"},
    {"ric": "aUSBISNXBR",    "name": "BIS Nominal EER",        "cluster": "fx", "importance": 2, "region": "external"},
    {"ric": "aUSBISRXBR",    "name": "BIS Real EER",           "cluster": "fx", "importance": 2, "region": "external"},
    {"ric": "aUSXRUSD",      "name": "EUR/USD",                "cluster": "fx", "importance": 1, "region": "external"},
    {"ric": "aUSCURAC",      "name": "Current Account",        "cluster": "trade", "importance": 1, "region": "external"},
    {"ric": "aUSGBALBA",     "name": "Trade Balance",          "cluster": "trade", "importance": 1, "region": "external"},
    {"ric": "aUSGBARBA",     "name": "Trade Balance (R)",      "cluster": "trade", "importance": 2, "region": "external"},

    # ---------- ENERGY ----------
    {"ric": "aUSEPGAPG",     "name": "Retail Gasoline",        "cluster": "energy", "importance": 1, "region": "energy"},
    {"ric": "aUSEPDAPG",     "name": "Retail Diesel",          "cluster": "energy", "importance": 2, "region": "energy"},
    {"ric": "aUSEPHAPG",     "name": "Retail Heating Oil",     "cluster": "energy", "importance": 3, "region": "energy"},
    {"ric": "aUSEIACS",      "name": "Crude Oil Stocks",       "cluster": "energy", "importance": 1, "region": "energy"},
    {"ric": "aUSEIAGS",      "name": "Gasoline Stocks",        "cluster": "energy", "importance": 2, "region": "energy"},
    {"ric": "aUSEIADS",      "name": "Distillate Stocks",      "cluster": "energy", "importance": 2, "region": "energy"},
    {"ric": "aUSEIAHOS",     "name": "SPR Stocks",             "cluster": "energy", "importance": 2, "region": "energy"},
    {"ric": "aUSEIAPRU",     "name": "Refinery Util",          "cluster": "energy", "importance": 2, "region": "energy"},
    {"ric": "aUSSCCO",       "name": "Cushing Stocks",         "cluster": "energy", "importance": 2, "region": "energy"},

    # ---------- HOUSING ----------
    {"ric": "aUSHSTART",     "name": "Housing Starts",         "cluster": "housing_act", "importance": 1, "region": "housing"},
    {"ric": "aUSBPERMIT",    "name": "Building Permits",       "cluster": "housing_act", "importance": 1, "region": "housing"},
    {"ric": "aUSHNSAO",      "name": "New Home Sales",         "cluster": "housing_act", "importance": 1, "region": "housing"},
    {"ric": "aUSHNSALES/A",  "name": "New Home Sales (alt)",   "cluster": "housing_act", "importance": 2, "region": "housing"},
    {"ric": "aUSEHSPAR",     "name": "Existing Home Sales",    "cluster": "housing_act", "importance": 1, "region": "housing"},
    {"ric": "aUSPHSALE/A",   "name": "Pending Home Sales",     "cluster": "housing_act", "importance": 2, "region": "housing"},
    {"ric": "aUSHPRICESP",   "name": "Case-Shiller 20",        "cluster": "housing_px", "importance": 1, "region": "housing"},
    {"ric": "aUSHPCSCM10/CA","name": "Case-Shiller 10",        "cluster": "housing_px", "importance": 2, "region": "housing"},
    {"ric": "aUSHPIYAR",     "name": "FHFA HPI YoY",           "cluster": "housing_px", "importance": 1, "region": "housing"},
    {"ric": "aUSHPIMAR",     "name": "FHFA HPI MoM",           "cluster": "housing_px", "importance": 2, "region": "housing"},
    {"ric": "aUSHAI",        "name": "Affordability Index",    "cluster": "housing_px", "importance": 1, "region": "housing"},
    {"ric": "aUSMBAMLR",     "name": "30Y Mortgage Rate",      "cluster": "mortgage", "importance": 1, "region": "housing"},
    {"ric": "aUSMACI/A",     "name": "MBA Mortgage Apps",      "cluster": "mortgage", "importance": 1, "region": "housing"},
    {"ric": "aUSMACP/A",     "name": "MBA Purchase Index",     "cluster": "mortgage", "importance": 2, "region": "housing"},
    {"ric": "aUSMACRI/A",    "name": "MBA Refi Index",         "cluster": "mortgage", "importance": 2, "region": "housing"},
    {"ric": "aUSTCONS/A",    "name": "Construction Spend",     "cluster": "investment", "importance": 2, "region": "housing"},

    # ---------- CREDIT & BANKING ----------
    {"ric": "aUSCRDOUTA",    "name": "Consumer Credit",        "cluster": "consumer_credit", "importance": 1, "region": "credit"},
    {"ric": "aUSCREDITIR/A", "name": "Revolving Credit",       "cluster": "consumer_credit", "importance": 1, "region": "credit"},
    {"ric": "aUSCREDITIN/A", "name": "Non-Revolving Credit",   "cluster": "consumer_credit", "importance": 2, "region": "credit"},
    {"ric": "aUSBCACIB/A",   "name": "C&I Loans",              "cluster": "bank_lending", "importance": 1, "region": "credit"},
    {"ric": "aUSBCALCB",     "name": "Consumer Loans Banks",   "cluster": "bank_lending", "importance": 2, "region": "credit"},
    {"ric": "aUSBCAREB/A",   "name": "Real Estate Loans",      "cluster": "bank_lending", "importance": 1, "region": "credit"},
    {"ric": "aUSBCLALQ/A",   "name": "Bank Charge-offs",       "cluster": "bank_lending", "importance": 2, "region": "credit"},
    {"ric": "aUSBCLCOCQ/A",  "name": "Card Charge-offs",       "cluster": "bank_lending", "importance": 1, "region": "credit"},
    {"ric": "aUSBDLALQ/A",   "name": "Bank Delinquencies",     "cluster": "bank_lending", "importance": 2, "region": "credit"},
    {"ric": "aUSBDLCOCQ/A",  "name": "Card Delinquencies",     "cluster": "bank_lending", "importance": 1, "region": "credit"},
    {"ric": "aUSBCLRECQ/A",  "name": "CRE Charge-offs",        "cluster": "bank_lending", "importance": 2, "region": "credit"},
    {"ric": "aUSBDLRECQ/A",  "name": "CRE Delinquencies",      "cluster": "bank_lending", "importance": 2, "region": "credit"},
    {"ric": "aUSBNRQP",      "name": "Bankruptcies",           "cluster": "bankruptcies", "importance": 2, "region": "credit"},

    # ---------- AGGREGATE & FISCAL ----------
    {"ric": "aUSCGDPPD/A",   "name": "Real GDP QoQ",           "cluster": "gdp", "importance": 1, "region": "aggregate"},
    {"ric": "aUSGDPEQZ/CA",  "name": "Real GDP YoY",           "cluster": "gdp", "importance": 1, "region": "aggregate"},
    {"ric": "aUSAGDPF",      "name": "GDP Consensus",          "cluster": "gdp", "importance": 2, "region": "aggregate"},
    {"ric": "aUSGDPCC/CA",   "name": "GDP Per Capita",         "cluster": "gdp", "importance": 3, "region": "aggregate"},
    {"ric": "aUSGDEF",       "name": "Federal Deficit",        "cluster": "government", "importance": 1, "region": "aggregate"},
    {"ric": "aUSGBPGDP",     "name": "Deficit % GDP",          "cluster": "government", "importance": 1, "region": "aggregate"},
    {"ric": "aUSFOUTL",      "name": "Federal Outlays",        "cluster": "government", "importance": 2, "region": "aggregate"},
    {"ric": "aUSFEDREC",     "name": "Federal Receipts",       "cluster": "government", "importance": 2, "region": "aggregate"},
    {"ric": "aUSXGBINTA",    "name": "Net Interest",           "cluster": "government", "importance": 1, "region": "aggregate"},
    {"ric": "aUSXGBSOCA",    "name": "Social Security",        "cluster": "government", "importance": 2, "region": "aggregate"},
    {"ric": "aUSXGBMEDA",    "name": "Medicare",               "cluster": "government", "importance": 2, "region": "aggregate"},
    {"ric": "aUSXGBDEFA",    "name": "Defense Outlays",        "cluster": "government", "importance": 2, "region": "aggregate"},
    {"ric": "aUSFEDETOS",    "name": "Federal Debt",           "cluster": "treasury", "importance": 1, "region": "aggregate"},
    {"ric": "aUSPDEBTA",     "name": "Public Debt",            "cluster": "treasury", "importance": 2, "region": "aggregate"},
    {"ric": "aUSPDBTR",      "name": "Public Debt % GDP",      "cluster": "treasury", "importance": 1, "region": "aggregate"},
    {"ric": "aUSSECMKTA",    "name": "Treasury Marketable",    "cluster": "treasury", "importance": 3, "region": "aggregate"},
    {"ric": "aUSFCBOUT",     "name": "CBO Outlays Forecast",   "cluster": "forecasts", "importance": 2, "region": "aggregate"},
    {"ric": "aUSFCBREV",     "name": "CBO Receipts Forecast",  "cluster": "forecasts", "importance": 2, "region": "aggregate"},
    {"ric": "aUSFCCUFHR",    "name": "Fed SEP UR",             "cluster": "forecasts", "importance": 2, "region": "aggregate"},
    {"ric": "aUSFCCCFHR",    "name": "Fed SEP Core PCE",       "cluster": "forecasts", "importance": 2, "region": "aggregate"},
]


# ============================================================================
#  HAND-AUTHORED EDGES (~170)
# ============================================================================
EDGES: list[tuple] = [
    # Inflation decomposition
    ("aUSCPFYAR",    "aUSCPIYYR",     "part_of", None,    "Core CPI is a component of Headline CPI"),
    ("aUSCPIXFE/A",  "aUSCPI",        "part_of", None,    "Core CPI level is a sub-aggregate of Headline CPI"),
    ("aUSCPI",       "aUSCPIYYR",     "drives",  [0, 0],  "CPI level changes drive YoY mechanically"),
    ("aUSCPIXFE/A",  "aUSCPFYAR",     "drives",  [0, 0],  "Core CPI level drives Core CPI YoY"),
    ("aUSPCEMAR",    "aUSPCE2AR",     "drives",  [0, 1],  "MoM Core PCE accumulates into YoY"),
    ("aUSPCEAR",     "aUSPCEYAR",     "drives",  [0, 1],  "MoM headline PCE accumulates into YoY"),
    ("aUSCPFYAR",    "aUSPCE2AR",     "related", None,    "Core CPI and Core PCE — different baskets, similar trend"),
    ("aUSCPIYYR",    "aUSPCEYAR",     "related", None,    "Headline CPI and PCE — companion series"),
    ("aUSPFDAR",     "aUSCPIYYR",     "leads",   [1, 3],  "PPI Final Demand leads goods CPI"),
    ("aUSPFDGAR",    "aUSCPFYAR",     "leads",   [1, 3],  "Core PPI leads core CPI"),
    ("aUSPFDEMDE/A", "aUSPFDAR",      "drives",  [0, 0],  "PPI level drives YoY"),
    ("aUSPFDEAR",    "aUSPFDAR",      "drives",  [0, 1],  "PPI MoM feeds YoY"),
    ("aUSIMPP",      "aUSCPIYYR",     "drives",  [1, 3],  "Import prices pass through to goods CPI"),
    ("aUSIMPAR",     "aUSIMPP",       "drives",  [0, 1],  "MoM feeds level"),
    ("aUSEXPP",      "aUSEXPAR",      "drives",  [0, 0],  "Export price level vs MoM"),

    # Wages -> inflation
    ("aUSEARNH/A",   "aUSCPIXFE/A",   "drives",  [3, 6],  "AHE feeds core CPI services"),
    ("aUSAHVEA",     "aUSCPFYAR",     "drives",  [3, 6],  "AHE YoY drives core CPI YoY"),
    ("aUSWAGESB/A",  "aUSPCE2AR",     "drives",  [3, 6],  "AHE pass-through to core PCE"),
    ("aUSEMPCI/A",   "aUSPCEMAR",     "drives",  [6, 9],  "ECI feeds core PCE"),
    ("aUSEMPCAR",    "aUSEMPCI/A",    "drives",  [0, 1],  "QoQ feeds level"),
    ("aUSECWNS/A",   "aUSEMPCI/A",    "part_of", None,    "Wages-and-salaries is a component of total ECI"),
    ("aUSULCNF/A",   "aUSPCE2AR",     "drives",  [6, 9],  "ULC feeds core PCE"),
    ("aUSOUTNF/A",   "aUSULCNF/A",    "drives",  [0, 3],  "Productivity reduces ULC"),
    ("aUSPHOPBUS/A", "aUSULCNF/A",    "drives",  [0, 3],  "Business productivity reduces ULC"),
    ("aUSEARN/CA",   "aUSEARNH/A",    "related", None,    "Real AHE = nominal AHE deflated"),

    # Energy -> inflation
    ("aUSEPGAPG",    "aUSCPIYYR",     "drives",  [0, 1],  "Gasoline directly enters CPI energy"),
    ("aUSEPDAPG",    "aUSCPIYYR",     "drives",  [1, 3],  "Diesel feeds goods CPI via freight"),
    ("aUSEPHAPG",    "aUSCPIYYR",     "drives",  [0, 2],  "Heating oil enters CPI energy"),

    # Inflation expectations
    ("aUSCPIYYR",    "aUSINFEXM1Y",   "drives",  [0, 3],  "Realized inflation lifts 1Y expectations"),
    ("aUSINFEXM1Y",  "aUSCSIUM",      "drives",  [0, 0],  "Inflation expectations weigh on sentiment"),

    # Labor decomposition
    ("aUSEMPADP/A",  "aUSNFARM/A",    "related", None,    "ADP and NFP both measure private payrolls"),
    ("aUSNFARMP/A",  "aUSNFARM/A",    "part_of", None,    "Private payrolls is a sub-aggregate of total NFP"),
    ("aUSNFARM/A",   "aUSUNTOTR",     "related", None,    "NFP and UR companion releases"),
    ("aUSUNTOTR",    "aUSRSAHMN/A",   "drives",  [0, 0],  "Sahm rule computed from UR"),
    ("aUSLABFRE/A",  "aUSUNTOTR",     "drives",  [0, 0],  "Participation affects UR (composition)"),
    ("aUSEMPR/A",    "aUSUNTOTR",     "related", None,    "E/P is the structural employment gauge"),
    ("aUSJOBC/A",    "aUSUNTOTR",     "leads",   [1, 2],  "Initial claims lead UR"),
    ("aUSJOBC/A",    "aUSJOBCC/A",    "leads",   [1, 4],  "Initial feed continuing claims pool"),
    ("aUSJOBCC4W/A", "aUSJOBCC/A",    "part_of", None,    "4w MA of continuing claims"),
    ("aUSJOLTAO",    "aUSNFARM/A",    "leads",   [1, 3],  "Job openings lead NFP"),
    ("aUSJBQUITO/A", "aUSEARNH/A",    "leads",   [3, 6],  "Quits lead wage growth"),
    ("aUSJOLTAO",    "aUSJBQUITO/A",  "related", None,    "Openings vs quits = labor tightness"),

    # GDP relationships
    ("aUSCGDPPD/A",  "aUSGDPEQZ/CA",  "related", None,    "QoQ-AR vs YoY of real GDP"),
    ("aUSAGDPF",     "aUSCGDPPD/A",   "related", None,    "Reuters poll vs actual"),
    ("aUSGDPCC/CA",  "aUSCGDPPD/A",   "part_of", None,    "GDP per capita = GDP / population"),
    ("aUSCFNA",      "aUSCGDPPD/A",   "leads",   [0, 1],  "CFNAI nowcasts GDP"),
    ("aUSNYWER",     "aUSCGDPPD/A",   "leads",   [0, 1],  "NY Fed Weekly leads GDP"),
    ("aUSCBBKLER",   "aUSCBBKCOR",    "leads",   [3, 6],  "BBK Leading leads BBK Coincident"),
    ("aUSCBBKGPR",   "aUSCGDPPD/A",   "related", None,    "BBK monthly GDP growth nowcasts"),
    ("aUSNPMI/A",    "aUSCGDPPD/A",   "leads",   [1, 3],  "ISM Mfg leads GDP turning points"),
    ("aUSNMFGPMI",   "aUSCGDPPD/A",   "leads",   [1, 3],  "ISM Services leads GDP"),
    ("aUSPFEDB/A",   "aUSNPMI/A",     "leads",   [0, 1],  "Philly Fed leads ISM Mfg"),
    ("aUSCLEAD/A",   "aUSCGDPPD/A",   "leads",   [3, 12], "LEI leads GDP turning points"),
    ("aUSCOINDIF/A", "aUSCGDPPD/A",   "related", None,    "CEI tracks GDP contemporaneously"),
    ("aUSEMPTR",     "aUSNFARM/A",    "leads",   [1, 3],  "ETI leads NFP turning points"),

    # Consumer chain
    ("aUSGPYD",      "aUSGPC/CA",     "drives",  [0, 1],  "Real DPI drives real PCE"),
    ("aUSGPYD/A",    "aUSGPYD",       "related", None,    "Nominal vs real DPI"),
    ("aUSGPC/CA",    "aUSGPCSAR",     "drives",  [0, 0],  "PCE level drives MoM"),
    ("aUSNS06L2",    "aUSGPC/CA",     "drives",  [0, 1],  "Saving rate residual: low savings = higher PCE"),
    ("aUSCSIUM",     "aUSCRETF/C",    "leads",   [1, 2],  "UMich sentiment leads retail"),
    ("aUSCONCF/A",   "aUSCRETF/C",    "leads",   [1, 2],  "CB confidence leads retail"),
    ("aUSCONCE/A",   "aUSCONCF/A",    "part_of", None,    "Expectations sub-index"),
    ("aUSCONCFP/A",  "aUSCONCF/A",    "part_of", None,    "Present situation sub-index"),
    ("aUSCONCFEX",   "aUSCSIUM",      "part_of", None,    "UMich expectations sub-index"),
    ("aUSCRETPE/A",  "aUSCRETF/C",    "drives",  [0, 0],  "MoM derived from level"),
    ("aUSCRETYE/A",  "aUSCRETF/C",    "drives",  [0, 0],  "YoY derived from level"),
    ("aUSRSLSFS/A",  "aUSCRETF/C",    "related", None,    "Inc food svc — broader retail"),
    ("aUSRLCOA",     "aUSCRETF/C",    "part_of", None,    "Control group is a sub-aggregate"),
    ("aUSCRETF/C",   "aUSGPC/CA",     "drives",  [0, 1],  "Retail feeds goods PCE"),
    ("aUSGPC/CA",    "aUSCGDPPD/A",   "drives",  [0, 0],  "PCE = ~70% of GDP"),
    ("aUSCRDOUTA",   "aUSCRETF/C",    "drives",  [0, 1],  "Consumer credit fuels spending"),
    ("aUSCREDITIR/A","aUSCRDOUTA",    "part_of", None,    "Revolving = component"),
    ("aUSCREDITIN/A","aUSCRDOUTA",    "part_of", None,    "Non-revolving = component"),
    ("aUSCRCDACR",   "aUSCREDITIR/A", "drives",  [3, 6],  "Higher card APR slows revolving credit"),
    ("aUSBCLCOCQ/A", "aUSCRCDACR",    "drives",  [3, 6],  "Charge-offs lift APRs"),

    # Auto chain
    ("aUSCARSOA",    "aUSVHLS",       "part_of", None,    "Cars are a component of light vehicles"),
    ("aUSDAPRODP",   "aUSPCARRVO/A",  "drives",  [0, 1],  "Production vs sales = inventory"),
    ("aUSVHLS",      "aUSPCARRVO/A",  "drives",  [0, 1],  "Sales pace sets days-supply"),

    # Housing pipeline
    ("aUSBPERMIT",   "aUSHSTART",     "leads",   [1, 3],  "Permits precede starts"),
    ("aUSHSTART",    "aUSHNSAO",      "leads",   [3, 6],  "Starts feed new home sales"),
    ("aUSHMKT/A",    "aUSBPERMIT",    "leads",   [1, 3],  "NAHB sentiment leads permits"),
    ("aUSHMKT/A",    "aUSHSTART",     "leads",   [1, 3],  "NAHB sentiment leads starts"),
    ("aUSHNSALES/A", "aUSHNSAO",      "related", None,    "Two new-home-sales sources"),
    ("aUSMBAMLR",    "aUSBPERMIT",    "drives",  [1, 3],  "Mortgage rate dampens permits"),
    ("aUSMBAMLR",    "aUSEHSPAR",     "drives",  [1, 3],  "Mortgage rate gates existing sales"),
    ("aUSMBAMLR",    "aUSMACI/A",     "drives",  [0, 1],  "Mortgage rate moves apps"),
    ("aUSMACP/A",    "aUSMACI/A",     "part_of", None,    "Purchase = component of composite"),
    ("aUSMACRI/A",   "aUSMACI/A",     "part_of", None,    "Refi = component of composite"),
    ("aUSMACP/A",    "aUSEHSPAR",     "leads",   [1, 2],  "Purchase apps lead existing sales"),
    ("aUSPHSALE/A",  "aUSEHSPAR",     "leads",   [1, 2],  "Pending leads existing closings"),
    ("aUSHPRICESP",  "aUSHPCSCM10/CA","related", None,    "Case-Shiller 20 vs 10"),
    ("aUSHPIMAR",    "aUSHPIYAR",     "drives",  [0, 1],  "FHFA HPI MoM accumulates into YoY"),
    ("aUSHAI",       "aUSEHSPAR",     "drives",  [1, 3],  "Affordability gates existing sales"),
    ("aUSHPIYAR",    "aUSHAI",        "drives",  [0, 0],  "Higher home prices reduce affordability"),
    ("aUSMBAMLR",    "aUSHAI",        "drives",  [0, 0],  "Mortgage rate is the second affordability driver"),
    ("aUSHPRICESP",  "aUSHPIYAR",     "related", None,    "Case-Shiller and FHFA — competing US HPI"),
    ("aUSHSTART",    "aUSTCONS/A",    "drives",  [1, 3],  "Starts feed residential construction"),
    ("aUSTCONS/A",   "aUSCGDPPD/A",   "drives",  [1, 3],  "Construction feeds GDP investment"),

    # Fed reaction function
    ("aUSPCEMAR",    "aUSFEDFUND",    "drives",  [3, 6],  "Core PCE — Fed's official inflation target"),
    ("aUSPCE2AR",    "aUSFEDFUND",    "drives",  [3, 6],  "Core PCE YoY drives reaction"),
    ("aUSCPIYYR",    "aUSFEDFUND",    "drives",  [3, 6],  "Headline CPI feeds reaction"),
    ("aUSCPFYAR",    "aUSFEDFUND",    "drives",  [3, 6],  "Core CPI watched alongside core PCE"),
    ("aUSUNTOTR",    "aUSFEDFUND",    "drives",  [3, 6],  "UR feeds dual-mandate reaction"),
    ("aUSNFARM/A",   "aUSFEDFUND",    "drives",  [3, 6],  "Payroll strength affects Fed reads"),

    # Fed corridor
    ("aUSFEDFUNDT",  "aUSFEDFUND",    "drives",  [0, 0],  "FOMC target sets corridor"),
    ("aUSFEDFUND",   "aUSIORAR",      "drives",  [0, 0],  "IORB = corridor floor for banks"),
    ("aUSFEDFUND",   "aUSRRPAR",      "drives",  [0, 0],  "ON RRP = floor for non-banks"),
    ("aUSFEDFUND",   "aUSDISWPCRM",   "drives",  [0, 0],  "Discount window = above corridor upper"),
    ("aUSFEDFUND",   "aUSPRIME",      "drives",  [0, 1],  "Prime = fed funds + 3.0pp admin"),

    # Fed -> curve / markets
    ("aUSFEDFUND",   "aUSEBM10Y",     "drives",  [0, 3],  "Fed funds anchors 10Y via expected path"),
    ("aUSEBM10Y",    "aUSGBOND",      "related", None,    "10Y and 20Y move together"),
    ("aUSEBM10Y",    "aUSLIDXIR10",   "drives",  [0, 0],  "10Y - FF = curve slope"),
    ("aUSFEDFUND",   "aUSLIDXIR10",   "drives",  [0, 0],  "Fed funds is short-end of spread"),
    ("aUSEBM10Y",    "aUSMBAMLR",     "drives",  [0, 1],  "10Y drives mortgage rate"),
    ("aUSPRIME",     "aUSCRCDACR",    "drives",  [0, 3],  "Prime drives card APR"),
    ("aUSLIDXIR10",  "aUSCLEAD/A",    "drives",  [0, 0],  "Yield curve is a component of LEI"),

    # Money supply
    ("aUSCMS2YB/A",  "aUSCMS2B/A",    "drives",  [0, 0],  "M2 YoY computed from level"),
    ("aUSCMS1B/A",   "aUSCMS2B/A",    "part_of", None,    "M1 sub-aggregate of M2"),
    ("aUSCMS0B/A",   "aUSCMS1B/A",    "part_of", None,    "Monetary base is M0 within M1"),
    ("aUSMAAAAAA",   "aUSCMS0B/A",    "related", None,    "Two monetary base series"),
    ("aUSMEMSVE/A",  "aUSCMS2B/A",    "drives",  [0, 0],  "Velocity = nominal GDP / M2"),
    ("aUSCMS2YB/A",  "aUSCPIYYR",     "leads",   [12, 18],"M2 growth precedes inflation (monetarist)"),

    # Fiscal
    ("aUSGDEF",      "aUSFEDETOS",    "drives",  [3, 12], "Persistent deficit grows debt"),
    ("aUSGDEF",      "aUSGBPGDP",     "related", None,    "Same series, different framing"),
    ("aUSFOUTL",     "aUSGDEF",       "drives",  [0, 0],  "Outlays - receipts = deficit"),
    ("aUSFEDREC",    "aUSGDEF",       "drives",  [0, 0],  "Receipts vs outlays = deficit"),
    ("aUSXGBINTA",   "aUSFOUTL",      "part_of", None,    "Net interest = component of outlays"),
    ("aUSXGBSOCA",   "aUSFOUTL",      "part_of", None,    "SS = component of outlays"),
    ("aUSXGBMEDA",   "aUSFOUTL",      "part_of", None,    "Medicare = component of outlays"),
    ("aUSXGBDEFA",   "aUSFOUTL",      "part_of", None,    "Defense = component of outlays"),
    ("aUSEBM10Y",    "aUSXGBINTA",    "drives",  [3, 12], "10Y drives net interest as Treasuries roll"),
    ("aUSFEDETOS",   "aUSPDEBTA",     "related", None,    "Gross vs public debt"),
    ("aUSPDBTR",     "aUSFEDETOS",    "related", None,    "Debt/GDP = sustainability framing"),
    ("aUSFEDETOS",   "aUSSECMKTA",    "part_of", None,    "Marketable Treasuries = component"),

    # Bank credit
    ("aUSBCACIB/A",  "aUSCGDPPD/A",   "drives",  [3, 6],  "C&I credit fuels business"),
    ("aUSBCAREB/A",  "aUSTCONS/A",    "drives",  [1, 3],  "RE loans fund construction"),
    ("aUSBCALCB",    "aUSCRDOUTA",    "related", None,    "Bank consumer loans overlap with G.19"),
    ("aUSBCLALQ/A",  "aUSBDLALQ/A",   "related", None,    "Charge-offs trail delinquencies"),
    ("aUSBDLCOCQ/A", "aUSBCLCOCQ/A",  "leads",   [3, 6],  "Card delinquencies precede charge-offs"),
    ("aUSBDLRECQ/A", "aUSBCLRECQ/A",  "leads",   [3, 6],  "CRE delinquencies precede charge-offs"),
    ("aUSBDLCOCQ/A", "aUSCRCDACR",    "drives",  [3, 6],  "Card delinquencies drive APR up"),
    ("aUSBNRQP",     "aUSBCLALQ/A",   "related", None,    "Bankruptcies co-move with charge-offs"),

    # Equities
    ("aUSSPCOM",     "aUSCONCF/A",    "drives",  [0, 1],  "Equity wealth boosts confidence"),
    ("aUSSPCOM",     "aUSCSIUM",      "drives",  [0, 1],  "Equity wealth boosts UMich sentiment"),
    ("aUSSPRPER",    "aUSSPCOM",      "drives",  [0, 0],  "P/E10 = price/10y earnings"),
    ("aUSSPREPS",    "aUSSPRPER",     "drives",  [0, 0],  "EPS denominator of P/E10"),
    ("aUSSPDIVY",    "aUSSPCOM",      "related", None,    "Yield = dividends/price"),
    ("aUSSPMDPS",    "aUSSPDIVY",     "drives",  [0, 0],  "Dividend level vs yield"),
    ("aUSEBM10Y",    "aUSSPRPER",     "drives",  [3, 6],  "Higher long rates compress P/E"),
    ("aUSFEDFUND",   "aUSSPCOM",      "drives",  [3, 12], "Fed tightening pressures equities"),

    # FX / external
    ("aUSCXTWF/C",   "aUSCXTWYF",     "drives",  [0, 0],  "TWI level vs YoY"),
    ("aUSCXTWF/C",   "aUSCXTRF/C",    "related", None,    "Nominal vs real TWI"),
    ("aUSBISNXBR",   "aUSCXTWF/C",    "related", None,    "BIS EER vs Fed TWI"),
    ("aUSBISRXBR",   "aUSBISNXBR",    "related", None,    "Real vs nominal BIS EER"),
    ("aUSXRUSD",     "aUSCXTWF/C",    "related", None,    "EUR/USD is largest weight in TWI"),
    ("aUSCXTWF/C",   "aUSIMPP",       "drives",  [1, 3],  "Strong USD lowers import prices"),
    ("aUSCXTWF/C",   "aUSEXPP",       "drives",  [1, 3],  "Strong USD compresses USD-denom exports"),
    ("aUSFEDFUND",   "aUSCXTWF/C",    "drives",  [0, 3],  "Higher US rates support USD"),
    ("aUSCURAC",     "aUSGBALBA",     "related", None,    "Goods trade is largest CA component"),
    ("aUSGBARBA",    "aUSGBALBA",     "related", None,    "Two goods-trade-balance series"),

    # Energy
    ("aUSEPGAPG",    "aUSEPDAPG",     "related", None,    "Gasoline and diesel co-move (crude-driven)"),
    ("aUSEIACS",     "aUSEPGAPG",     "drives",  [0, 1],  "Tight crude inventory lifts gasoline"),
    ("aUSSCCO",      "aUSEIACS",      "part_of", None,    "Cushing is part of total US crude ex-SPR"),
    ("aUSEIAGS",     "aUSEPGAPG",     "drives",  [0, 1],  "Gasoline inventory lifts retail price"),
    ("aUSEIAPRU",    "aUSEIAGS",      "drives",  [0, 1],  "Refinery util sets gasoline production"),
    ("aUSEIAHOS",    "aUSEIACS",      "related", None,    "SPR vs commercial crude"),

    # Forecasts -> actuals
    ("aUSFCBOUT",    "aUSFOUTL",      "related", None,    "CBO outlays vs actual"),
    ("aUSFCBREV",    "aUSFEDREC",     "related", None,    "CBO revenue vs actual"),
    ("aUSFCCUFHR",   "aUSUNTOTR",     "related", None,    "Fed SEP UR vs actual"),
    ("aUSFCCCFHR",   "aUSPCE2AR",     "related", None,    "Fed SEP core PCE vs actual"),
]


# ============================================================================
#  CLUSTER COLORS (for node fills)
# ============================================================================
CLUSTER_COLORS = {
    "inflation":       "#ff8a00",
    "employment":      "#22c55e",
    "unemployment":    "#16a34a",
    "wages":           "#15803d",
    "gdp":             "#3b82f6",
    "consumption":     "#0ea5e9",
    "investment":      "#0284c7",
    "government":      "#7c3aed",
    "housing_act":     "#a855f7",
    "housing_px":      "#9333ea",
    "surveys":         "#eab308",
    "fed":             "#ec4899",
    "treasury":        "#f43f5e",
    "bank_lending":    "#06b6d4",
    "money":           "#0891b2",
    "consumer_credit": "#0e7490",
    "mortgage":        "#c026d3",
    "equity":          "#84cc16",
    "trade":           "#f97316",
    "fx":              "#fb923c",
    "energy":          "#dc2626",
    "auto":            "#7e22ce",
    "bankruptcies":    "#b91c1c",
    "forecasts":       "#94a3b8",
}


# ============================================================================
#  LAYOUT — force-directed cluster layout WITHIN each region
# ============================================================================
def cluster_layout(
    members: list[dict],
    edges_within: list[tuple[str, str]],
    cx: float,
    cy: float,
    iterations: int = 200,
    spring_length: float = 110.0,
    repulsion: float = 18000.0,
    region_pull: float = 0.012,
    cooling: float = 0.94,
) -> dict[str, tuple[float, float]]:
    """Force-directed layout for nodes inside a single region.

    Forces:
      - Edge springs between connected members within the same region
      - Repulsion between every pair of members (inverse-square)
      - Linear pull toward (cx, cy) so nodes don't drift out of region
    """
    if not members:
        return {}
    rng = random.Random(hash(",".join(m["ric"] for m in members)) & 0xffffffff)

    # Initialize: scatter near region center with deterministic-but-varied offsets
    pos: dict[str, list[float]] = {}
    n = len(members)
    for i, m in enumerate(members):
        # spiral-ish initial seeding so very symmetric edge graphs don't cancel forces
        angle = (i * 137.5) * math.pi / 180.0
        r0 = 30 + rng.uniform(0, 40)
        pos[m["ric"]] = [
            cx + r0 * math.cos(angle) + rng.uniform(-15, 15),
            cy + r0 * math.sin(angle) + rng.uniform(-15, 15),
        ]

    rics = [m["ric"] for m in members]
    edge_set = set()
    for s, t in edges_within:
        if s in pos and t in pos:
            edge_set.add((s, t))

    step = 1.0
    for _ in range(iterations):
        force = {r: [0.0, 0.0] for r in rics}

        # Region anchor pull — pulls each node toward (cx, cy) softly
        for r, (x, y) in pos.items():
            dx = x - cx
            dy = y - cy
            force[r][0] -= region_pull * dx
            force[r][1] -= region_pull * dy

        # Pairwise repulsion (inverse-square)
        for i in range(len(rics)):
            ri = rics[i]
            xi, yi = pos[ri]
            for j in range(i + 1, len(rics)):
                rj = rics[j]
                xj, yj = pos[rj]
                dx = xi - xj
                dy = yi - yj
                d2 = dx * dx + dy * dy + 0.01
                d = math.sqrt(d2)
                f = repulsion / d2
                fx = f * dx / d
                fy = f * dy / d
                force[ri][0] += fx
                force[ri][1] += fy
                force[rj][0] -= fx
                force[rj][1] -= fy

        # Edge springs — pull connected members together
        for s, t in edge_set:
            xs, ys = pos[s]
            xt, yt = pos[t]
            dx = xt - xs
            dy = yt - ys
            d = math.sqrt(dx * dx + dy * dy) or 0.01
            spring = 0.04 * (d - spring_length)
            fx = spring * dx / d
            fy = spring * dy / d
            force[s][0] += fx
            force[s][1] += fy
            force[t][0] -= fx
            force[t][1] -= fy

        # Apply with cooling
        for r in rics:
            fx, fy = force[r]
            # Cap step magnitude
            mag = math.sqrt(fx * fx + fy * fy)
            if mag > 25:
                fx = fx * 25 / mag
                fy = fy * 25 / mag
            pos[r][0] += fx * step
            pos[r][1] += fy * step
        step *= cooling

    return {r: (xy[0], xy[1]) for r, xy in pos.items()}


def assign_positions(entries: list[dict], edges_all: list[tuple]) -> dict[str, tuple[float, float]]:
    """Place each entry inside its region using a force-directed cluster layout."""
    positions: dict[str, tuple[float, float]] = {}
    by_region: dict[str, list[dict]] = {}
    for e in entries:
        by_region.setdefault(e["region"], []).append(e)

    region_of = {e["ric"]: e["region"] for e in entries}
    edges_by_region: dict[str, list[tuple[str, str]]] = {}
    for src, tgt, *_ in edges_all:
        rs = region_of.get(src)
        rt = region_of.get(tgt)
        if rs and rt and rs == rt:
            edges_by_region.setdefault(rs, []).append((src, tgt))

    for region_id, members in by_region.items():
        meta = REGIONS.get(region_id)
        if not meta:
            continue
        within = edges_by_region.get(region_id, [])
        # More breathing room: bigger spring lengths + much stronger repulsion so
        # nodes (and their labels) don't overlap.
        n = len(members)
        spring = 180 if n > 16 else 150
        repulsion = 38000 if n > 16 else 28000
        layout = cluster_layout(members, within, meta["cx"], meta["cy"],
                                iterations=300, spring_length=spring, repulsion=repulsion,
                                region_pull=0.008)
        positions.update(layout)
    return positions


# ============================================================================
#  BUILD
# ============================================================================
def build() -> dict:
    with open(os.path.join(CATALOG_DIR, "_index.json"), encoding="utf-8") as f:
        idx = json.load(f)
    catalog_rics = idx["rics"]

    positions = assign_positions(CONDENSED, EDGES)

    nodes = []
    skipped = []
    region_counts: dict[str, int] = {}
    cluster_counts: dict[str, int] = {}
    for entry in CONDENSED:
        ric = entry["ric"]
        if ric not in catalog_rics:
            skipped.append(ric)
            continue
        cat_meta = catalog_rics[ric]
        x, y = positions.get(ric, (0, 0))
        nodes.append({
            "id": ric,
            "label": entry["name"],
            "description": cat_meta.get("description", ""),
            "frequency": cat_meta.get("frequency", ""),
            "cluster": entry["cluster"],
            "category_slug": cat_meta.get("slug", ""),
            "importance": entry["importance"],
            "region": entry["region"],
            "x": x,
            "y": y,
        })
        region_counts[entry["region"]] = region_counts.get(entry["region"], 0) + 1
        cluster_counts[entry["cluster"]] = cluster_counts.get(entry["cluster"], 0) + 1

    if skipped:
        print(f"[condensed] WARNING: {len(skipped)} RICs not in catalog: {skipped}")

    node_set = {n["id"] for n in nodes}
    edges = []
    skipped_edges = []
    for src, tgt, etype, lag, note in EDGES:
        if src not in node_set or tgt not in node_set:
            skipped_edges.append((src, tgt))
            continue
        edges.append({
            "source": src, "target": tgt, "type": etype,
            "lag_months": lag, "confidence": "hand", "note": note,
        })

    if skipped_edges:
        print(f"[condensed] WARNING: {len(skipped_edges)} edges reference missing RICs:")
        for s, t in skipped_edges:
            print(f"   {s} -> {t}")

    regions_out = []
    for rid, meta in REGIONS.items():
        regions_out.append({
            "id": rid,
            "label": meta["label"],
            "color": meta["color"],
            "cx": meta["cx"],
            "cy": meta["cy"],
            "ric_count": region_counts.get(rid, 0),
        })

    clusters_out = [{"id": cid, "color": col, "ric_count": cluster_counts.get(cid, 0)}
                    for cid, col in CLUSTER_COLORS.items()]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "region_count": len(regions_out),
            "skipped_rics": len(skipped),
            "skipped_edges": len(skipped_edges),
        },
        "regions": regions_out,
        "clusters": clusters_out,
        "nodes": nodes,
        "edges": edges,
    }


def main() -> int:
    g = build()
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(g, f, ensure_ascii=False, indent=2)
    s = g["stats"]
    print(f"[condensed] {s['node_count']} nodes, {s['edge_count']} edges, {s['region_count']} regions")
    print(f"[condensed] skipped {s['skipped_rics']} bad RICs, {s['skipped_edges']} bad edges")
    print(f"[condensed] -> {OUTPUT_PATH}")
    return 0 if (s["skipped_rics"] == 0 and s["skipped_edges"] == 0) else 1


if __name__ == "__main__":
    sys.exit(main())

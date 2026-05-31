# Finance Terminal (T10) — review brief

A new **CFO terminal** built natively inside the LBC launcher shell (vanilla
Babel-in-browser React + PostgREST over a Supabase `finance` schema). It is a
double-entry ledger for 3 IDR entities (LBC / LAM / LHF). Seeded with 16 realistic
demo entries for LBC, period May 2026. This brief describes the RENDERED state so a
UX reviewer can judge it as a real user would.

The terminal sits inside the standard LBC shell chrome: a top tab strip, a global
search bar + market ticker strip (BBCA, USD/IDR, etc.), then the Finance terminal
fills the rest. Accent colour is **emerald `#5fd6a4`** (every other terminal has its
own accent; LEGION is violet, Asset Mgmt is paper-white). Canvas is near-black, text
is light, all numbers are monospaced + tabular.

## Header (always visible)
- Left: emerald coin mark + "Finance" / "CFO · DOUBLE-ENTRY LEDGER".
- Center-right: ENTITY segmented control [ ALL | LAM | LBC | LHF ] (LBC active, emerald fill).
- PERIOD dropdown ("May 2026", also offers recent months / a quarter / YTD).
- "+ New entry" emerald button (also opens with keyboard `n`).

## Left nav rail (sections, with F-key hints)
OVERVIEW: Dashboard (F1). RECORD: Ledger (F2), Transfers, Recurring.
STRUCTURE: Accounts (F3), Tags. REPORT: Statements (F4). CONTROL: Periods, Audit, Settings.

## Dashboard
- 4 KPI cards: Cash & banks **Rp 3.78 B**; Net income · May 2026 **Rp 737 M** (green, "Profit");
  Net worth **Rp 5.78 B** (green, "Assets − liabilities"); Receivables/Payables **Rp 0 / Rp 0**.
- Lower-left panel "Recent entries" (16 total) — a table of the latest entries.
- Lower-right panel "Income vs expense · May 2026" — two horizontal bars (Income Rp 1,392,500,000 green;
  Expense Rp 656,000,000 red) + a balance-sheet check (Total assets vs Liabilities+equity + "Balanced" chip).

## Ledger (General ledger)
- Filter bar: Account dropdown, From date, To date, Search (memo/ref), + New entry.
- Table columns: Date | Ref (emerald, clickable) | Memo | Accounts (codes touched) | Amount (IDR, right-aligned).
- Row click opens a transaction detail modal (journal lines DR/CR + totals + audit history).
- 50/page pagination.

## Accounts (Chart of accounts)
- Table: Code (emerald) | Account (tree-indented; roots BOLD UPPERCASE) | Type | Balance (IDR, green/red by sign).
- Roots: 1000 ASSETS … 5000 EXPENSES; leaves indented beneath.

## Statements (Financial statements)
- Sub-nav tabs: [ Trial Balance | Income Statement | Balance Sheet | Cash Flow ] + "Export CSV".
- Trial Balance: Code | Account | Type | Debit | Credit, totals + balanced chip.
- Income Statement: Income tree + Expense tree + Net income row.
- Balance Sheet: Assets / Liabilities / Equity (incl. Retained earnings YTD) + Assets = L+E check.
- Cash Flow: Operating / Investing / Financing + opening/closing cash reconciliation.

## New entry (modal)
- Simple mode: From (credited) → To (debited) account selects + Amount.
- Advanced mode: multi-line journal grid (account / debit / credit per line) with a live
  "Balanced / Out of balance · DR x CR y" bar; Post disabled until balanced.

## Known rough edges already observed (validate + extend)
1. Table cells wrap and rows get tall: dates like "30 May 2026" wrap to 2 lines (Date column too narrow);
   memos and account names wrap ("Cash & Equivalents" → 2 lines), making rows ~2-3x tall.
2. In the Dashboard 2-column grid, the "Income vs expense · May 2026" panel title wraps to 2 lines.
3. The "+ New entry" button appears twice on the Ledger (header + filter bar).
4. Account "Type" shows raw lowercase enum ("asset", "equity") — not titlecased.

## ROUND 1 CHANGES ALREADY APPLIED (verify these landed; don't re-litigate)
- Accent pivoted from emerald to **teal-cyan `#36c1d4`** so it no longer collides with semantic positive-green (`--pos`). Verify teal is used for chrome/CTA/codes and green only for positive values.
- Radii pulled to house tokens (panels/kpi/tables `--r-3` 4px, buttons `--r-2` 3px, modal `--r-4` 6px, chips 3px).
- Tables: `white-space:nowrap`+ellipsis on text cells, but NUMERIC cells never truncate; row height ~34px → single-line dense rows. Verified: dashboard recent-entries + ledger no longer wrap.
- New-entry simple mode reframed to **DEBIT — account charged / CREDIT — account reduced** with a live plain-language effect line (e.g. "Cash increases · Mgmt fee income increases · Rp …"). Replaces the confusing From→To.
- Ledger filtered to a single account now shows a **running balance** (Date|Ref|Memo|Debit|Credit|Balance) — reconciliation view. Verified balances reconcile to the dashboard cash figure.
- Duplicate "New entry" button removed from the ledger (header button + `N` shortcut remain).
- Account types titlecased (Asset/Equity/…) in the Accounts tree. Segmented controls use the house paper active style; header gradient removed; nav labels ≥11px; letter-spacing 0.06em.

## KNOWN DEFERRED (call out if you think any is must-have before "final")
- Drill-through from a statement line → filtered ledger (UX agent flagged round 1).
- "Posted today" signal on the dashboard.
- Period open/closed lock chip near the period selector.
- Titlecasing the Type column inside the Trial Balance report (finance-reports.jsx) and any residual raw-enum displays in finance-ops.jsx.

## What "good" means here
Match the rest of the LBC terminal (see launcher/styles/legion.css and asset-mgmt.css for the
house system: tokens, density, table styling, chips, panels). It must feel like a Bloomberg-grade
institutional finance tool a CFO trusts — dense, precise, calm, fast to scan; not a generic SaaS dashboard.

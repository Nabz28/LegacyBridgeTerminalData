# Local research tooling

These four scripts build the heavy analysis packs for deep research rounds. They are versioned
here; **their output is not.** Every extract writes to a local folder outside this repository and
outside the database, by standing instruction: heavy data stays local, only conclusions go to
Supabase and the terminal. As of 2026-08-07 that folder holds ~36MB across 123 packs.

| Script | Builds |
|---|---|
| `extract_archive.py` | Per-category packs from the CEIC-style archive, plus equity fundamentals |
| `build_id_industry.py` | Joins Indonesian industry archive data to the IDX names that trade on it |
| `bloc_pack.py` | Level, momentum and cross-bloc correlation for country desks the archive cannot reach |
| `coverage_audit.py` | What has been researched, at what assurance, and what has not |

Run with `SUPABASE_SERVICE_ROLE` set. Point `HERE` at the local data folder.

## Bugs already fixed here — do not reintroduce them

Four rounds of adversarial review in August 2026 found two bugs in this tooling, both of the same
family: **a truncation invisible because the artifact looked complete.** Each produced a confident
published figure wrong by a large multiple.

**1. Mislabelled time windows** (`bloc_pack.py`). Returns were indexed back N *observations* but
labelled in *days*. For monthly series the columns lied — a coal benchmark's "ret_63d" was a
**62-month** return sitting beside the S&P's 63 trading days — and percent-changing rates rather
than differencing them hid a 25bp ECB hike. Now: windows are calendar-anchored and every value
carries its `from` date, rates are differenced to basis points and flagged `quoted_in`, each driver
reports `obs_spacing_days`, and a sparsity guard refuses any window the series cannot cover.

**2. Mislabelled denominators** (`build_id_industry.py`). The pack shipped the top 26 names by
market cap and readers computed sector shares off that truncated list. We published a name at
**42.7% of its sector**; against the true denominator it was **17.4%**. Now: packs ship
`n_companies_matched`, `matched_universe_mcap`, `sub_sector_totals`, per-name
`share_of_sub_sector_pct` and `share_of_matched_universe_pct`, plus a `share_warning` naming the
sectors matched — because the sector maps are broader than their names suggest.

**3. Silent category truncation** (`extract_archive.py`). Selection sorted the whole catalogue by
recency and sliced to a global top-N, so entire categories vanished. Two US notes were written
*around* data they declared absent, and a report told the board "Indonesian GDP is not in the
extracted set" when it was. Now: a per-category quota with a ceiling high enough that nothing
drops, and every truncated series carries `n_obs_total`, `n_obs_shipped`, `observations_from` and a
`window_warning`.

## The rule underneath all three

An absent file reads as an absent fact, and a truncated list reads as a complete one. **Any
pack-building step must either cover everything or say explicitly what it dropped.** Never let a
gap be silent — an analyst will correctly report "this data does not exist" and be wrong.

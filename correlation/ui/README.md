# Correlation Matrix Terminal — UI (v1)

Vanilla HTML/JS single-page app on top of a tiny Flask backend that serves
correlation matrices computed from cached returns (weekly + monthly).

## Install

```
pip install flask pandas pyarrow scipy
```

## Run

```
python correlation/ui/backend/app.py
```

Then open <http://localhost:5174>.

## What you get

- Left panel: full universe (708 series, 12 categories), collapsible, filterable
- Top bar: 11 prebuilt templates, weekly/monthly toggle, Pearson/Spearman toggle, ⌘K spotlight
- Main view: canvas-based correlation heatmap with hover tooltip + click-to-inspect
- Bottom panel: scatter (with OLS line) + 52w rolling Pearson chart

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/series` | Full series catalog with availability flag |
| `GET /api/template/<name>` | Precomputed matrix for a named template |
| `POST /api/compute_subset` | Compute a custom matrix on-the-fly |
| `GET /api/pair/<a>/<b>` | Pair stats + scatter + rolling correlation |
| `GET /api/rolling/<a>/<b>?window=52w` | Rolling Pearson series |

## Implementation notes

- Returns parquets are loaded once into memory at startup (~100MB).
- On first start, static JSONs are written to `static/data/` (series catalog,
  cluster order, and one matrix per template) so first paint is instant.
- The heatmap is a single `<canvas>` (not DOM cells) — handles 600×600
  without breaking a sweat.
- Chart.js v4 is used only for the bottom-panel scatter + line charts.

## Templates

`us_macro_xa`, `indo_domestic`, `indo_xborder`, `china_hk`, `asia_beta`,
`g10_em_fx`, `commodities`, `risk_factors`, `europe_xa`,
`energy_transition`, `crypto_equity`.

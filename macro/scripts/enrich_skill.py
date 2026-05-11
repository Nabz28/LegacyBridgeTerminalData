"""LLM-assisted Tier-2 enrichment of catalog/*.json skill content.

Workflow:
  - Reads one or more catalog/<slug>.json files
  - For each RIC missing 'meaning' (or with --force, all RICs), asks Claude to
    fill in: meaning, how_to_use, related_series, units, subcategory
  - Writes the file back, preserving the original RIC ordering and any
    already-curated fields not in the model's response
  - Idempotent: re-running on a category whose content is already filled is a no-op
  - Can write a per-category review markdown to /tmp for human pass before commit

Usage:
  export ANTHROPIC_API_KEY=sk-...
  python scripts/enrich_skill.py us_consumer_prices_inflation
  python scripts/enrich_skill.py us_consumer_prices_inflation us_employment_hours
  python scripts/enrich_skill.py --all                   # every category
  python scripts/enrich_skill.py us_banking --dry-run    # write to /tmp, no commit
  python scripts/enrich_skill.py us_banking --force      # overwrite filled fields too

Model: claude-sonnet-4-6 (good price/quality for this batch task).
Prompt caching: the system block (style guide + few-shots) is cached, so per-call
cost scales with category size, not catalog size. A full 50-category run is ~$3-5.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Any

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_DIR = os.path.join(REPO_ROOT, "catalog")

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 8192


SYSTEM_PROMPT = """You are documenting US macroeconomic time-series fetched from Refinitiv for a Bloomberg-style terminal.

Your job: for each RIC in a category JSON I send you, return enriched skill content that a market practitioner (buy-side analyst, macro PM, central-bank watcher) would value when the series surfaces in their terminal.

For every RIC, fill these fields:
- meaning: 1-3 sentences explaining what the series measures, who publishes it, frequency. State plainly what the number IS.
- how_to_use: 1-3 sentences on how a practitioner reads it: what level/move is meaningful, what to compare it against, what it leads or lags, common pitfalls or revisions.
- related_series: 2-5 RIC codes from the SAME catalog file that a user would likely chart alongside this one. Use only RIC codes you see in the input list. Do NOT invent RICs.
- units: short canonical units string ("%", "%, YoY", "Index (1985=100)", "Thousands of units, SAAR", "USD billions", etc.). Empty string if genuinely unknown.
- subcategory: short grouping label inside the category (e.g. for CPI: "Headline", "Core", "Shelter", "Food"). Empty string if no useful grouping.

Writing style:
- Terse, professional, market-aware. No hype, no marketing tone.
- Don't restate the description; assume the reader can see it.
- Don't use emoji or markdown formatting in field values.
- Acronyms on first use are fine (BLS, BEA, FOMC) — your reader knows them.
- If a series is genuinely obscure or unclear (e.g. a regional sub-aggregate where you can't pin down standard practitioner usage), keep meaning factual and write how_to_use as "Cross-section / drill-down series; use alongside the headline {series} to see {dimension} composition." rather than inventing.

Output format:
- Return a SINGLE JSON object (not wrapped, not in a code fence) with shape:
  {"rics": [{"ric": "...", "meaning": "...", "how_to_use": "...", "related_series": [...], "units": "...", "subcategory": "..."}, ...]}
- Include EVERY RIC in the input list, in the same order, with all fields populated.
- No commentary outside the JSON.
"""


def slugs_to_process(args_slugs: list[str], all_flag: bool) -> list[str]:
    if all_flag:
        slugs = []
        for f in sorted(os.listdir(CATALOG_DIR)):
            if f.endswith(".json") and f != "_index.json":
                slugs.append(f[:-5])
        return slugs
    if not args_slugs:
        raise SystemExit("Provide one or more category slugs, or pass --all")
    return list(args_slugs)


def filter_targets(rics: list[dict], force: bool) -> list[dict]:
    if force:
        return rics
    return [r for r in rics if not (r.get("meaning") or "").strip()]


def build_user_message(slug: str, category_name: str, targets: list[dict]) -> str:
    payload = {
        "category": category_name,
        "category_slug": slug,
        "rics": [
            {
                "ric": r["ric"],
                "description": r.get("description", ""),
                "frequency": r.get("frequency", ""),
            }
            for r in targets
        ],
    }
    return (
        f"Enrich skill content for these {len(targets)} RICs in the '{category_name}' "
        f"category. Input:\n\n```json\n"
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + "\n```\n\nReturn the enriched JSON now."
    )


def call_claude(client: Any, user_msg: str) -> dict:
    resp = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )
    text = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text")
    text = text.strip()
    if text.startswith("```"):
        # strip code fence if model added one despite instructions
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"model did not return valid JSON: {e}\n--- raw ---\n{text[:500]}")
    if "rics" not in parsed or not isinstance(parsed["rics"], list):
        raise RuntimeError("model response missing 'rics' array")
    cache_in = getattr(resp.usage, "cache_read_input_tokens", 0) or 0
    cache_create = getattr(resp.usage, "cache_creation_input_tokens", 0) or 0
    print(f"    [usage] in={resp.usage.input_tokens}  cache_read={cache_in}  cache_create={cache_create}  out={resp.usage.output_tokens}")
    return parsed


def merge_enrichment(existing: list[dict], enriched: dict) -> tuple[list[dict], int]:
    enriched_by_ric = {item.get("ric"): item for item in enriched["rics"]}
    updated = 0
    for entry in existing:
        e = enriched_by_ric.get(entry["ric"])
        if not e:
            continue
        for field in ("meaning", "how_to_use", "related_series", "units", "subcategory"):
            val = e.get(field)
            if val is None:
                continue
            entry[field] = val
        updated += 1
    return existing, updated


def process_slug(client: Any, slug: str, force: bool, dry_run: bool, batch_size: int) -> bool:
    path = os.path.join(CATALOG_DIR, f"{slug}.json")
    if not os.path.exists(path):
        print(f"  SKIP: catalog/{slug}.json not found")
        return False

    with open(path, encoding="utf-8") as f:
        cat = json.load(f)

    targets = filter_targets(cat.get("rics", []), force)
    if not targets:
        print(f"  [{slug}] all RICs already enriched, skipping (use --force to override)")
        return True

    print(f"  [{slug}] enriching {len(targets)}/{len(cat['rics'])} RICs ({cat['category']})")

    # Batch large categories so we don't blow MAX_TOKENS on output.
    # ~70 tokens of output per RIC is typical; with MAX_TOKENS=8192 we're safe up to ~100 RICs.
    all_enriched: list[dict] = []
    for i in range(0, len(targets), batch_size):
        chunk = targets[i : i + batch_size]
        msg = build_user_message(slug, cat["category"], chunk)
        print(f"    batch {i // batch_size + 1}: RICs {i + 1}-{i + len(chunk)}")
        for attempt in range(3):
            try:
                enriched = call_claude(client, msg)
                all_enriched.extend(enriched["rics"])
                break
            except Exception as e:
                if attempt == 2:
                    print(f"    FAILED after 3 attempts: {e}")
                    return False
                print(f"    retry {attempt + 1}: {e}")
                time.sleep(2 * (attempt + 1))

    cat["rics"], n_merged = merge_enrichment(cat["rics"], {"rics": all_enriched})

    out_path = path
    if dry_run:
        out_path = os.path.join("/tmp", f"{slug}.enriched.json")
        os.makedirs("/tmp", exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(cat, f, ensure_ascii=False, indent=2)
    print(f"    wrote {n_merged} enriched RICs -> {out_path}")
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("slugs", nargs="*", help="Category slug(s), e.g. us_banking")
    ap.add_argument("--all", action="store_true", help="Process every category")
    ap.add_argument("--force", action="store_true", help="Overwrite filled fields")
    ap.add_argument("--dry-run", action="store_true", help="Write outputs to /tmp instead of catalog/")
    ap.add_argument("--batch-size", type=int, default=80, help="RICs per LLM call (default 80)")
    args = ap.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY env var not set", file=sys.stderr)
        return 2
    try:
        from anthropic import Anthropic  # type: ignore
    except ImportError:
        print("ERROR: anthropic package not installed. Run: pip install anthropic", file=sys.stderr)
        return 2

    client = Anthropic()
    slugs = slugs_to_process(args.slugs, args.all)
    print(f"[enrich] processing {len(slugs)} categor{'y' if len(slugs) == 1 else 'ies'}")

    failed: list[str] = []
    for slug in slugs:
        ok = process_slug(client, slug, args.force, args.dry_run, args.batch_size)
        if not ok:
            failed.append(slug)

    print()
    if failed:
        print(f"[enrich] FAILED: {failed}")
        return 1
    print("[enrich] done")
    return 0


if __name__ == "__main__":
    sys.exit(main())

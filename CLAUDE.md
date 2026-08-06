# Legacy Bridge Terminal

A research operating system for Indonesian equity work — 13 terminals behind one login. Vanilla Babel-in-browser React shell (`launcher/`, no bundler) over Supabase (Narin's Plus, ref `adnubucjlezrtusbicja`). Embedded sub-apps: `management/`, `network/`, `yggdrasil/`, `autocharter/`, `correlation/`, `macro/`.

**Research Desk (T12)** is the UI for the autonomous research system — it replaced
the old Monitor (T12) + Research (T13) pair. The 23-desk taxonomy lives in the
database (`research.desk`, seeded by the pipeline), not in frontend code; the
terminal (`launcher/scripts/research-desk-*.jsx`) only reads. Dials, signals,
briefs, theses and ops freshness are written nightly by `pipeline/`. See
[docs/RESEARCH_SYSTEM.md](docs/RESEARCH_SYSTEM.md).

## LEGION (T9) — the AI chief of staff

This repo hosts **LEGION**, LBC's AI assistant and knowledge brain (the 9th terminal). LEGION is a deliberate **mode**, not the default — normal dev work here (fixing terminals, builds) is *not* LEGION.

**To engage LEGION**, the principal runs **`/legion`** (or `/lbc`, or says "engage LEGION"). When engaged: read **[LEGION.md](LEGION.md)** and follow it exactly — announce the transition, connect to the `brain` schema, load the index, triage the inbox, give a status read. Exit with `/legion exit`.

If you are not asked to engage LEGION, stay in normal Claude Code mode.

# Legacy Bridge Terminal

A research operating system for Indonesian equity work — 13 terminals behind one login. Vanilla Babel-in-browser React shell (`launcher/`, no bundler) over Supabase (Narin's Plus, ref `adnubucjlezrtusbicja`). Embedded sub-apps: `management/`, `network/`, `yggdrasil/`, `autocharter/`, `correlation/`, `macro/`.

**Monitor (T12) and Research (T13) share one coverage spine** — the 13 desks and
their sub-industries in `launcher/scripts/monitor-data.js`. Monitor is the tape
(prices, regime, breadth); Research is the view (house stance per desk and
sub-industry, the note book, the watchlist). See [docs/RESEARCH.md](docs/RESEARCH.md).
Never fork the taxonomy — add sub-industries in `monitor-data.js` and both pick
them up.

## LEGION (T9) — the AI chief of staff

This repo hosts **LEGION**, LBC's AI assistant and knowledge brain (the 9th terminal). LEGION is a deliberate **mode**, not the default — normal dev work here (fixing terminals, builds) is *not* LEGION.

**To engage LEGION**, the principal runs **`/legion`** (or `/lbc`, or says "engage LEGION"). When engaged: read **[LEGION.md](LEGION.md)** and follow it exactly — announce the transition, connect to the `brain` schema, load the index, triage the inbox, give a status read. Exit with `/legion exit`.

If you are not asked to engage LEGION, stay in normal Claude Code mode.

/**
 * HomeTab — the launcher.
 *
 * Lists every run in the corpus as a row in a dense table. Click a
 * row to open it in a new tab. Sprint 7 also surfaces:
 *   - prompt versions installed
 *   - corpus stats (run count, scored count)
 *
 * Compare / Leaderboard / Entity tabs are stubbed in the launcher
 * with "Sprint 10" labels so the navigation surface is visible
 * even though the screens aren't implemented yet.
 */

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { RunIndexRow } from '../api/types';
import { useTabsStore } from '../state/tabs';
import './HomeTab.css';

export function HomeTab() {
  const [runs, setRuns] = useState<RunIndexRow[] | null>(null);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const openRunTab = useTabsStore((s) => s.openRunTab);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, p] = await Promise.all([api.listRuns(), api.listPrompts()]);
        if (!cancelled) {
          setRuns(r);
          setPrompts(p);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="home-tab home-tab--error">
        <div className="home-tab__error-card">
          <div className="home-tab__error-title">API UNREACHABLE</div>
          <div className="home-tab__error-body">{error}</div>
          <div className="home-tab__error-hint">
            Start the backend: <code>yggdrasil terminal serve --runs-root runs_demo</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-tab">
      <header className="home-tab__header">
        <div className="home-tab__title">
          YGGDRASIL TERMINAL <span className="home-tab__title-dim">/ HOME</span>
        </div>
        <div className="home-tab__subtitle">
          asset-management research planning · {runs?.length ?? '…'} runs ·{' '}
          {prompts.length} prompt {prompts.length === 1 ? 'version' : 'versions'}
        </div>
      </header>

      <section className="home-tab__section">
        <div className="home-tab__section-head">
          <span className="home-tab__section-label">RUNS</span>
          <span className="home-tab__section-meta">click to open in a new tab</span>
        </div>
        <div className="home-tab__table">
          <div className="home-tab__row home-tab__row--head">
            <span className="home-tab__cell home-tab__cell--name">RUN</span>
            <span className="home-tab__cell home-tab__cell--topic">TOPIC</span>
            <span className="home-tab__cell home-tab__cell--num">NODES</span>
            <span className="home-tab__cell home-tab__cell--num">SCORE</span>
            <span className="home-tab__cell home-tab__cell--ver">PROMPTS</span>
          </div>
          {runs === null && (
            <div className="home-tab__row home-tab__row--empty">loading…</div>
          )}
          {runs !== null && runs.length === 0 && (
            <div className="home-tab__row home-tab__row--empty">
              no runs in this corpus — `yggdrasil run new --topic ...`
            </div>
          )}
          {runs?.map((row) => {
            const isV2 = row.prompts_version === 'v2';
            return (
              <div
                key={row.run_dir_name}
                className="home-tab__row home-tab__row--clickable"
                onClick={() =>
                  openRunTab(
                    row.run_dir_name,
                    shortTitle(row.topic ?? row.run_dir_name),
                  )
                }
              >
                <span className="home-tab__cell home-tab__cell--name">
                  {row.run_dir_name.split('-').slice(-1)[0]}
                </span>
                <span className="home-tab__cell home-tab__cell--topic">
                  {row.error ? (
                    <span className="home-tab__error-inline">
                      [error] {row.error}
                    </span>
                  ) : (
                    row.topic ?? '—'
                  )}
                </span>
                <span className="home-tab__cell home-tab__cell--num">
                  {row.node_count ?? '—'}
                </span>
                <span
                  className="home-tab__cell home-tab__cell--num"
                  style={{ color: scoreColor(row.score ?? null) }}
                >
                  {row.score?.toFixed(2) ?? '—'}
                </span>
                <span
                  className="home-tab__cell home-tab__cell--ver"
                  style={isV2 ? { color: 'var(--accent-blue-bright)', fontWeight: 600 } : undefined}
                >
                  {row.prompts_version ?? '—'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="home-tab__section home-tab__section--coming">
        <div className="home-tab__section-head">
          <span className="home-tab__section-label">COMING</span>
        </div>
        <div className="home-tab__coming">
          <div className="home-tab__coming-card">
            <div className="home-tab__coming-title">NEW RUN</div>
            <div className="home-tab__coming-body">
              kick off a tree from the UI; live mode streams nodes in
            </div>
            <div className="home-tab__coming-tag">SPRINT 9</div>
          </div>
          <div className="home-tab__coming-card">
            <div className="home-tab__coming-title">A/B COMPARE</div>
            <div className="home-tab__coming-body">
              v0 vs v1 side-by-side, score-delta heatmap by criterion
            </div>
            <div className="home-tab__coming-tag">SPRINT 10</div>
          </div>
          <div className="home-tab__coming-card">
            <div className="home-tab__coming-title">LEADERBOARD</div>
            <div className="home-tab__coming-body">
              corpus-wide ranking grouped by prompts version
            </div>
            <div className="home-tab__coming-tag">SPRINT 10</div>
          </div>
          <div className="home-tab__coming-card">
            <div className="home-tab__coming-title">ENTITY MAP</div>
            <div className="home-tab__coming-body">
              155 canonical entities — drill into every run that touches one
            </div>
            <div className="home-tab__coming-tag">SPRINT 10</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function shortTitle(topic: string): string {
  if (topic.length <= 40) return topic;
  return topic.slice(0, 37) + '…';
}

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--text-muted)';
  if (score >= 8) return 'var(--signal-up)';
  if (score < 6) return 'var(--signal-down)';
  return 'var(--text-primary)';
}

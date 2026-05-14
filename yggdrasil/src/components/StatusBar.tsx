/**
 * Status bar — pinned to the bottom of the app shell.
 *
 * Surfaces the current run's metadata (when a run tab is active),
 * health of the backend connection, and the active prompt version.
 */

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useTabsStore } from '../state/tabs';
import './StatusBar.css';

export function StatusBar() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        await api.health();
        if (!cancelled) setHealthy(true);
      } catch {
        if (!cancelled) setHealthy(false);
      }
    };
    void ping();
    const id = window.setInterval(ping, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  const dot = healthy === null ? '○' : healthy ? '●' : '✕';
  const dotColor =
    healthy === null
      ? 'var(--text-muted)'
      : healthy
        ? 'var(--signal-up)'
        : 'var(--signal-down)';

  return (
    <div className="status-bar">
      <span className="status-bar__cell">
        <span className="status-bar__label">CTX</span>
        <span className="status-bar__value">
          {activeTab?.kind === 'run'
            ? activeTab.runDirName?.split('-').slice(-1)[0] ?? 'run'
            : 'home'}
        </span>
      </span>
      <span className="status-bar__cell">
        <span className="status-bar__label">TAB</span>
        <span className="status-bar__value">{activeTab?.title ?? '—'}</span>
      </span>
      <span className="status-bar__spacer" />
      <span className="status-bar__cell">
        <span className="status-bar__label">UTC</span>
        <span className="status-bar__value">{utc(now)}</span>
      </span>
      <span className="status-bar__cell">
        <span className="status-bar__label">API</span>
        <span className="status-bar__value" style={{ color: dotColor }}>
          {dot}
        </span>
      </span>
    </div>
  );
}

function utc(d: Date): string {
  return (
    d.getUTCFullYear() +
    '-' +
    pad(d.getUTCMonth() + 1) +
    '-' +
    pad(d.getUTCDate()) +
    ' ' +
    pad(d.getUTCHours()) +
    ':' +
    pad(d.getUTCMinutes()) +
    ':' +
    pad(d.getUTCSeconds())
  );
}
function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

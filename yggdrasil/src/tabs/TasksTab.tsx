/**
 * TasksTab — flat hand-off task list extracted from a run.
 *
 * Sprint 10. Surfaces every ``evidence_need``, ``metric``, and
 * future-dated ``catalyst`` in the tree as a task row with full
 * context: kind, type, zone, pillar, parent claim, key_question,
 * inversion, type-specific fields (threshold, query, event date).
 *
 * Each row's "jump" button opens (or focuses) the parent Run tab and
 * centers the canvas on the task node.
 */

import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { TaskRow, TasksResponse } from '../api/types';
import { useTabsStore } from '../state/tabs';
import './TasksTab.css';

interface Props {
  runDirName: string;
}

type KindFilter = 'all' | 'research' | 'monitor' | 'watch';

export function TasksTab({ runDirName }: Props) {
  const [data, setData] = useState<TasksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [pillarFilter, setPillarFilter] = useState<string | 'all'>('all');
  const jumpToNode = useTabsStore((s) => s.jumpToNode);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    (async () => {
      try {
        const d = await api.getRunTasks(runDirName);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runDirName]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter((t) => {
      if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
      if (pillarFilter !== 'all' && t.pillar !== pillarFilter) return false;
      return true;
    });
  }, [data, kindFilter, pillarFilter]);

  const counts = useMemo(() => {
    // Derive ``total`` from the local array, not the server's
    // ``task_count`` — they should agree today, but if the API ever
    // paginates or truncates, the header would otherwise lie about
    // what the user can actually see + filter.
    const out = { total: 0, research: 0, monitor: 0, watch: 0 };
    for (const t of data?.tasks ?? []) {
      out.total += 1;
      out[t.kind] += 1;
    }
    return out;
  }, [data]);

  if (error) {
    return (
      <div className="tasks-tab tasks-tab--error">
        <div className="tasks-tab__error">
          <div className="tasks-tab__error-title">FAILED TO LOAD TASKS</div>
          <div className="tasks-tab__error-body">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="tasks-tab tasks-tab--loading">loading tasks…</div>;
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${runDirName}.tasks.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tasks-tab">
      <header className="tasks-tab__header">
        <div className="tasks-tab__heading">
          <span className="tasks-tab__title">HAND-OFF TASKS</span>
          <span className="tasks-tab__meta">
            {data.task_count} tasks · run {runDirName.split('-').slice(-1)[0]}
          </span>
        </div>
        <div className="tasks-tab__controls">
          <KindButton
            label={`all ${counts.total}`}
            active={kindFilter === 'all'}
            onClick={() => setKindFilter('all')}
          />
          <KindButton
            label={`research ${counts.research}`}
            tone="research"
            active={kindFilter === 'research'}
            onClick={() => setKindFilter('research')}
          />
          <KindButton
            label={`monitor ${counts.monitor}`}
            tone="monitor"
            active={kindFilter === 'monitor'}
            onClick={() => setKindFilter('monitor')}
          />
          <KindButton
            label={`watch ${counts.watch}`}
            tone="watch"
            active={kindFilter === 'watch'}
            onClick={() => setKindFilter('watch')}
          />
          <select
            className="tasks-tab__filter"
            value={pillarFilter}
            onChange={(e) => setPillarFilter(e.target.value)}
          >
            <option value="all">all pillars</option>
            <option value="pillar_1_must_be_true">Pillar 1</option>
            <option value="pillar_2_would_kill_it">Pillar 2</option>
            <option value="pillar_3_priced_in">Pillar 3</option>
            <option value="pillar_4_monitor">Pillar 4</option>
          </select>
          <button className="tasks-tab__export" onClick={exportJson}>
            export json
          </button>
        </div>
      </header>

      <div className="tasks-tab__table">
        <div className="tasks-tab__row tasks-tab__row--head">
          <span className="tasks-tab__cell tasks-tab__cell--kind">KIND</span>
          <span className="tasks-tab__cell tasks-tab__cell--pillar">PILLAR</span>
          <span className="tasks-tab__cell tasks-tab__cell--title">TITLE / PARENT</span>
          <span className="tasks-tab__cell tasks-tab__cell--detail">DETAIL</span>
          <span className="tasks-tab__cell tasks-tab__cell--jump" />
        </div>
        {filtered.length === 0 && (
          <div className="tasks-tab__row tasks-tab__row--empty">
            no tasks match the current filters
          </div>
        )}
        {filtered.map((t) => (
          <TaskRowView
            key={t.id}
            task={t}
            onJump={() =>
              jumpToNode(
                runDirName,
                runDirName.split('-').slice(-1)[0] ?? runDirName,
                t.id,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function KindButton({
  label,
  tone,
  active,
  onClick,
}: {
  label: string;
  tone?: 'research' | 'monitor' | 'watch';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={
        'tasks-tab__kind-btn' +
        (tone ? ` tasks-tab__kind-btn--${tone}` : '') +
        (active ? ' tasks-tab__kind-btn--active' : '')
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TaskRowView({ task, onJump }: { task: TaskRow; onJump: () => void }) {
  return (
    <div className={`tasks-tab__row tasks-tab__row--${task.kind}`}>
      <span className="tasks-tab__cell tasks-tab__cell--kind">
        <span className={`tasks-tab__kind-tag tasks-tab__kind-tag--${task.kind}`}>
          {task.kind}
        </span>
      </span>
      <span className="tasks-tab__cell tasks-tab__cell--pillar">
        {pillarLabel(task.pillar)}
      </span>
      <span className="tasks-tab__cell tasks-tab__cell--title">
        <div className="tasks-tab__task-title">{task.title}</div>
        {task.parent_title && (
          <div className="tasks-tab__task-parent">↳ from: {task.parent_title}</div>
        )}
        {task.key_question && (
          <div className="tasks-tab__task-kq">Q: {task.key_question}</div>
        )}
        {task.inversion && (
          <div className="tasks-tab__task-inv">✕ {task.inversion}</div>
        )}
      </span>
      <span className="tasks-tab__cell tasks-tab__cell--detail">
        {renderDetail(task)}
      </span>
      <span className="tasks-tab__cell tasks-tab__cell--jump">
        <button className="tasks-tab__jump-btn" onClick={onJump}>
          jump →
        </button>
      </span>
    </div>
  );
}

function pillarLabel(p: string | null): string {
  switch (p) {
    case 'pillar_1_must_be_true':
      return 'P1 · must be true';
    case 'pillar_2_would_kill_it':
      return 'P2 · kill it';
    case 'pillar_3_priced_in':
      return 'P3 · priced in';
    case 'pillar_4_monitor':
      return 'P4 · monitor';
    default:
      return '—';
  }
}

function renderDetail(t: TaskRow) {
  if (t.kind === 'research') {
    return (
      <div className="tasks-tab__detail">
        {t.evidence_query && (
          <div>
            <span className="tasks-tab__detail-label">query:</span> {t.evidence_query}
          </div>
        )}
        {t.evidence_tool && (
          <div>
            <span className="tasks-tab__detail-label">tool:</span> {t.evidence_tool}
          </div>
        )}
        {t.evidence_method && (
          <div>
            <span className="tasks-tab__detail-label">method:</span> {t.evidence_method}
          </div>
        )}
      </div>
    );
  }
  if (t.kind === 'monitor') {
    return (
      <div className="tasks-tab__detail">
        {t.metric_cadence && (
          <div>
            <span className="tasks-tab__detail-label">cadence:</span> {t.metric_cadence}
          </div>
        )}
        {t.metric_threshold !== null && (
          <div>
            <span className="tasks-tab__detail-label">threshold:</span>{' '}
            {t.metric_threshold} {t.metric_unit ?? ''}{' '}
            {t.metric_direction && (
              <span className={`tasks-tab__dir tasks-tab__dir--${t.metric_direction}`}>
                ({t.metric_direction})
              </span>
            )}
          </div>
        )}
        {t.key_data.length > 0 && (
          <div className="tasks-tab__chips">
            {t.key_data.slice(0, 3).map((kd) => (
              <span key={kd.label} className="tasks-tab__chip">
                {kd.label}: {kd.value}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (t.kind === 'watch') {
    return (
      <div className="tasks-tab__detail">
        {t.catalyst_date && (
          <div>
            <span className="tasks-tab__detail-label">date:</span> {t.catalyst_date}
          </div>
        )}
        {t.catalyst_impact && (
          <div>
            <span className="tasks-tab__detail-label">impact:</span> {t.catalyst_impact}
          </div>
        )}
      </div>
    );
  }
  return null;
}

import { useMemo, useState } from "react";
import type {
  DeliverableStatusView, Project, ProjectEvent, ProjectEventAttendee,
} from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls, KIND_LABELS } from "../lib/util";

interface CalendarViewProps {
  project: Project;
  deliverables: DeliverableStatusView[];
  events: ProjectEvent[];
  eventAttendees: ProjectEventAttendee[];
  users: Record<string, UserLite>;
  onSelectDeliverable: (id: string) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  project, deliverables, events, eventAttendees, users: _users, onSelectDeliverable,
}: CalendarViewProps) {
  // Start month = month of day_zero. Allow nav prev/next.
  const dayZero = new Date(project.day_zero + "T00:00:00Z");
  const [cursor, setCursor] = useState<{ y: number; m: number }>({
    y: dayZero.getUTCFullYear(),
    m: dayZero.getUTCMonth(),
  });

  const grid = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor]);

  // Index deliverables + events by ISO date (YYYY-MM-DD).
  const deliverablesByDate = useMemo(() => {
    const m = new Map<string, DeliverableStatusView[]>();
    for (const d of deliverables) {
      const arr = m.get(d.due_date) ?? [];
      arr.push(d);
      m.set(d.due_date, arr);
    }
    return m;
  }, [deliverables]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, ProjectEvent[]>();
    for (const e of events) {
      const iso = e.start_at.slice(0, 10);
      const arr = m.get(iso) ?? [];
      arr.push(e);
      m.set(iso, arr);
    }
    return m;
  }, [events]);

  const monthLabel = new Date(Date.UTC(cursor.y, cursor.m, 1))
    .toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });

  const todayIso = new Date().toISOString().slice(0, 10);

  const goPrev = () => setCursor(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  const goNext = () => setCursor(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });
  const goToday = () => {
    const now = new Date();
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
  };
  const goDayZero = () => setCursor({ y: dayZero.getUTCFullYear(), m: dayZero.getUTCMonth() });

  return (
    <div className="cal-wrap">
      <div className="cal-toolbar">
        <button className="btn ghost sm" onClick={goPrev} title="Previous month">‹</button>
        <div className="cal-month-label">{monthLabel}</div>
        <button className="btn ghost sm" onClick={goNext} title="Next month">›</button>
        <div style={{ flex: 1 }} />
        <button className="btn ghost sm" onClick={goToday}>Today</button>
        <button className="btn ghost sm" onClick={goDayZero}>D0</button>
      </div>

      <div className="cal-weekdays">
        {WEEKDAYS.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
      </div>

      <div className="cal-grid">
        {grid.map((cell) => {
          const iso = cell.iso;
          const dlvs = deliverablesByDate.get(iso) ?? [];
          const evs = eventsByDate.get(iso) ?? [];
          const isToday = iso === todayIso;
          const isDayZero = iso === project.day_zero;

          return (
            <div
              key={iso}
              className={cls(
                "cal-cell",
                !cell.inMonth && "cal-out",
                isToday && "cal-today",
                isDayZero && "cal-day-zero",
              )}
              title={isDayZero ? "Day 0 — project start" : undefined}
            >
              <div className="cal-cell-head">
                <span className="cal-cell-day">{cell.day}</span>
                {isDayZero && <span className="cal-d0-badge mono">D0</span>}
                {isToday && <span className="cal-today-badge mono">TODAY</span>}
              </div>
              <div className="cal-cell-cards">
                {dlvs.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={cls("cal-card cal-dlv", d.blocked ? "blocked" : d.health, `div-${d.division}`)}
                    onClick={() => onSelectDeliverable(d.id)}
                    title={`${d.title ?? d.kind} · ${d.blocked ? "blocked" : d.health}`}
                  >
                    <span className="cal-card-kind">{KIND_LABELS[d.kind] ?? d.kind}</span>
                    <span className="cal-card-title">{d.title ?? d.kind}</span>
                  </button>
                ))}
                {evs.map((e) => {
                  const attendeeCount = eventAttendees.filter((a) => a.event_id === e.id).length;
                  const time = new Date(e.start_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                  return (
                    <div
                      key={e.id}
                      className={cls("cal-card cal-event", `event-kind-${e.kind}`)}
                      title={`${e.title} · ${time}${attendeeCount ? ` · ${attendeeCount} attendees` : ""}`}
                    >
                      <span className="cal-card-time">{time}</span>
                      <span className="cal-card-title">{e.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cal-legend">
        <span className="dim mono" style={{ fontSize: 10, letterSpacing: 1 }}>Legend ·</span>
        <span className="division-pill div-ERD">ERD</span>
        <span className="division-pill div-MRD">MRD</span>
        <span className="division-pill div-IRD">IRD</span>
        <span className="division-pill div-MND">M&D</span>
        <span className="division-pill div-CROSS">CROSS</span>
      </div>
    </div>
  );
}

interface GridCell { iso: string; day: number; inMonth: boolean }

function buildMonthGrid(year: number, month: number): GridCell[] {
  // Start from the Sunday before/at the 1st of the month.
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = first.getUTCDay(); // 0 = Sunday
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - firstWeekday);

  // 6 rows × 7 cols = 42 cells (always; trailing cells overflow to next month).
  const cells: GridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    cells.push({
      iso: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month,
    });
  }
  return cells;
}

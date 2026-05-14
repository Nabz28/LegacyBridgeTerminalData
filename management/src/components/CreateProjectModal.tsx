import { useEffect, useMemo, useState } from "react";
import { createProject } from "../lib/api";
import { getClient } from "../lib/supabase";
import type { Team, User } from "../lib/types";
import { today } from "../lib/util";

interface UserLite {
  id: string;
  username: string;
  full_name: string;
  division: string | null;
  title: string | null;
}

interface CreateProjectModalProps {
  user: User;
  onClose: () => void;
  onCreated: (id: string, theme: string) => void;
}

interface DlvSpec { key: string; label: string; defaultOffset: number }

// First-cycle defaults: IM D5, MD D15, IO D20, ER D25, LinkedIn+Web D27, IG D34.
const PIPELINE_BLUEPRINT = (mdCount: number, erCount: number): DlvSpec[] => {
  const rows: DlvSpec[] = [{ key: "IM_1", label: "Investment Memo", defaultOffset: 5 }];
  for (let i = 1; i <= mdCount; i++) {
    rows.push({ key: `MD_${i}`, label: mdCount > 1 ? `Market Dive ${i}` : "Market Dive", defaultOffset: 15 });
  }
  rows.push({ key: "IO_1", label: "Industry Outlook", defaultOffset: 20 });
  for (let i = 1; i <= erCount; i++) {
    rows.push({ key: `ER_${i}`, label: erCount > 1 ? `Equity Research ${i}` : "Equity Research", defaultOffset: 25 });
  }
  rows.push({ key: "PUB_LINKEDIN_1", label: "LinkedIn Publication", defaultOffset: 27 });
  rows.push({ key: "PUB_WEBSITE_1",  label: "Website Publication", defaultOffset: 27 });
  rows.push({ key: "PUB_IG_1",       label: "Instagram Publication", defaultOffset: 34 });
  return rows;
};

function addDays(baseIso: string, n: number): string {
  const d = new Date(baseIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function CreateProjectModal({ user, onClose, onCreated }: CreateProjectModalProps) {
  const canCreate = user.role === "management" || user.role === "admin";

  const [theme, setTheme] = useState("");
  const [description, setDescription] = useState("");
  const [dayZero, setDayZero] = useState(today());
  const [teamId, setTeamId] = useState<string>("");
  const [mdCount, setMdCount] = useState(1);
  const [erCount, setErCount] = useState(1);
  const [erdVdIds, setErdVdIds] = useState<string[]>([]);
  const [irdVdIds, setIrdVdIds] = useState<string[]>([]);
  const [mrdVdIds, setMrdVdIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [erdVds, setErdVds] = useState<UserLite[]>([]);
  const [irdVds, setIrdVds] = useState<UserLite[]>([]);
  const [mrdVds, setMrdVds] = useState<UserLite[]>([]);
  const [dueDates, setDueDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pipeline = useMemo(() => PIPELINE_BLUEPRINT(mdCount, erCount), [mdCount, erCount]);

  // Auto-recompute defaults when day_zero or counts change, but keep any
  // dates the user has explicitly typed.
  useEffect(() => {
    setDueDates((cur) => {
      const next: Record<string, string> = {};
      for (const row of pipeline) {
        next[row.key] = cur[row.key] ?? addDays(dayZero, row.defaultOffset);
      }
      // Re-default the rows whose default offset would change with day_zero
      // (user-typed values stay; auto-defaults follow day_zero).
      for (const row of pipeline) {
        const wasDefault = cur[row.key] === undefined
          || cur[row.key] === addDays(dayZero, row.defaultOffset)
          // Allow tracking by checking if cur stored old default
          || cur[row.key] === undefined;
        if (wasDefault) next[row.key] = addDays(dayZero, row.defaultOffset);
      }
      return next;
    });
  }, [dayZero, mdCount, erCount, pipeline]);

  useEffect(() => {
    (async () => {
      const sb = getClient();
      const [tRes, uRes] = await Promise.all([
        sb.from("teams").select("*").eq("archived", false).order("name"),
        sb.from("users_lite").select("id, username, full_name, division, title")
          .in("title", ["ERD Vice Director 1", "ERD Vice Director 2", "IRD Vice Director", "MRD Vice Director"]),
      ]);
      setTeams((tRes.data ?? []) as Team[]);
      const us = (uRes.data ?? []) as UserLite[];
      setErdVds(us.filter((u) => u.title?.startsWith("ERD Vice")));
      setIrdVds(us.filter((u) => u.title?.startsWith("IRD Vice")));
      setMrdVds(us.filter((u) => u.title?.startsWith("MRD Vice")));
      const firstTeam = (tRes.data ?? [])[0];
      if (firstTeam) setTeamId(firstTeam.id);
    })();
  }, []);

  const onSubmit = async () => {
    if (!theme.trim()) { setErr("theme is required"); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await createProject({
        project_type: "research",
        theme: theme.trim(),
        description: description.trim() || undefined,
        day_zero: dayZero,
        team_id: teamId || null,
        visibility: "org",
        md_count: mdCount,
        er_count: erCount,
        erd_vd_ids: erdVdIds,
        ird_vd_ids: irdVdIds,
        mrd_vd_ids: mrdVdIds,
        due_dates: dueDates,
      });
      onCreated(res.id, theme.trim());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleVd = (id: string, list: string[], set: (v: string[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  if (!canCreate) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Not permitted</div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "8px 0" }}>
            Only management can create new projects. Ask CEO / CIO / a director.
          </div>
          <div className="modal-footer">
            <button className="btn ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">New research project</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {err && <div className="error-banner" style={{ margin: "0 0 12px 0" }}>{err}</div>}

        <div className="field">
          <label>Theme</label>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Gold ASEAN, Indonesia Telco"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Description (optional)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Day 0</label>
            <input type="date" value={dayZero} onChange={(e) => setDayZero(e.target.value)} />
          </div>
          <div className="field">
            <label>Team</label>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">(unassigned)</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Market Dives</label>
            <select value={mdCount} onChange={(e) => setMdCount(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
          <div className="field">
            <label>Equity Research</label>
            <select value={erCount} onChange={(e) => setErCount(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
        </div>

        <div className="share-section">
          <div className="share-section-title">Deliverable schedule</div>
          <div className="dim" style={{ fontSize: 11, marginBottom: 8 }}>
            Defaults auto-fill from Day 0. Edit any row to override.
          </div>
          <table className="due-grid">
            <thead>
              <tr>
                <th>Deliverable</th>
                <th>Due date</th>
                <th className="num">Offset from D0</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((row) => {
                const cur = dueDates[row.key] ?? addDays(dayZero, row.defaultOffset);
                const offset = Math.round(
                  (new Date(cur + "T00:00:00Z").getTime() - new Date(dayZero + "T00:00:00Z").getTime()) /
                  (24 * 60 * 60 * 1000),
                );
                return (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td>
                      <input
                        type="date"
                        value={cur}
                        onChange={(e) => setDueDates((prev) => ({ ...prev, [row.key]: e.target.value }))}
                      />
                    </td>
                    <td className="num mono dim">D{offset}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="share-section">
          <div className="share-section-title">VD approvers (optional)</div>
          <div className="field">
            <label>ERD VD</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {erdVds.map((vd) => (
                <label
                  key={vd.id}
                  className={`picker-chip${erdVdIds.includes(vd.id) ? " on" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={erdVdIds.includes(vd.id)}
                    onChange={() => toggleVd(vd.id, erdVdIds, setErdVdIds)}
                  />
                  {vd.full_name}
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>MRD VD</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {mrdVds.map((vd) => (
                <label
                  key={vd.id}
                  className={`picker-chip${mrdVdIds.includes(vd.id) ? " on" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={mrdVdIds.includes(vd.id)}
                    onChange={() => toggleVd(vd.id, mrdVdIds, setMrdVdIds)}
                  />
                  {vd.full_name}
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>IRD VD</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {irdVds.map((vd) => (
                <label
                  key={vd.id}
                  className={`picker-chip${irdVdIds.includes(vd.id) ? " on" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={irdVdIds.includes(vd.id)}
                    onChange={() => toggleVd(vd.id, irdVdIds, setIrdVdIds)}
                  />
                  {vd.full_name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn primary" onClick={onSubmit} disabled={busy}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}

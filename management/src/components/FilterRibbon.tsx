import type { FilterState, UserLite } from "../lib/kpi";
import type { Team } from "../lib/types";

interface FilterRibbonProps {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  teams: Team[];
  analysts: UserLite[];
}

const DIVISIONS = [
  { value: "", label: "All divisions" },
  { value: "ERD", label: "ERD · Equity" },
  { value: "MRD", label: "MRD · Market" },
  { value: "IRD", label: "IRD · Industry" },
  { value: "MND", label: "M&D · Publication" },
];

const PERIODS: Array<{ value: FilterState["period"]; label: string }> = [
  { value: "all", label: "All time" },
  { value: "ytd", label: "YTD" },
  { value: "90d", label: "Last 90d" },
  { value: "30d", label: "Last 30d" },
];

export function FilterRibbon({ filter, setFilter, teams, analysts }: FilterRibbonProps) {
  const filteredAnalysts = filter.division
    ? analysts.filter((a) => a.division === filter.division)
    : analysts;

  const update = (patch: Partial<FilterState>) => setFilter({ ...filter, ...patch });

  return (
    <div className="filter-ribbon">
      <div className="filter-group">
        <label>Division</label>
        <select
          value={filter.division ?? ""}
          onChange={(e) => update({ division: e.target.value || null, analyst_id: null })}
        >
          {DIVISIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Team</label>
        <select
          value={filter.team_id ?? ""}
          onChange={(e) => update({ team_id: e.target.value || null })}
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Analyst</label>
        <select
          value={filter.analyst_id ?? ""}
          onChange={(e) => update({ analyst_id: e.target.value || null })}
        >
          <option value="">All analysts</option>
          {filteredAnalysts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}{a.division ? ` · ${a.division}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Period</label>
        <select
          value={filter.period}
          onChange={(e) => update({ period: e.target.value as FilterState["period"] })}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      {(filter.division || filter.team_id || filter.analyst_id || filter.period !== "all") && (
        <button
          className="btn ghost sm"
          onClick={() => setFilter({ division: null, team_id: null, analyst_id: null, period: "all" })}
        >
          Clear
        </button>
      )}
    </div>
  );
}

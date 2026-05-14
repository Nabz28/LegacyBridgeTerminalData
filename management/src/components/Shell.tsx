import { useEffect, useState } from "react";
import { getClient } from "../lib/supabase";
import type { Project, Team, User } from "../lib/types";
import type { FilterState, UserLite } from "../lib/kpi";
import { DEFAULT_FILTER } from "../lib/kpi";
import { fmtDateLong } from "../lib/util";
import { ProjectTab } from "./ProjectTab";
import { CreateProjectModal } from "./CreateProjectModal";
import { FleetTab } from "./FleetTab";
import { RosterTab } from "./RosterTab";
import { KpiTab } from "./KpiTab";
import { AdminTab } from "./AdminTab";

type SystemKey = "home" | "fleet" | "roster" | "kpi" | "admin";
type ProjectKey = `project:${string}`;
type ActiveKey = SystemKey | ProjectKey;

interface ProjectTabEntry { id: string; theme: string }

interface ShellProps {
  user: User;
  onLogout: () => void;
}

const PROJECT_TABS_KEY = "lbc.mgmt.projectTabs";
const ACTIVE_KEY = "lbc.mgmt.activeTab";
const FILTER_KEY = "lbc.mgmt.filter";

const SYSTEM_TABS: { key: SystemKey; label: string; pip: "accent" | "gold" | "cyan" | "violet" | "negative"; adminOnly?: boolean }[] = [
  { key: "home",   label: "HOME",   pip: "accent" },
  { key: "fleet",  label: "FLEET",  pip: "cyan" },
  { key: "roster", label: "ROSTER", pip: "gold" },
  { key: "kpi",    label: "KPI",    pip: "violet" },
  { key: "admin",  label: "ADMIN",  pip: "negative", adminOnly: true },
];

export function Shell({ user, onLogout }: ShellProps) {
  const [projectTabs, setProjectTabs] = useState<ProjectTabEntry[]>(() => loadProjectTabs());
  const [activeKey, setActiveKey] = useState<ActiveKey>(() => {
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored && isValidActive(stored, loadProjectTabs())) return stored as ActiveKey;
    return "home";
  });
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterState>(() => loadFilter());

  // Shared lookups for aggregate tabs.
  const [teams, setTeams] = useState<Team[]>([]);
  const [analysts, setAnalysts] = useState<UserLite[]>([]);

  useEffect(() => {
    localStorage.setItem(PROJECT_TABS_KEY, JSON.stringify(projectTabs));
  }, [projectTabs]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeKey);
  }, [activeKey]);

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify(filter));
  }, [filter]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const sb = getClient();
      const [tRes, uRes] = await Promise.all([
        sb.from("teams").select("*").eq("archived", false).order("name"),
        sb.from("users_lite").select("id, username, full_name, division, title, role")
          .eq("active", true).order("full_name"),
      ]);
      if (!alive) return;
      setTeams((tRes.data ?? []) as Team[]);
      setAnalysts((uRes.data ?? []) as UserLite[]);
    })();
    return () => { alive = false; };
  }, []);

  const openProject = (id: string, theme: string) => {
    if (!projectTabs.some((t) => t.id === id)) {
      setProjectTabs((prev) => [...prev, { id, theme }]);
    }
    setActiveKey(`project:${id}` as ProjectKey);
  };

  const closeProject = (id: string) => {
    setProjectTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeKey === `project:${id}`) setActiveKey("home");
  };

  const handleCreated = (id: string, theme: string) => {
    setShowCreate(false);
    openProject(id, theme);
  };

  const onlyAnalysts = analysts.filter((a) => a.role === "analyst");

  return (
    <div className="shell">
      <div className="tabbar">
        <a
          href="/launcher/"
          className="tabbar-home"
          title="Back to terminal selector"
          aria-label="Main terminal"
        >
          <span className="home-arrow">←</span>
          <span className="home-label">HOME</span>
        </a>
        <div
          className="tabbar-brand"
          onClick={() => setActiveKey("home")}
          title="Home"
        >
          <span className="dot" />
          LBC · MGMT
        </div>

        {SYSTEM_TABS.filter((t) => !t.adminOnly || user.role === "admin").map((t) => (
          <div
            key={t.key}
            className={`tab system pip-${t.pip} ${activeKey === t.key ? "active" : ""}`}
            onClick={() => setActiveKey(t.key)}
          >
            <span>{t.label}</span>
          </div>
        ))}

        {projectTabs.map((t) => {
          const k = `project:${t.id}` as ProjectKey;
          return (
            <div
              key={t.id}
              className={`tab ${activeKey === k ? "active" : ""}`}
              onClick={() => setActiveKey(k)}
            >
              <span className="mono">{t.id}</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span>{t.theme}</span>
              <button
                type="button"
                className="close"
                onClick={(e) => { e.stopPropagation(); closeProject(t.id); }}
                aria-label="Close tab"
              >
                ×
              </button>
            </div>
          );
        })}

        <button
          type="button"
          className="tabbar-add"
          onClick={() => setShowCreate(true)}
          title="New project"
        >
          +
        </button>

        <div className="tabbar-spacer" />
        <div className="tabbar-user">
          <span className="who">{user.full_name}</span>
          <span className="role">{user.role}</span>
          <button type="button" className="logout" onClick={onLogout}>logout</button>
        </div>
      </div>

      <div className="tab-body">
        {activeKey === "home" && (
          <Home user={user} onOpen={openProject} onCreate={() => setShowCreate(true)} />
        )}
        {activeKey === "fleet" && (
          <FleetTab
            filter={filter}
            setFilter={setFilter}
            teams={teams}
            analysts={onlyAnalysts}
            onOpenProject={openProject}
          />
        )}
        {activeKey === "roster" && (
          <RosterTab
            filter={filter}
            setFilter={setFilter}
            teams={teams}
            analysts={onlyAnalysts}
          />
        )}
        {activeKey === "kpi" && (
          <KpiTab
            filter={filter}
            setFilter={setFilter}
            teams={teams}
            analysts={onlyAnalysts}
          />
        )}
        {activeKey === "admin" && (
          <AdminTab user={user} />
        )}
        {activeKey.startsWith("project:") && (
          <ProjectTab
            key={activeKey}
            projectId={activeKey.slice("project:".length)}
            user={user}
          />
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function loadProjectTabs(): ProjectTabEntry[] {
  try {
    const raw = localStorage.getItem(PROJECT_TABS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is ProjectTabEntry =>
      typeof t === "object" && t && typeof t.id === "string" && typeof t.theme === "string"
    );
  } catch {
    return [];
  }
}

function isValidActive(key: string, tabs: ProjectTabEntry[]): boolean {
  if (["home", "fleet", "roster", "kpi", "admin"].includes(key)) return true;
  if (!key.startsWith("project:")) return false;
  const id = key.slice("project:".length);
  return tabs.some((t) => t.id === id);
}

function loadFilter(): FilterState {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return DEFAULT_FILTER;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_FILTER;
    return { ...DEFAULT_FILTER, ...parsed };
  } catch {
    return DEFAULT_FILTER;
  }
}

interface HomeProps {
  user: User;
  onOpen: (id: string, theme: string) => void;
  onCreate: () => void;
}

function Home({ user, onOpen, onCreate }: HomeProps) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await getClient()
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });
        if (!alive) return;
        if (error) throw error;
        setProjects((data ?? []) as Project[]);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      }
    })();
    return () => { alive = false; };
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? (projects ?? []).filter(
        (p) => p.id.toLowerCase().includes(q) || p.theme.toLowerCase().includes(q),
      )
    : (projects ?? []);
  const active = filtered.filter((p) => p.status === "active");
  const archived = filtered.filter((p) => p.status !== "active");

  return (
    <div className="home-wrap">
      <div className="home-header">
        <div>
          <div className="home-title">Projects</div>
          <div className="home-subtitle">{user.full_name} · {user.title ?? user.role}</div>
        </div>
        <div className="home-actions">
          <input
            className="admin-search"
            placeholder="Search ID or theme…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn primary" onClick={onCreate}>+ New project</button>
        </div>
      </div>

      {err && <div className="error-banner">{err}</div>}
      {projects === null && <div className="loading">Loading projects…</div>}

      {projects !== null && projects.length === 0 && (
        <div className="empty-state">
          No projects yet. Click "+ New project" to create the first one.
        </div>
      )}
      {projects !== null && projects.length > 0 && filtered.length === 0 && (
        <div className="empty-state">No projects match "{search}".</div>
      )}

      {active.length > 0 && (
        <ProjectGrid title="Active" rows={active} onOpen={onOpen} />
      )}
      {archived.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <ProjectGrid title="Archive" rows={archived} onOpen={onOpen} />
        </div>
      )}
    </div>
  );
}

function ProjectGrid({
  title, rows, onOpen,
}: { title: string; rows: Project[]; onOpen: (id: string, theme: string) => void }) {
  return (
    <>
      <div className="home-subtitle" style={{ marginBottom: 12 }}>
        {title} · {rows.length}
      </div>
      <div className="project-grid">
        {rows.map((p) => (
          <div
            key={p.id}
            className={`project-card ${p.project_type}`}
            onClick={() => onOpen(p.id, p.theme)}
          >
            <div className="type-pill">{p.project_type}</div>
            <div className="pid">{p.id}</div>
            <div className="theme">{p.theme}</div>
            <div className="meta">
              <span><b>D0:</b> {fmtDateLong(p.day_zero)}</span>
              <span><b>{p.visibility}</b></span>
              <span style={{ color: "var(--text-faint)" }}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

import { getStore, setCurrentUser } from "../lib/demo";

// Floating toolbar — only mounted when isDemoMode() is true. Lets the
// reviewer switch which user they're "logged in as" so they can preview
// the UI from every role (admin / management / analyst / advisor).

interface DemoToolbarProps {
  currentUserId: string;
}

const PERSONAS: Array<{ label: string; id: string; hint: string }> = [
  { label: "Aldee — admin",         id: "u-aldee",   hint: "Sees ADMIN tab; full control" },
  { label: "Nabil — CEO",           id: "u-nabil",   hint: "Project giver, IM approver" },
  { label: "Charlie — CIO",         id: "u-charlie", hint: "Project giver" },
  { label: "Satya — ERD Director",  id: "u-satya",   hint: "Approves ERD outputs" },
  { label: "Aqila — IRD Director",  id: "u-aqila",   hint: "Approves IRD outputs" },
  { label: "Farhan — M&D Director", id: "u-farhan",  hint: "Approves publications" },
  { label: "Grace — SPD",           id: "u-grace",   hint: "People mgmt; reads everything" },
  { label: "Bulan — ERD analyst",   id: "u-bulan",   hint: "Team 3 ERD; submit/upload" },
  { label: "Resti — MRD analyst",   id: "u-resti",   hint: "Team 1 MRD; owns MD" },
  { label: "Stefano — advisor",     id: "u-stefano", hint: "Read + comment only" },
];

export function DemoToolbar({ currentUserId }: DemoToolbarProps) {
  const store = getStore();
  const current = store.users.find((u) => u.id === currentUserId);

  const exitDemo = () => {
    try { localStorage.removeItem("lbc.mgmt.demo"); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    url.searchParams.set("demo", "0");
    window.location.href = url.toString();
  };

  return (
    <div className="demo-toolbar">
      <div className="demo-pill">
        <span className="demo-dot" /> DEMO
      </div>
      <div className="demo-info">
        <span className="dim mono">as</span>{" "}
        <span className="mono" style={{ color: "var(--accent)" }}>{current?.username ?? "?"}</span>{" "}
        <span className="dim">·</span>{" "}
        <span className="dim">{current?.title ?? current?.role}</span>
      </div>
      <select
        className="demo-select"
        value={currentUserId}
        onChange={(e) => setCurrentUser(e.target.value)}
        title="Switch persona"
      >
        {PERSONAS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      <button className="btn ghost sm" onClick={exitDemo} title="Disable demo mode">
        Exit
      </button>
    </div>
  );
}

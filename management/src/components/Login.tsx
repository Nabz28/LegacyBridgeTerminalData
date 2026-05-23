import { FormEvent, useState } from "react";
import { login } from "../lib/api";
import { persistSession } from "../lib/supabase";
import type { User } from "../lib/types";

interface LoginProps {
  onAuth: (token: string, user: User, expiresIn: number) => void;
}

export function Login({ onAuth }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await login(username, password);
      persistSession(res.token, res.user, res.expires_in);
      onAuth(res.token, res.user, res.expires_in);
    } catch (e) {
      setErr((e as Error).message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <a
          href="/launcher/"
          title="Back to terminal selector"
          aria-label="Back to terminal selector"
          onClick={(e) => {
            if (window.top !== window.self) {
              e.preventDefault();
              try { window.top?.postMessage({ type: "lbc:home" }, window.location.origin); } catch { /* noop */ }
            }
          }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            alignSelf: "flex-start",
            padding: "6px 12px", marginBottom: 16,
            color: "var(--text-dim)", textDecoration: "none",
            border: "1px solid var(--border-strong)",
            borderRadius: 3,
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
            letterSpacing: 1.5,
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>←</span>
          <span>HOME</span>
        </a>
        <div className="login-brand">
          <span className="dot" /> LBC Management Terminal
        </div>
        <div className="login-title">Sign in</div>
        <div className="login-sub">Module 03 · v0.1</div>

        {err && <div className="login-error">{err}</div>}

        <div className="login-field">
          <label>Username</label>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
            spellCheck={false}
          />
        </div>

        <div className="login-field">
          <label>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </div>

        <button type="submit" className="login-btn" disabled={busy}>
          {busy ? "Authenticating…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

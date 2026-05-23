import { useEffect, useState } from "react";
import { Login } from "./components/Login";
import { Shell } from "./components/Shell";
import { DemoToolbar } from "./components/DemoToolbar";
import { isDemoMode, getStore, subscribe } from "./lib/demo";
import { clearSession, readToken, readUser } from "./lib/supabase";
import type { Session, User } from "./lib/types";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [demoTick, setDemoTick] = useState(0);

  useEffect(() => {
    if (isDemoMode()) {
      const s = getStore();
      const u = s.users.find((x) => x.id === s.current_user_id) ?? s.users[0];
      if (u) {
        setSession({
          token: `demo.token.${u.id}`,
          user: u,
          expires_at: Date.now() + 12 * 3600 * 1000,
        });
      }
      setReady(true);
      const unsub = subscribe(() => setDemoTick((t) => t + 1));
      return unsub;
    }

    const token = readToken();
    const user = readUser();
    if (token && user) {
      const expRaw = localStorage.getItem("lbc.mgmt.exp");
      setSession({ token, user, expires_at: expRaw ? Number(expRaw) : 0 });
    }
    setReady(true);
  }, []);

  // Re-sync session when demo store's current user changes (role switcher).
  useEffect(() => {
    if (!isDemoMode()) return;
    const s = getStore();
    const u = s.users.find((x) => x.id === s.current_user_id);
    if (u && session?.user.id !== u.id) {
      setSession({
        token: `demo.token.${u.id}`,
        user: u,
        expires_at: Date.now() + 12 * 3600 * 1000,
      });
    }
  }, [demoTick]);

  const handleAuth = (token: string, user: User, expiresIn: number) => {
    setSession({ token, user, expires_at: Date.now() + expiresIn * 1000 });
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  if (!ready) return <div className="loading">Initializing…</div>;

  if (!session) {
    return <Login onAuth={handleAuth} />;
  }

  return (
    <>
      <Shell user={session.user} onLogout={handleLogout} />
      {isDemoMode() && <DemoToolbar currentUserId={session.user.id} />}
    </>
  );
}

// Live-updates hook backed by Supabase Realtime.
//
// In production: subscribes to postgres_changes on the management schema so
// every table mutation triggers a refresh in all open browsers. In demo mode:
// no-op (the in-memory store already notifies via dispatch).
//
// Coarse-grained on purpose — any change anywhere on the schema bumps every
// subscriber. At our scale (~3 active projects, 18 analysts) this costs
// nothing and keeps the wiring simple.

import { useEffect } from "react";
import { isDemoMode } from "./demo";
import { getClient } from "./supabase";

let _channelRef: { channel: unknown; refcount: number } | null = null;
const listeners = new Set<() => void>();

export function useRealtimeRefresh(refresh: () => void): void {
  useEffect(() => {
    if (isDemoMode()) return;
    listeners.add(refresh);

    if (!_channelRef) {
      const sb = getClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const channel = (sb as any)
        .channel("mgmt-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "management" },
          () => { for (const fn of listeners) fn(); },
        )
        .subscribe();
      _channelRef = { channel, refcount: 1 };
    } else {
      _channelRef.refcount += 1;
    }

    return () => {
      listeners.delete(refresh);
      if (_channelRef) {
        _channelRef.refcount -= 1;
        if (_channelRef.refcount <= 0) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (getClient() as any).removeChannel(_channelRef.channel);
          } catch { /* ignore */ }
          _channelRef = null;
        }
      }
    };
  }, [refresh]);
}

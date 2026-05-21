// ================================================================
// Macro · Map sub-page
// Wraps <MacroGlobe /> full-bleed with a detach-to-window escape hatch.
//
// Detached mode:
//   click ↗ Open in window → opens globe.html in a new browser window,
//   inline panel switches to a placeholder, both stay in sync via
//   BroadcastChannel('lbc-globe'). When the detached window is closed
//   (heartbeat silent for >10s) the inline globe automatically reattaches.
//
// Why: rendering Cesium inside the terminal forces the globe and every
// other workspace to share one main thread / one WebGL context. Detaching
// to a separate Chrome renderer process recovers main-terminal FPS to 60.
// ================================================================

const MacroMap = () => {
  const STORAGE_KEY = 'lbc_globe_detached';
  const CHANNEL_NAME = 'lbc-globe';
  const HEARTBEAT_TIMEOUT_MS = 10_000;

  // Read the persisted detach flag synchronously on mount so we don't
  // spin up Cesium just to immediately tear it down.
  const initialDetached = (() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch { return false; }
  })();
  const [detached, setDetached] = React.useState(initialDetached);
  const [lastHeartbeat, setLastHeartbeat] = React.useState(initialDetached ? Date.now() : null);
  const channelRef = React.useRef(null);
  const heartbeatCheckRef = React.useRef(null);

  // BroadcastChannel — listen for heartbeats from the detached window,
  // and broadcast our own state so the popup knows the parent still cares.
  React.useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = ch;
    ch.onmessage = (ev) => {
      const msg = ev.data || {};
      if (msg.type === 'heartbeat') {
        setLastHeartbeat(Date.now());
      } else if (msg.type === 'closing') {
        // popup announced shutdown — reattach immediately
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        setDetached(false);
        setLastHeartbeat(null);
      } else if (msg.type === 'select' && msg.info && window.lbcSelectGlobeEntity) {
        window.lbcSelectGlobeEntity(msg.info);
      }
    };
    return () => { try { ch.close(); } catch {} channelRef.current = null; };
  }, []);

  // Watchdog — if we're "detached" but no heartbeat in 10s, the popup is
  // gone (user closed it, lost focus to another monitor, etc.). Reattach.
  React.useEffect(() => {
    if (!detached) {
      if (heartbeatCheckRef.current) { clearInterval(heartbeatCheckRef.current); heartbeatCheckRef.current = null; }
      return;
    }
    heartbeatCheckRef.current = setInterval(() => {
      if (!lastHeartbeat) return;
      if (Date.now() - lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        setDetached(false);
        setLastHeartbeat(null);
      }
    }, 2000);
    return () => { if (heartbeatCheckRef.current) { clearInterval(heartbeatCheckRef.current); heartbeatCheckRef.current = null; } };
  }, [detached, lastHeartbeat]);

  const openDetached = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setDetached(true);
    setLastHeartbeat(Date.now()); // give the popup a grace window
    window.open('globe.html', 'lbc-globe', 'width=1600,height=1000,resizable=yes,scrollbars=no');
  };

  const reattachNow = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (channelRef.current) try { channelRef.current.postMessage({ type: 'reattach' }); } catch {}
    setDetached(false);
    setLastHeartbeat(null);
  };

  if (detached) {
    const ageS = lastHeartbeat ? Math.round((Date.now() - lastHeartbeat) / 1000) : '?';
    return (
      <section className="mc-section mc-map-page">
        <div className="mc-section-h">
          <span>Macro · Map</span>
          <span className="mc-section-h-sub">globe detached to separate window · heartbeat {ageS}s ago</span>
        </div>
        <div className="mc-map-detached">
          <div className="mc-map-detached-inner">
            <div className="mc-map-detached-glyph">↗</div>
            <h3 className="mc-map-detached-h">Globe is open in another window</h3>
            <p className="mc-map-detached-p">
              Cesium is running in its own browser process for performance isolation.
              The main terminal stays at 60 FPS while the globe handles AIS / aircraft / satellite streams.
            </p>
            <p className="mc-map-detached-meta">
              Picks made in the popup will reflect here · heartbeat sync via <code>BroadcastChannel('lbc-globe')</code>
            </p>
            <button className="mc-map-detach-btn is-primary" onClick={reattachNow}>
              ← Bring back inline
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Inline mode — render MacroGlobe with the detach button overlaid.
  const Globe = window.MacroGlobe;
  return (
    <section className="mc-section mc-map-page">
      <div className="mc-section-h">
        <span>Macro · Map</span>
        <span className="mc-section-h-sub">3D globe · live AIS / aircraft / satellites / energy</span>
        <button className="mc-map-detach-btn" onClick={openDetached} title="Open in a separate browser window for max performance">
          ↗ Open in window
        </button>
      </div>
      <div className="mc-map-page-frame">
        {Globe ? <Globe /> : <div className="mc-map-placeholder">MacroGlobe component not loaded.</div>}
      </div>
    </section>
  );
};

window.MacroMap = MacroMap;

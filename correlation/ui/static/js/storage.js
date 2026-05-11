// localStorage helpers — saved views, recent picks, last state.
(function () {
  const KEY = 'corr_terminal_v1';
  const RECENT_KEY = 'corr_terminal_recent';

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (_) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  const Storage = {
    // saved views: array of {id, name, ids, freq, method, denoise, diff, start, end, savedAt}
    listSaved() { return load(KEY, []); },
    saveView(view) {
      const all = Storage.listSaved();
      view.id = view.id || ('v_' + Date.now().toString(36));
      view.savedAt = new Date().toISOString();
      const idx = all.findIndex(v => v.id === view.id);
      if (idx >= 0) all[idx] = view; else all.unshift(view);
      save(KEY, all.slice(0, 30));
      return view;
    },
    deleteView(id) {
      save(KEY, Storage.listSaved().filter(v => v.id !== id));
    },

    // recent: lightweight history of templates loaded
    listRecent() { return load(RECENT_KEY, []); },
    pushRecent(item) {
      const all = Storage.listRecent().filter(r => r.key !== item.key);
      all.unshift({ ...item, at: Date.now() });
      save(RECENT_KEY, all.slice(0, 12));
    },
  };

  window.Storage = Storage;
})();

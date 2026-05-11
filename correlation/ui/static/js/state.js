// Centralized state with simple pub/sub. App, modules subscribe to changes.
(function () {
  class AppState {
    constructor() {
      this.s = {
        series: [],            // full series catalog
        seriesById: {},
        availableIds: new Set(),
        freq: 'w',
        method: 'pearson',
        template: 'us_macro_xa',
        matrix: null,          // {ids,names,cats,matrix,n_obs,date_range,...}
        diffMatrix: null,      // overlay matrix (delta) when diff mode on
        diffWindowDays: 0,     // 0 = off
        denoise: false,
        startDate: null,       // ISO YYYY-MM-DD
        endDate: null,
        dateRange: { start: null, end: null }, // available range
        regimes: [],
        showRegimes: true,
        scope: 'global',       // global / us / indo (filters regime overlay)
        selection: null,       // {i,j} for keyboard nav
      };
      this.listeners = {};
    }
    on(event, fn) { (this.listeners[event] ||= []).push(fn); }
    emit(event, payload) { (this.listeners[event] || []).forEach(fn => fn(payload)); }
    set(patch) {
      Object.assign(this.s, patch);
      this.emit('change', this.s);
    }
    get() { return this.s; }
  }

  window.AppState = new AppState();
})();

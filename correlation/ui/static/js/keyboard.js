// Global keyboard shortcuts. Wired by app.js after components are ready.
(function () {
  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  class Keyboard {
    constructor(handlers) {
      this.h = handlers || {};
      window.addEventListener('keydown', e => this._on(e));
    }

    _on(e) {
      // ⌘K / Ctrl+K is handled inside Search; don't double-handle here.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return;

      // Esc always works regardless of focus.
      if (e.key === 'Escape') { this.h.onEscape?.(); return; }

      if (isTyping(e)) return;

      const k = e.key.toLowerCase();
      const KEYMAP = {
        '/' : () => this.h.focusFilter?.(),
        't' : () => this.h.openTemplates?.(),
        'm' : () => this.h.toggleFreq?.(),
        'p' : () => this.h.toggleMethod?.(),
        'd' : () => this.h.toggleDenoise?.(),
        'x' : () => this.h.cycleDiff?.(),
        's' : () => this.h.saveCurrent?.(),
        'r' : () => this.h.resetWindow?.(),
        '?' : () => this.h.openHelp?.(),
        'enter': () => this.h.activateSelection?.(),
        'arrowleft':  () => this.h.move?.(-1, 0),
        'arrowright': () => this.h.move?.( 1, 0),
        'arrowup':    () => this.h.move?.( 0,-1),
        'arrowdown':  () => this.h.move?.( 0, 1),
      };

      const handler = KEYMAP[k];
      if (handler) {
        e.preventDefault();
        handler();
      }
    }
  }

  window.Keyboard = Keyboard;
})();

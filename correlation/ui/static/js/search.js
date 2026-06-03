// Spotlight search (⌘K / Ctrl+K). Live filter over series + special prefixes.
(function () {
  class Search {
    constructor(modalEl, inputEl, resultsEl, hintEl) {
      this.modal = modalEl;
      this.input = inputEl;
      this.results = resultsEl;
      this.hint = hintEl;
      this.series = [];
      this.activeIdx = 0;
      this.matches = [];
      this.onAddId = null;
      this.onRemoveId = null;
      this.onFocusId = null;

      this.input.addEventListener('input', () => this._search());
      this.input.addEventListener('keydown', e => this._key(e));
      modalEl.addEventListener('click', e => {
        if (e.target.classList.contains('modal-backdrop')) this.close();
      });

      window.addEventListener('keydown', e => {
        const isOpen = !this.modal.hidden;
        const wantsOpen = (e.key.toLowerCase() === 'k') && (e.metaKey || e.ctrlKey);
        if (wantsOpen) { e.preventDefault(); this.open(); return; }
        if (isOpen && e.key === 'Escape') this.close();
      });
    }

    setSeries(list) { this.series = list; }

    open() {
      this.modal.hidden = false;
      this.input.value = '';
      this.activeIdx = 0;
      this._search();
      setTimeout(() => this.input.focus(), 10);
    }

    close() {
      this.modal.hidden = true;
    }

    // Open the spotlight pre-filled with a query (used by cross-terminal
    // hand-off: the macro terminal links here with ?q=<indicator name>).
    openWith(q) {
      this.modal.hidden = false;
      this.input.value = q || '';
      this.activeIdx = 0;
      this._search();
      setTimeout(() => this.input.focus(), 10);
    }

    _search() {
      const q = this.input.value.trim();
      let mode = 'find', text = q;
      let catFilter = null;
      if (q.startsWith('+')) { mode = 'add'; text = q.slice(1); }
      else if (q.startsWith('-')) { mode = 'remove'; text = q.slice(1); }
      const m = text.match(/^cat:(\w+)\s*(.*)$/i);
      if (m) { catFilter = m[1].toLowerCase(); text = m[2]; }
      const lc = text.toLowerCase();

      let pool = this.series;
      if (catFilter) pool = pool.filter(s => s.cat.toLowerCase().includes(catFilter));

      if (lc) {
        pool = pool.map(s => {
          let score = 0;
          const id = s.id.toLowerCase();
          const nm = s.name.toLowerCase();
          if (id === lc) score += 1000;
          else if (id.startsWith(lc)) score += 400;
          else if (id.includes(lc)) score += 200;
          if (nm.startsWith(lc)) score += 80;
          else if (nm.includes(lc)) score += 40;
          if ((s.sub || '').toLowerCase().includes(lc)) score += 10;
          return { s, score };
        }).filter(x => x.score > 0).sort((a,b) => b.score - a.score).map(x => x.s);
      }
      this.matches = pool.slice(0, 10);
      this.activeIdx = 0;
      this.mode = mode;
      this._render();
    }

    _render() {
      this.results.innerHTML = '';
      const verb = this.mode === 'add' ? 'Add' : (this.mode === 'remove' ? 'Remove' : 'Focus');
      this.hint.textContent = `${this.matches.length} results · ${verb} on Enter · ↑/↓ navigate · Esc close`;
      this.matches.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = 'search-result' + (i === this.activeIdx ? ' active' : '');
        row.innerHTML = `
          <span class="sr-id">${s.id}</span>
          <span class="sr-name">${s.name}</span>
          <span class="sr-cat">${s.cat}</span>
        `;
        row.addEventListener('click', () => { this.activeIdx = i; this._commit(); });
        this.results.appendChild(row);
      });
    }

    _key(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIdx = Math.min(this.matches.length - 1, this.activeIdx + 1); this._render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIdx = Math.max(0, this.activeIdx - 1); this._render(); }
      else if (e.key === 'Enter') { e.preventDefault(); this._commit(); }
    }

    _commit() {
      const s = this.matches[this.activeIdx];
      if (!s) return;
      if (this.mode === 'add' && this.onAddId) this.onAddId(s.id);
      else if (this.mode === 'remove' && this.onRemoveId) this.onRemoveId(s.id);
      else if (this.onFocusId) this.onFocusId(s.id);
      this.close();
    }
  }

  window.Search = Search;
})();

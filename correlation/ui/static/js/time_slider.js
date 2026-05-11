// Dual-handle time-window slider. Drag to choose [start, end] within available range.
(function () {
  function parseISO(s) { return new Date(s + 'T00:00:00Z').getTime(); }
  function fmtISO(t) { return new Date(t).toISOString().slice(0, 10); }

  class TimeSlider {
    constructor(trackEl, fillEl, hAEl, hBEl, startEl, endEl, lenEl, presetButtons) {
      this.track = trackEl;
      this.fill = fillEl;
      this.hA = hAEl;
      this.hB = hBEl;
      this.startEl = startEl;
      this.endEl = endEl;
      this.lenEl = lenEl;
      this.presets = presetButtons;
      this.min = 0; this.max = 1;
      this.a = 0; this.b = 1;
      this.dragging = null;
      this.onChange = null;       // (start, end) — debounced
      this.onChangeImmediate = null; // every move
      this._debTimer = null;

      const onPointerDown = (which) => (e) => {
        e.preventDefault();
        this.dragging = which;
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
      };
      const onPointerMove = (e) => {
        if (!this.dragging) return;
        const rect = this.track.getBoundingClientRect();
        let pct = (e.clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        if (this.dragging === 'a') {
          this.a = Math.min(pct, this.b - 0.005);
        } else {
          this.b = Math.max(pct, this.a + 0.005);
        }
        this._render();
        if (this.onChangeImmediate) this.onChangeImmediate(this._abs(this.a), this._abs(this.b));
        this._debounce();
      };
      const onPointerUp = () => {
        this.dragging = null;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        if (this.onChange) this.onChange(this._abs(this.a), this._abs(this.b));
      };
      this.hA.addEventListener('pointerdown', onPointerDown('a'));
      this.hB.addEventListener('pointerdown', onPointerDown('b'));

      // Click on the rail to move nearest handle.
      this.track.addEventListener('click', e => {
        if (this.dragging) return;
        if (e.target === this.hA || e.target === this.hB) return;
        const rect = this.track.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        if (Math.abs(pct - this.a) < Math.abs(pct - this.b)) {
          this.a = Math.min(pct, this.b - 0.005);
        } else {
          this.b = Math.max(pct, this.a + 0.005);
        }
        this._render();
        if (this.onChange) this.onChange(this._abs(this.a), this._abs(this.b));
      });

      // Preset buttons.
      this.presets.forEach(b => {
        b.addEventListener('click', () => this.applyPreset(b.dataset.preset));
      });
    }

    _debounce() {
      clearTimeout(this._debTimer);
      this._debTimer = setTimeout(() => {
        if (this.onChange && !this.dragging) this.onChange(this._abs(this.a), this._abs(this.b));
      }, 250);
    }

    _abs(pct) { return this.min + (this.max - this.min) * pct; }
    _pct(t) { return (this.max - this.min) <= 0 ? 0 : (t - this.min) / (this.max - this.min); }

    setRange(startISO, endISO) {
      this.min = parseISO(startISO);
      this.max = parseISO(endISO);
      this.a = 0; this.b = 1;
      this._render();
    }

    setActiveWindow(startISO, endISO) {
      if (startISO) this.a = Math.max(0, this._pct(parseISO(startISO)));
      if (endISO)   this.b = Math.min(1, this._pct(parseISO(endISO)));
      this._render();
    }

    applyPreset(preset) {
      this.presets.forEach(b => b.classList.toggle('active', b.dataset.preset === preset));
      if (preset === 'all') { this.a = 0; this.b = 1; }
      else {
        const days = { '10y': 3650, '5y': 1825, '3y': 1095, '1y': 365, '6m': 183 }[preset] || 365;
        const total = (this.max - this.min) / 86400000; // days span
        if (total > 0) {
          this.a = Math.max(0, 1 - days / total);
          this.b = 1;
        }
      }
      this._render();
      if (this.onChange) this.onChange(this._abs(this.a), this._abs(this.b));
    }

    _render() {
      const aPct = this.a * 100;
      const bPct = this.b * 100;
      this.fill.style.left  = aPct + '%';
      this.fill.style.right = (100 - bPct) + '%';
      this.hA.style.left = aPct + '%';
      this.hB.style.left = bPct + '%';
      this.startEl.textContent = fmtISO(this._abs(this.a));
      this.endEl.textContent   = fmtISO(this._abs(this.b));
      const days = (this._abs(this.b) - this._abs(this.a)) / 86400000;
      let lbl;
      if (days >= 365 * 2) lbl = `${(days / 365).toFixed(1)}y`;
      else if (days >= 30) lbl = `${(days / 30).toFixed(0)}mo`;
      else lbl = `${Math.round(days)}d`;
      this.lenEl.textContent = `· ${lbl}`;
      // Reset preset highlight if user dragged.
      if (this.dragging) this.presets.forEach(b => b.classList.remove('active'));
    }
  }

  window.TimeSlider = TimeSlider;
})();

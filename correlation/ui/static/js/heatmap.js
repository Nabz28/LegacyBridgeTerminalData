// Canvas-based correlation heatmap. Renders an N×N matrix, supports diff overlay.
(function () {
  const CAT_COLORS = {
    us_equities: '#3b82f6',
    us_macro: '#8b5cf6',
    indonesia_equities: '#dc2626',
    indonesia_macro: '#f59e0b',
    china_hk: '#fbbf24',
    china_macro: '#d97706',
    korea_japan_asean_india: '#10b981',
    europe_dm_latam: '#06b6d4',
    global_fx: '#a855f7',
    energy_commod: '#ef4444',
    metals_commod: '#eab308',
    agri_soft_commod: '#84cc16',
    crypto: '#f97316',
    etfs: '#14b8a6',
  };
  window.CAT_COLORS = CAT_COLORS;

  const CAT_LABELS = {
    us_equities: 'US Eq', us_macro: 'US Macro',
    indonesia_equities: 'ID Eq', indonesia_macro: 'ID Macro',
    china_hk: 'China/HK', china_macro: 'CN Macro',
    korea_japan_asean_india: 'KR/JP/ASEAN',
    europe_dm_latam: 'EU/LatAm',
    global_fx: 'FX',
    energy_commod: 'Energy', metals_commod: 'Metals',
    agri_soft_commod: 'Agri', crypto: 'Crypto',
    etfs: 'ETFs',
  };
  window.CAT_LABELS = CAT_LABELS;

  const STRIP = 6;

  // Linear interpolation between two hex ints; returns rgb string.
  function lerpColor(a, b, t) {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${bl})`;
  }

  // Map ρ ∈ [-1,1] to color along the gradient stops.
  function rhoColor(r) {
    if (!isFinite(r)) return '#14181f';
    const stops = [
      [-1.0, 0xf54e58],
      [-0.5, 0xa02831],
      [ 0.0, 0x14181f],
      [ 0.5, 0x1a8a4d],
      [ 1.0, 0x2dd674],
    ];
    if (r <= -1) return '#f54e58';
    if (r >=  1) return '#2dd674';
    for (let i = 0; i < stops.length - 1; i++) {
      if (r >= stops[i][0] && r <= stops[i + 1][0]) {
        const t = (r - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
        return lerpColor(stops[i][1], stops[i + 1][1], t);
      }
    }
    return '#14181f';
  }

  // Diff color scale: tighter range (-0.5..+0.5) since deltas are smaller.
  function diffColor(d) {
    if (!isFinite(d)) return '#14181f';
    const dn = Math.max(-0.5, Math.min(0.5, d)) * 2; // scale to [-1,1]
    return rhoColor(dn);
  }
  window.rhoColor = rhoColor;

  class Heatmap {
    constructor(canvas, tooltipEl) {
      this.canvas = canvas;
      this.tooltipEl = tooltipEl;
      this.ctx = canvas.getContext('2d');
      this.dpr = window.devicePixelRatio || 1;
      this.matrix = null;
      this.diffMatrix = null;   // overlay
      this.ids = [];
      this.names = [];
      this.cats = [];
      this.hover = null;
      this.selection = null;    // for keyboard nav
      this.showDiff = false;
      this.onCellClick = null;
      this.onCellSelect = null; // hover or kb select

      this._resize = this._resize.bind(this);
      window.addEventListener('resize', this._resize);
      canvas.addEventListener('mousemove', e => this._onMove(e));
      canvas.addEventListener('mouseleave', () => this._setHover(null));
      canvas.addEventListener('click', e => this._onClick(e));
    }

    setData({ ids, names, cats, matrix }) {
      this.ids = ids || [];
      this.names = names || [];
      this.cats = cats || [];
      this.matrix = matrix || null;
      this.diffMatrix = null;
      this.showDiff = false;
      this._resize();
    }
    setDiff(matrix, on) {
      this.diffMatrix = matrix || null;
      this.showDiff = !!on;
      this._render();
    }
    setSelection(sel) {
      this.selection = sel;
      this._render();
    }
    moveSelection(dx, dy) {
      const n = this.ids.length;
      if (!n) return;
      const cur = this.selection || { i: 0, j: 0 };
      const i = Math.max(0, Math.min(n - 1, cur.i + dy));
      const j = Math.max(0, Math.min(n - 1, cur.j + dx));
      this.selection = { i, j };
      this._render();
      this._announceSelected();
    }
    activateSelection() {
      if (!this.selection || !this.onCellClick) return;
      const { i, j } = this.selection;
      this.onCellClick({ id_a: this.ids[i], id_b: this.ids[j], name_a: this.names[i], name_b: this.names[j] });
    }

    _resize() {
      const wrap = this.canvas.parentElement;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      this.canvas.width = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._render();
    }

    _layout() {
      const w = this.canvas.width / this.dpr;
      const h = this.canvas.height / this.dpr;
      const n = this.ids.length;
      if (!n) return null;
      // Reserve gutters for labels on small matrices.
      const labelGutter  = (n <= 60) ? Math.min(96, Math.floor(w * 0.10)) : 0;
      const xLabelGutter = (n <= 60) ? Math.min(80, Math.floor(h * 0.14)) : 0;
      const top    = STRIP + (n <= 60 ? 14 : 0);
      const left   = STRIP + labelGutter;
      const bottom = xLabelGutter + 4;
      const right  = 8;
      // Fill the available rectangle — cells can be non-square.
      const widthAvail  = Math.max(0, w - left - right);
      const heightAvail = Math.max(0, h - top - bottom);
      const cellW = widthAvail  / n;
      const cellH = heightAvail / n;
      const sizeW = cellW * n;
      const sizeH = cellH * n;
      // Keep `cell` (avg) for legacy code paths that used it for font sizing decisions.
      const cell = Math.min(cellW, cellH);
      return { w, h, n, top, left, sizeW, sizeH, cellW, cellH, cell, labelGutter, xLabelGutter };
    }

    _render() {
      const ctx = this.ctx;
      const w = this.canvas.width / this.dpr;
      const h = this.canvas.height / this.dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0d12';
      ctx.fillRect(0, 0, w, h);
      const lay = this._layout();
      if (!lay || !this.matrix) return;
      const { n, top, left, sizeW, sizeH, cellW, cellH, cell, labelGutter, xLabelGutter } = lay;

      const useDiff = this.showDiff && this.diffMatrix;

      // Cells (rectangular — fill the entire pane).
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          let v;
          if (i === j) v = useDiff ? 0 : 1;
          else v = useDiff ? this.diffMatrix[i][j] : this.matrix[i][j];
          if (i === j) ctx.fillStyle = '#2a3140';
          else ctx.fillStyle = useDiff ? diffColor(v) : rhoColor(v);
          ctx.fillRect(left + j * cellW, top + i * cellH, cellW + 0.5, cellH + 0.5);
        }
      }

      // In-cell numbers when each cell is large enough.
      // Threshold is intentionally aggressive (cellH ≥ 13) so 12 / 19 / 25-series
      // matrices all show numbers consistently. Font shrinks to 8px floor.
      if (cellW >= 18 && cellH >= 13) {
        const fontSize = Math.max(8, Math.min(11, Math.floor(Math.min(cellW * 0.32, cellH * 0.55))));
        ctx.font = `500 ${fontSize}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            let v;
            if (i === j) v = useDiff ? 0 : 1;
            else v = useDiff ? this.diffMatrix[i][j] : this.matrix[i][j];
            if (!isFinite(v)) continue;
            const intensity = Math.abs(useDiff ? v * 2 : v);
            ctx.fillStyle = intensity > 0.55 ? '#0a0d12' : '#cdd2dc';
            const txt = useDiff ? (v >= 0 ? '+' : '') + v.toFixed(2) : v.toFixed(2);
            ctx.fillText(txt, left + j * cellW + cellW / 2, top + i * cellH + cellH / 2);
          }
        }
      }

      // Asset-class color bands (top: cellW, left: cellH).
      for (let i = 0; i < n; i++) {
        const col = CAT_COLORS[this.cats[i]] || '#5b626d';
        ctx.fillStyle = col;
        // Top band — uses column width.
        ctx.fillRect(left + i * cellW, top - STRIP, cellW + 0.5, STRIP - 1);
        // Left band — uses row height.
        ctx.fillRect(left - STRIP, top + i * cellH, STRIP - 1, cellH + 0.5);
      }

      // Y-axis labels (left) for small N — sized to row height.
      if (labelGutter > 0 && cellH >= 8) {
        const fs = Math.min(11, Math.max(8, Math.floor(cellH * 0.55)));
        ctx.font = `${fs}px JetBrains Mono, monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#9da3ad';
        for (let i = 0; i < n; i++) {
          const label = (this.ids[i] || '').split(':').pop().slice(0, 12);
          ctx.fillText(label, left - STRIP - 4, top + i * cellH + cellH / 2);
        }
      }

      // X-axis labels (bottom) for small N — rotated -55° so they don't overlap.
      if (xLabelGutter > 0 && cellW >= 8) {
        const fs = Math.min(11, Math.max(8, Math.floor(cellW * 0.55)));
        ctx.font = `${fs}px JetBrains Mono, monospace`;
        ctx.fillStyle = '#9da3ad';
        const yBase = top + sizeH + 4;
        for (let j = 0; j < n; j++) {
          const label = (this.ids[j] || '').split(':').pop().slice(0, 12);
          const x = left + j * cellW + cellW / 2;
          ctx.save();
          ctx.translate(x, yBase);
          ctx.rotate(-Math.PI * 55 / 180);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }

      // Hover crosshair (cyan).
      if (this.hover) {
        const { i, j } = this.hover;
        ctx.strokeStyle = 'rgba(41,212,255,0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(left + 0.5, top + i * cellH + 0.5, sizeW, cellH);
        ctx.strokeRect(left + j * cellW + 0.5, top + 0.5, cellW, sizeH);
      }
      // Selection box (amber).
      if (this.selection) {
        const { i, j } = this.selection;
        ctx.strokeStyle = '#ff9d00';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(left + j * cellW + 1, top + i * cellH + 1, cellW - 2, cellH - 2);
      }
    }

    _cellAt(clientX, clientY) {
      const lay = this._layout();
      if (!lay) return null;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const { top, left, n, cellW, cellH, sizeW, sizeH } = lay;
      if (x < left || y < top || x >= left + sizeW || y >= top + sizeH) return null;
      const j = Math.floor((x - left) / cellW);
      const i = Math.floor((y - top) / cellH);
      if (i < 0 || j < 0 || i >= n || j >= n) return null;
      return { i, j };
    }

    _setHover(hover) {
      this.hover = hover;
      this._render();
      if (!hover) {
        this.tooltipEl.hidden = true;
        return;
      }
    }

    _announceSelected() {
      if (!this.selection || !this.onCellSelect) return;
      const { i, j } = this.selection;
      this.onCellSelect({
        id_a: this.ids[i], id_b: this.ids[j],
        name_a: this.names[i], name_b: this.names[j],
        i, j,
      });
    }

    _onMove(e) {
      const cell = this._cellAt(e.clientX, e.clientY);
      if (!cell) { this._setHover(null); return; }
      this._setHover(cell);
      const { i, j } = cell;
      const v = (i === j) ? (this.showDiff && this.diffMatrix ? 0 : 1)
              : (this.showDiff && this.diffMatrix ? this.diffMatrix[i][j] : this.matrix[i][j]);
      const sign = v >= 0 ? '+' : '';
      const label = this.showDiff ? 'Δρ' : 'ρ';
      this.tooltipEl.innerHTML =
        `<div class="row1">${this.ids[i]} ↔ ${this.ids[j]}</div>` +
        `<div class="row-name">${this.names[i]} · ${this.names[j]}</div>` +
        `<div class="rho">${label} = ${sign}${v.toFixed(3)}</div>`;
      const wrap = this.canvas.parentElement;
      const wrapRect = wrap.getBoundingClientRect();
      let tx = e.clientX - wrapRect.left + 14;
      let ty = e.clientY - wrapRect.top + 14;
      this.tooltipEl.hidden = false;
      const tw = this.tooltipEl.offsetWidth;
      const th = this.tooltipEl.offsetHeight;
      if (tx + tw > wrap.clientWidth) tx = e.clientX - wrapRect.left - tw - 14;
      if (ty + th > wrap.clientHeight) ty = e.clientY - wrapRect.top - th - 14;
      this.tooltipEl.style.left = tx + 'px';
      this.tooltipEl.style.top = ty + 'px';
    }

    _onClick(e) {
      const cell = this._cellAt(e.clientX, e.clientY);
      if (!cell) return;
      this.selection = cell;
      this._render();
      if (this.onCellClick) {
        this.onCellClick({
          id_a: this.ids[cell.i], id_b: this.ids[cell.j],
          name_a: this.names[cell.i], name_b: this.names[cell.j],
        });
      }
    }
  }

  window.Heatmap = Heatmap;
})();

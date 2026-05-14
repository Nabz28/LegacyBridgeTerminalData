// PCA panel. Reads /api/pca and renders top-K factors with loadings.
(function () {
  class PCAPanel {
    constructor(eigenbarEl, factorsEl, explainedEl) {
      this.eigenbarEl = eigenbarEl;
      this.factorsEl = factorsEl;
      this.explainedEl = explainedEl;
    }

    clear() {
      this.eigenbarEl.innerHTML = '';
      this.factorsEl.innerHTML = '';
      this.explainedEl.textContent = '—';
    }

    async load(ids, freq, method, start, end) {
      if (!ids || ids.length < 2) { this.clear(); return; }
      let data;
      try {
        data = await window.CorrAPI.getPCA({
          ids, freq, method, start_date: start, end_date: end, top_k: 5,
        });
      } catch (e) {
        // Cloud mode: server-side PCA isn't available. Show a soft notice
        // rather than blanking the panel without explanation.
        this.clear();
        this.explainedEl.textContent = 'local-only';
        return;
      }
      if (data.error) { this.clear(); return; }
      this._render(data);
    }

    _render(data) {
      // Top eigenvalue bar (relative widths of top-K explained).
      this.eigenbarEl.innerHTML = '';
      const factors = data.factors || [];
      const totalTopK = factors.reduce((s, f) => s + Math.abs(f.explained), 0) || 1;
      factors.forEach((f, i) => {
        const seg = document.createElement('div');
        seg.className = 'seg-bar';
        seg.style.flex = String(Math.max(0.02, Math.abs(f.explained) / totalTopK));
        seg.title = `PC${f.k}: ${(f.explained * 100).toFixed(1)}%`;
        const hue = 30 + i * 8;
        seg.style.background = `hsl(${hue},90%,${52 - i * 4}%)`;
        this.eigenbarEl.appendChild(seg);
      });
      const cum = factors.length ? factors[factors.length - 1].cumulative : 0;
      this.explainedEl.textContent = `${(cum * 100).toFixed(1)}%`;

      // Factor cards.
      this.factorsEl.innerHTML = '';
      for (const f of factors) {
        const card = document.createElement('div');
        card.className = 'pca-factor';
        const head = document.createElement('div');
        head.className = 'pca-factor-head';
        head.innerHTML = `<span class="pca-factor-name">PC${f.k}</span><span class="pca-factor-pct">${(f.explained * 100).toFixed(1)}%</span>`;
        card.appendChild(head);

        if (f.top_long.length) {
          const t = document.createElement('div');
          t.className = 'pca-section-title';
          t.textContent = 'long';
          card.appendChild(t);
          this._appendLoadings(card, f.top_long.slice(0, 4), 'pos');
        }
        if (f.top_short.length) {
          const t = document.createElement('div');
          t.className = 'pca-section-title';
          t.textContent = 'short';
          card.appendChild(t);
          this._appendLoadings(card, f.top_short.slice(0, 4), 'neg');
        }
        this.factorsEl.appendChild(card);
      }
    }

    _appendLoadings(parent, rows, sideClass) {
      const max = Math.max(...rows.map(r => Math.abs(r.weight)), 0.01);
      for (const row of rows) {
        const r = document.createElement('div');
        r.className = 'pca-loading-row';
        const w = Math.abs(row.weight) / max;
        const sign = row.weight >= 0 ? '+' : '';
        const lbl = (row.id || '').split(':').pop().slice(0, 14);
        const cls = row.weight >= 0 ? 'pos' : 'neg';
        r.innerHTML = `
          <span class="lbl" title="${row.id} · ${row.name}">${lbl}</span>
          <span class="bar-wrap"><span class="bar ${cls}" style="width:${(w * 100).toFixed(0)}%"></span></span>
          <span class="val">${sign}${row.weight.toFixed(2)}</span>
        `;
        parent.appendChild(r);
      }
    }
  }

  window.PCAPanel = PCAPanel;
})();

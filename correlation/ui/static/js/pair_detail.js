// Bottom panel: scatter + rolling correlation with regime overlay.
(function () {
  const TXT = '#cdd2dc';
  const MUTED = '#5b626d';
  const GRID = '#1c2129';
  const ZERO = '#3a4051';

  // Custom Chart.js plugin that paints regime windows behind the rolling chart.
  const regimeOverlayPlugin = {
    id: 'regimeOverlay',
    beforeDatasetsDraw(chart, args, opts) {
      if (!opts || !opts.regimes || !opts.regimes.length) return;
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales || !scales.x) return;
      const colors = opts.colors || {};
      ctx.save();
      ctx.beginPath();
      ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      ctx.clip();
      for (const r of opts.regimes) {
        if (opts.scope && r.scope && r.scope !== 'global' && r.scope !== opts.scope) continue;
        const x0 = scales.x.getPixelForValue(r.start);
        const x1 = scales.x.getPixelForValue(r.end);
        if (!isFinite(x0) || !isFinite(x1)) continue;
        const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
        if (hi < chartArea.left || lo > chartArea.right) continue;
        ctx.fillStyle = colors[r.type] || 'rgba(255,255,255,0.05)';
        ctx.fillRect(Math.max(lo, chartArea.left), chartArea.top,
                     Math.min(hi, chartArea.right) - Math.max(lo, chartArea.left),
                     chartArea.bottom - chartArea.top);
      }
      ctx.restore();
    },
  };

  // Crosshair plugin — draws a full-height vertical line at the currently-hovered
  // x position (or at the nearest data point in 'index' mode). Works even when
  // the mouse isn't directly on the line, because Chart.js's index-mode hover
  // is engaged in the chart options below.
  const crosshairPlugin = {
    id: 'crosshair',
    afterDatasetsDraw(chart) {
      const active = chart.tooltip && chart.tooltip._active;
      if (!active || !active.length) return;
      const { ctx, chartArea } = chart;
      const x = active[0].element.x;
      if (!isFinite(x) || x < chartArea.left || x > chartArea.right) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,157,0,0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };

  if (window.Chart && Chart.register) Chart.register(regimeOverlayPlugin, crosshairPlugin);

  const baseScale = (label) => ({
    grid: { color: GRID, drawTicks: true },
    ticks: { color: MUTED, font: { family: 'JetBrains Mono', size: 10 } },
    title: { display: !!label, text: label, color: MUTED, font: { family: 'JetBrains Mono', size: 10 } },
  });

  class PairDetail {
    constructor(scatterCanvas, rollingCanvas, titleEl, metaEl, hintEl, bodyEl) {
      this.scatterCanvas = scatterCanvas;
      this.rollingCanvas = rollingCanvas;
      this.titleEl = titleEl;
      this.metaEl = metaEl;
      this.hintEl = hintEl;
      this.bodyEl = bodyEl;
      this.scatter = null;
      this.rolling = null;
      this.regimes = [];
      this.regimeColors = {};
      this.scope = 'global';
    }

    setRegimes(regimes, colors) {
      this.regimes = regimes || [];
      this.regimeColors = colors || {};
    }
    setScope(scope) { this.scope = scope; }

    // Wire the three pair-related download buttons. Called once by app.js
    // after init. Each button is enabled only when load() has populated data.
    wireDownloads({ csv, scatterPng, rollingPng, onStatus }) {
      const say = onStatus || function () {};
      const hasData = () => !!(this._data && this._idA && this._idB);

      csv?.addEventListener('click', () => {
        if (!hasData()) { say('click a heatmap cell first'); return; }
        try {
          CorrExport.exportPairCSV(this._data, this._idA, this._idB);
          say('exported pair CSV');
        } catch (e) { say('CSV export failed: ' + e.message); }
      });

      scatterPng?.addEventListener('click', async () => {
        if (!hasData() || !this.scatter) { say('scatter not ready'); return; }
        const title = `Scatter · ${this._idA} ↔ ${this._idB}`;
        const subtitle = `${this._data.names.a} ↔ ${this._data.names.b}  ·  n=${this._data.n_obs}  ·  ${this._data.date_range[0]} → ${this._data.date_range[1]}`;
        const fname = CorrExport.filename(
          ['corr-pair-scatter', this._idA + '_x_' + this._idB,
           this._data.date_range && this._data.date_range[0],
           this._data.date_range && this._data.date_range[1]],
          'png');
        try {
          await CorrExport.exportChartPNG(this.scatter, title, subtitle, fname);
          say('exported scatter PNG');
        } catch (e) { say('scatter PNG failed: ' + e.message); }
      });

      rollingPng?.addEventListener('click', async () => {
        if (!hasData() || !this.rolling) { say('rolling chart not ready'); return; }
        const window = this._data.rolling && this._data.rolling.window || '52w';
        const title = `Rolling ${window} · ${this._idA} ↔ ${this._idB}`;
        const subtitle = `${this._data.names.a} ↔ ${this._data.names.b}  ·  ${this._data.date_range[0]} → ${this._data.date_range[1]}`;
        const fname = CorrExport.filename(
          ['corr-pair-rolling', this._idA + '_x_' + this._idB, window],
          'png');
        try {
          await CorrExport.exportChartPNG(this.rolling, title, subtitle, fname);
          say('exported rolling PNG');
        } catch (e) { say('rolling PNG failed: ' + e.message); }
      });
    }

    showError(msg) {
      this.titleEl.textContent = 'pair: ' + msg;
      this.titleEl.classList.add('muted');
      this.metaEl.textContent = '';
    }

    async load(idA, idB, freq, opts) {
      this._idA = idA;
      this._idB = idB;
      this._data = null;  // cleared until fetch returns
      this.titleEl.classList.remove('muted');
      this.titleEl.textContent = `${idA} ↔ ${idB}`;
      this.hintEl.textContent = 'loading…';
      this.bodyEl.dataset.empty = 'false';
      let data;
      try {
        data = await window.CorrAPI.getPair(idA, idB, freq, opts || {});
      } catch (err) {
        this.showError(err.message);
        return;
      }
      if (data.error) { this.showError(data.error); return; }
      this._data = data;

      const ps = data.pearson, sp = data.spearman;
      const pf = ps == null ? 'n/a' : ((ps >= 0 ? '+' : '') + ps.toFixed(3));
      // Spearman is only computed by the Flask backend; cloud mode returns null.
      const sf = sp == null ? '—' : ((sp >= 0 ? '+' : '') + sp.toFixed(3));
      // β = OLS slope of B on A. Tells the hedge ratio (per +1 unit move in A,
      // B moves β units on average). Independent of ρ which captures strength.
      const slope = data.regression && data.regression.slope;
      const bf = slope == null ? '—' : ((slope >= 0 ? '+' : '') + slope.toFixed(2));
      this.titleEl.textContent = `${idA} ↔ ${idB}  ·  ${data.names.a} ↔ ${data.names.b}`;
      this.hintEl.textContent = '';
      this.metaEl.textContent = `ρ=${pf}  β=${bf}  Spearman=${sf}  n=${data.n_obs}  ${data.date_range[0]} → ${data.date_range[1]}`;

      this._renderScatter(data, idA, idB);
      this._renderRolling(data);
    }

    _renderScatter(data, idA, idB) {
      if (this.scatter) { this.scatter.destroy(); this.scatter = null; }
      const datasets = [
        {
          type: 'scatter',
          label: 'returns',
          data: data.scatter,
          backgroundColor: 'rgba(41,212,255,0.55)',
          pointRadius: 1.5,
          pointHoverRadius: 3,
        },
      ];
      if (data.regression) {
        datasets.push({
          type: 'line',
          label: 'OLS',
          data: data.regression.x.map((x, i) => ({ x, y: data.regression.y[i] })),
          borderColor: '#ff9d00',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          showLine: true,
        });
      }
      this.scatter = new Chart(this.scatterCanvas, {
        data: { datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(13,17,24,.97)',
              titleColor: '#ff9d00',
              bodyColor: TXT,
              borderColor: '#283040',
              borderWidth: 1,
            },
          },
          scales: {
            x: { ...baseScale(idA), type: 'linear' },
            y: { ...baseScale(idB) },
          },
        },
      });
    }

    _renderRolling(data) {
      if (this.rolling) { this.rolling.destroy(); this.rolling = null; }
      const r = data.rolling || { dates: [], values: [] };
      const points = r.dates.map((d, i) => ({ x: d, y: r.values[i] }));
      this.rolling = new Chart(this.rollingCanvas, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'rolling ρ',
              data: points,
              borderColor: '#29d4ff',
              backgroundColor: 'rgba(41,212,255,0.16)',
              borderWidth: 1.5,
              pointRadius: 0,
              fill: 'origin',
              tension: 0.18,
            },
            {
              label: 'zero',
              data: points.length ? [{ x: points[0].x, y: 0 }, { x: points[points.length - 1].x, y: 0 }] : [],
              borderColor: ZERO,
              borderWidth: 1,
              borderDash: [3, 3],
              pointRadius: 0,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          parsing: false,
          interaction: { mode: 'index', intersect: false, axis: 'x' },
          hover:       { mode: 'index', intersect: false, axis: 'x' },
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(13,17,24,.97)',
              titleColor: '#ff9d00',
              bodyColor: TXT,
              borderColor: '#283040',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              filter: (item) => item.datasetIndex === 0,
              callbacks: {
                title: (items) => items[0]?.label || '',
                label: (item) => {
                  const v = item.parsed.y;
                  if (v == null) return 'ρ = n/a';
                  const sign = v >= 0 ? '+' : '';
                  return `ρ = ${sign}${v.toFixed(3)}`;
                },
              },
            },
            regimeOverlay: {
              regimes: this.regimes,
              colors: this.regimeColors,
              scope: this.scope,
            },
          },
          scales: {
            x: {
              ...baseScale(''),
              type: 'category',
              labels: r.dates,
              ticks: { color: MUTED, font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 8 },
            },
            y: { ...baseScale(''), suggestedMin: -1, suggestedMax: 1 },
          },
        },
      });
    }
  }

  window.PairDetail = PairDetail;
})();

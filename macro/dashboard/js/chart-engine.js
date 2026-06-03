// chart-engine.js — lean Chart.js wrapper for the Refinitiv Macro Terminal.
// Handles line / area / bar over a time axis with multi-series overlay.
// Owns one Chart.js instance bound to <canvas id="mainChart">.
//
// ── Transform layer ──────────────────────────────────────────────────────
// Raw observations are NEVER mutated. A global transform + smoothing pair is
// applied at render time by seriesPoints(), which is the single source of
// truth for the live chart, CSV export, and PNG export. Transforms are
// date-based (not index-based) so they're correct across mixed frequencies
// (daily / weekly / monthly / quarterly).
//
//   Transforms (mutually exclusive):
//     level   — raw value
//     yoy     — % change vs the observation ~1 year earlier
//     qoq     — % change vs the observation ~1 quarter earlier
//     mom     — % change vs the previous observation (period-over-period)
//     diff    — absolute change vs the previous observation
//     index   — rebased to 100 at the first point in the visible window
//     zscore  — standardized (σ from mean) over the visible window
//
//   Smoothing (optional, applied after the transform):
//     0 / 3 / 6 / 12 — trailing simple moving average over N points

(function (global) {
  'use strict';

  var SERIES_COLORS = ['#ff8a00', '#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#06b6d4', '#f97316'];
  var TEXT = '#e6e8ec';
  var TEXT_DIM = '#9aa3b2';
  var GRID = '#252b36';

  var ONE_DAY = 86400 * 1000;

  var chart = null;
  var chartType = 'line';
  var seriesById = {};
  var seriesOrder = [];
  var rangeKey = '5Y';
  var transform = 'level';   // level | yoy | qoq | mom | diff | index | zscore
  var smoothing = 0;         // 0 | 3 | 6 | 12

  // Transforms that need history BEFORE the visible window to compute the
  // first visible point (so we transform on the full series, then range-clip).
  var HISTORY_TRANSFORMS = { yoy: true, qoq: true, mom: true, diff: true };
  // Transforms defined relative to the visible window (clip first, then transform).
  var WINDOW_TRANSFORMS = { index: true, zscore: true };

  var TRANSFORM_META = {
    level:  { short: 'Level',  axis: '',                 pct: false },
    yoy:    { short: 'YoY',    axis: '% YoY',            pct: true  },
    qoq:    { short: 'QoQ',    axis: '% QoQ',            pct: true  },
    mom:    { short: 'Δ%',     axis: '% chg (period)',   pct: true  },
    diff:   { short: 'Δ',      axis: 'Δ (period)',       pct: false },
    index:  { short: '=100',   axis: 'Index (=100)',     pct: false },
    zscore: { short: 'Z',      axis: 'σ (z-score)',      pct: false }
  };

  function nextColor() {
    return SERIES_COLORS[seriesOrder.length % SERIES_COLORS.length];
  }

  function isoDay(d) {
    if (!(d instanceof Date)) d = new Date(d);
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth() + 1).padStart(2, '0');
    var day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function rangeBounds(key) {
    if (key === 'MAX') return null;
    var years = parseInt(key, 10);
    if (!years) return null;
    var to = new Date();
    var from = new Date(to);
    from.setFullYear(from.getFullYear() - years);
    return { from: from, to: to };
  }

  function filterByRange(observations, key) {
    var b = rangeBounds(key);
    if (!b) return observations;
    return observations.filter(function (o) {
      return o.date >= b.from && o.date <= b.to;
    });
  }

  // ── Transform primitives ────────────────────────────────────────────────

  // For each point, find the value at ~`days` before its date (nearest prior
  // within a tolerance window) and return % change. Uses a trailing pointer so
  // the whole pass is O(n). obs must be sorted ascending by date.
  function pctVsLookback(obs, days) {
    if (obs.length < 2) return [];
    var tolMs = days * 0.5 * ONE_DAY;          // half-period tolerance
    var targetMs = days * ONE_DAY;
    var out = [];
    var j = 0;
    for (var i = 0; i < obs.length; i++) {
      var t = obs[i].date.getTime();
      var want = t - targetMs;
      // advance j to the last obs at or before `want`
      while (j + 1 < obs.length && obs[j + 1].date.getTime() <= want) j++;
      // pick the nearer of obs[j] / obs[j+1] to `want`
      var best = obs[j];
      if (j + 1 < i) {
        var d0 = Math.abs(obs[j].date.getTime() - want);
        var d1 = Math.abs(obs[j + 1].date.getTime() - want);
        if (d1 < d0) best = obs[j + 1];
      }
      if (best && best !== obs[i] &&
          Math.abs(best.date.getTime() - want) <= tolMs &&
          best.value != null && obs[i].value != null && Math.abs(best.value) > 1e-12) {
        out.push({ date: obs[i].date, value: (obs[i].value / best.value - 1) * 100 });
      }
    }
    return out;
  }

  // Period-over-period: vs the immediately preceding observation.
  function periodChange(obs, asPct) {
    var out = [];
    for (var i = 1; i < obs.length; i++) {
      var prev = obs[i - 1].value, cur = obs[i].value;
      if (prev == null || cur == null) continue;
      if (asPct) {
        if (Math.abs(prev) < 1e-12) continue;
        out.push({ date: obs[i].date, value: (cur / prev - 1) * 100 });
      } else {
        out.push({ date: obs[i].date, value: cur - prev });
      }
    }
    return out;
  }

  function rebaseIndex(obs) {
    if (!obs.length) return [];
    var base = null;
    for (var i = 0; i < obs.length; i++) {
      if (obs[i].value != null && Math.abs(obs[i].value) > 1e-12) { base = obs[i].value; break; }
    }
    if (base == null) return [];
    return obs.map(function (o) {
      return { date: o.date, value: o.value == null ? null : (o.value / base) * 100 };
    });
  }

  function zscore(obs) {
    var vals = obs.filter(function (o) { return o.value != null; }).map(function (o) { return o.value; });
    if (vals.length < 2) return [];
    var mean = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    var variance = vals.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / vals.length;
    var sd = Math.sqrt(variance);
    if (sd < 1e-12) return [];
    return obs.map(function (o) {
      return { date: o.date, value: o.value == null ? null : (o.value - mean) / sd };
    });
  }

  function movingAverage(obs, n) {
    if (!n || n < 2 || obs.length < n) return obs;
    var out = [];
    var window = [];
    var sum = 0;
    for (var i = 0; i < obs.length; i++) {
      var v = obs[i].value;
      if (v == null) { out.push({ date: obs[i].date, value: null }); continue; }
      window.push(v); sum += v;
      if (window.length > n) sum -= window.shift();
      out.push({ date: obs[i].date, value: window.length === n ? sum / n : null });
    }
    return out;
  }

  function applyTransform(rawObs) {
    if (transform === 'yoy') return pctVsLookback(rawObs, 365);
    if (transform === 'qoq') return pctVsLookback(rawObs, 91);
    if (transform === 'mom') return periodChange(rawObs, true);
    if (transform === 'diff') return periodChange(rawObs, false);
    return rawObs;
  }

  // The single source of truth for a series' rendered/exported points, given
  // the active transform + smoothing + range.
  function seriesPoints(s) {
    var raw = s.observations || [];
    var pts;
    if (WINDOW_TRANSFORMS[transform]) {
      pts = filterByRange(raw, rangeKey);
      pts = (transform === 'index') ? rebaseIndex(pts) : zscore(pts);
      if (smoothing) pts = movingAverage(pts, smoothing);
    } else if (HISTORY_TRANSFORMS[transform]) {
      pts = applyTransform(raw);
      if (smoothing) pts = movingAverage(pts, smoothing);
      pts = filterByRange(pts, rangeKey);
    } else { // level
      pts = raw;
      if (smoothing) pts = movingAverage(pts, smoothing);
      pts = filterByRange(pts, rangeKey);
    }
    return pts;
  }

  function transformAxisLabel() {
    var m = TRANSFORM_META[transform] || TRANSFORM_META.level;
    var base = m.axis;
    if (smoothing) base = (base ? base + ' · ' : '') + smoothing + '-MA';
    return base;
  }

  function buildDataset(s, idx, type, labels, points) {
    var color = s.color || SERIES_COLORS[idx % SERIES_COLORS.length];
    var todayIso = isoDay(new Date());
    var byDate = {};
    points.forEach(function (o) { byDate[isoDay(o.date)] = o.value; });
    var data = labels.map(function (d) { return byDate[d] == null ? null : byDate[d]; });
    var ds = {
      label: s.label,
      data: data,
      borderColor: color,
      backgroundColor: color,
      pointRadius: type === 'bar' ? 0 : function (ctx) {
        var lbl = labels[ctx.dataIndex];
        return lbl > todayIso ? 2 : 0;
      },
      pointStyle: 'circle',
      pointBackgroundColor: function (ctx) {
        var lbl = labels[ctx.dataIndex];
        return lbl > todayIso ? hexToRgba(color, 0.6) : color;
      },
      pointBorderColor: 'transparent',
      pointHoverRadius: 4,
      borderWidth: 1.6,
      tension: 0.05,
      spanGaps: true,
      ric: s.ric,
      yAxisID: s.axis === 'left' ? 'yLeft' : 'y',
      segment: type === 'bar' ? undefined : {
        borderDash: function (ctx) {
          var lbl = labels[ctx.p1DataIndex];
          return lbl > todayIso ? [4, 4] : undefined;
        },
        borderColor: function (ctx) {
          var lbl = labels[ctx.p1DataIndex];
          return lbl > todayIso ? hexToRgba(color, 0.65) : color;
        },
      },
    };
    if (type === 'area') {
      ds.fill = 'origin';
      ds.backgroundColor = hexToRgba(color, 0.18);
    } else if (type === 'bar') {
      ds.type = 'bar';
      ds.backgroundColor = labels.map(function (d) {
        return d > todayIso ? hexToRgba(color, 0.45) : color;
      });
      ds.borderWidth = 0;
      ds.barThickness = 'flex';
    }
    return ds;
  }

  function hexToRgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // If the currently-selected rangeKey filters every series down to zero
  // observations, widen the range to the smallest one that retains data.
  function autoWidenRangeIfEmpty() {
    if (seriesOrder.length === 0) return;
    var ladder = ['1Y', '3Y', '5Y', '10Y', 'MAX'];
    function totalObsInRange(key) {
      var n = 0;
      seriesOrder.forEach(function (id) {
        n += filterByRange(seriesById[id].observations, key).length;
      });
      return n;
    }
    if (totalObsInRange(rangeKey) > 0) return;
    var startIdx = ladder.indexOf(rangeKey);
    var tries = ladder.slice(startIdx + 1).concat(['MAX']);
    for (var i = 0; i < tries.length; i++) {
      if (totalObsInRange(tries[i]) > 0) {
        rangeKey = tries[i];
        var btns = document.querySelectorAll('.range-btn');
        btns.forEach(function (b) { b.classList.toggle('active', b.dataset.range === rangeKey); });
        var status = document.getElementById('chartStatus');
        if (status) {
          var prev = status.textContent;
          status.textContent = 'Widened range to ' + rangeKey + ' (data ends before recent ' + ladder[startIdx] + ')';
          setTimeout(function () { if (status.textContent.indexOf('Widened range') === 0) status.textContent = prev || 'Ready'; }, 4000);
        }
        return;
      }
    }
  }

  // True when any visible series uses the secondary (left) axis.
  function hasDualAxis() {
    return seriesOrder.some(function (id) { return seriesById[id].axis === 'left'; });
  }

  function fmtNum(v) {
    return v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  function rebuild() {
    var canvas = document.getElementById('mainChart');
    var empty = document.getElementById('chartEmpty');
    var legend = document.getElementById('legend');
    if (!canvas) return;

    if (seriesOrder.length === 0) {
      if (chart) { chart.destroy(); chart = null; }
      if (empty) empty.style.display = 'flex';
      if (legend) legend.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (legend) legend.style.display = 'flex';

    // Compute transformed points once per series, reuse for labels + datasets + legend.
    var pointsById = {};
    seriesOrder.forEach(function (id) { pointsById[id] = seriesPoints(seriesById[id]); });

    var allDates = {};
    seriesOrder.forEach(function (id) {
      pointsById[id].forEach(function (o) { allDates[isoDay(o.date)] = true; });
    });
    var labels = Object.keys(allDates).sort();

    var datasets = seriesOrder.map(function (id, idx) {
      return buildDataset(seriesById[id], idx, chartType, labels, pointsById[id]);
    });

    var axisTitle = transformAxisLabel();
    var dual = hasDualAxis();

    var yScales = {
      y: {
        ticks: { color: TEXT_DIM, font: { family: 'JetBrains Mono, Consolas, monospace', size: 10 } },
        grid: { color: GRID, drawBorder: false },
        position: 'right',
        title: axisTitle ? { display: true, text: axisTitle, color: TEXT_DIM, font: { family: 'JetBrains Mono, Consolas, monospace', size: 10 } } : { display: false }
      }
    };
    if (dual) {
      yScales.yLeft = {
        ticks: { color: TEXT_DIM, font: { family: 'JetBrains Mono, Consolas, monospace', size: 10 } },
        grid: { drawOnChartArea: false, drawBorder: false },
        position: 'left'
      };
    }

    var cfg = {
      type: chartType === 'bar' ? 'bar' : 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          macroShading: {},   // consumed by the regime/event shading plugin (Batch 3)
          tooltip: {
            backgroundColor: '#1d222c',
            borderColor: '#323847',
            borderWidth: 1,
            titleColor: TEXT,
            bodyColor: TEXT,
            padding: 10,
            displayColors: true,
            callbacks: {
              label: function (ctx) {
                var v = ctx.parsed.y;
                var meta = TRANSFORM_META[transform] || TRANSFORM_META.level;
                var suffix = meta.pct && v != null ? '%' : '';
                return ctx.dataset.label + ': ' + (v == null ? '—' : fmtNum(v) + suffix);
              }
            }
          }
        },
        scales: Object.assign({
          x: {
            type: 'category',
            ticks: {
              color: TEXT_DIM,
              font: { family: 'JetBrains Mono, Consolas, monospace', size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
              callback: function (val) {
                var label = this.getLabelForValue(val);
                return label ? label.slice(0, 7) : '';
              }
            },
            grid: { color: GRID, drawBorder: false }
          }
        }, yScales)
      }
    };

    if (chart) chart.destroy();
    chart = new Chart(canvas.getContext('2d'), cfg);

    renderLegend(pointsById);
  }

  function renderLegend(pointsById) {
    var el = document.getElementById('legend');
    if (!el) return;
    pointsById = pointsById || {};
    var meta = TRANSFORM_META[transform] || TRANSFORM_META.level;
    var suffix = meta.pct ? '%' : '';
    el.innerHTML = '';
    seriesOrder.forEach(function (id, idx) {
      var s = seriesById[id];
      var color = s.color || SERIES_COLORS[idx % SERIES_COLORS.length];
      var pts = pointsById[id] || seriesPoints(s);
      var lastVal = null;
      for (var i = pts.length - 1; i >= 0; i--) { if (pts[i].value != null) { lastVal = pts[i].value; break; } }
      var item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML =
        '<span class="swatch" style="background:' + color + '"></span>' +
        '<span class="label">' + escapeHtml(s.label) + (s.axis === 'left' ? ' <span class="axis-tag" title="Left axis">L</span>' : '') + '</span>' +
        (lastVal != null ? '<span class="last">' + Number(lastVal).toLocaleString(undefined, { maximumFractionDigits: 2 }) + suffix + '</span>' : '') +
        '<span class="x" data-ric="' + escapeAttr(s.ric) + '" title="Remove">×</span>';
      el.appendChild(item);
    });
    el.querySelectorAll('.x').forEach(function (x) {
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        api.remove(x.dataset.ric);
      });
    });
    // Click the swatch/label to move a series between the right (default) and
    // left axis — the fastest way to make a different-unit overlay readable.
    el.querySelectorAll('.legend-item').forEach(function (item, i) {
      var ric = seriesOrder[i];
      item.title = 'Click to move to the ' + (seriesById[ric] && seriesById[ric].axis === 'left' ? 'right' : 'left') + ' axis';
      item.addEventListener('click', function (e) {
        if (e.target.classList.contains('x')) return;
        var s = seriesById[ric];
        if (!s) return;
        api.setAxis(ric, s.axis === 'left' ? 'right' : 'left');
      });
    });
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function escapeAttr(s) { return escapeHtml(s); }

  // Compact label for derived-series names (keeps the legend readable).
  function shortLabel(s) {
    var l = (s && (s.label || s.ric)) || '';
    return l.length > 22 ? l.slice(0, 21) + '…' : l;
  }

  var api = {
    setType: function (type) {
      chartType = type;
      rebuild();
    },
    setRange: function (key) {
      rangeKey = key;
      rebuild();
    },
    setTransform: function (mode) {
      if (!TRANSFORM_META[mode]) mode = 'level';
      transform = mode;
      rebuild();
    },
    getTransform: function () { return transform; },
    setSmoothing: function (n) {
      smoothing = parseInt(n, 10) || 0;
      rebuild();
    },
    getSmoothing: function () { return smoothing; },
    getRange: function () { return rangeKey; },
    // Force a re-render (used by the regime-shading toggle, which lives outside
    // the engine but draws into the same chart).
    redraw: function () { rebuild(); },
    // Apply the active transform/smoothing/range pipeline to an arbitrary
    // series shape ({observations:[{date,value}]}). Reused by derived series,
    // the economic calendar, and tests. Does not touch the live chart.
    computePoints: function (series) { return seriesPoints(series || {}); },
    transformAxisLabel: transformAxisLabel,
    // For the shading plugin: the sorted ISO-date labels currently on the x-axis.
    currentLabels: function () { return chart ? (chart.data.labels || []).slice() : []; },
    add: function (series) {
      // series: { ric, label, observations: [{date, value}], color?, axis? }
      if (!series || !series.ric) return;
      if (seriesById[series.ric]) {
        var prev = seriesById[series.ric];
        if (!series.color && prev.color) series.color = prev.color;
        if (!series.axis && prev.axis) series.axis = prev.axis;
        seriesById[series.ric] = series;
      } else {
        seriesById[series.ric] = series;
        seriesOrder.push(series.ric);
      }
      if (!series.color) series.color = nextColor();
      autoWidenRangeIfEmpty();
      rebuild();
    },
    remove: function (ric) {
      if (!seriesById[ric]) return;
      delete seriesById[ric];
      seriesOrder = seriesOrder.filter(function (r) { return r !== ric; });
      rebuild();
    },
    clear: function () {
      seriesById = {};
      seriesOrder = [];
      rebuild();
    },
    has: function (ric) { return !!seriesById[ric]; },
    list: function () { return seriesOrder.slice(); },
    get: function (ric) { return seriesById[ric] || null; },
    primary: function () { return seriesOrder[0] ? seriesById[seriesOrder[0]] : null; },
    // Toggle a series onto the secondary (left) axis and back.
    setAxis: function (ric, axis) {
      var s = seriesById[ric];
      if (!s) return;
      s.axis = (axis === 'left') ? 'left' : 'right';
      rebuild();
    },

    // Build a derived series from two loaded series:
    //   op 'spread' → A − B   ·   op 'ratio' → A ÷ B
    // Aligns on exact day; if too few exact matches (mixed frequencies),
    // falls back to nearest-prior within 45 days. Adds it as a normal series.
    // Returns { ok, n, ric } or { ok:false, reason }.
    buildDerived: function (op, ricA, ricB, label) {
      var a = seriesById[ricA], b = seriesById[ricB];
      if (!a || !b) return { ok: false, reason: 'Both series must be loaded.' };
      var aObs = a.observations || [], bObs = b.observations || [];
      if (!aObs.length || !bObs.length) return { ok: false, reason: 'A loaded series has no data.' };

      function combine(av, bv) {
        if (av == null || bv == null) return null;
        if (op === 'ratio') return Math.abs(bv) < 1e-12 ? null : av / bv;
        return av - bv;
      }

      // 1) exact-day alignment
      var bByDay = {};
      bObs.forEach(function (o) { bByDay[isoDay(o.date)] = o.value; });
      var out = [];
      aObs.forEach(function (o) {
        var bv = bByDay[isoDay(o.date)];
        if (bv === undefined) return;
        var v = combine(o.value, bv);
        if (v != null) out.push({ date: o.date, value: v });
      });

      // 2) fallback — nearest-prior within 45 days (mixed-frequency case)
      if (out.length < 5) {
        var tol = 45 * ONE_DAY;
        var j = 0;
        out = [];
        for (var i = 0; i < aObs.length; i++) {
          var t = aObs[i].date.getTime();
          while (j + 1 < bObs.length && bObs[j + 1].date.getTime() <= t) j++;
          var cand = bObs[j];
          if (cand && Math.abs(cand.date.getTime() - t) <= tol) {
            var vv = combine(aObs[i].value, cand.value);
            if (vv != null) out.push({ date: aObs[i].date, value: vv });
          }
        }
      }

      if (out.length < 2) return { ok: false, reason: 'Series do not overlap in time.' };
      var sym = op === 'ratio' ? ' ÷ ' : ' − ';
      var ric = '~' + op + ':' + ricA + ':' + ricB;
      api.add({
        ric: ric,
        label: label || (shortLabel(a) + sym + shortLabel(b)),
        observations: out,
        derived: { op: op, a: ricA, b: ricB }
      });
      return { ok: true, n: out.length, ric: ric };
    },

    // ============================================================
    //  EXPORT — CSV (transformed data) and PNG (paper-friendly image)
    // ============================================================
    exportCsv: function () {
      if (seriesOrder.length === 0) return null;
      var dateSet = {};
      var byRic = {};
      seriesOrder.forEach(function (id) {
        var s = seriesById[id];
        var pts = seriesPoints(s);
        var idx = {};
        pts.forEach(function (o) {
          var d = isoDay(o.date);
          dateSet[d] = true;
          idx[d] = o.value;
        });
        byRic[id] = idx;
      });
      var dates = Object.keys(dateSet).sort();
      var tlabel = (TRANSFORM_META[transform] || TRANSFORM_META.level).axis || 'level';
      var headers = ['date'].concat(seriesOrder.map(function (id) {
        var s = seriesById[id];
        return '"' + (s.label || s.ric).replace(/"/g, '""') + ' (' + s.ric + ') [' + tlabel + ']"';
      }));
      var rows = [headers.join(',')];
      dates.forEach(function (d) {
        var cells = [d];
        seriesOrder.forEach(function (id) {
          var v = byRic[id][d];
          cells.push(v == null ? '' : String(v));
        });
        rows.push(cells.join(','));
      });
      var content = rows.join('\r\n') + '\r\n';
      var primary = seriesById[seriesOrder[0]];
      var stamp = isoDay(new Date());
      var safeRic = String(primary.ric).replace(/[^a-zA-Z0-9]+/g, '_');
      var fname = 'macroterm_' + safeRic + (seriesOrder.length > 1 ? '_+' + (seriesOrder.length - 1) : '') + '_' + stamp + '.csv';
      return { filename: fname, content: content, mime: 'text/csv;charset=utf-8' };
    },

    exportPng: function (opts) {
      if (seriesOrder.length === 0 || !window.Chart) return null;
      opts = opts || {};
      var width = opts.width || 1600;
      var height = opts.height || 900;

      var off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      off.style.position = 'fixed';
      off.style.left = '-9999px';
      off.style.top = '-9999px';
      document.body.appendChild(off);

      var pointsById = {};
      seriesOrder.forEach(function (id) { pointsById[id] = seriesPoints(seriesById[id]); });
      var allDates = {};
      seriesOrder.forEach(function (id) {
        pointsById[id].forEach(function (o) { allDates[isoDay(o.date)] = true; });
      });
      var labels = Object.keys(allDates).sort();

      var PAPER_TEXT = '#0f1419';
      var PAPER_DIM  = '#5b6573';
      var PAPER_GRID = '#e4e8ee';

      var datasets = seriesOrder.map(function (id, idx) {
        var ds = buildDataset(seriesById[id], idx, chartType, labels, pointsById[id]);
        ds.borderWidth = chartType === 'bar' ? 0 : 2.0;
        return ds;
      });

      var primary = seriesById[seriesOrder[0]];
      var titleStr = (primary.label || primary.ric);
      if (seriesOrder.length > 1) titleStr += '  +' + (seriesOrder.length - 1) + ' overlay' + (seriesOrder.length > 2 ? 's' : '');
      var tlabel = (TRANSFORM_META[transform] || TRANSFORM_META.level).axis;
      if (transform !== 'level') titleStr += '   ·   ' + tlabel;

      var whiteBgPlugin = {
        id: 'whiteBg',
        beforeDraw: function (c) {
          var ctx = c.ctx;
          ctx.save();
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.restore();
        }
      };

      var dual = hasDualAxis();
      var yScales = {
        y: {
          ticks: { color: PAPER_DIM, font: { family: 'Helvetica, Arial, sans-serif', size: 10 } },
          grid: { color: PAPER_GRID, drawBorder: false },
          position: 'right'
        }
      };
      if (dual) {
        yScales.yLeft = {
          ticks: { color: PAPER_DIM, font: { family: 'Helvetica, Arial, sans-serif', size: 10 } },
          grid: { drawOnChartArea: false, drawBorder: false },
          position: 'left'
        };
      }

      var cfg = {
        type: chartType === 'bar' ? 'bar' : 'line',
        data: { labels: labels, datasets: datasets },
        plugins: [whiteBgPlugin],
        options: {
          responsive: false,
          maintainAspectRatio: false,
          animation: false,
          devicePixelRatio: 1,
          interaction: { mode: 'nearest', axis: 'x', intersect: false },
          layout: { padding: { top: 56, right: 28, bottom: 18, left: 18 } },
          plugins: {
            legend: {
              display: true, position: 'top', align: 'start',
              labels: { color: PAPER_TEXT, font: { family: 'Helvetica, Arial, sans-serif', size: 12 }, boxWidth: 12, boxHeight: 8, usePointStyle: false }
            },
            datalabels: { display: false },
            title: {
              display: true, text: titleStr, color: PAPER_TEXT,
              font: { family: 'Helvetica, Arial, sans-serif', size: 16, weight: '600' },
              align: 'start', padding: { top: 4, bottom: 6 }
            },
            subtitle: {
              display: true,
              text: 'Range: ' + rangeKey + '   ·   Exported: ' + isoDay(new Date()) + '   ·   Refinitiv Macro Terminal',
              color: PAPER_DIM, font: { family: 'Helvetica, Arial, sans-serif', size: 10 },
              align: 'start', padding: { bottom: 8 }
            },
            tooltip: { enabled: false }
          },
          scales: Object.assign({
            x: {
              type: 'category',
              ticks: {
                color: PAPER_DIM, font: { family: 'Helvetica, Arial, sans-serif', size: 10 },
                maxRotation: 0, autoSkip: true, maxTicksLimit: 12,
                callback: function (val) { var label = this.getLabelForValue(val); return label ? label.slice(0, 7) : ''; }
              },
              grid: { color: PAPER_GRID, drawBorder: false }
            }
          }, yScales)
        }
      };

      var tmp = new Chart(off.getContext('2d'), cfg);
      tmp.update('none');
      var dataUrl = off.toDataURL('image/png');
      tmp.destroy();
      document.body.removeChild(off);

      var stamp = isoDay(new Date());
      var safeRic = String(primary.ric).replace(/[^a-zA-Z0-9]+/g, '_');
      var fname = 'macroterm_' + safeRic + (seriesOrder.length > 1 ? '_+' + (seriesOrder.length - 1) : '') + '_' + stamp + '.png';
      return { filename: fname, dataUrl: dataUrl };
    }
  };

  global.ChartEngine = api;
})(window);

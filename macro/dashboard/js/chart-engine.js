// chart-engine.js — lean Chart.js wrapper for the Refinitiv Macro Terminal.
// Handles line / area / bar over a time axis with multi-series overlay.
// Owns one Chart.js instance bound to <canvas id="mainChart">.

(function (global) {
  'use strict';

  var SERIES_COLORS = ['#ff8a00', '#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#06b6d4', '#f97316'];
  var TEXT = '#e6e8ec';
  var TEXT_DIM = '#9aa3b2';
  var GRID = '#252b36';

  var chart = null;
  var chartType = 'line';
  var seriesById = {};
  var seriesOrder = [];
  var rangeKey = '5Y';

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

  function buildDataset(s, idx, type, labels) {
    var color = s.color || SERIES_COLORS[idx % SERIES_COLORS.length];
    var todayIso = isoDay(new Date());
    var byDate = {};
    s.observations.forEach(function (o) { byDate[isoDay(o.date)] = o.value; });
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
      pointStyle: function (ctx) {
        var lbl = labels[ctx.dataIndex];
        return lbl > todayIso ? 'circle' : 'circle';
      },
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
      // For bars: lighten forecast bars instead of dashing
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
  // Order tried: current → 10Y → MAX. Updates the toolbar's active button
  // so the user sees the new range reflected immediately.
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
    // Try each wider range in order, then any range
    var startIdx = ladder.indexOf(rangeKey);
    var tries = ladder.slice(startIdx + 1).concat(['MAX']);
    for (var i = 0; i < tries.length; i++) {
      if (totalObsInRange(tries[i]) > 0) {
        rangeKey = tries[i];
        // Sync the range toolbar buttons (if present in the DOM)
        var btns = document.querySelectorAll('.range-btn');
        btns.forEach(function (b) { b.classList.toggle('active', b.dataset.range === rangeKey); });
        // Show a brief status hint so the user knows we widened
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

    // Build a unified, sorted set of date labels across all visible series
    var allDates = {};
    seriesOrder.forEach(function (id) {
      filterByRange(seriesById[id].observations, rangeKey).forEach(function (o) {
        allDates[isoDay(o.date)] = true;
      });
    });
    var labels = Object.keys(allDates).sort();

    var datasets = seriesOrder.map(function (id, idx) {
      return buildDataset(seriesById[id], idx, chartType, labels);
    });

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
                return ctx.dataset.label + ': ' + (v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 }));
              }
            }
          }
        },
        scales: {
          x: {
            type: 'category',
            ticks: {
              color: TEXT_DIM,
              font: { family: 'JetBrains Mono, Consolas, monospace', size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
              callback: function (val, idx) {
                var label = this.getLabelForValue(val);
                return label ? label.slice(0, 7) : '';
              }
            },
            grid: { color: GRID, drawBorder: false }
          },
          y: {
            ticks: { color: TEXT_DIM, font: { family: 'JetBrains Mono, Consolas, monospace', size: 10 } },
            grid: { color: GRID, drawBorder: false },
            position: 'right'
          }
        }
      }
    };

    if (chart) chart.destroy();
    chart = new Chart(canvas.getContext('2d'), cfg);

    renderLegend();
  }

  function renderLegend() {
    var el = document.getElementById('legend');
    if (!el) return;
    el.innerHTML = '';
    seriesOrder.forEach(function (id, idx) {
      var s = seriesById[id];
      var color = s.color || SERIES_COLORS[idx % SERIES_COLORS.length];
      var last = s.observations.length ? s.observations[s.observations.length - 1].value : null;
      var item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML =
        '<span class="swatch" style="background:' + color + '"></span>' +
        '<span class="label">' + escapeHtml(s.label) + '</span>' +
        (last != null ? '<span class="last">' + Number(last).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '</span>' : '') +
        '<span class="x" data-ric="' + escapeAttr(s.ric) + '" title="Remove">×</span>';
      el.appendChild(item);
    });
    el.querySelectorAll('.x').forEach(function (x) {
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        api.remove(x.dataset.ric);
      });
    });
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function escapeAttr(s) { return escapeHtml(s); }

  var api = {
    setType: function (type) {
      chartType = type;
      rebuild();
    },
    setRange: function (key) {
      rangeKey = key;
      rebuild();
    },
    add: function (series) {
      // series: { ric, label, observations: [{date: Date, value: number}], color? }
      if (!series || !series.ric) return;
      if (seriesById[series.ric]) {
        seriesById[series.ric] = series;
      } else {
        seriesById[series.ric] = series;
        seriesOrder.push(series.ric);
      }
      if (!series.color) series.color = nextColor();

      // Auto-widen range if NO series has any observations in the current
      // window. Common case: discontinued or sparse series whose data ends
      // before today minus rangeKey years (e.g. data ending 2017-11 + 5Y view).
      // We promote to the smallest range that actually contains data so the
      // user always sees a meaningful chart, never an empty 0-1 axis.
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
    primary: function () { return seriesOrder[0] ? seriesById[seriesOrder[0]] : null; },

    // ============================================================
    //  EXPORT — CSV (data) and PNG (paper-friendly chart image)
    // ============================================================
    exportCsv: function () {
      if (seriesOrder.length === 0) return null;
      // Filter each series by current rangeKey, then build a wide table:
      //   columns:  date, <label_1> (<ric_1>), <label_2> (<ric_2>), ...
      var dateSet = {};
      var byRic = {};
      seriesOrder.forEach(function (id) {
        var s = seriesById[id];
        var filtered = filterByRange(s.observations, rangeKey);
        var idx = {};
        filtered.forEach(function (o) {
          var d = isoDay(o.date);
          dateSet[d] = true;
          idx[d] = o.value;
        });
        byRic[id] = idx;
      });
      var dates = Object.keys(dateSet).sort();
      var headers = ['date'].concat(seriesOrder.map(function (id) {
        var s = seriesById[id];
        // Quote labels — they may contain commas
        return '"' + (s.label || s.ric).replace(/"/g, '""') + ' (' + s.ric + ')"';
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

    // Renders a paper-friendly PNG (white bg, black labels) without disturbing
    // the live chart. Builds a temporary Chart.js instance on an offscreen
    // canvas, exports its base64 image, then destroys the temp chart.
    exportPng: function (opts) {
      if (seriesOrder.length === 0 || !window.Chart) return null;
      opts = opts || {};
      var width = opts.width || 1600;
      var height = opts.height || 900;

      // Offscreen canvas, attached to DOM (Chart.js needs a real canvas) but hidden.
      var off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      off.style.position = 'fixed';
      off.style.left = '-9999px';
      off.style.top = '-9999px';
      document.body.appendChild(off);

      // Rebuild labels + datasets the same way as the live chart, but with paper colors
      var allDates = {};
      seriesOrder.forEach(function (id) {
        filterByRange(seriesById[id].observations, rangeKey).forEach(function (o) {
          allDates[isoDay(o.date)] = true;
        });
      });
      var labels = Object.keys(allDates).sort();

      var PAPER_TEXT = '#0f1419';
      var PAPER_DIM  = '#5b6573';
      var PAPER_GRID = '#e4e8ee';

      var datasets = seriesOrder.map(function (id, idx) {
        var ds = buildDataset(seriesById[id], idx, chartType, labels);
        // Slightly thicker line on paper for clarity
        ds.borderWidth = chartType === 'bar' ? 0 : 2.0;
        return ds;
      });

      // Title text for the export — primary series + count of overlays
      var primary = seriesById[seriesOrder[0]];
      var titleStr = (primary.label || primary.ric);
      if (seriesOrder.length > 1) titleStr += '  +' + (seriesOrder.length - 1) + ' overlay' + (seriesOrder.length > 2 ? 's' : '');

      // Plugin to paint a solid white background for the PNG (canvases default to transparent)
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
              display: true,
              position: 'top',
              align: 'start',
              labels: {
                color: PAPER_TEXT,
                font: { family: 'Helvetica, Arial, sans-serif', size: 12 },
                boxWidth: 12,
                boxHeight: 8,
                usePointStyle: false,
              }
            },
            datalabels: { display: false },
            title: {
              display: true,
              text: titleStr,
              color: PAPER_TEXT,
              font: { family: 'Helvetica, Arial, sans-serif', size: 16, weight: '600' },
              align: 'start',
              padding: { top: 4, bottom: 6 }
            },
            subtitle: {
              display: true,
              text: 'Range: ' + rangeKey + '   ·   Exported: ' + isoDay(new Date()) + '   ·   Refinitiv Macro Terminal',
              color: PAPER_DIM,
              font: { family: 'Helvetica, Arial, sans-serif', size: 10 },
              align: 'start',
              padding: { bottom: 8 }
            },
            tooltip: { enabled: false }
          },
          scales: {
            x: {
              type: 'category',
              ticks: {
                color: PAPER_DIM,
                font: { family: 'Helvetica, Arial, sans-serif', size: 10 },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 12,
                callback: function (val) {
                  var label = this.getLabelForValue(val);
                  return label ? label.slice(0, 7) : '';
                }
              },
              grid: { color: PAPER_GRID, drawBorder: false }
            },
            y: {
              ticks: { color: PAPER_DIM, font: { family: 'Helvetica, Arial, sans-serif', size: 10 } },
              grid: { color: PAPER_GRID, drawBorder: false },
              position: 'right'
            }
          }
        }
      };

      var tmp = new Chart(off.getContext('2d'), cfg);
      // Force one synchronous render
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

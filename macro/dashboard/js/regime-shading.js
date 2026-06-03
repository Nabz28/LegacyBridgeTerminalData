// regime-shading.js — recession bands + key-event markers behind the chart.
//
// A globally-registered Chart.js plugin that reads window.MacroShading state
// (enabled flag + active country, resolved from Catalog at draw time) and
// paints, BEHIND the data:
//   • recession / crisis bands  (shaded vertical regions)
//   • event markers             (thin dated vertical lines + small labels)
//
// The x-axis is a category scale of ISO-day strings, so dates are mapped to the
// nearest category index. Data is curated and embedded (no fetch, instant).

(function (global) {
  'use strict';

  // ── Curated cycle data ────────────────────────────────────────────────
  // Recessions: NBER for the US; crisis/contraction windows for ID/CN.
  // Events: a small, high-signal set so labels never crowd the axis.
  var DATA = {
    us: {
      recessions: [
        { start: '1980-01-01', end: '1980-07-31', label: '1980' },
        { start: '1981-07-01', end: '1982-11-30', label: '1981–82' },
        { start: '1990-07-01', end: '1991-03-31', label: 'Gulf War' },
        { start: '2001-03-01', end: '2001-11-30', label: 'Dot-com' },
        { start: '2007-12-01', end: '2009-06-30', label: 'GFC' },
        { start: '2020-02-01', end: '2020-04-30', label: 'COVID' }
      ],
      events: [
        { date: '2008-09-15', label: 'Lehman' },
        { date: '2013-05-22', label: 'Taper tantrum' },
        { date: '2015-12-16', label: '1st hike' },
        { date: '2020-03-23', label: 'COVID floor' },
        { date: '2022-03-16', label: 'Hiking cycle' },
        { date: '2023-07-26', label: 'Peak rate' }
      ]
    },
    id: {
      recessions: [
        { start: '1997-08-01', end: '1999-06-30', label: 'Asian crisis' },
        { start: '2020-04-01', end: '2020-12-31', label: 'COVID' }
      ],
      events: [
        { date: '1998-05-21', label: 'Reformasi' },
        { date: '2013-08-19', label: 'Taper / rupiah' },
        { date: '2020-03-02', label: 'First COVID case' },
        { date: '2022-08-23', label: 'BI hiking' }
      ]
    },
    cn: {
      recessions: [
        { start: '2015-06-01', end: '2016-01-31', label: 'Equity crash' },
        { start: '2020-01-01', end: '2020-03-31', label: 'COVID' }
      ],
      events: [
        { date: '2008-11-09', label: '¥4T stimulus' },
        { date: '2015-08-11', label: 'CNY devaluation' },
        { date: '2021-09-20', label: 'Evergrande' },
        { date: '2022-12-07', label: 'Reopening' }
      ]
    }
  };

  var BAND_FILL   = 'rgba(148,163,184,0.10)';
  var BAND_FILL_PAPER = 'rgba(15,20,25,0.06)';
  var BAND_EDGE   = 'rgba(148,163,184,0.28)';
  var EVENT_LINE  = 'rgba(255,138,0,0.38)';
  var EVENT_TEXT  = 'rgba(255,138,0,0.92)';
  var EVENT_TEXT_PAPER = 'rgba(120,70,0,0.9)';

  function activeCountry() {
    try {
      if (global.Catalog && global.Catalog.getCountry) return global.Catalog.getCountry();
    } catch (e) {}
    return (global.MacroShading && global.MacroShading.country) || 'us';
  }

  // Map an ISO-day to an x-pixel on a category scale by locating the nearest
  // category index. Returns null when the chart has no labels.
  function pixelForDate(chart, iso) {
    var labels = chart.data.labels || [];
    if (!labels.length) return null;
    var scale = chart.scales.x;
    if (!scale) return null;
    var idx;
    if (iso <= labels[0]) idx = 0;
    else if (iso >= labels[labels.length - 1]) idx = labels.length - 1;
    else {
      var lo = 0, hi = labels.length - 1;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (labels[mid] < iso) lo = mid + 1; else hi = mid;
      }
      idx = lo;
    }
    return scale.getPixelForValue(idx);
  }

  function isPaper(chart) {
    // The PNG export chart paints a white background — detect it so band/label
    // colors stay legible on paper.
    return !!(chart.options && chart.options.plugins && chart.options.plugins.legend &&
              chart.options.plugins.legend.display === true);
  }

  var plugin = {
    id: 'macroShading',
    beforeDatasetsDraw: function (chart) {
      if (!global.MacroShading || !global.MacroShading.enabled) return;
      var labels = chart.data.labels || [];
      if (!labels.length) return;
      var cc = DATA[activeCountry()];
      if (!cc) return;
      var area = chart.chartArea;
      var ctx = chart.ctx;
      var paper = isPaper(chart);
      var first = labels[0], last = labels[labels.length - 1];

      ctx.save();
      (cc.recessions || []).forEach(function (r) {
        if (r.end < first || r.start > last) return;        // fully outside window
        var x0 = pixelForDate(chart, r.start < first ? first : r.start);
        var x1 = pixelForDate(chart, r.end > last ? last : r.end);
        if (x0 == null || x1 == null) return;
        var w = Math.max(1, x1 - x0);
        ctx.fillStyle = paper ? BAND_FILL_PAPER : BAND_FILL;
        ctx.fillRect(x0, area.top, w, area.bottom - area.top);
        if (w > 6) {
          ctx.strokeStyle = BAND_EDGE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x0 + 0.5, area.top); ctx.lineTo(x0 + 0.5, area.bottom);
          ctx.moveTo(x1 - 0.5, area.top); ctx.lineTo(x1 - 0.5, area.bottom);
          ctx.stroke();
        }
        if (w > 42) {
          ctx.fillStyle = paper ? 'rgba(80,90,100,0.8)' : 'rgba(148,163,184,0.75)';
          ctx.font = '9px JetBrains Mono, Consolas, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(r.label, x0 + w / 2, area.top + 11);
        }
      });
      ctx.restore();
    },
    afterDatasetsDraw: function (chart) {
      if (!global.MacroShading || !global.MacroShading.enabled) return;
      if (!global.MacroShading.events) return;
      var labels = chart.data.labels || [];
      if (!labels.length) return;
      var cc = DATA[activeCountry()];
      if (!cc) return;
      var area = chart.chartArea;
      var ctx = chart.ctx;
      var paper = isPaper(chart);
      var first = labels[0], last = labels[labels.length - 1];

      ctx.save();
      ctx.font = '8.5px JetBrains Mono, Consolas, monospace';
      var lastLabelX = -1e9;
      (cc.events || []).forEach(function (ev) {
        if (ev.date < first || ev.date > last) return;
        var x = pixelForDate(chart, ev.date);
        if (x == null) return;
        ctx.strokeStyle = EVENT_LINE;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x + 0.5, area.top); ctx.lineTo(x + 0.5, area.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        // Stagger labels that would collide with the previous one.
        if (x - lastLabelX > 8) {
          ctx.save();
          ctx.translate(x + 3, area.top + 4);
          ctx.rotate(Math.PI / 2);
          ctx.fillStyle = paper ? EVENT_TEXT_PAPER : EVENT_TEXT;
          ctx.textAlign = 'left';
          ctx.fillText(ev.label, 0, 0);
          ctx.restore();
          lastLabelX = x;
        }
      });
      ctx.restore();
    }
  };

  function register() {
    if (global.Chart && global.Chart.register) {
      try { global.Chart.register(plugin); return true; } catch (e) {}
    }
    return false;
  }
  // Chart.js loads from CDN before this file; register immediately, retry once.
  if (!register()) {
    document.addEventListener('DOMContentLoaded', register);
  }

  global.MacroShading = {
    enabled: false,
    events: true,
    country: 'us',
    hasData: function (cc) { return !!DATA[cc || activeCountry()]; },
    toggle: function () {
      this.enabled = !this.enabled;
      if (global.ChartEngine && global.ChartEngine.redraw) global.ChartEngine.redraw();
      return this.enabled;
    },
    set: function (on) {
      this.enabled = !!on;
      if (global.ChartEngine && global.ChartEngine.redraw) global.ChartEngine.redraw();
    }
  };
})(window);

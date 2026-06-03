// econ-calendar.js — an economic calendar built from the terminal's own data.
//
// No external feed: every row is derived from series already in the catalog.
//   • Headline indicators come from the condensed influence-graph anchors
//     (the most-watched series) plus, for the US, every Reuters Polls anchor.
//   • "Last release" = the series' latest observation (value + prior + change).
//   • "Next (est.)" = last observation date + the series' frequency cadence —
//     an estimate, clearly marked as such (we have no official release schedule).
//   • For poll indicators we also align the consensus median to the latest
//     actual and show the surprise (actual − consensus).
//
// Rows are split into Upcoming (estimated, next 60d) and Recent (last 75d),
// and clicking a row charts that series.

(function (global) {
  'use strict';

  var FREQ_DAYS = { P1D: 1, P1W: 7, P1M: 30, P3M: 91, P6M: 182, P1Y: 365 };
  var FREQ_LABEL = { P1D: 'Daily', P1W: 'Weekly', P1M: 'Monthly', P3M: 'Quarterly', P6M: 'Semi-annual', P1Y: 'Annual' };
  var MAX_HEADLINE = 22;   // cap series fetched on open (each is a network round-trip)
  var MAX_POLLS = 14;

  var built = null;        // cache for the active country
  var builtCountry = null;
  var building = false;

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function isoDay(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return d.toISOString().slice(0, 10);
  }
  // Month-precision label for ESTIMATED dates — we never imply day-precision on
  // a date we computed by adding a frequency cadence.
  function monthYear(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function addCadence(date, freq) {
    var d = new Date(date.getTime());
    if (freq === 'P1M') { d.setUTCMonth(d.getUTCMonth() + 1); return d; }
    if (freq === 'P3M') { d.setUTCMonth(d.getUTCMonth() + 3); return d; }
    if (freq === 'P6M') { d.setUTCMonth(d.getUTCMonth() + 6); return d; }
    if (freq === 'P1Y') { d.setUTCFullYear(d.getUTCFullYear() + 1); return d; }
    d.setUTCDate(d.getUTCDate() + (FREQ_DAYS[freq] || 30));
    return d;
  }
  function fmt(v) {
    return v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  function daysBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

  function lastTwo(obs) {
    var pts = (obs || []).filter(function (o) { return o.value != null; });
    if (!pts.length) return null;
    return { last: pts[pts.length - 1], prior: pts.length > 1 ? pts[pts.length - 2] : null };
  }
  // Value of `obs` nearest (at or before) the given date.
  function valueAt(obs, date) {
    var t = date.getTime(), best = null;
    for (var i = 0; i < obs.length; i++) {
      if (obs[i].value == null) continue;
      if (obs[i].date.getTime() <= t + 3 * 86400000) best = obs[i].value;
      else break;
    }
    return best;
  }

  // Resolve the headline set without hardcoding RICs: cluster anchors from the
  // condensed graph + (US) poll anchors with their consensus sibling.
  function gatherTargets() {
    var C = global.Catalog;
    var idx = C.getIndex() || {};
    var ricMeta = idx.rics || {};
    var targets = [];
    var seen = {};

    function freqOf(ric) { return (ricMeta[ric] && ricMeta[ric].frequency) || 'P1M'; }
    function descOf(ric, fallback) { return (ricMeta[ric] && ricMeta[ric].description) || fallback || ric; }

    // 1) Poll anchors (US) — these carry a consensus median.
    var polls = [];
    var pollCats = (idx.categories || []).filter(function (c) { return c.section === 'Polls'; });
    var pollPromise = Promise.all(pollCats.map(function (c) { return C.getCategory(c.slug).catch(function () { return null; }); }))
      .then(function (cats) {
        cats.forEach(function (cat) {
          if (!cat) return;
          var byGroup = {};
          (cat.rics || []).forEach(function (r) {
            var gid = r.indicator_group_id || r.indicator || r.ric;
            (byGroup[gid] = byGroup[gid] || []).push(r);
          });
          Object.keys(byGroup).forEach(function (gid) {
            if (polls.length >= MAX_POLLS) return;
            var stats = byGroup[gid];
            var anchor = stats.find(function (r) { return r.stat_role === 'actual'; });
            var median = stats.find(function (r) { return r.stat_role === 'median'; });
            if (!anchor) return;
            if (seen[anchor.ric]) return;
            seen[anchor.ric] = true;
            polls.push({
              ric: anchor.ric,
              label: anchor.indicator || (anchor.description || '').split('—')[0].trim() || anchor.ric,
              freq: anchor.frequency || freqOf(anchor.ric),
              units: anchor.units || '',
              isPoll: true,
              consensusRic: median ? median.ric : null,
              topic: anchor.indicator_topic || ''
            });
          });
        });
      });

    // 2) Cluster anchors from the condensed graph (all countries).
    return pollPromise.then(function () {
      targets = polls.slice();
      var g = C.getGraph ? C.getGraph('condensed') : null;
      var nodes = (g && g.nodes) || [];
      // anchors first, then tier-1
      var ranked = nodes.slice().sort(function (a, b) {
        var aa = (a.is_anchor ? 0 : 1), bb = (b.is_anchor ? 0 : 1);
        if (aa !== bb) return aa - bb;
        return (a.tier || 9) - (b.tier || 9);
      });
      for (var i = 0; i < ranked.length && targets.length < MAX_HEADLINE + MAX_POLLS; i++) {
        var n = ranked[i];
        if (seen[n.id]) continue;
        if (!ricMeta[n.id]) continue;  // must exist in catalog
        seen[n.id] = true;
        targets.push({
          ric: n.id,
          label: (n.label && n.label !== n.id) ? n.label : descOf(n.id),
          freq: freqOf(n.id),
          units: (ricMeta[n.id] && ricMeta[n.id].units) || '',
          isPoll: false,
          consensusRic: null
        });
      }
      return targets;
    });
  }

  function buildRows() {
    var C = global.Catalog;
    return gatherTargets().then(function (targets) {
      // Fetch observations (+ consensus where present) in parallel.
      var jobs = targets.map(function (t) {
        var obsP = C.getObservations(t.ric).catch(function () { return []; });
        var conP = t.consensusRic ? C.getObservations(t.consensusRic).catch(function () { return []; }) : Promise.resolve(null);
        return Promise.all([obsP, conP]).then(function (res) {
          var lt = lastTwo(res[0]);
          if (!lt) return null;
          var row = {
            ric: t.ric, label: t.label, freq: t.freq, freqLabel: FREQ_LABEL[t.freq] || t.freq,
            units: t.units, isPoll: t.isPoll, topic: t.topic,
            lastDate: lt.last.date, lastVal: lt.last.value,
            priorVal: lt.prior ? lt.prior.value : null
          };
          row.change = (row.priorVal != null) ? row.lastVal - row.priorVal : null;
          row.nextEst = addCadence(lt.last.date, t.freq);
          if (res[1] && res[1].length) {
            var cons = valueAt(res[1], lt.last.date);
            if (cons != null) { row.consensus = cons; row.surprise = row.lastVal - cons; }
          }
          return row;
        });
      });
      return Promise.all(jobs).then(function (rows) {
        return rows.filter(Boolean);
      });
    });
  }

  function rowHtml(r, kind) {
    var today = new Date();
    var dateStr, daysStr, estMark = '';
    if (kind === 'upcoming') {
      // Estimated — month precision only, tilde-marked, never a crisp day.
      dateStr = '~' + monthYear(r.nextEst);
      var dn = daysBetween(today, r.nextEst);
      daysStr = 'est · ' + (dn <= 0 ? 'due' : '~' + dn + 'd');
      estMark = '<span class="cal-badge est" title="Estimated from the series\' release cadence — not an official schedule date">est</span>';
    } else {
      dateStr = isoDay(r.lastDate);
      var dp = daysBetween(r.lastDate, today);
      daysStr = dp <= 0 ? 'today' : (dp + 'd ago');
    }
    var chgClass = r.change == null ? '' : (r.change > 0 ? 'up' : (r.change < 0 ? 'down' : ''));
    var chgStr = r.change == null ? '' : (r.change > 0 ? '▲ ' : (r.change < 0 ? '▼ ' : '')) + fmt(Math.abs(r.change));
    var surpriseBadge = '';
    if (r.surprise != null) {
      var s = r.surprise;
      var cls = s > 0 ? 'above' : (s < 0 ? 'below' : 'inline');
      var txt = (s > 0 ? '+' : '') + fmt(s) + ' vs cons';
      surpriseBadge = '<span class="cal-badge ' + cls + '" title="Actual minus consensus median">' + escapeHtml(txt) + '</span>';
    } else if (r.isPoll) {
      surpriseBadge = '<span class="cal-badge poll" title="Reuters poll indicator">poll</span>';
    }
    return '<div class="cal-row" data-ric="' + escapeHtml(r.ric) + '">' +
      '<div class="cal-row-date"><span class="cal-d">' + dateStr + '</span><span class="cal-rel">' + daysStr + '</span></div>' +
      '<div class="cal-row-main">' +
        '<div class="cal-row-name">' + escapeHtml(r.label) + ' ' + estMark + surpriseBadge + '</div>' +
        '<div class="cal-row-meta">' + escapeHtml(r.freqLabel) + (r.units ? ' · ' + escapeHtml(r.units) : '') + ' · ' + escapeHtml(r.ric) + '</div>' +
      '</div>' +
      '<div class="cal-row-vals">' +
        '<div class="cal-val"><span class="cal-val-num">' + fmt(r.lastVal) + '</span><span class="cal-val-lbl">last</span></div>' +
        '<div class="cal-val"><span class="cal-val-num">' + fmt(r.priorVal) + '</span><span class="cal-val-lbl">prior</span></div>' +
        '<div class="cal-val ' + chgClass + '"><span class="cal-val-num">' + (chgStr || '—') + '</span><span class="cal-val-lbl">Δ</span></div>' +
      '</div>' +
    '</div>';
  }

  function render(rows) {
    var body = document.getElementById('calBody');
    if (!body) return;
    var today = new Date();
    var upcoming = rows.filter(function (r) {
      var dn = daysBetween(today, r.nextEst);
      return dn >= -7 && dn <= 60;
    }).sort(function (a, b) { return a.nextEst - b.nextEst; });
    var recent = rows.filter(function (r) {
      var dp = daysBetween(r.lastDate, today);
      return dp >= 0 && dp <= 75;
    }).sort(function (a, b) { return b.lastDate - a.lastDate; });

    var html = '';
    html += '<div class="cal-col">' +
      '<div class="cal-col-head"><span class="cal-col-title">▲ Upcoming</span><span class="cal-col-note">estimated from release cadence</span></div>' +
      (upcoming.length ? upcoming.map(function (r) { return rowHtml(r, 'upcoming'); }).join('')
        : '<div class="cal-empty">No headline releases estimated in the next 60 days.</div>') +
      '</div>';
    html += '<div class="cal-col">' +
      '<div class="cal-col-head"><span class="cal-col-title">● Recent releases</span><span class="cal-col-note">last 75 days · actual vs prior</span></div>' +
      (recent.length ? recent.map(function (r) { return rowHtml(r, 'recent'); }).join('')
        : '<div class="cal-empty">No recent releases in the last 75 days.</div>') +
      '</div>';
    body.innerHTML = html;

    body.querySelectorAll('.cal-row').forEach(function (el) {
      el.addEventListener('click', function () {
        var ric = el.dataset.ric;
        close();
        if (global.MacroTerminal && global.MacroTerminal.loadRic) global.MacroTerminal.loadRic(ric, { replace: true });
      });
    });
  }

  function setSub(text) {
    var sub = document.getElementById('calSub');
    if (sub) sub.textContent = text;
  }

  function open() {
    var overlay = document.getElementById('calOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    var cc = (global.Catalog && global.Catalog.getCountry && global.Catalog.getCountry()) || 'us';
    setSub((cc || '').toUpperCase() + ' · as of ' + isoDay(new Date()) + ' · derived from catalog data');

    if (built && builtCountry === cc) { render(built); return; }
    if (building) return;
    building = true;
    var body = document.getElementById('calBody');
    if (body) body.innerHTML = '<div class="cal-loading">Reading the latest releases from ' + escapeHtml((cc || '').toUpperCase()) + ' data…</div>';
    buildRows().then(function (rows) {
      built = rows; builtCountry = cc; building = false;
      render(rows);
    }).catch(function (err) {
      building = false;
      if (body) body.innerHTML = '<div class="cal-loading err">Could not build the calendar: ' + escapeHtml(err.message) + '</div>';
    });
  }
  function close() {
    var overlay = document.getElementById('calOverlay');
    if (overlay) overlay.classList.add('hidden');
  }
  function invalidate() { built = null; builtCountry = null; }

  global.EconCalendar = { open: open, close: close, invalidate: invalidate };
})(window);

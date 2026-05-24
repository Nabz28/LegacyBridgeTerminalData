// ================================================================
// lbc-export.js — shared export helpers (window.LbcExport).
// Plain <script> (no Babel), loaded before the Babel UI scripts.
//
//   LbcExport.saveCSV(filename, {headers:[...], rows:[[...]]})
//   LbcExport.toCSV({headers, rows}) -> string
//   LbcExport.svgToPng(svgEl, {filename, scale, background, remapLight})
//   LbcExport.stamp()  -> 'YYYYMMDD-HHMM' for filenames
//
// PNG export rasterises an <svg> onto a white canvas. Because the charts
// are drawn light-on-dark, any near-white stroke/fill/text is remapped to a
// dark equivalent (preserving alpha) so it stays legible on white. Mid-tone
// data colours (steel / green / red) are left untouched.
// ================================================================
(function () {
  'use strict';

  function stamp() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  // ---- file download ------------------------------------------------------
  function download(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  }

  // ---- CSV ----------------------------------------------------------------
  function csvCell(v) {
    if (v == null) return '';
    if (typeof v === 'number') return isFinite(v) ? String(v) : '';
    var s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(payload) {
    payload = payload || {};
    var headers = payload.headers || [];
    var rows = payload.rows || [];
    var lines = [];
    if (headers.length) lines.push(headers.map(csvCell).join(','));
    rows.forEach(function (r) {
      var arr = Array.isArray(r) ? r : headers.map(function (h) { return r[h]; });
      lines.push(arr.map(csvCell).join(','));
    });
    return lines.join('\r\n');
  }
  function saveCSV(filename, payload) {
    var csv = typeof payload === 'string' ? payload : toCSV(payload);
    download(filename || ('export-' + stamp() + '.csv'), new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  }

  // ---- colour remap for white background ----------------------------------
  var LUM_T = 0.72; // above this, recolour for legibility on white
  function parseColor(str) {
    if (!str) return null;
    str = str.trim();
    if (str === 'none' || str === 'transparent') return null;
    var m = str.match(/rgba?\(([^)]+)\)/i);
    if (!m) return null;
    var p = m[1].split(',').map(function (s) { return parseFloat(s); });
    if (p.length < 3 || !isFinite(p[0])) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 && isFinite(p[3]) ? p[3] : 1 };
  }
  function lum(c) { return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255; }
  function remapColor(str) {
    var c = parseColor(str);
    if (!c) return null;
    if (lum(c) > LUM_T) return 'rgba(40,42,48,' + c.a + ')'; // near-white -> dark slate
    return null;
  }

  var STYLE_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
    'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'color',
    'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor',
    'dominant-baseline', 'letter-spacing'];

  // Walk source + clone in parallel; copy resolved presentation styles inline
  // (CSS classes don't survive serialisation), remapping light colours.
  function inlineStyles(srcEl, cloneEl, remap) {
    var cs = window.getComputedStyle(srcEl), decl = '';
    STYLE_PROPS.forEach(function (p) {
      var v = cs.getPropertyValue(p);
      if (!v) return;
      if (remap && (p === 'fill' || p === 'stroke' || p === 'color')) {
        var rm = remapColor(v);
        if (rm) v = rm;
      }
      decl += p + ':' + v + ';';
    });
    cloneEl.setAttribute('style', decl);
    var sc = srcEl.children, cc = cloneEl.children;
    for (var i = 0; i < sc.length; i++) if (cc[i]) inlineStyles(sc[i], cc[i], remap);
  }

  function svgSize(svg) {
    var r = svg.getBoundingClientRect();
    var w = Math.ceil(r.width), h = Math.ceil(r.height);
    if ((!w || !h) && svg.viewBox && svg.viewBox.baseVal) { w = w || svg.viewBox.baseVal.width; h = h || svg.viewBox.baseVal.height; }
    return { w: w || 600, h: h || 360 };
  }

  // svg: an <svg> DOM node. opts: {filename, scale=2, background='#fff',
  // padding=16, remapLight=true, onError}
  function svgToPng(svg, opts) {
    opts = opts || {};
    if (!svg || svg.tagName !== 'svg') { if (opts.onError) opts.onError('No chart to export.'); return; }
    var filename = opts.filename || ('chart-' + stamp() + '.png');
    var bg = opts.background || '#ffffff';
    var scale = opts.scale || 2;
    var pad = opts.padding != null ? opts.padding : 16;
    var remap = opts.remapLight !== false;
    var sz = svgSize(svg);
    var clone = svg.cloneNode(true);
    inlineStyles(svg, clone, remap);
    clone.setAttribute('width', sz.w);
    clone.setAttribute('height', sz.h);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', '0 0 ' + sz.w + ' ' + sz.h);
    var xml = new XMLSerializer().serializeToString(clone);
    // Blob URL (not a base64 data URI): handles any-unicode labels and has no
    // ~2MB size ceiling that btoa(unescape(encodeURIComponent(...))) imposes.
    var svgUrl = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = (sz.w + pad * 2) * scale;
        canvas.height = (sz.h + pad * 2) * scale;
        var ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.fillStyle = bg; ctx.fillRect(0, 0, sz.w + pad * 2, sz.h + pad * 2);
        ctx.drawImage(img, pad, pad, sz.w, sz.h);
        canvas.toBlob(function (blob) {
          if (blob) download(filename, blob); else if (opts.onError) opts.onError('PNG encode failed.');
        }, 'image/png');
      } catch (e) { if (opts.onError) opts.onError(String(e && e.message || e)); }
      finally { URL.revokeObjectURL(svgUrl); }
    };
    img.onerror = function () { URL.revokeObjectURL(svgUrl); if (opts.onError) opts.onError('Could not rasterise the chart.'); };
    img.src = svgUrl;
  }

  // Convenience: find the first <svg> inside a container and export it.
  function pngFromContainer(container, opts) {
    var svg = container && container.querySelector ? container.querySelector('svg') : null;
    svgToPng(svg, opts);
  }

  window.LbcExport = {
    stamp: stamp, download: download,
    toCSV: toCSV, saveCSV: saveCSV,
    svgToPng: svgToPng, pngFromContainer: pngFromContainer
  };
})();

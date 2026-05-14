// exports.js — download helpers for the correlation terminal.
//
// PNG: composite a chart's canvas onto a white-background 2x canvas with a
// title strip burned in, then download. Works for both raw <canvas> (the
// heatmap) and Chart.js instances (scatter / rolling / PCA bar).
//
// CSV: build a CSV string and trigger a download via an object URL.
//
// All filenames follow Pattern 1 from the design grilling:
//   corr-<surface>-<context>-<freq>-<date_range>.<ext>
// Tickers with `:` `!` `?` get sanitized to `_` so Windows doesn't choke.

(function (global) {
  'use strict';

  var PNG_SCALE = 2;
  var TITLE_STRIP_H = 60;   // px, scaled by PNG_SCALE
  var TITLE_PAD_X = 16;
  var TITLE_FONT = '600 14px "Inter", system-ui, sans-serif';
  var SUBTITLE_FONT = '12px "JetBrains Mono", "Consolas", monospace';
  var TITLE_COLOR = '#1f2937';
  var SUBTITLE_COLOR = '#6b7280';
  var BG_COLOR = '#ffffff';

  // -------------------------------------------------------------------
  //  Filename helpers
  // -------------------------------------------------------------------
  function sanitize(s) {
    return String(s == null ? '' : s).replace(/[:!?/\\<>|"*]/g, '_').replace(/\s+/g, '_');
  }

  function filename(parts, ext) {
    return parts.filter(Boolean).map(sanitize).join('-') + '.' + ext;
  }

  // -------------------------------------------------------------------
  //  CSV helpers
  // -------------------------------------------------------------------
  function csvCell(v) {
    if (v == null) return '';
    var s = String(v);
    // Quote when the value contains comma / quote / newline.
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function csvRows(rows) {
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  function downloadBlob(blob, fname) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  function downloadCSV(rows, fname) {
    var body = csvRows(rows);
    // Prepend BOM so Excel autodetects UTF-8 (otherwise non-ASCII tickers
    // and the ρ glyph come through as mojibake).
    var blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, fname);
  }

  // -------------------------------------------------------------------
  //  CSV builders — one per surface
  // -------------------------------------------------------------------
  function heatmapToRows(data) {
    // data: { ids, names, matrix, freq, method, n_obs, date_range, name?, display? }
    var ids = data.ids || [];
    var names = data.names || ids;
    var M = data.matrix || [];
    var rows = [];
    // Row 1: header with IDs (corner left empty)
    rows.push([''].concat(ids));
    // Row 2: human names (corner = 'name')
    rows.push(['name'].concat(names));
    // Data rows: leading column = id, rest = matrix row values
    for (var i = 0; i < ids.length; i++) {
      var r = [ids[i]];
      var row = M[i] || [];
      for (var j = 0; j < ids.length; j++) {
        r.push(row[j] == null ? '' : Number(row[j]).toFixed(6));
      }
      rows.push(r);
    }
    return rows;
  }

  function pairToRows(data, idA, idB) {
    // data: { scatter:[{x,y}], rolling:{dates:[],values:[]}, regression, ... }
    var scatter = data.scatter || [];
    var rolling = data.rolling || { dates: [], values: [] };
    // Index rolling by date so we can join on the same date axis.
    var rollMap = {};
    for (var k = 0; k < rolling.dates.length; k++) rollMap[rolling.dates[k]] = rolling.values[k];

    var rows = [['date', idA, idB, 'rolling_corr_' + (rolling.window || 'NA')]];
    // Scatter doesn't carry the date — pair detail computes it from joined
    // returns. Reconstruct date order from the rolling axis when present, else
    // assume scatter is already in date order and use index as proxy.
    if (rolling.dates.length === scatter.length) {
      // Common case: scatter is aligned to rolling dates (both come from the
      // same joined-returns query in the adapter).
      for (var i = 0; i < rolling.dates.length; i++) {
        var d = rolling.dates[i];
        rows.push([
          d,
          scatter[i] ? Number(scatter[i].x).toFixed(8) : '',
          scatter[i] ? Number(scatter[i].y).toFixed(8) : '',
          rollMap[d] == null ? '' : Number(rollMap[d]).toFixed(6),
        ]);
      }
    } else {
      // Fallback: no date axis on scatter; emit scatter rows without dates,
      // then a separator, then the rolling series. Better than dropping data.
      for (var i = 0; i < scatter.length; i++) {
        rows.push(['', Number(scatter[i].x).toFixed(8), Number(scatter[i].y).toFixed(8), '']);
      }
      for (var j = 0; j < rolling.dates.length; j++) {
        rows.push([rolling.dates[j], '', '', rolling.values[j] == null ? '' : Number(rolling.values[j]).toFixed(6)]);
      }
    }
    return rows;
  }

  function pcaToRows(pca, matrixData) {
    // pca: { factors: [{k, explained, cumulative, loadings: [{id, name, weight, sign}]}] }
    // matrixData: the original matrix data (for ids/names ordering).
    var factors = pca.factors || [];
    if (!factors.length) return [['series_id', 'series_name']];
    var k = factors.length;

    // Row 1: per-factor variance-explained headers
    var explainedRow = ['', 'variance_explained'];
    for (var i = 0; i < k; i++) explainedRow.push(Number(factors[i].explained).toFixed(4));

    // Row 2: cumulative
    var cumRow = ['', 'cumulative'];
    for (var i = 0; i < k; i++) cumRow.push(Number(factors[i].cumulative).toFixed(4));

    // Row 3: column names (series + PC1 PC2 ...)
    var headerRow = ['series_id', 'series_name'];
    for (var i = 0; i < k; i++) headerRow.push('PC' + (i + 1));

    // Build a loadings lookup: id -> [pc1, pc2, ...]
    var byId = {};
    for (var i = 0; i < k; i++) {
      var f = factors[i];
      for (var j = 0; j < f.loadings.length; j++) {
        var L = f.loadings[j];
        if (!byId[L.id]) byId[L.id] = { name: L.name, weights: new Array(k) };
        byId[L.id].weights[i] = (L.sign || 1) * L.weight;
      }
    }
    var rows = [explainedRow, cumRow, headerRow];
    var ids = (matrixData && matrixData.ids) || Object.keys(byId);
    for (var idx = 0; idx < ids.length; idx++) {
      var id = ids[idx];
      var entry = byId[id];
      if (!entry) continue;
      var r = [id, entry.name];
      for (var i = 0; i < k; i++) {
        r.push(entry.weights[i] == null ? '' : Number(entry.weights[i]).toFixed(6));
      }
      rows.push(r);
    }
    return rows;
  }

  // -------------------------------------------------------------------
  //  PNG helpers
  // -------------------------------------------------------------------
  function pngFromCanvas(srcCanvas, title, subtitle) {
    // Compose: white background + title strip + scaled chart canvas.
    var dpr = PNG_SCALE;
    var srcW = srcCanvas.width / (srcCanvas._dpr || 1);
    var srcH = srcCanvas.height / (srcCanvas._dpr || 1);
    // Most canvases store backing-store sized for devicePixelRatio. We just
    // composite at native resolution then scale up by PNG_SCALE for output.
    var outW = srcCanvas.width * dpr;
    var outH = srcCanvas.height * dpr + TITLE_STRIP_H * dpr;

    var out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    var ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // White background.
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, outW, outH);

    // Title strip.
    ctx.fillStyle = TITLE_COLOR;
    ctx.font = '600 ' + (14 * dpr) + 'px "Inter", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(title || '', TITLE_PAD_X * dpr, 12 * dpr);

    if (subtitle) {
      ctx.fillStyle = SUBTITLE_COLOR;
      ctx.font = (12 * dpr) + 'px "JetBrains Mono", "Consolas", monospace';
      ctx.fillText(subtitle, TITLE_PAD_X * dpr, 32 * dpr);
    }

    // Source canvas, scaled up to 2x.
    ctx.drawImage(srcCanvas, 0, TITLE_STRIP_H * dpr, srcCanvas.width * dpr, srcCanvas.height * dpr);

    return new Promise(function (resolve) {
      out.toBlob(function (blob) { resolve(blob); }, 'image/png');
    });
  }

  function downloadPNG(srcCanvas, title, subtitle, fname) {
    return pngFromCanvas(srcCanvas, title, subtitle).then(function (blob) {
      downloadBlob(blob, fname);
    });
  }

  // -------------------------------------------------------------------
  //  Export entrypoints — call these from button click handlers
  // -------------------------------------------------------------------
  function exportHeatmapCSV(matrixData, sliderState) {
    var fname = filename([
      'corr-heatmap',
      matrixData.name || matrixData.display || 'custom',
      matrixData.freq === 'm' ? 'monthly' : 'weekly',
      matrixData.method || 'pearson',
      (matrixData.date_range && matrixData.date_range[0]) || '',
      (matrixData.date_range && matrixData.date_range[1]) || '',
    ], 'csv');
    downloadCSV(heatmapToRows(matrixData), fname);
  }

  function exportHeatmapPNG(matrixData, sourceCanvas) {
    var fname = filename([
      'corr-heatmap',
      matrixData.name || matrixData.display || 'custom',
      matrixData.freq === 'm' ? 'monthly' : 'weekly',
      matrixData.method || 'pearson',
    ], 'png');
    var title = matrixData.display || matrixData.name || 'Custom subset';
    var subtitle = (matrixData.ids || []).length + ' series · ' +
                   String(matrixData.method || 'pearson').toUpperCase() + ' · ' +
                   (matrixData.freq === 'm' ? 'monthly' : 'weekly') + ' · ' +
                   'n=' + (matrixData.n_obs || '—') + ' · ' +
                   ((matrixData.date_range && matrixData.date_range.join(' → ')) || '');
    return downloadPNG(sourceCanvas, title, subtitle, fname);
  }

  function exportPairCSV(pairData, idA, idB) {
    var fname = filename([
      'corr-pair',
      idA + '_x_' + idB,
      pairData.rolling && pairData.rolling.window ? pairData.rolling.window : 'rolling',
      (pairData.date_range && pairData.date_range[0]) || '',
      (pairData.date_range && pairData.date_range[1]) || '',
    ], 'csv');
    downloadCSV(pairToRows(pairData, idA, idB), fname);
  }

  function exportChartPNG(chartInstance, title, subtitle, fname) {
    if (!chartInstance) return Promise.reject(new Error('chart not initialized'));
    return downloadPNG(chartInstance.canvas, title, subtitle, fname);
  }

  function exportPCACSV(pca, matrixData) {
    var fname = filename([
      'corr-pca',
      matrixData.name || matrixData.display || 'custom',
      matrixData.freq === 'm' ? 'monthly' : 'weekly',
      'top' + (pca.factors ? pca.factors.length : 5),
    ], 'csv');
    downloadCSV(pcaToRows(pca, matrixData), fname);
  }

  function exportPCAPNG(eigenbarEl, factorsEl, matrixData) {
    // The PCA panel is a div tree, not a canvas. Render the bar + cards to
    // an offscreen canvas via foreignObject SVG -> blob. This is simpler than
    // re-implementing the layout in canvas drawing.
    var rect = eigenbarEl.getBoundingClientRect();
    // Snapshot the parent panel container so we capture the bar AND cards.
    var node = eigenbarEl.parentElement;
    if (!node) return Promise.reject(new Error('PCA panel missing'));
    return _domToPNG(node, matrixData, 'PCA · ' + (matrixData.display || matrixData.name || 'custom'),
                    'top-' + (matrixData.ids ? matrixData.ids.length : '') + ' series · variance explained');
  }

  // Render a DOM node to PNG via SVG foreignObject. Works for the PCA panel.
  function _domToPNG(node, matrixData, title, subtitle) {
    var rect = node.getBoundingClientRect();
    var w = Math.max(400, Math.ceil(rect.width));
    var h = Math.max(120, Math.ceil(rect.height));
    var dpr = PNG_SCALE;

    // Clone the node to avoid mutating live DOM; inline computed styles so
    // the SVG snapshot is self-contained.
    var clone = node.cloneNode(true);
    _inlineStyles(node, clone);
    var html = new XMLSerializer().serializeToString(clone);

    // Wrap the HTML in an SVG with the right size.
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
        '<foreignObject width="100%" height="100%">' +
          '<div xmlns="http://www.w3.org/1999/xhtml" style="background:#fff;color:#1f2937;font-family:Inter,sans-serif;font-size:12px;padding:8px;">' +
            html +
          '</div>' +
        '</foreignObject>' +
      '</svg>';

    var svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(svgBlob);
    var img = new Image();
    return new Promise(function (resolve, reject) {
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = w * dpr;
        c.height = h * dpr + TITLE_STRIP_H * dpr;
        var ctx = c.getContext('2d');
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, c.width, c.height);
        // Title strip
        ctx.fillStyle = TITLE_COLOR;
        ctx.font = '600 ' + (14 * dpr) + 'px Inter, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(title, TITLE_PAD_X * dpr, 12 * dpr);
        ctx.fillStyle = SUBTITLE_COLOR;
        ctx.font = (12 * dpr) + 'px "JetBrains Mono", monospace';
        ctx.fillText(subtitle, TITLE_PAD_X * dpr, 32 * dpr);
        // Body
        ctx.drawImage(img, 0, TITLE_STRIP_H * dpr, w * dpr, h * dpr);
        URL.revokeObjectURL(url);
        c.toBlob(function (blob) {
          var fname = filename([
            'corr-pca',
            matrixData.name || matrixData.display || 'custom',
            matrixData.freq === 'm' ? 'monthly' : 'weekly',
          ], 'png');
          downloadBlob(blob, fname);
          resolve();
        }, 'image/png');
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('PCA snapshot failed (SVG/foreignObject not supported?)'));
      };
      img.src = url;
    });
  }

  function _inlineStyles(src, dst) {
    // Cheap: copy computed background/color/font for the snapshot tree.
    // We don't need pixel-perfect — just legible factor cards on white.
    var srcChildren = src.querySelectorAll('*');
    var dstChildren = dst.querySelectorAll('*');
    for (var i = 0; i < srcChildren.length; i++) {
      var cs = window.getComputedStyle(srcChildren[i]);
      var s = dstChildren[i].style;
      s.color = '#1f2937';
      s.background = 'transparent';
      s.fontFamily = cs.fontFamily;
      s.fontSize = cs.fontSize;
      s.fontWeight = cs.fontWeight;
      s.padding = cs.padding;
      s.margin = cs.margin;
      s.display = cs.display;
      s.flex = cs.flex;
      s.height = cs.height;
      s.width = cs.width;
    }
  }

  global.CorrExport = {
    sanitize: sanitize,
    filename: filename,
    downloadCSV: downloadCSV,
    downloadBlob: downloadBlob,
    downloadPNG: downloadPNG,
    exportHeatmapCSV: exportHeatmapCSV,
    exportHeatmapPNG: exportHeatmapPNG,
    exportPairCSV: exportPairCSV,
    exportChartPNG: exportChartPNG,
    exportPCACSV: exportPCACSV,
    exportPCAPNG: exportPCAPNG,
  };
})(window);

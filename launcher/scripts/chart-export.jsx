// ================================================================
// chart-export.jsx — download the current data-gatherer series as a
// clean, white-background PNG line chart. Pure canvas, no deps.
// Shared by the Macro Data Gatherer + Industry Data gatherer (and the
// macro Series detail modal). Call:
//   window.downloadLineChartPNG('AALI.png', {
//     values: [..numbers..], labels: [..'YYYY-MM-DD'..],
//     title: 'Crude palm oil price', unit: 'IDR/kg', color: '#5B8DEF' });
// ================================================================
(function () {
  // compact, readable axis number (abs<1 -> 3dp, <100 -> 2dp, else grouped int)
  const axisNum = (v) => {
    if (v == null || !isFinite(v)) return '';
    const a = Math.abs(v);
    if (a !== 0 && a < 1) return v.toFixed(3);
    if (a < 100) return v.toFixed(2);
    return Math.round(v).toLocaleString('en-US');
  };

  // '#5B8DEF' + alpha -> rgba()
  const hexA = (hex, alpha) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return 'rgba(91,141,239,' + alpha + ')';
    const n = parseInt(m[1], 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  };

  window.downloadLineChartPNG = function (filename, opts) {
    opts = opts || {};
    const values = (opts.values || []).map(Number).filter((v) => isFinite(v));
    if (!values.length) return;
    const labels = opts.labels || [];
    const title = opts.title || 'Series';
    const unit = opts.unit || '';
    const color = opts.color || '#1f6feb';

    const SCALE = 2;                 // crisp on retina / when zoomed
    const W = 1280, H = 720;
    const cv = document.createElement('canvas');
    cv.width = W * SCALE; cv.height = H * SCALE;
    const ctx = cv.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const mL = 96, mR = 48, mT = 86, mB = 76;
    const pw = W - mL - mR, ph = H - mT - mB;

    // title + subtitle
    ctx.fillStyle = '#0b0b0c';
    ctx.font = '600 23px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(title).slice(0, 90), mL, 46);
    const sub = [unit, labels.length ? labels[0] + '  →  ' + labels[labels.length - 1] : '', values.length + ' points']
      .filter(Boolean).join('      ·      ');
    ctx.fillStyle = '#6b7280';
    ctx.font = '13px Inter, Arial, sans-serif';
    ctx.fillText(sub, mL, 68);

    // value range (8% headroom)
    let lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
    if (lo === hi) { lo -= 1; hi += 1; }
    const padV = (hi - lo) * 0.08; lo -= padV; hi += padV;
    const N = values.length;
    const xAt = (i) => mL + (N === 1 ? pw / 2 : (i / (N - 1)) * pw);
    const yAt = (v) => mT + ph - ((v - lo) / (hi - lo)) * ph;

    // y gridlines + labels
    const TICKS = 5;
    ctx.font = '12px Inter, Arial, sans-serif';
    for (let t = 0; t <= TICKS; t++) {
      const v = lo + (t / TICKS) * (hi - lo);
      const yy = yAt(v);
      ctx.strokeStyle = t === 0 ? '#d1d5db' : '#eceef1';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mL, yy); ctx.lineTo(W - mR, yy); ctx.stroke();
      ctx.fillStyle = '#6b7280'; ctx.textAlign = 'right';
      ctx.fillText(axisNum(v), mL - 10, yy + 4);
    }

    // x labels (~6, evenly spaced)
    const xticks = Math.min(6, N);
    ctx.fillStyle = '#6b7280'; ctx.textAlign = 'center'; ctx.font = '12px Inter, Arial, sans-serif';
    for (let t = 0; t < xticks; t++) {
      const idx = xticks === 1 ? 0 : Math.round((t / (xticks - 1)) * (N - 1));
      ctx.fillText(String(labels[idx] || ''), xAt(idx), H - mB + 24);
    }

    // axes
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mL, mT); ctx.lineTo(mL, mT + ph); ctx.lineTo(W - mR, mT + ph);
    ctx.stroke();

    // subtle area fill under the line
    ctx.beginPath();
    values.forEach((v, i) => { const xx = xAt(i), yy = yAt(v); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
    ctx.lineTo(xAt(N - 1), mT + ph); ctx.lineTo(xAt(0), mT + ph); ctx.closePath();
    ctx.fillStyle = hexA(color, 0.09); ctx.fill();

    // the line
    ctx.beginPath();
    values.forEach((v, i) => { const xx = xAt(i), yy = yAt(v); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();

    // footer credit
    ctx.fillStyle = '#9ca3af'; ctx.font = '11px Inter, Arial, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('Legacy Bridge Terminal', W - mR, H - 22);

    cv.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };
})();

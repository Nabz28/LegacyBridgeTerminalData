// ================================================================
// analysis-results.jsx — presentational results renderers for the
// Analysis workbench. Self-contained mini SVG charts (no chart lib
// coupling) + per-method result views. window.AnalysisResults + AnalysisViz.
// ================================================================
(function () {
  'use strict';
  var fmt = function (v, d) { if (v == null || !isFinite(v)) return '—'; d = d == null ? 4 : d; return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var fmtP = function (p) { if (p == null || !isFinite(p)) return '—'; return p < 0.0001 ? '<0.0001' : p.toFixed(4); };
  var stars = function (p) { return p == null ? '' : (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : ''); };
  var COL = { line: '#7c9bf2', line2: '#19C37D', line3: '#FF5C70', band: 'rgba(124,155,242,.18)', grid: 'rgba(151,170,197,.12)', zero: 'rgba(255,255,255,.25)' };

  // ---- mini SVG line chart (multi-series + optional CI band) ----
  function MiniLine(props) {
    var series = props.series || [], labels = props.labels || [], H = props.height || 150, band = props.band;
    var W = 320, pad = { l: 38, r: 8, t: 8, b: 18 };
    var all = []; series.forEach(function (s) { s.values.forEach(function (v) { if (v != null && isFinite(v)) all.push(v); }); });
    if (band) { (band.lower || []).concat(band.upper || []).forEach(function (v) { if (v != null && isFinite(v)) all.push(v); }); }
    if (!all.length) return <div className="an-empty">no data</div>;
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all); if (lo === hi) { hi = lo + 1; lo = lo - 1; }
    var n = Math.max.apply(null, series.map(function (s) { return s.values.length; }));
    var x = function (i) { return pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r)); };
    var y = function (v) { return pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b); };
    var path = function (vals) { var d = '', started = false; vals.forEach(function (v, i) { if (v == null || !isFinite(v)) { started = false; return; } d += (started ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; started = true; }); return d; };
    var zeroY = (lo < 0 && hi > 0) ? y(0) : null;
    var bandPath = null;
    if (band && band.lower && band.upper) {
      var up = band.upper.map(function (v, i) { return x(i).toFixed(1) + ' ' + y(v).toFixed(1); });
      var dn = band.lower.map(function (v, i) { return x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).reverse();
      bandPath = 'M' + up.join(' L') + ' L' + dn.join(' L') + ' Z';
    }
    return (
      <svg viewBox={'0 0 ' + W + ' ' + H} className="an-svg" preserveAspectRatio="none" style={{ width: '100%', height: H }}>
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke={COL.grid} />
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke={COL.grid} />
        {zeroY != null && <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY} stroke={COL.zero} strokeDasharray="2 3" />}
        {bandPath && <path d={bandPath} fill={COL.band} stroke="none" />}
        {series.map(function (s, i) { return <path key={i} d={path(s.values)} fill="none" stroke={s.color || COL.line} strokeWidth={s.w || 1.6} />; })}
        <text x={pad.l - 4} y={pad.t + 8} className="an-axt" textAnchor="end">{fmt(hi, Math.abs(hi) < 10 ? 2 : 0)}</text>
        <text x={pad.l - 4} y={H - pad.b} className="an-axt" textAnchor="end">{fmt(lo, Math.abs(lo) < 10 ? 2 : 0)}</text>
      </svg>
    );
  }

  function Bars(props) {
    var values = props.values || [], labels = props.labels || [], H = props.height || 150, color = props.color || COL.line;
    var W = 320, pad = { l: 34, r: 8, t: 8, b: 26 };
    if (!values.length) return <div className="an-empty">no data</div>;
    var hi = Math.max.apply(null, values.concat([0])), lo = Math.min.apply(null, values.concat([0])); if (hi === lo) hi = lo + 1;
    var bw = (W - pad.l - pad.r) / values.length;
    var y = function (v) { return pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b); };
    var zeroY = y(0);
    return (
      <svg viewBox={'0 0 ' + W + ' ' + H} className="an-svg" style={{ width: '100%', height: H }}>
        <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY} stroke={COL.zero} />
        {values.map(function (v, i) { var yy = y(v); var h = Math.abs(zeroY - yy); return <rect key={i} x={pad.l + i * bw + 1.5} y={Math.min(yy, zeroY)} width={Math.max(bw - 3, 1)} height={Math.max(h, 0.5)} fill={v < 0 ? COL.line3 : color} rx="1" />; })}
        {labels.length <= 14 && labels.map(function (l, i) { return <text key={i} x={pad.l + i * bw + bw / 2} y={H - 8} className="an-axt" textAnchor="middle">{String(l).slice(0, 6)}</text>; })}
      </svg>
    );
  }

  // diverging color for correlation heatmap
  function corrColor(v) {
    if (v == null || !isFinite(v)) return 'rgba(255,255,255,.04)';
    var a = Math.min(Math.abs(v), 1);
    return v >= 0 ? 'rgba(124,155,242,' + (0.12 + a * 0.7) + ')' : 'rgba(255,92,112,' + (0.12 + a * 0.7) + ')';
  }
  function Heatmap(props) {
    var names = props.names, m = props.matrix;
    return (
      <div className="an-heat-wrap"><table className="an-heat"><thead><tr><th></th>{names.map(function (n, j) { return <th key={j} title={n}>{n.slice(0, 10)}</th>; })}</tr></thead>
        <tbody>{names.map(function (n, i) { return <tr key={i}><th title={n}>{n.slice(0, 14)}</th>{m[i].map(function (v, j) { return <td key={j} style={{ background: corrColor(v) }} title={n + ' × ' + names[j] + ' = ' + fmt(v, 3)}>{v == null ? '·' : (Math.abs(v) >= 0.995 ? '1' : v.toFixed(2))}</td>; })}</tr>; })}</tbody>
      </table></div>
    );
  }

  function CoefTable(props) {
    var r = props.r;
    return (
      <table className="an-table an-coef"><thead><tr><th>Variable</th><th>Coef.</th><th>Std.Err</th><th>t</th><th>P&gt;|t|</th><th>[95% CI]</th></tr></thead>
        <tbody>{r.names.map(function (nm, i) { return (
          <tr key={i}><td className="an-vn">{nm}</td><td className="an-num">{fmt(r.coef[i])}<span className="an-star">{stars(r.p[i])}</span></td>
            <td className="an-num">{fmt(r.se[i])}</td><td className="an-num">{fmt(r.t[i], 3)}</td><td className="an-num">{fmtP(r.p[i])}</td>
            <td className="an-num an-ci">{fmt(r.ci[i][0], 3)}, {fmt(r.ci[i][1], 3)}</td></tr>
        ); })}</tbody></table>
    );
  }
  function StatGrid(props) {
    return <div className="an-stat-grid">{props.stats.map(function (s, i) { return <div key={i} className="an-stat"><span className="an-stat-l">{s.label}</span><span className="an-stat-v">{s.value}</span></div>; })}</div>;
  }

  // ---- regression equation rendered with estimated coefficients ----
  function EquationLine(props) {
    var r = props.r; var hasC = r.names[0] === '(const)';
    var terms = r.names.map(function (nm, i) {
      if (nm === '(const)') return null;
      var c = r.coef[i];
      return <span key={i} className="an-eq-term">{c >= 0 ? ' + ' : ' − '}{fmt(Math.abs(c), 3)}·<b>{nm}</b></span>;
    }).filter(Boolean);
    return (
      <div className="an-eq-result">
        <b>{props.yName || 'Y'}</b> = {hasC ? fmt(r.coef[0], 3) : ''}{terms}<span className="an-eq-err"> + ε</span>
      </div>
    );
  }

  // ================= per-method result view =================
  function ResultView(props) {
    var res = props.result, vars = props.vars || {};
    if (!res) return null;
    if (res.error) return <div className="an-err">{res.error}</div>;
    var method = res.method || '';

    if (method.indexOf('OLS') > -1 || method.indexOf('Panel') > -1) {
      var idx = res.fitted.map(function (_, i) { return i; });
      var actual = res.fitted.map(function (f, i) { return f + res.resid[i]; });
      var statList = [
        { label: 'Observations', value: res.n }, { label: 'R²', value: fmt(res.r2, 4) }, { label: 'Adj. R²', value: fmt(res.adjR2, 4) },
        { label: 'F-stat', value: fmt(res.fStat, 3) + (res.fP != null ? ' (p=' + fmtP(res.fP) + ')' : '') },
        { label: 'σ (resid)', value: fmt(res.sigma, 4) }, { label: 'RMSE', value: fmt(res.rmse, 4) },
        { label: 'AIC', value: fmt(res.aic, 2) }, { label: 'BIC', value: fmt(res.bic, 2) },
        { label: 'Durbin–Watson', value: fmt(res.dw, 3) }, { label: 'Jarque–Bera', value: fmt(res.jb, 2) + (res.jbP != null ? ' (p=' + fmtP(res.jbP) + ')' : '') }
      ];
      if (res.effects) statList.unshift({ label: 'Effects', value: res.effects + (res.entities ? ' · ' + res.entities + ' entities' : '') });
      if (res.theta != null) statList.push({ label: 'θ (RE)', value: fmt(res.theta, 3) });
      return (
        <div className="an-res">
          <EquationLine r={res} yName={props.yName} />
          {res.robust && res.robust !== 'none' && <div className="an-note">Std. errors: {res.robust.toUpperCase()} (heteroskedasticity-robust)</div>}
          <CoefTable r={res} />
          <div className="an-sig-key">*** p&lt;0.01 · ** p&lt;0.05 · * p&lt;0.1</div>
          <StatGrid stats={statList} />
          <div className="an-charts2">
            <div className="an-chart-card"><div className="an-chart-h">Actual vs. Fitted</div><MiniLine series={[{ name: 'Actual', values: actual, color: COL.line2 }, { name: 'Fitted', values: res.fitted, color: COL.line }]} /></div>
            <div className="an-chart-card"><div className="an-chart-h">Residuals</div><MiniLine series={[{ name: 'resid', values: res.resid, color: COL.line3, w: 1.2 }]} /></div>
          </div>
        </div>
      );
    }

    if (method === 'VAR' || method === 'BVAR') {
      var K = res.K, names = res.names;
      var irf = res._irf, fevd = res._fevd, band = res._irfBands;
      return (
        <div className="an-res">
          <StatGrid stats={[
            { label: 'Model', value: method + '(' + res.p + ')' }, { label: 'Variables', value: K }, { label: 'Obs', value: res.T },
            { label: 'AIC', value: fmt(res.aic, 2) }, { label: 'BIC', value: fmt(res.bic, 2) },
            { label: 'Stable', value: res.stable ? '✓ all roots inside unit circle' : '⚠ unstable (root ≥ 1)' }
          ]} />
          {res._lagSel && <div className="an-sub"><div className="an-sub-h">Lag-order selection</div>
            <table className="an-table"><thead><tr><th>p</th><th>AIC</th><th>BIC</th><th>HQIC</th></tr></thead><tbody>
              {res._lagSel.table.map(function (row) { return <tr key={row.p} className={row.p === res.p ? 'an-row-on' : ''}><td>{row.p}</td><td className="an-num">{fmt(row.aic, 2)}</td><td className="an-num">{fmt(row.bic, 2)}</td><td className="an-num">{fmt(row.hqic, 2)}</td></tr>; })}
            </tbody></table>
            <div className="an-note">AIC suggests p={res._lagSel.aic} · BIC p={res._lagSel.bic} · HQIC p={res._lagSel.hqic}</div></div>}
          {irf && <div className="an-sub"><div className="an-sub-h">Impulse responses{band ? ' (68% bands)' : ''} — response of row to a shock in column (Cholesky)</div>
            <div className="an-irf-grid" style={{ gridTemplateColumns: 'auto repeat(' + K + ', 1fr)' }}>
              <div className="an-irf-corner"></div>
              {names.map(function (n, j) { return <div key={'h' + j} className="an-irf-colh">↯ {n}</div>; })}
              {names.map(function (ni, i) { return [
                <div key={'r' + i} className="an-irf-rowh">{ni}</div>
              ].concat(names.map(function (nj, j) {
                var vals = irf.map(function (h) { return h[i][j]; });
                var bnd = band ? { lower: band.lower.map(function (h) { return h[i][j]; }), upper: band.upper.map(function (h) { return h[i][j]; }) } : null;
                return <div key={i + '_' + j} className="an-irf-cell"><MiniLine series={[{ name: 'irf', values: vals, color: COL.line, w: 1.5 }]} band={bnd} height={86} /></div>;
              })); })}
            </div></div>}
          {fevd && <div className="an-sub"><div className="an-sub-h">Variance decomposition (horizon {fevd.length - 1})</div>
            <table className="an-table"><thead><tr><th>Variable</th>{names.map(function (n, j) { return <th key={j}>{n}</th>; })}</tr></thead>
              <tbody>{names.map(function (ni, i) { return <tr key={i}><td className="an-vn">{ni}</td>{fevd[fevd.length - 1][i].map(function (v, j) { return <td key={j} className="an-num">{(v * 100).toFixed(1)}%</td>; })}</tr>; })}</tbody></table></div>}
          {res.eigen && res.eigen.length > 0 && <div className="an-sub"><div className="an-sub-h">Stability — eigenvalue moduli</div>
            <div className="an-eig">{res.eigen.slice(0, 8).map(function (e, i) { return <span key={i} className={'an-eig-pill ' + (e.mod < 1 ? 'ok' : 'bad')}>{fmt(e.mod, 3)}</span>; })}</div></div>}
        </div>
      );
    }

    if (method === 'corr') {
      return <div className="an-res"><div className="an-note">{res.method === 'corr' ? '' : ''}Pearson/Spearman correlation · n={res.n} · method: {res.methodKind}</div><Heatmap names={res.names} matrix={res.matrix} /></div>;
    }

    if (method === 'descriptive') {
      return (
        <div className="an-res"><table className="an-table an-desc"><thead><tr><th>Variable</th><th>N</th><th>Mean</th><th>Std</th><th>Min</th><th>P25</th><th>Median</th><th>P75</th><th>Max</th><th>Skew</th><th>Kurt</th></tr></thead>
          <tbody>{res.rows.map(function (d, i) { return <tr key={i}><td className="an-vn">{d.name}</td><td className="an-num">{d.n}</td><td className="an-num">{fmt(d.mean, 3)}</td><td className="an-num">{fmt(d.std, 3)}</td><td className="an-num">{fmt(d.min, 3)}</td><td className="an-num">{fmt(d.p25, 3)}</td><td className="an-num">{fmt(d.median, 3)}</td><td className="an-num">{fmt(d.p75, 3)}</td><td className="an-num">{fmt(d.max, 3)}</td><td className="an-num">{fmt(d.skew, 2)}</td><td className="an-num">{fmt(d.kurt, 2)}</td></tr>; })}</tbody></table>
          {res.hist && <div className="an-chart-card" style={{ marginTop: 12 }}><div className="an-chart-h">Distribution · {res.hist.name}</div><Bars values={res.hist.counts} labels={res.hist.edges} color={COL.line} /></div>}
        </div>
      );
    }

    if (method === 'ADF') {
      return (
        <div className="an-res">
          <StatGrid stats={[{ label: 'ADF statistic', value: fmt(res.stat, 4) }, { label: 'Lags', value: res.lags }, { label: 'Trend', value: res.trend }, { label: 'Obs', value: res.n }]} />
          <table className="an-table"><thead><tr><th>Critical values</th><th>1%</th><th>5%</th><th>10%</th></tr></thead>
            <tbody><tr><td>Threshold</td><td className="an-num">{res.critical['1%']}</td><td className="an-num">{res.critical['5%']}</td><td className="an-num">{res.critical['10%']}</td></tr></tbody></table>
          <div className={'an-verdict ' + (res.stationary ? 'good' : 'warn')}>{res.decision}</div>
        </div>
      );
    }

    if (method === 'Granger') {
      if (res.pmatrix) {
        return <div className="an-res"><div className="an-note">Granger causality p-values · row → column · lags={res.lags} (p&lt;0.05 ⇒ causes)</div>
          <table className="an-table an-granger"><thead><tr><th>cause ↓ / effect →</th>{res.names.map(function (n, j) { return <th key={j}>{n.slice(0, 10)}</th>; })}</tr></thead>
            <tbody>{res.names.map(function (ni, i) { return <tr key={i}><th>{ni.slice(0, 14)}</th>{res.pmatrix[i].map(function (p, j) { return <td key={j} className={'an-num ' + (p != null && p < 0.05 ? 'an-cause' : '')}>{p == null ? '—' : fmtP(p)}</td>; })}</tr>; })}</tbody></table></div>;
      }
      return <div className="an-res"><StatGrid stats={[{ label: 'F-stat', value: fmt(res.fStat, 3) }, { label: 'p-value', value: fmtP(res.p) }, { label: 'Lags', value: res.lags }]} />
        <div className={'an-verdict ' + (res.causes ? 'good' : 'warn')}>{res.causes ? 'X Granger-causes Y at 5%' : 'No Granger causality at 5%'}</div></div>;
    }

    return <pre className="an-raw">{JSON.stringify(res, null, 2).slice(0, 2000)}</pre>;
  }

  window.AnalysisViz = { MiniLine: MiniLine, Bars: Bars, Heatmap: Heatmap, CoefTable: CoefTable, StatGrid: StatGrid, fmt: fmt };
  window.AnalysisResults = { ResultView: ResultView };
})();

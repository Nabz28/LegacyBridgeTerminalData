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
  // brand steel-blue + always-on semantic green/red (LBC tokens)
  var COL = { line: '#97AAC5', line2: '#19C37D', line3: '#FF5C70', band: 'rgba(151,170,197,.20)', grid: 'rgba(151,170,197,.12)', zero: 'rgba(255,255,255,.25)' };

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
        {labels.length > 0 && <text x={pad.l} y={H - 5} className="an-axt" textAnchor="start">{String(labels[0]).slice(0, 7)}</text>}
        {labels.length > 1 && <text x={W - pad.r} y={H - 5} className="an-axt" textAnchor="end">{String(labels[labels.length - 1]).slice(0, 7)}</text>}
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
    // diverging: brand steel for positive, semantic red for negative (LBC palette — no cobalt)
    return v >= 0 ? 'rgba(151,170,197,' + (0.12 + a * 0.7) + ')' : 'rgba(255,92,112,' + (0.12 + a * 0.7) + ')';
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

  // Misspecification diagnostics + actionable guidance.
  function DiagPanel(props) {
    var d = props.diag || {}; var maxVif = (d.vif || []).reduce(function (m, v) { return (v != null && v > m) ? v : m; }, 0);
    if (d.bp == null && d.bg == null && !maxVif) return null;
    var het = d.bpP != null && d.bpP < 0.05, ser = d.bgP != null && d.bgP < 0.05;
    return (
      <div className="an-sub">
        <div className="an-sub-h">Diagnostics</div>
        <div className="an-stat-grid">
          {d.bp != null && <div className="an-stat"><span className="an-stat-l">Breusch-Pagan (heterosk.)</span><span className="an-stat-v">{fmt(d.bp, 2)} · p={fmtP(d.bpP)} {het ? '⚠' : '✓'}</span></div>}
          {d.bg != null && <div className="an-stat"><span className="an-stat-l">Breusch-Godfrey ac({d.bgH})</span><span className="an-stat-v">{fmt(d.bg, 2)} · p={fmtP(d.bgP)} {ser ? '⚠' : '✓'}</span></div>}
          {maxVif > 0 && <div className="an-stat"><span className="an-stat-l">Max VIF (collinearity)</span><span className="an-stat-v">{fmt(maxVif, 2)} {maxVif > 10 ? '⚠' : '✓'}</span></div>}
        </div>
        {(het || ser) && props.robust !== 'hac' && <div className="an-note">⚠ {ser ? 'Serial correlation' : 'Heteroskedasticity'} detected — switch Std. errors to <b>HAC (Newey-West)</b> (regression menu) for valid inference.</div>}
        {maxVif > 10 && <div className="an-note">⚠ High multicollinearity (max VIF &gt; 10) — coefficients are imprecise; drop or combine a regressor.</div>}
      </div>
    );
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

    if (method.indexOf('OLS') > -1 || method.indexOf('Panel') > -1 || method === 'factor') {
      var idx = res.fitted.map(function (_, i) { return i; });
      var actual = res.fitted.map(function (f, i) { return f + res.resid[i]; });
      var statList = [
        { label: 'Observations', value: res.n }, { label: 'R²', value: fmt(res.r2, 4) }, { label: 'Adj. R²', value: fmt(res.adjR2, 4) },
        { label: 'F-stat', value: fmt(res.fStat, 3) + (res.fP != null ? ' (p=' + fmtP(res.fP) + ')' : '') },
        { label: 'σ (resid)', value: fmt(res.sigma, 4) }, { label: 'RMSE', value: fmt(res.rmse, 4) },
        { label: 'AIC', value: fmt(res.aic, 2) }, { label: 'BIC', value: fmt(res.bic, 2) },
        { label: 'Durbin–Watson', value: fmt(res.dw, 3) }, { label: 'Jarque–Bera', value: fmt(res.jb, 2) + (res.jbP != null ? ' (p=' + fmtP(res.jbP) + ')' : '') }
      ];
      if (res.alphaAnn != null) statList.unshift({ label: 'Jensen α (annualized)', value: fmt(res.alphaAnn, 3) + ' · t=' + fmt(res.alphaT, 2) + ' · p=' + fmtP(res.alphaP) });
      if (res.effects) statList.unshift({ label: 'Effects', value: res.effects + (res.entities ? ' · ' + res.entities + ' entities' : '') });
      if (res.clustered) statList.push({ label: 'Std. errors', value: 'cluster-robust (' + res.clustered + ' entities)' });
      if (res.theta != null) statList.push({ label: 'θ (RE)', value: fmt(res.theta, 3) });
      if (res.hausman != null) statList.push({ label: 'Hausman χ²(' + res.hausmanDf + ')', value: fmt(res.hausman, 2) + ' · p=' + fmtP(res.hausmanP) + ' → prefer ' + res.hausmanPrefer });
      return (
        <div className="an-res">
          <EquationLine r={res} yName={props.yName} />
          {res.robust === 'hac' && <div className="an-note">Std. errors: <b>Newey-West HAC</b> ({res.hacLags} lags) — robust to heteroskedasticity & autocorrelation.</div>}
          {res.robust === 'hc1' && <div className="an-note">Std. errors: <b>HC1 White</b> — heteroskedasticity-robust (not autocorrelation-robust; use HAC for time series).</div>}
          {res._logged && <div className="an-note">Level variables auto-logged — slopes on ln·ln pairs read as elasticities.</div>}
          <CoefTable r={res} />
          <div className="an-sig-key">*** p&lt;0.01 · ** p&lt;0.05 · * p&lt;0.1</div>
          <StatGrid stats={statList} />
          {res.diag && <DiagPanel diag={res.diag} robust={res.robust} />}
          <div className="an-charts2">
            <div className="an-chart-card"><div className="an-chart-h">Actual vs. Fitted</div><MiniLine series={[{ name: 'Actual', values: actual, color: COL.line2 }, { name: 'Fitted', values: res.fitted, color: COL.line }]} /></div>
            <div className="an-chart-card"><div className="an-chart-h">Residuals</div><MiniLine series={[{ name: 'resid', values: res.resid, color: COL.line3, w: 1.2 }]} /></div>
          </div>
        </div>
      );
    }

    if (method === 'VAR' || method === 'BVAR' || method === 'svar') {
      var K = res.K, names = res.names;
      var irf = res._irf, fevd = res._fevd, band = res._irfBands;
      if (method === 'svar') {
        return (
          <div className="an-res">
            <StatGrid stats={[{ label: 'Model', value: 'SVAR(' + res.p + ')' }, { label: 'Identification', value: res.ident === 'bq' ? 'Blanchard-Quah (long-run)' : 'Recursive (Cholesky)' }, { label: 'Variables', value: K }, { label: 'Stable', value: res.stable ? '✓' : '⚠ unstable' }]} />
            <div className="an-note">Structural impulse responses{res.ident === 'bq' ? ' — first shock has a permanent long-run effect; second is transitory' : ' — recursive ordering: ' + names.join(' → ')}.</div>
            <div className="an-sub"><div className="an-sub-h">Structural IRF — response of row to structural shock in column</div>
              <div className="an-irf-grid" style={{ gridTemplateColumns: 'auto repeat(' + K + ', 1fr)' }}>
                <div className="an-irf-corner"></div>
                {names.map(function (n, j) { return <div key={'h' + j} className="an-irf-colh">↯ {n}</div>; })}
                {names.map(function (ni, i) { return [<div key={'r' + i} className="an-irf-rowh">{ni}</div>].concat(names.map(function (nj, j) {
                  return <div key={i + '_' + j} className="an-irf-cell"><MiniLine series={[{ name: 'irf', values: irf.map(function (h) { return h[i][j]; }), color: COL.line, w: 1.5 }]} height={86} /></div>;
                })); })}
              </div></div>
            {fevd && <div className="an-sub"><div className="an-sub-h">Variance decomposition (h={fevd.length - 1})</div>
              <table className="an-table"><thead><tr><th>Variable</th>{names.map(function (n, j) { return <th key={j}>{n}</th>; })}</tr></thead>
                <tbody>{names.map(function (ni, i) { return <tr key={i}><td className="an-vn">{ni}</td>{fevd[fevd.length - 1][i].map(function (v, j) { return <td key={j} className="an-num">{(v * 100).toFixed(1)}%</td>; })}</tr>; })}</tbody></table></div>}
          </div>
        );
      }
      return (
        <div className="an-res">
          <StatGrid stats={[
            { label: 'Model', value: method + '(' + res.p + ')' }, { label: 'Variables', value: K }, { label: 'Obs', value: res.T },
            { label: 'AIC', value: fmt(res.aic, 2) }, { label: 'BIC', value: fmt(res.bic, 2) },
            { label: 'Stable', value: res.stable ? '✓ all roots inside unit circle' : '⚠ unstable (root ≥ 1)' }
          ]} />
          <div className="an-note">Identification: orthogonalized (Cholesky) IRFs depend on the variable order — <b>{names.join(' → ')}</b>. Endogenous variables should be stationary (difference/log non-stationary series; run ADF first). {method === 'BVAR' ? 'Bands = 68% posterior (Minnesota prior draws).' : (band ? 'Bands = 68% from matrix-normal coefficient sampling.' : '')}</div>
          {!res.stable && <div className="an-verdict warn">⚠ The VAR is unstable (a companion root ≥ 1) — IRFs do not die out and forecasts diverge. Difference your variables or reduce lags.</div>}
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
          <StatGrid stats={[{ label: 'ADF statistic', value: fmt(res.stat, 4) }, { label: 'p-value (approx)', value: fmt(res.p, 4) }, { label: 'Lags' + (res.lagAuto ? ' (AIC)' : ''), value: res.lags }, { label: 'Trend', value: res.trend }, { label: 'Obs', value: res.n }]} />
          <table className="an-table"><thead><tr><th>Critical values</th><th>1%</th><th>5%</th><th>10%</th></tr></thead>
            <tbody><tr><td>Threshold</td><td className="an-num">{res.critical['1%']}</td><td className="an-num">{res.critical['5%']}</td><td className="an-num">{res.critical['10%']}</td></tr></tbody></table>
          <div className={'an-verdict ' + (res.stationary ? 'good' : 'warn')}>{res.decision}</div>
        </div>
      );
    }

    if (method === 'cointegration') {
      return (
        <div className="an-res">
          <div className="an-note">{res.test} test — Step 1: OLS of Y on X (the long-run / cointegrating regression). Step 2: ADF on its residuals.</div>
          {res.beta && <EquationLine r={{ names: res.names, coef: res.beta }} yName={(res.names && res.names[0]) || 'Y'} />}
          <StatGrid stats={[{ label: 'Residual ADF stat', value: fmt(res.stat, 4) }, { label: 'Lags', value: res.lags }, { label: '# regressors', value: res.nReg }]} />
          <table className="an-table"><thead><tr><th>Engle-Granger critical</th><th>1%</th><th>5%</th><th>10%</th></tr></thead>
            <tbody><tr><td>Threshold</td><td className="an-num">{res.critical['1%']}</td><td className="an-num">{res.critical['5%']}</td><td className="an-num">{res.critical['10%']}</td></tr></tbody></table>
          <div className={'an-verdict ' + (res.cointegrated ? 'good' : 'warn')}>{res.decision}</div>
        </div>
      );
    }

    if (method === 'acf') {
      var lags = res.acf.map(function (o) { return o.lag; });
      return (
        <div className="an-res">
          <div className="an-note">Autocorrelation of <b>{res.name}</b> · n={res.n}. Bars beyond the dashed Bartlett band are significant at ~5%.</div>
          <div className="an-charts2">
            <div className="an-chart-card"><div className="an-chart-h">ACF</div><Bars values={res.acf.map(function (o) { return o.value; })} labels={lags} /><div className="an-dim" style={{ fontSize: 10, marginTop: 4 }}>±{fmt(res.acf[0] ? res.acf[0].ci : 0, 2)} band (lag 1)</div></div>
            <div className="an-chart-card"><div className="an-chart-h">PACF</div><Bars values={res.pacf.map(function (o) { return o.value; })} labels={lags} /></div>
          </div>
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

    // ---- ARIMA / SARIMAX ----
    if (method === 'arima') {
      var o = res.order, ord = '(' + o.p + ',' + o.d + ',' + o.q + ')' + (o.P + o.D + o.Q ? '(' + o.P + ',' + o.D + ',' + o.Q + ')' + o.s : '');
      var fc = res.forecast || [];
      var hist = res.fitted || []; var fitted2 = hist.slice();
      // build a continuous series: in-sample fitted then forecast means
      var fseries = fitted2.concat(fc.map(function (f) { return f.mean; }));
      var lo = fc.length ? hist.map(function () { return null; }).concat(fc.map(function (f) { return f.lo95; })) : null;
      var up = fc.length ? hist.map(function () { return null; }).concat(fc.map(function (f) { return f.hi95; })) : null;
      return (
        <div className="an-res">
          <div className="an-eq-result"><b>{res._yName || 'Y'}</b> · ARIMA {ord}</div>
          <table className="an-table an-coef"><thead><tr><th>Term</th><th>Coef.</th><th>Std.Err</th><th>t</th><th>P&gt;|t|</th></tr></thead>
            <tbody>{res.names.map(function (nm, i) { return <tr key={i}><td className="an-vn">{nm}</td><td className="an-num">{fmt(res.coef[i])}<span className="an-star">{stars(res.p[i])}</span></td><td className="an-num">{fmt(res.se[i])}</td><td className="an-num">{fmt(res.t[i], 3)}</td><td className="an-num">{fmtP(res.p[i])}</td></tr>; })}</tbody></table>
          <StatGrid stats={[{ label: 'σ', value: fmt(res.sigma, 4) }, { label: 'AIC', value: fmt(res.aic, 2) }, { label: 'BIC', value: fmt(res.bic, 2) }, { label: 'Obs', value: res.n }, { label: 'Ljung-Box p', value: res.ljung ? fmtP(res.ljung.p) + (res.ljung.p < 0.05 ? ' ⚠ residual autocorr' : ' ✓ white') : '—' }]} />
          {fc.length > 0 && <div className="an-sub"><div className="an-sub-h">Forecast ({fc.length} steps{res.forecastScale === 'differenced' ? ', differenced scale' : ''}, 95% band)</div>
            <MiniLine series={[{ name: 'fit+fc', values: fseries, color: COL.line }]} band={lo ? { lower: lo, upper: up } : null} labels={res._dates || []} height={170} /></div>}
          {fc.length > 0 && (o.d > 0 || o.D > 0) && <div className="an-note">⚠ Forecast bands are <b>approximate</b> for differenced (d/D ≥ 1) models — interval variance is propagated on the differenced scale, so long-horizon bands understate true level-scale uncertainty.</div>}
        </div>
      );
    }
    if (method === 'ets') {
      var ef = res.forecast || []; var eser = (res._series || []).concat([]);
      var efit = (res.fitted || []).concat(ef.map(function (f) { return f.mean; }));
      return (
        <div className="an-res">
          <StatGrid stats={[{ label: 'α (level)', value: fmt(res.alpha, 3) }, { label: 'β (trend)', value: res.beta != null ? fmt(res.beta, 3) : '—' }, { label: 'γ (seasonal)', value: res.gamma != null ? fmt(res.gamma, 3) : '—' }, { label: 'SSE', value: fmt(res.sse, 2) }]} />
          <div className="an-note">Smoothing constants are fixed defaults (not SSE-optimized) — a quick baseline forecast. Forecast carries no interval.</div>
          <div className="an-chart-card"><div className="an-chart-h">{res._name} · observed (green) + fit/forecast (blue)</div>
            <MiniLine series={[{ name: 'obs', values: eser, color: COL.line2 }, { name: 'fit', values: efit, color: COL.line }]} height={180} /></div></div>
      );
    }
    if (method === 'hp') {
      return (
        <div className="an-res">
          <StatGrid stats={[{ label: 'λ smoothing', value: res.lambda }, { label: 'Obs', value: (res.trend || []).length }]} />
          <div className="an-chart-card"><div className="an-chart-h">{res._name} · series (green) vs trend (blue) · λ={res.lambda}</div>
            <MiniLine series={[{ name: 'y', values: res._series || [], color: COL.line2 }, { name: 'trend', values: res.trend, color: COL.line }]} labels={res._dates || []} height={170} /></div>
          <div className="an-chart-card"><div className="an-chart-h">Cycle (gap)</div><MiniLine series={[{ name: 'cycle', values: res.cycle, color: COL.line3, w: 1.3 }]} labels={res._dates || []} height={120} /></div>
        </div>
      );
    }
    if (method === 'decompose') {
      return (
        <div className="an-res">
          <div className="an-note">{res._name} · classical {res.type === 'mul' ? 'multiplicative' : 'additive'} decomposition, period s={res.s}.</div>
          <div className="an-chart-card"><div className="an-chart-h">Observed</div><MiniLine series={[{ name: 'y', values: res._series || [], color: COL.line2 }]} height={110} /></div>
          <div className="an-chart-card"><div className="an-chart-h">Trend</div><MiniLine series={[{ name: 't', values: res.trend, color: COL.line }]} height={110} /></div>
          <div className="an-chart-card"><div className="an-chart-h">Seasonal</div><MiniLine series={[{ name: 's', values: res.seasonal, color: COL.line }]} height={100} /></div>
          <div className="an-chart-card"><div className="an-chart-h">Remainder</div><MiniLine series={[{ name: 'r', values: res.remainder, color: COL.line3, w: 1.2 }]} height={100} /></div>
        </div>
      );
    }
    if (method === 'garch') {
      return (
        <div className="an-res">
          <StatGrid stats={[{ label: 'ω', value: fmt(res.omega, 6) }, { label: 'α (ARCH)', value: fmt(res.alpha, 4) }].concat(res.gamma != null ? [{ label: 'γ (GJR asymmetry)', value: fmt(res.gamma, 4) }] : []).concat([{ label: 'β (GARCH)', value: fmt(res.beta, 4) }, { label: 'Persistence', value: fmt(res.persistence, 4) }, { label: 'Uncond. vol', value: fmt(res.uncondVol, 5) }, { label: 'Log-lik', value: fmt(res.llf, 1) }, { label: 'AIC', value: fmt(res.aic, 1) }, { label: 'Obs', value: res.n }])} />
          {res.persistence >= 0.999 && <div className="an-verdict warn">⚠ Persistence ≈ 1 — variance is near-integrated (IGARCH); shocks die out very slowly.</div>}
          <div className="an-chart-card"><div className="an-chart-h">{res._name} · conditional volatility (σₜ)</div><MiniLine series={[{ name: 'vol', values: res.condVol, color: COL.line }]} height={170} /></div>
        </div>
      );
    }
    if (method === 'logit') {
      return (
        <div className="an-res">
          <table className="an-table an-coef"><thead><tr><th>Variable</th><th>Coef.</th><th>Std.Err</th><th>z</th><th>P&gt;|z|</th><th>Odds ratio</th></tr></thead>
            <tbody>{res.names.map(function (nm, i) { return <tr key={i}><td className="an-vn">{nm}</td><td className="an-num">{fmt(res.coef[i])}<span className="an-star">{stars(res.p[i])}</span></td><td className="an-num">{fmt(res.se[i])}</td><td className="an-num">{fmt(res.z[i], 3)}</td><td className="an-num">{fmtP(res.p[i])}</td><td className="an-num">{fmt(res.oddsRatio[i], 3)}</td></tr>; })}</tbody></table>
          <div className="an-sig-key">*** p&lt;0.01 · ** p&lt;0.05 · * p&lt;0.1</div>
          <StatGrid stats={[{ label: 'McFadden pseudo-R²', value: fmt(res.pseudoR2, 3) }, { label: 'Log-lik', value: fmt(res.llf, 2) }, { label: 'Obs', value: res.n }]} />
        </div>
      );
    }
    if (method === 'quantreg') {
      var qn = res.coef.length === res.names.length + 1 ? ['(const)'].concat(res.names) : res.names;
      return (
        <div className="an-res">
          <div className="an-note">Quantile regression at <b>τ = {res.tau}</b> · n={res.n}.</div>
          <table className="an-table an-coef"><thead><tr><th>Variable</th><th>Coef. (τ={res.tau})</th></tr></thead>
            <tbody>{res.coef.map(function (c, i) { return <tr key={i}><td className="an-vn">{qn[i]}</td><td className="an-num">{fmt(c)}</td></tr>; })}</tbody></table>
        </div>
      );
    }
    if (method === 'chow') {
      return (
        <div className="an-res">
          <StatGrid stats={[{ label: 'Chow F', value: fmt(res.fStat, 3) }, { label: 'df', value: res.df1 + ', ' + res.df2 }, { label: 'p-value', value: fmtP(res.p) }, { label: 'Break at', value: res._breakDate || ('obs ' + res.breakIndex) }]} />
          <div className={'an-verdict ' + (res.broke ? 'warn' : 'good')}>{res.broke ? '⚠ Structural break detected at 5% — coefficients differ across the split (consider separate models or a break dummy).' : 'No structural break at 5% — coefficients are stable across the split.'}</div>
        </div>
      );
    }
    if (method === 'johansen') {
      return (
        <div className="an-res">
          <StatGrid stats={[{ label: 'Variables', value: res.K }, { label: 'Lags', value: res.p }, { label: 'Cointegrating rank', value: res.rank + (res.rank === 0 ? ' (none)' : '') }]} />
          <div className={'an-verdict ' + (res.rank > 0 ? 'good' : 'warn')}>{res.rank > 0 ? res.rank + ' cointegrating relationship(s) found — the system shares a long-run equilibrium; estimate a VECM (rank ' + res.rank + ').' : 'No cointegration — model the variables in differences (a VAR on Δ), not levels.'}</div>
          <div className="an-note">5% critical values: Osterwald-Lenum (1992), {res.det === 'n' ? 'no-deterministic' : 'unrestricted-constant'} case · asymptotic. Rank = first r whose trace stat falls below its critical value.</div>
          <div className="an-sub"><div className="an-sub-h">Trace test</div>
            <table className="an-table"><thead><tr><th>H₀: rank ≤</th><th>eigenvalue</th><th>trace stat</th><th>5% crit</th></tr></thead>
              <tbody>{res.trace.map(function (t, i) { return <tr key={i} className={t.crit5 != null && t.stat > t.crit5 ? 'an-row-on' : ''}><td>{t.r}</td><td className="an-num">{fmt(res.eigenvalues[i], 4)}</td><td className="an-num">{fmt(t.stat, 2)}</td><td className="an-num">{t.crit5 == null ? '—' : t.crit5}</td></tr>; })}</tbody></table></div>
          {res.maxeig && <div className="an-sub"><div className="an-sub-h">Max-eigenvalue test</div>
            <table className="an-table"><thead><tr><th>H₀: rank =</th><th>max-eig stat</th><th>5% crit</th></tr></thead>
              <tbody>{res.maxeig.map(function (t, i) { return <tr key={i} className={t.crit5 != null && t.stat > t.crit5 ? 'an-row-on' : ''}><td>{t.r}</td><td className="an-num">{fmt(t.stat, 2)}</td><td className="an-num">{t.crit5 == null ? '—' : t.crit5}</td></tr>; })}</tbody></table></div>}
        </div>
      );
    }
    if (method === 'vecm') {
      return (
        <div className="an-res">
          <StatGrid stats={[{ label: 'Cointegrating rank', value: res.rank }, { label: 'Variables', value: res.names.length }]} />
          <div className="an-sub"><div className="an-sub-h">Cointegrating vectors β (long-run relationship)</div>
            <table className="an-table"><thead><tr><th>Variable</th>{(res.beta[0] || []).map(function (_, j) { return <th key={j}>β{j + 1}</th>; })}</tr></thead>
              <tbody>{res.names.map(function (n, i) { return <tr key={i}><td className="an-vn">{n}</td>{res.beta[i].map(function (v, j) { return <td key={j} className="an-num">{fmt(v, 3)}</td>; })}</tr>; })}</tbody></table></div>
          <div className="an-sub"><div className="an-sub-h">Adjustment speeds α (error-correction)</div>
            <table className="an-table"><thead><tr><th>Equation Δ</th>{(res.alpha[0] || []).map(function (_, j) { return <th key={j}>α{j + 1}</th>; })}</tr></thead>
              <tbody>{res.names.map(function (n, i) { return <tr key={i}><td className="an-vn">{n}</td>{res.alpha[i].map(function (v, j) { return <td key={j} className="an-num">{fmt(v, 3)}</td>; })}</tr>; })}</tbody></table></div>
          {res.ect && res.ect.length > 0 && <div className="an-chart-card"><div className="an-chart-h">Error-correction term (deviation from equilibrium)</div><MiniLine series={[{ name: 'ect', values: res.ect.map(function (r) { return Array.isArray(r) ? r[0] : r; }), color: COL.line }]} height={130} /></div>}
        </div>
      );
    }
    if (method === 'pca') {
      return (
        <div className="an-res">
          <div className="an-note">Principal components on {res.names.length} standardized variables · n={res.n}.</div>
          <div className="an-chart-card"><div className="an-chart-h">Scree — variance explained per component</div><Bars values={res.explained.map(function (v) { return v * 100; })} labels={res.explained.map(function (_, i) { return 'PC' + (i + 1); })} /></div>
          <div className="an-sub"><div className="an-sub-h">Explained variance</div>
            <table className="an-table"><thead><tr><th>Component</th><th>Eigenvalue</th><th>% variance</th><th>cumulative %</th></tr></thead>
              <tbody>{res.eigenvalues.map(function (e, i) { return <tr key={i}><td>PC{i + 1}</td><td className="an-num">{fmt(e, 3)}</td><td className="an-num">{(res.explained[i] * 100).toFixed(1)}%</td><td className="an-num">{(res.cumExplained[i] * 100).toFixed(1)}%</td></tr>; })}</tbody></table></div>
          <div className="an-sub"><div className="an-sub-h">Loadings</div>
            <table className="an-table"><thead><tr><th>Variable</th>{res.names.map(function (_, j) { return <th key={j}>PC{j + 1}</th>; })}</tr></thead>
              <tbody>{res.names.map(function (n, i) { return <tr key={i}><td className="an-vn">{n}</td>{res.loadings[i].map(function (v, j) { return <td key={j} className="an-num" style={{ background: corrColor(v) }}>{fmt(v, 2)}</td>; })}</tr>; })}</tbody></table></div>
        </div>
      );
    }
    if (method === 'rolling') {
      var rn = (res.coefPaths && res.coefPaths.length === (res.names.length + 1)) ? ['(const)'].concat(res.names) : res.names;
      return (
        <div className="an-res">
          <div className="an-note"><b>{res._yName || 'Y'}</b> · rolling regression, {res.window}-period window — time-varying coefficients.</div>
          {(res.coefPaths || []).map(function (path, i) { return <div key={i} className="an-chart-card"><div className="an-chart-h">β · {rn[i] || ('coef ' + i)}</div><MiniLine series={[{ name: 'b', values: path, color: i === 0 ? COL.line2 : COL.line }]} height={110} /></div>; })}
        </div>
      );
    }

    return <pre className="an-raw">{JSON.stringify(res, null, 2).slice(0, 2000)}</pre>;
  }

  window.AnalysisViz = { MiniLine: MiniLine, Bars: Bars, Heatmap: Heatmap, CoefTable: CoefTable, StatGrid: StatGrid, fmt: fmt };
  window.AnalysisResults = { ResultView: ResultView };
})();

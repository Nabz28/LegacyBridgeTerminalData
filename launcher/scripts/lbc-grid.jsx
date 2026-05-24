// ================================================================
// lbc-grid.jsx — shared Excel-like read-only data grid (window.LbcDataGrid).
// Sticky header + sticky first column, row gutter, zebra striping, mono
// right-aligned numbers, a frequency badge, and a one-click CSV export.
//
//   <window.LbcDataGrid
//      title="Aligned dataset"
//      freqBadge="Monthly · auto"
//      headers={['Date','DXY','Gold']}
//      rows={[['2020-01-31', 96.4, 1580], ...]}   // cells: number|string
//      filename="dataset.csv"
//      note="142 rows after alignment · 0 dropped"
//      maxHeight={380}
//   />
//
// Cells that are raw numbers are formatted for display but exported/copied
// as the underlying value via window.LbcExport.
// ================================================================
(function () {
  'use strict';
  var R = window.React;
  if (!R) return;
  var h = R.createElement;

  function gfmt(v) {
    if (v == null || v === '') return '';
    if (typeof v !== 'number') return String(v);
    if (!isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e7 || a < 1e-4)) return v.toExponential(3);
    var dec = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 2 : 4;
    return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dec });
  }

  function LbcDataGrid(props) {
    var headers = props.headers || [];
    var rows = props.rows || [];
    var maxHeight = props.maxHeight || 380;
    var ROW_CAP = props.rowCap || 2000; // safety cap for huge datasets in the DOM
    var shown = rows.length > ROW_CAP ? rows.slice(0, ROW_CAP) : rows;

    function exportCsv() {
      var Ex = window.LbcExport;
      if (!Ex) return;
      Ex.saveCSV(props.filename || ('data-' + Ex.stamp() + '.csv'), { headers: headers, rows: rows });
    }

    var isNumCol = headers.map(function (_, c) {
      // a column is numeric if any cell in it is a number
      for (var i = 0; i < shown.length; i++) { if (typeof shown[i][c] === 'number') return true; }
      return false;
    });

    return h('div', { className: 'lg-wrap' },
      h('div', { className: 'lg-bar' },
        h('div', { className: 'lg-bar-l' },
          props.title ? h('span', { className: 'lg-title' }, props.title) : null,
          props.freqBadge ? h('span', { className: 'lg-badge', title: 'Detected sampling frequency' }, props.freqBadge) : null
        ),
        h('div', { className: 'lg-bar-r' },
          h('span', { className: 'lg-dim' }, rows.length + ' × ' + headers.length),
          h('button', { className: 'lg-csv', onClick: exportCsv, title: 'Download as CSV' }, '↓ CSV')
        )
      ),
      props.note ? h('div', { className: 'lg-note' }, props.note) : null,
      h('div', { className: 'lg-scroll', style: { maxHeight: maxHeight + 'px' } },
        h('table', { className: 'lg-table' },
          h('thead', null,
            h('tr', null,
              h('th', { className: 'lg-gut lg-corner' }, '#'),
              headers.map(function (hd, c) {
                return h('th', { key: c, className: (c === 0 ? 'lg-fix ' : '') + (isNumCol[c] ? 'lg-num' : '') }, hd);
              })
            )
          ),
          h('tbody', null,
            shown.map(function (row, r) {
              return h('tr', { key: r },
                h('td', { className: 'lg-gut' }, r + 1),
                headers.map(function (_, c) {
                  var v = row[c];
                  return h('td', { key: c, className: (c === 0 ? 'lg-fix ' : '') + (isNumCol[c] ? 'lg-num' : '') }, gfmt(v));
                })
              );
            })
          )
        )
      ),
      rows.length > ROW_CAP
        ? h('div', { className: 'lg-note lg-trunc' }, 'Showing first ' + ROW_CAP.toLocaleString('en-US') + ' of ' + rows.length.toLocaleString('en-US') + ' rows — export CSV for the full dataset.')
        : null
    );
  }

  window.LbcDataGrid = LbcDataGrid;
})();

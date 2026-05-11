// Left panel: collapsible category tree with checkboxes + filter input.
(function () {
  const CAT_LABEL = {
    us_equities: 'US Equities',
    us_macro: 'US Macro',
    indonesia_equities: 'Indonesia Equities',
    indonesia_macro: 'Indonesia Macro',
    china_hk: 'China + HK',
    china_macro: 'China Macro',
    korea_japan_asean_india: 'Korea / Japan / ASEAN / India',
    europe_dm_latam: 'Europe / DM / LatAm',
    global_fx: 'Global FX',
    energy_commod: 'Energy',
    metals_commod: 'Metals',
    agri_soft_commod: 'Agri / Softs',
    crypto: 'Crypto',
    etfs: 'ETFs',
  };

  class Universe {
    constructor(treeEl, filterEl, countEl, clearBtn, computeBtn) {
      this.treeEl = treeEl;
      this.filterEl = filterEl;
      this.countEl = countEl;
      this.clearBtn = clearBtn;
      this.computeBtn = computeBtn;
      this.series = [];
      this.byCat = {};
      this.selected = new Set();
      this.filter = '';
      this.openCats = new Set();
      this.onCompute = null;
      this.onSelectionChange = null;

      filterEl.addEventListener('input', e => {
        this.filter = e.target.value.trim().toLowerCase();
        this._render();
      });
      clearBtn.addEventListener('click', () => {
        this.selected.clear();
        this._render();
        this._announce();
      });
      computeBtn.addEventListener('click', () => {
        if (this.onCompute) this.onCompute(Array.from(this.selected));
      });
    }

    setSeries(list) {
      this.series = list;
      // Two-level grouping: cat -> sub -> [series]
      this.byCat = {};        // {cat: {sub: [series]}}
      this.byCatFlat = {};    // {cat: [series]} — kept for cat counts
      this.openSubs = new Set();  // subkey = `${cat}::${sub}`
      for (const s of list) {
        (this.byCatFlat[s.cat] ||= []).push(s);
        const sub = s.sub || 'Other';
        ((this.byCat[s.cat] ||= {})[sub] ||= []).push(s);
      }
      this._render();
    }

    setSelected(ids) {
      this.selected = new Set(ids);
      this._render();
      this._announce();
    }

    add(id) { this.selected.add(id); this._render(); this._announce(); }
    remove(id) { this.selected.delete(id); this._render(); this._announce(); }
    toggle(id) { this.selected.has(id) ? this.selected.delete(id) : this.selected.add(id); this._render(); this._announce(); }
    has(id) { return this.selected.has(id); }
    ids() { return Array.from(this.selected); }
    focusFilter() { this.filterEl.focus(); this.filterEl.select(); }

    _announce() {
      this.countEl.textContent = `${this.selected.size}`;
      if (this.onSelectionChange) this.onSelectionChange(Array.from(this.selected));
    }

    _matches(s) {
      if (!this.filter) return true;
      const f = this.filter;
      return s.id.toLowerCase().includes(f) ||
             s.name.toLowerCase().includes(f) ||
             s.cat.toLowerCase().includes(f) ||
             (s.sub || '').toLowerCase().includes(f);
    }

    _render() {
      const cats = Object.keys(this.byCatFlat).sort((a,b) => (CAT_LABEL[a]||a).localeCompare(CAT_LABEL[b]||b));
      this.treeEl.innerHTML = '';
      this.countEl.textContent = `${this.selected.size}`;
      const colors = window.CAT_COLORS || {};
      for (const cat of cats) {
        const allItems = this.byCatFlat[cat];
        const itemsFiltered = allItems.filter(s => this._matches(s));
        if (!itemsFiltered.length && this.filter) continue;
        const selCount = allItems.reduce((n,s) => n + (this.selected.has(s.id) ? 1 : 0), 0);
        const grp = document.createElement('div');
        grp.className = 'cat-group';
        const isOpen = this.openCats.has(cat) || (this.filter && itemsFiltered.length);
        if (isOpen) grp.classList.add('open');

        const hdr = document.createElement('div');
        hdr.className = 'cat-header';
        hdr.innerHTML = `
          <span class="cat-arrow">▶</span>
          <span class="swatch" style="background:${colors[cat] || '#5b626d'}"></span>
          <span class="cat-name">${CAT_LABEL[cat] || cat}</span>
          <span class="cat-count">${selCount}/${allItems.length}</span>
        `;
        hdr.addEventListener('click', () => {
          if (this.openCats.has(cat)) this.openCats.delete(cat); else this.openCats.add(cat);
          this._render();
        });
        grp.appendChild(hdr);

        const list = document.createElement('div');
        list.className = 'cat-items';
        const subMap = this.byCat[cat] || {};
        const subKeys = Object.keys(subMap).sort();

        // If only one sub-industry (or none), render flat — same as before.
        if (subKeys.length <= 1) {
          for (const s of itemsFiltered) list.appendChild(this._renderRow(s));
        } else {
          for (const sub of subKeys) {
            const subItems = subMap[sub].filter(s => this._matches(s));
            if (!subItems.length && this.filter) continue;
            const subSelCount = subMap[sub].reduce((n,s) => n + (this.selected.has(s.id) ? 1 : 0), 0);

            const subKey = `${cat}::${sub}`;
            const subOpen = this.openSubs.has(subKey) || (this.filter && subItems.length);
            const subGrp = document.createElement('div');
            subGrp.className = 'sub-group' + (subOpen ? ' open' : '');

            const subHdr = document.createElement('div');
            subHdr.className = 'sub-header';
            subHdr.innerHTML = `
              <span class="sub-arrow">▶</span>
              <span class="sub-name">${sub}</span>
              <span class="sub-count">${subSelCount}/${subMap[sub].length}</span>
            `;
            subHdr.addEventListener('click', () => {
              if (this.openSubs.has(subKey)) this.openSubs.delete(subKey); else this.openSubs.add(subKey);
              this._render();
            });
            subGrp.appendChild(subHdr);

            const subList = document.createElement('div');
            subList.className = 'sub-items';
            for (const s of subItems) subList.appendChild(this._renderRow(s));
            subGrp.appendChild(subList);
            list.appendChild(subGrp);
          }
        }
        grp.appendChild(list);
        this.treeEl.appendChild(grp);
      }
    }

    _renderRow(s) {
      const row = document.createElement('div');
      row.className = 'series-row';
      if (!s.available) row.classList.add('unavail');
      if (this.selected.has(s.id)) row.classList.add('selected');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = this.selected.has(s.id);
      cb.disabled = !s.available;
      cb.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', () => this.toggle(s.id));
      row.appendChild(cb);
      const sid = document.createElement('span');
      sid.className = 'sid';
      sid.textContent = s.id;
      sid.title = s.id;
      row.appendChild(sid);
      const sname = document.createElement('span');
      sname.className = 'sname';
      sname.textContent = s.name;
      sname.title = s.name + (s.sub ? ` · ${s.sub}` : '');
      row.appendChild(sname);
      row.addEventListener('click', () => { if (s.available) this.toggle(s.id); });
      return row;
    }
  }

  window.Universe = Universe;
})();

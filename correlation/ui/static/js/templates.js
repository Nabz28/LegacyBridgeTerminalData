// Templates dropdown.
(function () {
  const TEMPLATES = [
    { key: 'us_macro_xa',       em: '🇺🇸', name: 'US Macro Cross-Asset' },
    { key: 'indo_domestic',     em: '🇮🇩', name: 'Indonesia Domestic' },
    { key: 'indo_xborder',      em: '🇮🇩', name: 'Indonesia Cross-Border' },
    { key: 'china_hk',          em: '🇨🇳', name: 'China + HK' },
    { key: 'asia_beta',         em: '🌏', name: 'Asia Beta' },
    { key: 'g10_em_fx',         em: '💱', name: 'G10 + EM FX' },
    { key: 'commodities',       em: '🛢️', name: 'Commodities' },
    { key: 'risk_factors',      em: '📈', name: 'Risk Factors' },
    { key: 'europe_xa',         em: '🇪🇺', name: 'Europe Cross-Asset' },
    { key: 'energy_transition', em: '⚡', name: 'Energy Transition' },
    { key: 'crypto_equity',     em: '🪙', name: 'Crypto + Equity Beta' },
  ];

  class Templates {
    constructor(btnEl, menuEl) {
      this.btnEl = btnEl;
      this.menuEl = menuEl;
      this.counts = {};
      this.onPick = null;
      btnEl.addEventListener('click', e => {
        e.stopPropagation();
        this.toggle();
      });
      document.addEventListener('click', e => {
        if (!menuEl.contains(e.target) && e.target !== btnEl) menuEl.hidden = true;
      });
    }

    setCounts(map) { this.counts = map || {}; this._render(); }

    open() { this.menuEl.hidden = false; this._render(); }
    close() { this.menuEl.hidden = true; }
    toggle() { this.menuEl.hidden = !this.menuEl.hidden; if (!this.menuEl.hidden) this._render(); }

    list() { return TEMPLATES; }

    _render() {
      this.menuEl.innerHTML = '';
      for (const t of TEMPLATES) {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.innerHTML = `
          <span class="em">${t.em}</span>
          <span class="name">${t.name}</span>
          <span class="ct">${this.counts[t.key] || ''}</span>
        `;
        item.addEventListener('click', () => {
          this.menuEl.hidden = true;
          if (this.onPick) this.onPick(t.key);
        });
        this.menuEl.appendChild(item);
      }
    }
  }

  window.Templates = Templates;
  window.TEMPLATE_LIST = TEMPLATES;
})();

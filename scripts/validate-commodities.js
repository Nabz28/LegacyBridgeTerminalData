// Validate NEW commodity candidates (CPO, coal/LNG, base metals, fertilizers/pupuk,
// grains, softs, agri raw materials, meat/seafood, IMF commodity indices) by
// test-fetching through the series-proxy edge fn (FRED holds the key server-side).
// Prints VALID / INVALID so we only wire live IDs into macro-refresh.
//
// Usage: node scripts/validate-commodities.js

const PROXY = "https://adnubucjlezrtusbicja.supabase.co/functions/v1/series-proxy";
const ANON = "sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7";

// key | region | subcategory | label | unit | source | id | tv | transform | freq
const C = [
  // ---- ENERGY (cost) — FRED IMF/World Bank global benchmarks ----
  ["wb_coal_au","Commodities","Energy","Coal, Australia (Newcastle)","$","FRED","PCOALAUUSDM","","level","monthly"],
  ["wb_coal_sa","Commodities","Energy","Coal, South Africa","$","FRED","PCOALSAUSDM","","level","monthly"],
  ["wb_natgas_eu","Commodities","Energy","Natural Gas, Europe (TTF)","$","FRED","PNGASEUUSDM","","level","monthly"],
  ["wb_natgas_jp","Commodities","Energy","LNG, Japan (import)","$","FRED","PNGASJPUSDM","","level","monthly"],
  ["wb_natgas_us","Commodities","Energy","Natural Gas, US (Henry Hub)","$","FRED","PNGASUSUSDM","","level","monthly"],
  ["wb_oil_brent","Commodities","Energy","Crude Oil, Brent","$","FRED","POILBREUSDM","","level","monthly"],
  ["wb_oil_wti","Commodities","Energy","Crude Oil, WTI","$","FRED","POILWTIUSDM","","level","monthly"],
  ["wb_oil_dubai","Commodities","Energy","Crude Oil, Dubai","$","FRED","POILDUBUSDM","","level","monthly"],
  ["wb_oil_apsp","Commodities","Energy","Crude Oil, APSP avg spot","$","FRED","POILAPSPUSDM","","level","monthly"],
  // ---- INDUSTRIAL METALS — FRED IMF ----
  ["wb_aluminum","Commodities","Industrial Metals","Aluminum (LME)","$","FRED","PALUMUSDM","","level","monthly"],
  ["wb_copper","Commodities","Industrial Metals","Copper (LME)","$","FRED","PCOPPUSDM","","level","monthly"],
  ["wb_nickel","Commodities","Industrial Metals","Nickel (LME)","$","FRED","PNICKUSDM","","level","monthly"],
  ["wb_lead","Commodities","Industrial Metals","Lead (LME)","$","FRED","PLEADUSDM","","level","monthly"],
  ["wb_zinc","Commodities","Industrial Metals","Zinc (LME)","$","FRED","PZINCUSDM","","level","monthly"],
  ["wb_tin","Commodities","Industrial Metals","Tin (LME)","$","FRED","PTINUSDM","","level","monthly"],
  ["wb_iron_ore","Commodities","Industrial Metals","Iron Ore (China CFR)","$","FRED","PIORECRUSDM","","level","monthly"],
  ["wb_uranium","Commodities","Industrial Metals","Uranium","$","FRED","PURANUSDM","","level","monthly"],
  // ---- PRECIOUS (FRED monthly benchmarks) ----
  ["wb_gold","Commodities","Precious Metals","Gold (monthly avg)","$","FRED","PGOLDUSDM","","level","monthly"],
  // ---- PALM OIL & VEGETABLE OILS ----
  ["wb_palm_oil","Commodities","Palm Oil & Veg Oils","Palm Oil (CPO)","$","FRED","PPOILUSDM","","level","monthly"],
  ["wb_soybeans","Commodities","Palm Oil & Veg Oils","Soybeans","$","FRED","PSOYBUSDM","","level","monthly"],
  ["wb_soybean_oil","Commodities","Palm Oil & Veg Oils","Soybean Oil","$","FRED","PSOYOILUSDM","","level","monthly"],
  ["wb_sunflower_oil","Commodities","Palm Oil & Veg Oils","Sunflower Oil","$","FRED","PSUNOUSDM","","level","monthly"],
  ["wb_rapeseed_oil","Commodities","Palm Oil & Veg Oils","Rapeseed Oil","$","FRED","PROILUSDM","","level","monthly"],
  ["wb_groundnut_oil","Commodities","Palm Oil & Veg Oils","Groundnut Oil","$","FRED","PGNUTSUSDM","","level","monthly"],
  ["wb_coconut_oil","Commodities","Palm Oil & Veg Oils","Coconut Oil","$","FRED","PCOCONUTUSDM","","level","monthly"],
  // ---- GRAINS & STAPLE FOOD ----
  ["wb_wheat","Commodities","Grains & Food","Wheat (HRW)","$","FRED","PWHEAMTUSDM","","level","monthly"],
  ["wb_maize","Commodities","Grains & Food","Maize (Corn)","$","FRED","PMAIZMTUSDM","","level","monthly"],
  ["wb_rice","Commodities","Grains & Food","Rice (Thai 5%)","$","FRED","PRICENPQUSDM","","level","monthly"],
  ["wb_barley","Commodities","Grains & Food","Barley","$","FRED","PBARLUSDM","","level","monthly"],
  // ---- SOFTS & BEVERAGES ----
  ["wb_sugar_isa","Commodities","Softs & Beverages","Sugar (ISA)","$","FRED","PSUGAISAUSDM","","level","monthly"],
  ["wb_sugar_us","Commodities","Softs & Beverages","Sugar (US)","$","FRED","PSUGAUSAUSDM","","level","monthly"],
  ["wb_sugar_eu","Commodities","Softs & Beverages","Sugar (EU)","$","FRED","PSUGAEECUSDM","","level","monthly"],
  ["wb_coffee_arabica","Commodities","Softs & Beverages","Coffee (Arabica)","$","FRED","PCOFFOTMUSDM","","level","monthly"],
  ["wb_coffee_robusta","Commodities","Softs & Beverages","Coffee (Robusta)","$","FRED","PCOFFROBUSDM","","level","monthly"],
  ["wb_cocoa","Commodities","Softs & Beverages","Cocoa","$","FRED","PCOCOUSDM","","level","monthly"],
  ["wb_tea","Commodities","Softs & Beverages","Tea (avg 3-auctions)","$","FRED","PTEAUSDM","","level","monthly"],
  ["wb_tea_kolkata","Commodities","Softs & Beverages","Tea (Kolkata)","$","FRED","PTEAINUSDM","","level","monthly"],
  ["wb_tea_mombasa","Commodities","Softs & Beverages","Tea (Mombasa)","$","FRED","PTEAMOMUSDM","","level","monthly"],
  ["wb_oranges","Commodities","Softs & Beverages","Oranges","$","FRED","PORANGUSDM","","level","monthly"],
  ["wb_bananas","Commodities","Softs & Beverages","Bananas","$","FRED","PBANSOPUSDM","","level","monthly"],
  // ---- AGRICULTURAL RAW MATERIALS ----
  ["wb_cotton","Commodities","Agri Raw Materials","Cotton (A Index)","$","FRED","PCOTTINDUSDM","","level","monthly"],
  ["wb_rubber","Commodities","Agri Raw Materials","Rubber (TSR20)","$","FRED","PRUBBUSDM","","level","monthly"],
  ["wb_wool_coarse","Commodities","Agri Raw Materials","Wool (coarse)","$","FRED","PWOOLCUSDM","","level","monthly"],
  ["wb_wool_fine","Commodities","Agri Raw Materials","Wool (fine)","$","FRED","PWOOLFUSDM","","level","monthly"],
  ["wb_logs","Commodities","Agri Raw Materials","Hardwood Logs","$","FRED","PLOGSKUSDM","","level","monthly"],
  ["wb_sawnwood","Commodities","Agri Raw Materials","Sawnwood (Malaysia)","$","FRED","PSAWMALUSDM","","level","monthly"],
  // ---- FERTILIZERS (pupuk) ----
  ["wb_urea","Commodities","Fertilizers","Urea (Black Sea/ME)","$","FRED","PUREAUSDM","","level","monthly"],
  ["wb_dap","Commodities","Fertilizers","DAP (Diammonium Phosphate)","$","FRED","PDAPUSDM","","level","monthly"],
  ["wb_phosphate_rock","Commodities","Fertilizers","Phosphate Rock","$","FRED","PROCKUSDM","","level","monthly"],
  ["wb_potash","Commodities","Fertilizers","Potassium Chloride (Potash)","$","FRED","PPOTASHUSDM","","level","monthly"],
  ["wb_tsp","Commodities","Fertilizers","Triple Superphosphate","$","FRED","PTSPUSDM","","level","monthly"],
  // ---- MEAT & SEAFOOD ----
  ["wb_beef","Commodities","Meat & Seafood","Beef","$","FRED","PBEEFUSDM","","level","monthly"],
  ["wb_poultry","Commodities","Meat & Seafood","Poultry (chicken)","$","FRED","PPOULTUSDM","","level","monthly"],
  ["wb_lamb","Commodities","Meat & Seafood","Lamb","$","FRED","PLAMBUSDM","","level","monthly"],
  ["wb_shrimp","Commodities","Meat & Seafood","Shrimp","$","FRED","PSHRIUSDM","","level","monthly"],
  ["wb_salmon","Commodities","Meat & Seafood","Salmon","$","FRED","PSALMUSDM","","level","monthly"],
  ["wb_fishmeal","Commodities","Meat & Seafood","Fishmeal","$","FRED","PFSHMEALUSDM","","level","monthly"],
  // ---- IMF COMMODITY PRICE INDICES ----
  ["wb_idx_all","Commodities","Commodity Indices","IMF All Commodities Index","idx","FRED","PALLFNFINDEXM","","level","monthly"],
  ["wb_idx_energy","Commodities","Commodity Indices","IMF Energy Index","idx","FRED","PNRGINDEXM","","level","monthly"],
  ["wb_idx_nonfuel","Commodities","Commodity Indices","IMF Non-Fuel Index","idx","FRED","PNFUELINDEXM","","level","monthly"],
  ["wb_idx_food_bev","Commodities","Commodity Indices","IMF Food & Beverage Index","idx","FRED","PFANDBINDEXM","","level","monthly"],
  ["wb_idx_food","Commodities","Commodity Indices","IMF Food Index","idx","FRED","PFOODINDEXM","","level","monthly"],
  ["wb_idx_industrial","Commodities","Commodity Indices","IMF Industrial Inputs Index","idx","FRED","PINDUINDEXM","","level","monthly"],
  ["wb_idx_metals","Commodities","Commodity Indices","IMF Metals Index","idx","FRED","PMETAINDEXM","","level","monthly"],
  ["wb_idx_agri_raw","Commodities","Commodity Indices","IMF Agri Raw Materials Index","idx","FRED","PRAWMINDEXM","","level","monthly"],
  ["wb_idx_beverages","Commodities","Commodity Indices","IMF Beverages Index","idx","FRED","PBEVEINDEXM","","level","monthly"],
];

const cand = C.map((r) => ({ key: r[0], region: r[1], subcategory: r[2], label: r[3], unit: r[4], source: r[5], id: r[6], tv: r[7], transform: r[8], freq: r[9] }));

async function test(c) {
  const yqs = c.source === "YAHOO" ? "&range=5y&interval=1d" : "";
  try {
    const r = await fetch(`${PROXY}?source=${encodeURIComponent(c.source)}&id=${encodeURIComponent(c.id)}${yqs}`, { headers: { apikey: ANON, Authorization: "Bearer " + ANON } });
    const j = await r.json().catch(() => ({}));
    const obs = Array.isArray(j.obs) ? j.obs : [];
    return { ok: r.ok && obs.length > 0, count: obs.length, last: obs.length ? obs[obs.length - 1].value : null, lastDate: obs.length ? obs[obs.length - 1].date : null };
  } catch (e) { return { ok: false, count: 0, err: String(e) }; }
}

(async () => {
  const valid = [], invalid = [];
  for (const c of cand) {
    const t = await test(c);
    if (t.ok) valid.push({ ...c, _count: t.count, _last: t.last, _lastDate: t.lastDate });
    else invalid.push({ key: c.key, source: c.source, id: c.id, count: t.count, err: t.err });
    process.stdout.write(t.ok ? "." : "X");
    await new Promise((r) => setTimeout(r, 160));
  }
  console.log(`\n\nVALID ${valid.length} / ${cand.length}  ·  INVALID ${invalid.length}\n`);
  console.log("VALID:");
  valid.forEach((v) => console.log(`  ${v.key.padEnd(22)} ${String(v.id).padEnd(16)} n=${String(v._count).padStart(4)}  last=${v._last} (${v._lastDate})  [${v.subcategory}] ${v.label}`));
  console.log("\nINVALID (prune/replace):");
  invalid.forEach((i) => console.log(`  ${i.key.padEnd(22)} FRED:${i.id}`));
})();

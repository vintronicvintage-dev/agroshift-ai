/**
 * Rule-based explanation generator (no LLM). Every item has a stable i18n key, numeric
 * params, ready Turkish/English strings rendered from templates, and the source names.
 */
import type {
  ClimateSummary, CropId, Explanation, ExplanationItem, PlanResult, PriorityWeights, SoilHydraulics, ClimateZone,
} from "../types";
import { CROPS } from "../crops/database";
import { ZONE_LABEL } from "../crops/calendar";
import { legumeSuccessions } from "../crops/rules";

type Lang = "tr" | "en";
type Params = Record<string, number | string>;

function fmtNum(x: number, lang: Lang): string {
  const abs = Math.abs(x);
  const digits = Number.isInteger(x) || abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const s = x.toFixed(digits);
  const [int, dec] = s.split(".");
  const sign = int.startsWith("-") ? "-" : "";
  const body = int.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, lang === "tr" ? "." : ",");
  const decSep = lang === "tr" ? "," : ".";
  return sign + body + (dec ? decSep + dec : "");
}

export function render(template: string, params: Params, lang: Lang): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    if (v === undefined) return `{${k}}`;
    return typeof v === "number" ? fmtNum(v, lang) : v;
  });
}

function item(key: string, params: Params, tr: string, en: string, sources?: string[], trParams?: Params): ExplanationItem {
  return { key, params, text: { tr: render(tr, { ...params, ...(trParams ?? {}) }, "tr"), en: render(en, params, "en") }, sources };
}

const cropTr = (c: CropId) => CROPS[c].name.tr;
const cropEn = (c: CropId) => CROPS[c].name.en;
const planTr = (p: readonly CropId[]) => p.map(cropTr).join(" → ");
const planEn = (p: readonly CropId[]) => p.map(cropEn).join(" → ");

const PRIORITY_NAME: Record<keyof PriorityWeights, { tr: string; en: string }> = {
  water: { tr: "su tasarrufu", en: "water saving" },
  income: { tr: "gelir", en: "income" },
  soil: { tr: "toprak sağlığı", en: "soil health" },
  risk: { tr: "düşük risk", en: "low risk" },
};

export interface ExplainContext {
  climate: ClimateSummary;
  soil: SoilHydraulics;
  zone: ClimateZone;
  windows: { count: number; first: number | null; last: number | null; excluded: number };
  gwetAssumedWindows: number;
  priorities: PriorityWeights;
  budgetMm: number;
  sourcesClimate: string[];
}

export function explainPlan(plan: PlanResult, current: PlanResult, ctx: ExplainContext): Explanation {
  const why: ExplanationItem[] = [];
  const evidence: ExplanationItem[] = [];
  const benefits: ExplanationItem[] = [];
  const gaps: ExplanationItem[] = [];
  const localReview: ExplanationItem[] = [];
  const isCurrent = plan.kind === "current";
  const crops = plan.crops;
  const nasa = ctx.sourcesClimate.length ? ctx.sourcesClimate : ["NASA POWER"];

  // ── WHY ───────────────────────────────────────────────────────────────────
  if (isCurrent) {
    why.push(item("why.current", { plan: planEn(crops) },
      "Mevcut ekim nöbetin ({plan}); diğer planlar bununla karşılaştırılır.",
      "Your current rotation ({plan}); every other plan is compared with it.", undefined, { plan: planTr(crops) }));
  } else if (plan.kind === "user") {
    why.push(item("why.user", { plan: planEn(crops) },
      "Senin kurduğun plan ({plan}); öneri değil, karşılaştırma için hesaplandı.",
      "A plan you built ({plan}); evaluated for comparison, not recommended by the tool.", undefined, { plan: planTr(crops) }));
  } else {
    why.push(item("why.rank", { rank: plan.rank ?? 0, score: plan.score.composite, current: current.score.composite },
      "Önceliklerine göre {rank}. sırada: bileşik puan {score}/100 (mevcut ekim nöbeti {current}/100).",
      "Ranked #{rank} for your priorities: composite score {score}/100 (current rotation {current}/100)."));
    const top = (Object.keys(ctx.priorities) as (keyof PriorityWeights)[]).sort((a, b) => ctx.priorities[b] - ctx.priorities[a])[0];
    why.push(item("why.priority", { weight: Math.round(ctx.priorities[top] * 100), value: plan.score.components[top] * 100, priority: PRIORITY_NAME[top].en },
      "En yüksek ağırlıklı önceliğin {priority} (%{weight}); bu plan o eksende {value}/100 alıyor.",
      "Your highest-weighted priority is {priority} ({weight} %); this plan scores {value}/100 on it.", undefined, { priority: PRIORITY_NAME[top].tr }));
  }
  const pr = plan.water.requirementMmPerYr, cr = current.water.requirementMmPerYr;
  if (!isCurrent && pr && cr && Math.abs(pr.p50 - cr.p50) >= 10) {
    const less = pr.p50 < cr.p50;
    why.push(item(less ? "why.lessWater" : "why.moreWater", { diff: Math.abs(pr.p50 - cr.p50), plan: pr.p50, current: cr.p50 },
      less ? "Yağış dışı su ihtiyacı mevcut ekim nöbetinden yılda {diff} mm daha az (P50 {plan} / {current} mm)."
        : "Yağış dışı su ihtiyacı mevcut ekim nöbetinden yılda {diff} mm daha fazla (P50 {plan} / {current} mm).",
      less ? "Needs {diff} mm/yr less water beyond rain than the current rotation (P50 {plan} vs {current} mm)."
        : "Needs {diff} mm/yr more water beyond rain than the current rotation (P50 {plan} vs {current} mm).",
      ["FAO-56", ...nasa]));
  }
  const pm = plan.economics.grossMarginTLPerDaPerYr, cm = current.economics.grossMarginTLPerDaPerYr;
  if (!isCurrent && pm && cm && Math.abs(pm.p50 - cm.p50) >= 100) {
    const up = pm.p50 > cm.p50;
    why.push(item(up ? "why.higherMargin" : "why.lowerMargin", { diff: Math.abs(pm.p50 - cm.p50), plan: pm.p50, current: cm.p50 },
      up ? "Senaryo kazancı (brüt) dekar başına yılda {diff} TL daha yüksek (P50 {plan} / {current} TL/da)."
        : "Senaryo kazancı (brüt) dekar başına yılda {diff} TL daha düşük (P50 {plan} / {current} TL/da).",
      up ? "Scenario gross margin is {diff} TL/da/yr higher (P50 {plan} vs {current} TL/da)."
        : "Scenario gross margin is {diff} TL/da/yr lower (P50 {plan} vs {current} TL/da).",
      ["Scenario assumptions (editable)"]));
  }
  if (!isCurrent && Math.abs(plan.soilHealth.score - current.soilHealth.score) >= 5) {
    const up = plan.soilHealth.score > current.soilHealth.score;
    why.push(item(up ? "why.betterSoil" : "why.worseSoil", { plan: plan.soilHealth.score, current: current.soilHealth.score },
      up ? "Toprak sağlığı göstergesi daha yüksek: {plan}/100 (mevcut {current})." : "Toprak sağlığı göstergesi daha düşük: {plan}/100 (mevcut {current}).",
      up ? "Higher soil-health indicator: {plan}/100 (current {current})." : "Lower soil-health indicator: {plan}/100 (current {current})."));
  }
  if (!isCurrent && Math.abs(plan.risk.score - current.risk.score) >= 0.05) {
    const lower = plan.risk.score < current.risk.score;
    why.push(item(lower ? "why.lowerRisk" : "why.higherRisk", { plan: plan.risk.score * 100, current: current.risk.score * 100 },
      lower ? "Risk puanı daha düşük: {plan}/100 (mevcut {current})." : "Risk puanı daha yüksek: {plan}/100 (mevcut {current}).",
      lower ? "Lower risk score: {plan}/100 (current {current})." : "Higher risk score: {plan}/100 (current {current})."));
  }

  // ── EVIDENCE ──────────────────────────────────────────────────────────────
  const c = ctx.climate;
  if (c.meanAnnualPrecipMm !== null && c.meanAnnualEt0Mm !== null) {
    evidence.push(item("evidence.climate", { start: c.period.start, end: c.period.end, precip: c.meanAnnualPrecipMm, et0: c.meanAnnualEt0Mm, years: c.completeYears.length },
      "Günlük iklim {start} – {end} ({years} tam yıl): ortalama yağış {precip} mm/yıl, FAO-56 Penman–Monteith ET₀ {et0} mm/yıl.",
      "Daily climate {start} – {end} ({years} complete years): mean precipitation {precip} mm/yr, FAO-56 Penman–Monteith ET₀ {et0} mm/yr.",
      [...nasa, "FAO-56"]));
  }
  evidence.push(item("evidence.windows", { n: ctx.windows.count, first: String(ctx.windows.first ?? "–"), last: String(ctx.windows.last ?? "–") },
    "Plan, kayıttaki {n} ardışık üç yıllık pencerenin her birinde gün gün yeniden oynatıldı (ilk tarım yılı {first}, son {last}); aralık gerçek yılların yayılımıdır.",
    "The plan was replayed day by day over each of {n} consecutive 3-year windows in the record (first agricultural year {first}, last {last}); ranges are the spread of real years.",
    nasa));
  if (pr) {
    evidence.push(item("evidence.requirement", { p10: pr.p10, p50: pr.p50, p90: pr.p90 },
      "Su açığı (yağışsız sulama ihtiyacı) P10–P50–P90: {p10} – {p50} – {p90} mm/yıl.",
      "Water deficit (irrigation need beyond rain) P10–P50–P90: {p10} – {p50} – {p90} mm/yr.", ["FAO-56 Ch. 8 water balance", ...nasa]));
  }
  evidence.push(item("evidence.soil", { texture: ctx.soil.textureClassComputed, taw: ctx.soil.tawMmPerM, fc: ctx.soil.thetaFC, wp: ctx.soil.thetaWP, cn: ctx.soil.curveNumbers.row },
    "Toprak {texture}: tarla kapasitesi {fc}, solma noktası {wp} m³/m³ → kullanılabilir su {taw} mm/m (Saxton & Rawls 2006); SCS eğri numarası (sıra ürün) {cn}.",
    "Soil {texture}: field capacity {fc}, wilting point {wp} m³/m³ → available water {taw} mm/m (Saxton & Rawls 2006); SCS curve number (row crop) {cn}.",
    ["Saxton & Rawls 2006", "USDA-NRCS TR-55", ...ctx.soil.evidence.flatMap((e) => e.sources).filter((s) => !s.startsWith("Saxton") && !s.startsWith("USDA"))]));
  for (const y of plan.years) {
    const def = CROPS[y.cropId];
    if (!def.agronomy || !y.yieldRatio) continue;
    const a = def.agronomy;
    evidence.push(item("evidence.crop", {
      year: y.year, crop: cropEn(y.cropId), kcIni: a.kc.value.ini, kcMid: a.kc.value.mid, kcEnd: a.kc.value.end, ky: a.ky.value,
      ratio: y.yieldRatio.p50 * 100, ratioP10: y.yieldRatio.p10 * 100, kyConf: a.ky.confidence, kcConf: a.kc.confidence,
    },
      "{year}. yıl {crop}: Kc {kcIni}/{kcMid}/{kcEnd} ({kcConf}), Ky {ky} ({kyConf}); su stresine bağlı verim oranı P50 %{ratio}, P10 %{ratioP10}.",
      "Year {year} {crop}: Kc {kcIni}/{kcMid}/{kcEnd} ({kcConf}), Ky {ky} ({kyConf}); water-limited yield ratio P50 {ratio} %, P10 {ratioP10} %.",
      [a.kc.source, a.ky.source], { crop: cropTr(y.cropId), kcConf: a.kc.confidence === "literature" ? "literatür" : "varsayım", kyConf: a.ky.confidence === "literature" ? "literatür" : "varsayım" }));
  }
  if (crops.includes("fallow")) {
    const after = plan.years.find((y, i) => i > 0 && crops[i - 1] === "fallow" && y.soilWaterAtSowingMm);
    if (after?.soilWaterAtSowingMm) {
      evidence.push(item("evidence.carryover", { crop: cropEn(after.cropId), year: after.year, aw: after.soilWaterAtSowingMm.p50 },
        "Nadas sonrası {year}. yıl {crop} ekiminde 1,5 m profildeki kullanılabilir su P50 {aw} mm.",
        "At sowing of {crop} in year {year}, after fallow, plant-available water in the 1.5 m profile is P50 {aw} mm.",
        ["FAO-56 Ch. 8 water balance"], { crop: cropTr(after.cropId) }));
    }
  }
  for (const t of c.trends.filter((x) => x.significant)) {
    const nameTr: Record<string, string> = { precip: "yıllık yağış", et0: "yıllık ET₀", hot_days: "sıcak gün sayısı", frost_days: "don günü sayısı", gwet_root: "kök bölgesi nemi" };
    const nameEn: Record<string, string> = { precip: "annual precipitation", et0: "annual ET₀", hot_days: "hot days", frost_days: "frost days", gwet_root: "root-zone wetness" };
    evidence.push(item("evidence.trend", { variable: nameEn[t.variable], slope: t.senSlope, unit: t.unit, p: t.p },
      "Anlamlı eğilim: {variable} Sen eğimi {slope} {unit}/yıl (Mann–Kendall p = {p}).",
      "Significant trend: {variable} Sen slope {slope} {unit} per year (Mann–Kendall p = {p}).",
      [...nasa, "Mann–Kendall / Sen"], { variable: nameTr[t.variable] }));
  }

  // ── BENEFITS ──────────────────────────────────────────────────────────────
  const sh = plan.soilHealth;
  if (sh.legumeYears > 0) {
    const legumes = [...new Set(crops.filter((x) => CROPS[x].family === "fabaceae"))];
    benefits.push(item("benefit.legume", { crops: legumes.map(cropEn).join(", "), low: sh.nContributionKgHa.low, high: sh.nContributionKgHa.high },
      "{crops} döngü başına tahmini {low}–{high} kg N/ha azot bırakır (literatür aralığı, varsayım); sonraki ürünün gübresi azaltılabilir.",
      "{crops} leave an estimated {low}–{high} kg N/ha per cycle (literature range, assumption); fertiliser for the next crop can be reduced.",
      ["Crop table (assumption)"], { crops: legumes.map(cropTr).join(", ") }));
  }
  if (!isCurrent && sh.sameFamilyPairs < current.soilHealth.sameFamilyPairs) {
    benefits.push(item("benefit.familyBreak", { plan: sh.sameFamilyPairs, current: current.soilHealth.sameFamilyPairs },
      "Aynı ürün ailesinin üst üste gelmesi azalıyor ({current} → {plan} çift): hastalık ve zararlı döngüsü kırılır.",
      "Fewer same-family successions ({current} → {plan} pairs): breaks pest and disease cycles."));
  }
  if (!isCurrent && sh.bareDaysPerYear < current.soilHealth.bareDaysPerYear - 15) {
    benefits.push(item("benefit.lessBare", { plan: sh.bareDaysPerYear, current: current.soilHealth.bareDaysPerYear },
      "Çıplak toprak süresi kısalıyor: yılda {plan} gün (mevcut {current}); erozyon riski azalır.",
      "Shorter bare-soil periods: {plan} days/yr (current {current}); lower erosion risk."));
  }
  const pu = plan.water.unmetDeficitMmPerYr, cu = current.water.unmetDeficitMmPerYr;
  if (!isCurrent && pu && cu && pu.p50 < cu.p50 - 10) {
    benefits.push(item("benefit.lessUnmet", { plan: pu.p50, current: cu.p50 },
      "Bütçeyle karşılanamayan su açığı azalıyor: P50 {plan} mm/yıl (mevcut {current}).",
      "Less water deficit left unmet by the budget: P50 {plan} mm/yr (current {current})."));
  }
  if (!isCurrent && plan.water.budgetExceededShare !== null && current.water.budgetExceededShare !== null &&
      plan.water.budgetExceededShare < current.water.budgetExceededShare - 0.1) {
    benefits.push(item("benefit.budget", { plan: plan.water.budgetExceededShare * 100, current: current.water.budgetExceededShare * 100 },
      "Bütçeyi aşan pencere oranı %{current} → %{plan}.",
      "Share of windows exceeding the water budget {current} % → {plan} %."));
  }
  if (crops.includes("fallow")) {
    benefits.push(item("benefit.fallowStorage", {},
      "Nadas yılı kış yağışını profilde biriktirir; sonraki ürün daha nemli toprakta başlar (yukarıdaki kanıta bak).",
      "The fallow year stores winter rain in the profile; the next crop starts in wetter soil (see evidence)."));
  }
  if (!isCurrent && pm && cm && pm.p50 > cm.p50 + 100) {
    benefits.push(item("benefit.margin", { diff: pm.p50 - cm.p50 },
      "Senaryo varsayımlarıyla dekar başına yılda yaklaşık {diff} TL ek kazanç (brüt) (fiyatları düzenleyebilirsin).",
      "About {diff} TL/da/yr extra gross margin under the scenario assumptions (prices are editable)."));
  }

  // ── GAPS ──────────────────────────────────────────────────────────────────
  gaps.push(item("gap.economics", {},
    "Fiyat, maliyet ve referans verimler varsayımdır (2025/26 mertebesi); marj bir senaryodur, kesin kâr değildir.",
    "Prices, costs and reference yields are assumptions (2025/26 order of magnitude); margins are a scenario, not a profit forecast."));
  gaps.push(item("gap.calendar", { zone: ZONE_LABEL[ctx.zone].en },
    "Ekim tarihleri ve evre uzunlukları bölge tipi için varsayımdır: {zone}.",
    "Sowing dates and stage lengths are assumptions for the zone type: {zone}.", undefined, { zone: ZONE_LABEL[ctx.zone].tr }));
  const asmParams = [...new Set(crops)].flatMap((id) => {
    const a = CROPS[id].agronomy;
    if (!a) return [];
    const names: string[] = [];
    if (a.ky.confidence === "assumption") names.push("Ky");
    if (a.kc.confidence === "assumption") names.push("Kc");
    if (a.rootDepthMaxM.confidence === "assumption") names.push("Zr");
    if (a.p.confidence === "assumption") names.push("p");
    return names.length ? [`${cropEn(id)}: ${names.join(", ")}`] : [];
  });
  if (asmParams.length) {
    gaps.push(item("gap.cropParams", { list: asmParams.join("; ") },
      "Literatür tablosunda bulunmayan, varsayım olarak işaretli ürün parametreleri: {list}.",
      "Crop parameters not found in the literature tables and marked as assumptions: {list}."));
  }
  const q = c.quality;
  const interp = Object.values(q.interpolatedDays).reduce((a, b) => a + b, 0);
  if (interp > 0) gaps.push(item("gap.interpolated", { n: interp },
    "{n} değişken-gün ≤3 günlük boşluk doğrusal enterpolasyonla dolduruldu.",
    "{n} variable-days in gaps of ≤ 3 days were filled by linear interpolation."));
  if (q.et0HargreavesDays > 0) gaps.push(item("gap.hargreaves", { n: q.et0HargreavesDays },
    "{n} günde radyasyon/nem/rüzgâr eksikti; ET₀ Hargreaves (FAO-56 Eq. 52) ile hesaplandı.",
    "On {n} days radiation/humidity/wind were missing; ET₀ used Hargreaves (FAO-56 Eq. 52).", ["FAO-56"]));
  if (ctx.windows.excluded > 0) gaps.push(item("gap.excludedYears", { n: ctx.windows.excluded },
    "{n} tarım yılı uzun veri boşluğu nedeniyle yeniden oynatmadan çıkarıldı (veri uydurulmadı).",
    "{n} agricultural years were excluded from the replay because of long data gaps (no data was invented)."));
  if (ctx.windows.count === 0) gaps.push(item("gap.noWindows", {},
    "Tam veriye sahip üç yıllık pencere yok: su ve verim dağılımı hesaplanamadı (veri yok).",
    "No 3-year window has complete data: water and yield distributions could not be computed (no data)."));
  if (ctx.gwetAssumedWindows > 0) gaps.push(item("gap.initialMoisture", { n: ctx.gwetAssumedWindows },
    "{n} pencerede başlangıç toprak nemi (GWETROOT) yoktu; %50 dolu kabul edildi (yalnız döngü ısınma tohumu olarak kullanılır).",
    "In {n} windows the starting soil moisture (GWETROOT) was missing; 50 % of available water was assumed (used only as the cycle spin-up seed)."));
  if (ctx.soil.organicMatterAssumed) gaps.push(item("gap.organicMatter", { om: ctx.soil.organicMatterPct },
    "Organik karbon verisi yok; organik madde %{om} varsayıldı.",
    "No organic carbon data; organic matter assumed at {om} %."));
  const lowYield = plan.years.filter((y) => y.yieldRatio && y.yieldRatio.p50 < 0.5);
  if (lowYield.length) gaps.push(item("gap.kyRange", { crops: lowYield.map((y) => cropEn(y.cropId)).join(", ") },
    "{crops}: su stresi şiddetli (verim oranı < %50); FAO-33 doğrusal Ky modeli bu aralıkta belirsizdir.",
    "{crops}: severe water stress (yield ratio < 50 %); the linear FAO-33 Ky model is uncertain in this range.",
    ["FAO-33"], { crops: lowYield.map((y) => cropTr(y.cropId)).join(", ") }));

  // ── LOCAL REVIEW ──────────────────────────────────────────────────────────
  for (const v of plan.violations) {
    localReview.push({ key: `review.violation.${v.code}`, params: { crop: v.cropId, year: v.year }, text: v.text });
  }
  for (const s of plan.calendar) {
    if (!s.sow) continue;
    localReview.push(item("review.sowing", { crop: cropEn(s.cropId), year: s.year, sow: s.sow, harvest: s.harvest ?? "–" },
      "{year}. yıl {crop}: ekim {sow}, hasat {harvest} varsayıldı; yerel çeşit ve İl Tarım takvimiyle doğrula.",
      "Year {year} {crop}: sowing {sow}, harvest {harvest} assumed; confirm with local varieties and the provincial extension calendar.",
      undefined, { crop: cropTr(s.cropId) }));
  }
  for (const s of legumeSuccessions(crops)) {
    const next = s.year === 3 ? 1 : s.year + 1;
    localReview.push(item("review.legumeSuccession", { from: cropEn(s.from), to: cropEn(s.to), year: s.year, next },
      "{year}. yıl {from} → {next}. yıl {to}: iki baklagil üst üste. Ortak toprak kaynaklı hastalık (Fusarium, Rhizoctonia, Sclerotinia) ve nematod riski artar; arada bir tahıl önerilir, yerel uzmanla değerlendir.",
      "Year {year} {from} → year {next} {to}: two legumes in a row. Shared soil-borne disease (Fusarium, Rhizoctonia, Sclerotinia) and nematode risk increases; a cereal break is advised, review with a local expert.",
      undefined, { from: cropTr(s.from), to: cropTr(s.to) }));
  }
  const set = new Set(crops);
  const rv =(key: string, tr: string, en: string) => localReview.push(item(key, {}, tr, en));
  if (set.has("sugar_beet")) rv("review.sugarBeet", "Şeker pancarı: fabrika kotası/sözleşmesi, nematod ve rizomani durumu kontrol edilmeli.", "Sugar beet: check factory quota/contract, beet cyst nematode and rhizomania status.");
  if (set.has("sunflower")) rv("review.sunflower", "Ayçiçeği: orobanş (canavar otu) riski ve dayanıklı çeşit seçimi yerel uzmanla konuşulmalı.", "Sunflower: discuss broomrape (Orobanche) risk and resistant hybrids with a local expert.");
  if (set.has("chickpea")) rv("review.chickpea", "Nohut: yağışlı ilkbaharlarda antraknoz (Ascochyta) riski; dayanıklı çeşit ve ekim zamanı.", "Chickpea: Ascochyta blight risk in wet springs; resistant variety and sowing date.");
  if (set.has("lentil_red")) rv("review.lentil", "Kırmızı mercimek: yabancı ot kontrolü ve hasat kayıpları için makine uygunluğu.", "Red lentil: weed control and harvester suitability to limit harvest losses.");
  if (set.has("cotton")) rv("review.cotton", "Pamuk: pazar, çırçır mesafesi ve zararlı (beyazsinek, pembe kurt) programı.", "Cotton: market, gin distance and pest programme (whitefly, pink bollworm).");
  if (set.has("alfalfa")) rv("review.alfalfa", "Yonca tek yıllık dilim olarak modellendi; gerçekte çok yıllıktır, tesis maliyeti yıllara yayılır.", "Alfalfa is modelled as a one-year slice; real stands are multi-year and establishment cost is spread over years.");
  if (set.has("fallow")) rv("review.fallow", "Nadas: yabancı ot kontrolü ve eğimli arazide erozyon; bunun yerine fiğ gibi örtü bitkisi düşünülebilir.", "Fallow: weed control and erosion on slopes; a cover crop such as vetch may be an alternative.");
  if (set.has("maize_grain") || set.has("sugar_beet") || set.has("cotton") || set.has("dry_bean")) {
    rv("review.waterRight", "Sulama hakkı ve tahsis (DSİ / sulama birliği) ile kuyu izni bütçeyle uyumlu mu, doğrula.", "Confirm the water right and allotment (DSİ / irrigation association) and well permit match the budget.");
  }
  plan.water.budgetExceededShareByYear.forEach((s, i) => {
    if (s !== null && s >= 0.2) localReview.push(item("review.budgetYear", { year: i + 1, share: s * 100, crop: cropEn(crops[i]) },
      "{year}. yıl ({crop}) pencerelerin %{share}'inde su bütçesi yetmedi.",
      "In year {year} ({crop}) the water budget ran out in {share} % of windows.", undefined, { crop: cropTr(crops[i]) }));
  });
  for (const y of plan.years) {
    if ((y.frostDaysMean ?? 0) + (y.winterKillDaysMean ?? 0) >= 1) localReview.push(item("review.frost", { crop: cropEn(y.cropId), year: y.year, days: (y.frostDaysMean ?? 0) + (y.winterKillDaysMean ?? 0) },
      "{year}. yıl {crop}: kritik evrede ortalama {days} don günü; çeşit ve ekim tarihi yerel uzmanla gözden geçirilmeli.",
      "Year {year} {crop}: on average {days} frost days in the critical stage; review variety and sowing date locally.", undefined, { crop: cropTr(y.cropId) }));
    if ((y.heatDaysMean ?? 0) >= 5) localReview.push(item("review.heat", { crop: cropEn(y.cropId), year: y.year, days: y.heatDaysMean ?? 0 },
      "{year}. yıl {crop}: çiçeklenme/dane dolumunda ortalama {days} sıcak stres günü.",
      "Year {year} {crop}: on average {days} heat-stress days at flowering/grain fill.", undefined, { crop: cropTr(y.cropId) }));
  }
  if (ctx.budgetMm > 0) rv("review.efficiency", "Sulama randımanı (yöntem) varsayımını tarlandaki gerçek kayıplarla karşılaştır.", "Compare the assumed irrigation efficiency (method) with real field losses.");

  return { why, evidence, benefits, gaps, localReview };
}

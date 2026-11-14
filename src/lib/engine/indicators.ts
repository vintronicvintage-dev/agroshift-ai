/**
 * Plan indicators (engine v2). Rule-based and labelled "indicator" — not measurements.
 *  - Nitrogen balance: legume fixation − N removed with harvested products (fertiliser not counted).
 *  - Soil cover days per month from the repeating crop calendar.
 *  - Erosion: RUSLE-style A = R·K·LS·C·P (Renard et al. 1997, USDA Agriculture Handbook 703 structure)
 *    with R from the modified Fournier index (Renard & Freimund 1994, J. Hydrol. 157:287–306),
 *    K from Williams (1995), LS from the RUSLE slope-steepness (McCool et al. 1987) and length
 *    (Wischmeier & Smith exponent) terms, C from crop stage / residue / fallow (assumption).
 *  - Advisory warnings: soil pH ranges, break lengths, previous-crop disease codes, rainfed
 *    "irrigated-only" crops, high erosion.
 */
import type {
  CropId, ErosionIndicator, LocalizedText, NitrogenBalance, PlanWarning, RotationSequence, SoilCoverIndicator,
  SoilHydraulics, SoilProfile, YearResult,
} from "../types";
import { CROPS, asm } from "../crops/database";
import { CYCLE_DAYS, type SequenceSchedule } from "../crops/calendar";
import { preCropEffect, previousCrops, BREAK_YEARS_ADVISED } from "../crops/preCrop";
import type { PreparedClimate } from "./climate";
import { epochDayOf, ymdOfEpochDay } from "./dates";
import { capSoc, erodibilityK } from "./soil";

const REF_START = epochDayOf(2001, 10, 1);

// ── Soil cover ───────────────────────────────────────────────────────────────

type DayClass = { kind: "crop"; cropId: CropId; stage: number } | { kind: "bare"; sinceHarvest: number; prevCrop: CropId | null };

/** Day-by-day class of the reference 3-year cycle (wrapping late harvests into year 1). */
function cycleDays(schedule: SequenceSchedule): DayClass[] {
  const out: DayClass[] = new Array(CYCLE_DAYS);
  for (let t = 0; t < CYCLE_DAYS; t++) out[t] = { kind: "bare", sinceHarvest: 1e9, prevCrop: null };
  const slots = schedule.slots.filter((s) => s !== null);
  for (const s of slots) {
    const L = s.stages;
    const len = L[0] + L[1] + L[2] + L[3];
    for (let i = 0; i < len; i++) {
      const t = (s.sowOffset + i) % CYCLE_DAYS;
      const stage = i < L[0] ? 0 : i < L[0] + L[1] ? 1 : i < L[0] + L[1] + L[2] ? 2 : 3;
      out[t] = { kind: "crop", cropId: s.cropId, stage };
    }
  }
  // days since the last harvest (two passes for the wrap)
  let since = 1e9, prev: CropId | null = null;
  for (let pass = 0; pass < 2; pass++) {
    for (let t = 0; t < CYCLE_DAYS; t++) {
      const d = out[t];
      if (d.kind === "crop") { since = 0; prev = d.cropId; continue; }
      since++;
      if (pass === 1 || since < d.sinceHarvest) out[t] = { kind: "bare", sinceHarvest: since, prevCrop: prev };
    }
  }
  return out;
}

export function soilCover(schedule: SequenceSchedule): SoilCoverIndicator {
  const days = cycleDays(schedule);
  const cov = new Array(12).fill(0), est = new Array(12).fill(0), bare = new Array(12).fill(0);
  days.forEach((d, t) => {
    const m = ymdOfEpochDay(REF_START + t).m - 1;
    if (d.kind === "crop") (d.stage === 0 ? est : cov)[m]++;
    else bare[m]++;
  });
  const f = (a: number[]) => a.map((x) => Math.round((x / 3) * 10) / 10);
  return { coveredDaysByMonth: f(cov), establishingDaysByMonth: f(est), bareDaysByMonth: f(bare) };
}

// ── Erosion ──────────────────────────────────────────────────────────────────

/** Cover-management factors (assumption, after RUSLE subfactor concepts; Renard et al. 1997). */
export const C_FACTORS = asm({
  establishing: 0.6, development: 0.3, mid: 0.08, late: 0.15,
  residue: { high: 0.25, medium: 0.4, low: 0.65 } as Record<"low" | "medium" | "high", number>,
  residueDays: 120, tilledBare: 0.9,
}, "Assumption: daily C by crop stage, post-harvest residue class (first 120 days) and tilled bare soil (0.9); structure after RUSLE (Renard et al. 1997, USDA AH-703)");
/** Slope length for LS, m (assumption: typical field slope length). */
export const SLOPE_LENGTH_M = asm(50, "Assumption: 50 m slope length (field scale)");

/** Rainfall erosivity R (MJ·mm·ha⁻¹·h⁻¹·yr⁻¹), modified Fournier index per complete year (Renard & Freimund 1994). */
export function erosivityR(clim: PreparedClimate): { r: number | null; monthShare: number[] } {
  const years = new Map<number, { m: number[]; n: number; ok: boolean }>();
  for (let i = 0; i < clim.n; i++) {
    const am = clim.absMonth[i];
    const y = Math.floor(am / 12), m = am % 12;
    let e = years.get(y);
    if (!e) { e = { m: new Array(12).fill(0), n: 0, ok: true }; years.set(y, e); }
    const p = clim.precip[i];
    if (!Number.isFinite(p)) e.ok = false; else e.m[m] += p;
    e.n++;
  }
  const rs: number[] = [];
  const sq = new Array(12).fill(0);
  for (const [y, e] of years) {
    const days = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
    if (!e.ok || e.n !== days) continue;
    const P = e.m.reduce((a, b) => a + b, 0);
    if (P <= 0) continue;
    const F = e.m.reduce((a, b) => a + b * b, 0) / P;
    rs.push(F < 55 ? 0.07397 * Math.pow(F, 1.847) : 95.77 - 6.081 * F + 0.477 * F * F);
    e.m.forEach((v, k) => { sq[k] += v * v; });
  }
  const tot = sq.reduce((a, b) => a + b, 0);
  return { r: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null, monthShare: tot > 0 ? sq.map((x) => x / tot) : new Array(12).fill(1 / 12) };
}

/** RUSLE LS (McCool et al. 1987 steepness; slope-class length exponent). */
export function lsFactor(slopePct: number, lengthM = SLOPE_LENGTH_M.value): number {
  const s = Math.max(0, slopePct);
  const th = Math.atan(s / 100);
  const m = s >= 5 ? 0.5 : s >= 3.5 ? 0.4 : s >= 1 ? 0.3 : 0.2;
  const L = Math.pow(lengthM / 22.13, m);
  const S = s < 9 ? 10.8 * Math.sin(th) + 0.03 : 16.8 * Math.sin(th) - 0.5;
  return L * S;
}

export function erosionIndicator(
  schedule: SequenceSchedule, clim: PreparedClimate, soil: SoilProfile, slope: { pct: number | null; source: "terrain" | "field" | "none" },
  erosivity = erosivityR(clim),
): ErosionIndicator {
  const days = cycleDays(schedule);
  const cf = C_FACTORS.value;
  const cMonth = new Array(12).fill(0), nMonth = new Array(12).fill(0);
  days.forEach((d, t) => {
    const m = ymdOfEpochDay(REF_START + t).m - 1;
    let c: number;
    if (d.kind === "crop") c = [cf.establishing, cf.development, cf.mid, cf.late][d.stage];
    else if (d.prevCrop && d.sinceHarvest <= cf.residueDays) c = cf.residue[CROPS[d.prevCrop].residue.value];
    else c = cf.tilledBare;
    cMonth[m] += c; nMonth[m]++;
  });
  const cFactor = cMonth.reduce((s, c, m) => s + (nMonth[m] ? c / nMonth[m] : 0) * erosivity.monthShare[m], 0);
  const sc = capSoc(soil.soc);
  const oc = sc !== null ? sc / 10 : 0.58;
  const tot = soil.sand + soil.silt + soil.clay || 1;
  const k = erodibilityK((soil.sand / tot) * 100, (soil.silt / tot) * 100, (soil.clay / tot) * 100, oc);
  const ls = slope.pct === null ? null : lsFactor(slope.pct);
  const a = ls === null || erosivity.r === null ? null : erosivity.r * k * ls * cFactor;
  const cls: ErosionIndicator["class"] = a === null ? null : a < 2 ? "low" : a < 10 ? "moderate" : a < 25 ? "high" : "very_high";
  return {
    label: "indicator", aTHaYr: a, class: cls, rFactor: erosivity.r, kFactor: k, lsFactor: ls, cFactor, pFactor: 1,
    slopePct: slope.pct, slopeSource: slope.source,
    evidence: {
      formula: "A = R·K·LS·C·P (RUSLE structure); R = Renard & Freimund (1994) from modified Fournier index; K = Williams (1995); LS = McCool et al. (1987), λ = 50 m; C = erosivity-weighted daily stage/residue factors (assumption); P = 1",
      inputs: { R: erosivity.r === null ? null : Math.round(erosivity.r), K: Math.round(k * 10000) / 10000, LS: ls === null ? null : Math.round(ls * 100) / 100, C: Math.round(cFactor * 1000) / 1000, slopePct: slope.pct },
      sources: ["Renard et al. 1997 (USDA AH-703)", "Renard & Freimund 1994", "Williams 1995", "McCool et al. 1987"],
    },
  };
}

// ── Nitrogen ─────────────────────────────────────────────────────────────────

export function nitrogenBalance(crops: RotationSequence, years: YearResult[]): NitrogenBalance {
  let fixL = 0, fixH = 0, remL = 0, remH = 0;
  crops.forEach((c, k) => {
    const d = CROPS[c];
    if (d.nFixationKgHa) { fixL += d.nFixationKgHa.value.low; fixH += d.nFixationKgHa.value.high; }
    const y = years[k]?.yieldTHa;
    const coef = d.nRemovalKgPerT?.value ?? 0;
    if (y && coef) { remL += y.p10 * coef; remH += y.p90 * coef; }
  });
  const r = (x: number) => Math.round(x / 3);
  return {
    label: "indicator",
    fixationKgHaYr: { low: r(fixL), high: r(fixH) },
    removalKgHaYr: { low: r(remL), high: r(remH) },
    balanceKgHaYr: { low: r(fixL - remH), high: r(fixH - remL) },
    sources: ["Crop table nFixationKgHa / nRemovalKgPerT (assumption)", "Yield P10–P90 from the window replay"],
  };
}

// ── Warnings ─────────────────────────────────────────────────────────────────

const IRRIGATED_ONLY = new Set<CropId>(["maize_grain", "maize_silage", "sugar_beet", "cotton", "dry_bean"]);

export function planWarnings(
  crops: RotationSequence, soil: SoilHydraulics, budgetMm: number, erosion: ErosionIndicator | null,
): PlanWarning[] {
  const out: PlanWarning[] = [];
  const name = (c: CropId) => CROPS[c].name;
  const ph = soil.phTopsoil ?? null;
  const seen = new Set<CropId>();
  crops.forEach((c, i) => {
    const year = i + 1;
    if (seen.has(c)) return;
    seen.add(c);
    const r = CROPS[c].phRange?.value;
    if (r && ph !== null) {
      if (ph < r.min) out.push({ code: "ph_low", cropId: c, year, severity: "warn", text: {
        tr: `${name(c).tr}: toprak pH ${ph.toFixed(1)}, ürünün rahat aralığı ${r.min}–${r.max}; kireçleme ve çeşit seçimini yerel uzmanla konuş.`,
        en: `${name(c).en}: soil pH ${ph.toFixed(1)} is below the crop's comfortable range ${r.min}–${r.max}; discuss liming and variety locally.` } });
      else if (ph > r.max) out.push({ code: "ph_high", cropId: c, year, severity: "warn", text: {
        tr: `${name(c).tr}: toprak pH ${ph.toFixed(1)}, ürünün rahat aralığı ${r.min}–${r.max}; kireçli toprakta demir/çinko eksikliği (sararma) riski.`,
        en: `${name(c).en}: soil pH ${ph.toFixed(1)} is above the crop's comfortable range ${r.min}–${r.max}; iron/zinc deficiency (chlorosis) risk on calcareous soil.` } });
    }
    const adv = BREAK_YEARS_ADVISED[c];
    if (adv && adv > 3) out.push({ code: "break_short", cropId: c, year, severity: "info", text: {
      tr: `${name(c).tr} bu planda 3 yılda bir geliyor; hastalık ve zararlı için genelde ${adv} yıllık ara önerilir.`,
      en: `${name(c).en} returns every 3 years in this plan; a ${adv}-year break is usually advised against soil-borne pests and diseases.` } });
    if (budgetMm <= 0 && IRRIGATED_ONLY.has(c)) out.push({ code: "rainfed_irrigated_crop", cropId: c, year, severity: "warn", text: {
      tr: `${name(c).tr} bölgede çoğunlukla sulanarak yetiştirilir; kuru tarımda verim çok oynak olur.`,
      en: `${name(c).en} is mostly grown irrigated; under rainfed conditions yields are very unstable.` } });
  });
  const prevs = previousCrops(crops);
  const CODES: Record<string, PlanWarning["code"]> = {
    legume_after_legume: "legume_after_legume", cereal_after_cereal: "cereal_after_cereal", sclerotinia_host: "sclerotinia_host",
    fusarium_maize_residue: "fusarium_maize_residue", verticillium: "verticillium",
  };
  crops.forEach((c, i) => {
    if (c === "fallow") return;
    const e = preCropEffect(prevs[i], c);
    for (const code of e.codes) {
      const w = CODES[code];
      if (!w) continue;
      out.push({ code: w, cropId: c, year: i + 1, severity: "warn", text: {
        tr: `${i + 1}. yıl ${name(c).tr} (önceki: ${name(prevs[i]).tr}): ${e.note.tr}.`,
        en: `Year ${i + 1} ${name(c).en} (after ${name(prevs[i]).en}): ${e.note.en}.` } });
    }
  });
  if (erosion && (erosion.class === "high" || erosion.class === "very_high")) out.push({ code: "erosion_high", cropId: null, year: 0, severity: "warn", text: {
    tr: `Erozyon göstergesi yüksek (yaklaşık ${erosion.aTHaYr!.toFixed(0)} t/ha/yıl): çıplak toprak süresini kısalt, anızı bırak, eğime dik sür.`,
    en: `Erosion indicator is high (about ${erosion.aTHaYr!.toFixed(0)} t/ha/yr): shorten bare periods, keep residue, till across the slope.` } });
  return out;
}

export const SALINITY_NOTE: LocalizedText = {
  tr: "Tuzluluk (EC) verisi yok; tuza duyarlı ürünler (fasulye, mısır) için toprak analizi yaptır.",
  en: "No salinity (EC) data; get a soil test before salt-sensitive crops (bean, maize).",
};

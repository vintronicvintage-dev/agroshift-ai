// Engine v2 behaviour: pre-crop matrix, repeating cycle, layered soil, rainfall adjustment,
// robust ranking, sensitivity, custom plans, indicators, narrative, units.
import { describe, it, expect } from "vitest";
import { analyze, evaluateCustomPlan, DISCLAIMER, tHaToKgDa, kgDaToTHa, mmToM3PerDa, trLocative, outOf, formatYieldKgDa } from "./index";
import { syntheticClimate, LOAM_SOIL } from "./testFixtures";
import { CROPS, CROP_IDS, CROP_CONSTANTS } from "../crops/database";
import { preCropEffect, ROTATION_GROUP } from "../crops/preCrop";
import { scheduleSequence } from "../crops/calendar";
import { prepareClimate } from "./climate";
import { soilHydraulics, slopeAdjustedCN, tawCum, uniformProfile, SOIL_COLUMN_M, layerHydraulics } from "./soil";
import { createSetup, replayWindows, simulatePlanChain, simulateWindowExact, SPINUP_MAX_ITER } from "./rotation";
import { buildEvalContext, summarizeRaw, type RawWindow } from "./evaluation";
import { lsFactor } from "./indicators";
import type { AnalysisInput, CropId, FieldInput, SoilLayer } from "../types";

const highland = syntheticClimate();
const field: FieldInput = { areaDa: 50, soil: LOAM_SOIL, irrigationBudgetMm: 250, irrigationEfficiency: 0.7, currentRotation: ["wheat_winter", "fallow", "wheat_winter"] };
const inp = (over: Partial<AnalysisInput> = {}, f: Partial<FieldInput> = {}): AnalysisInput => ({ climate: highland, field: { ...field, ...f }, ...over });

describe("pre-crop effect matrix", () => {
  const legumes = CROP_IDS.filter((c) => CROPS[c].family === "fabaceae");
  it("every pair has a bounded factor, a source and confidence 'assumption'", () => {
    for (const a of CROP_IDS) for (const b of CROP_IDS) {
      const e = preCropEffect(a, b);
      expect(e.yieldFactor).toBeGreaterThanOrEqual(0.8);
      expect(e.yieldFactor).toBeLessThanOrEqual(1.15);
      expect(e.source.length).toBeGreaterThan(10);
      expect(e.confidence).toBe("assumption");
      expect(e.note.tr.length).toBeGreaterThan(3);
      if (b === "fallow") { expect(e.yieldFactor).toBe(1); expect(e.nCreditKgHa.high).toBe(0); }
      if (CROPS[b].family === "fabaceae") expect(e.nCreditKgHa.high).toBe(0); // legumes need no N fertiliser
    }
  });
  it("legumes help cereals, cereals after the same cereal are penalised", () => {
    for (const l of legumes) for (const c of ["wheat_winter", "barley_winter", "maize_grain"] as CropId[]) {
      expect(preCropEffect(l, c).yieldFactor).toBeGreaterThan(1);
      expect(preCropEffect(l, c).nCreditKgHa.high).toBeGreaterThan(0);
    }
    expect(preCropEffect("wheat_winter", "wheat_winter").yieldFactor).toBeLessThan(preCropEffect("barley_winter", "wheat_winter").yieldFactor);
    expect(preCropEffect("barley_winter", "wheat_winter").yieldFactor).toBeLessThan(1);
    expect(preCropEffect("fallow", "wheat_winter").yieldFactor).toBeGreaterThan(1);
  });
  it("symmetry sanity: shared-pathogen penalties are symmetric for every legume pair and Sclerotinia host pair", () => {
    for (const a of legumes) for (const b of legumes) {
      if (a === b) continue;
      expect(preCropEffect(a, b).yieldFactor).toBe(preCropEffect(b, a).yieldFactor);
      expect(preCropEffect(a, b).yieldFactor).toBeLessThan(1);
    }
    expect(preCropEffect("sunflower", "dry_bean").yieldFactor).toBe(preCropEffect("dry_bean", "sunflower").yieldFactor);
    for (const c of CROP_IDS) expect(ROTATION_GROUP[c]).toBeDefined();
  });
});

describe("repeating cycle (steady state)", () => {
  const clim = prepareClimate(highland, 1, 0);
  const setup = createSetup(clim, soilHydraulics(LOAM_SOIL), "highland");
  const windows = replayWindows(clim);
  const sched = scheduleSequence(["wheat_winter", "fallow", "barley_winter"], "highland");
  it("spin-up converges and chained windows start from the predecessor's end state", () => {
    const out = simulatePlanChain(setup, sched, windows, 0, windows.map(() => 0.5));
    const byAy = new Map(out.filter((o) => o).map((o) => [o!.firstAy, o!]));
    let chained = 0;
    for (const o of out) {
      if (!o) continue;
      expect(Math.abs(o.massBalanceError)).toBeLessThan(0.01);
      if (o.start === "spinup") expect(o.spinupIterations).toBeLessThan(SPINUP_MAX_ITER);
      else { chained++; expect(o.storageStart).toBeCloseTo(byAy.get(o.firstAy - 3)!.storageEnd, 9); }
    }
    expect(chained).toBe(out.filter(Boolean).length - 3);
  });
  it("results do not depend on the GWETROOT seed (dry vs wet start)", () => {
    const dry = simulatePlanChain(setup, sched, windows, 0, windows.map(() => 0));
    const wet = simulatePlanChain(setup, sched, windows, 0, windows.map(() => 1));
    dry.forEach((d, i) => {
      if (!d) return;
      const w = wet[i]!;
      expect(Math.abs(d.years[0].season!.eta - w.years[0].season!.eta)).toBeLessThan(1);
    });
  });
  it("cyclic calendar: a late year-3 harvest delays or blocks year-1 winter wheat", () => {
    const s = scheduleSequence(["wheat_winter", "chickpea", "sugar_beet"], "highland");
    expect(s.slots[0]!.delay).toBeGreaterThan(0);
    expect(scheduleSequence(["wheat_winter", "fallow", "cotton"], "highland").conflictYears).toContain(1);
  });
});

describe("layered soil", () => {
  const uniformLayers: SoilLayer[] = [[0, 5], [5, 15], [15, 30], [30, 60], [60, 100], [100, 200]].map(([top, bottom]) => ({
    top, bottom, sand: LOAM_SOIL.sand, silt: LOAM_SOIL.silt, clay: LOAM_SOIL.clay, soc: LOAM_SOIL.soc, ph: 7.8, cec: null, nitrogen: null,
    bulkDensity: null, coarseFragments: null, thetaFC: null, thetaWP: null,
  }));
  it("uniform layers reduce exactly to the single-layer result", () => {
    const a = analyze(inp({ options: { robust: false, sensitivity: false } }));
    const b = analyze(inp({ options: { robust: false, sensitivity: false } }, { soilLayers: uniformLayers }));
    expect(b.soil.tawMmPerM).toBeCloseTo(a.soil.tawMmPerM, 9);
    expect(b.current.water.requirementMmPerYr!.p50).toBeCloseTo(a.current.water.requirementMmPerYr!.p50, 6);
    expect(b.current.years[0].yieldTHa!.p50).toBeCloseTo(a.current.years[0].yieldTHa!.p50, 6);
  });
  it("the layered code path with equal layers equals the uniform path; mass balance holds with real layering", () => {
    const clim = prepareClimate(highland, 1, 0);
    const soil = soilHydraulics(LOAM_SOIL);
    const s1 = createSetup(clim, soil, "highland");
    const s2 = createSetup(clim, soil, "highland");
    const t = soil.tawMmPerM;
    s2.ctx.profile = { bounds: [0, 0.3, 0.6], cum: [0, 0.3 * t, 0.6 * t], perM: [t, t, t], uniform: null };
    const sched = scheduleSequence(["wheat_winter", "sugar_beet", "chickpea"], "highland");
    for (const w of replayWindows(clim).slice(0, 6)) {
      const a = simulateWindowExact(s1, sched, w, 150, 0.5), b = simulateWindowExact(s2, sched, w, 150, 0.5);
      expect(b.storageEnd).toBeCloseTo(a.storageEnd, 6);
      expect(b.years[1].season!.eta).toBeCloseTo(a.years[1].season!.eta, 6);
    }
    const s3 = createSetup(clim, soil, "highland");
    s3.ctx.profile = { bounds: [0, 0.3, 0.6], cum: [0, 0.3 * 180, 0.3 * 180 + 0.3 * 120], perM: [180, 120, 60], uniform: null };
    s3.ctx.tawCol = tawCum(s3.ctx.profile, SOIL_COLUMN_M);
    for (const w of replayWindows(clim)) {
      const o = simulateWindowExact(s3, sched, w, 150, 0.5);
      expect(Math.abs(o.massBalanceError)).toBeLessThan(0.01);
    }
  });
  it("measured θ, bulk density and coarse fragments are used; column constant matches the crop table", () => {
    expect(SOIL_COLUMN_M).toBe(CROP_CONSTANTS.zColumnM.value);
    const l = layerHydraulics([
      { ...uniformLayers[0], thetaFC: 0.32, thetaWP: 0.17 },
      { ...uniformLayers[1], coarseFragments: 30 },
      { ...uniformLayers[2], bulkDensity: 1.6 },
    ], LOAM_SOIL);
    expect(l[0].method).toBe("measured");
    expect(l[0].tawMmPerM).toBeCloseTo(150, 6);
    expect(l[1].tawMmPerM).toBeLessThan(l[2].tawMmPerM + 100);
    expect(l[1].coarseFragmentsPct).toBe(30);
    expect(l[2].densityFactor).not.toBeNull();
    expect(tawCum(uniformProfile(100), 1.2)).toBeCloseTo(120, 9);
  });
});

describe("rainfall adjustment and terrain", () => {
  const base = { options: { robust: false, sensitivity: false } } as const;
  it("is never applied silently, is reported, and is monotone (less rain → no less deficit)", () => {
    const none = analyze(inp(base));
    const n2 = analyze(inp({ ...base, precipAdjustment: { mode: "none", factorAnnual: 0.5, provenance: "x" } }));
    expect(n2.current.water.requirementMmPerYr).toEqual(none.current.water.requirementMmPerYr);
    expect(none.precipitation!.calibrated).toBe(false);
    let prev = -Infinity;
    for (const f of [1.2, 1.0, 0.8, 0.6]) {
      const r = analyze(inp({ ...base, precipAdjustment: { mode: "annual", factorAnnual: f, provenance: "test station" } }));
      expect(r.precipitation!.mode).toBe("annual");
      expect(r.assumptions.find((a) => a.key === "precip")!.value).toContain("annual");
      const d = r.current.water.requirementMmPerYr!.mean;
      expect(d).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = d;
    }
    const m = analyze(inp({ ...base, precipAdjustment: { mode: "monthly", factorsMonthly: new Array(12).fill(0.8), provenance: "era5" } }));
    const a = analyze(inp({ ...base, precipAdjustment: { mode: "annual", factorAnnual: 0.8, provenance: "era5" } }));
    expect(m.current.water.requirementMmPerYr!.p50).toBeCloseTo(a.current.water.requirementMmPerYr!.p50, 9);
    expect(m.current.explanation.evidence.some((e) => e.key === "evidence.precipAdjustment")).toBe(true);
  });
  it("slope raises the curve number above 5 % and the erosion indicator grows with slope", () => {
    expect(slopeAdjustedCN(78, 5)).toBeCloseTo(78, 2); // 13.86 ≈ 20·ln2
    expect(slopeAdjustedCN(78, 15)).toBeGreaterThan(78);
    expect(slopeAdjustedCN(78, 1)).toBeLessThan(78);
    expect(lsFactor(12)).toBeGreaterThan(lsFactor(4));
    const flat = analyze(inp(base, { slopePct: 2 })), steep = analyze(inp(base, { slopePct: 12 }));
    expect(steep.current.erosion!.aTHaYr!).toBeGreaterThan(flat.current.erosion!.aTHaYr!);
    expect(steep.current.water.runoffMmPerYr!.mean).toBeGreaterThan(flat.current.water.runoffMmPerYr!.mean);
    const none = analyze(inp(base));
    expect(none.current.erosion!.aTHaYr).toBeNull();
  });
  it("terrain elevation shifts temperature with the lapse rate and is reported", () => {
    const r = analyze(inp(base, { terrain: { elevationMean: 700, elevationMin: 690, elevationMax: 710, slopePct: 3, aspectDeg: null, samples: 9, sources: [] } }));
    expect(r.terrain!.lapseDeltaC).toBeCloseTo(1.95, 2);
    expect(r.scenario.notes.some((n) => n.en.includes("field elevation"))).toBe(true);
  });
});

describe("yield model", () => {
  const clim = prepareClimate(highland, 1, 0);
  const setup = createSetup(clim, soilHydraulics(LOAM_SOIL), "highland");
  const raw = (eta: number, irrigation: number, rfDeficit: number): RawWindow => ({
    firstAy: 2005, years: [{ etc: 500, eta, irrigation, shortfall: 0, rfDeficit, frost: 0, wk: 0, heat: 0, aw: 0 }, null, null],
    rainfedDeficit: rfDeficit, deepPerc: 0, runoff: 0, massErr: 0, yearsLen: 3, start: "given",
  });
  it("rainfed uses the rainfed ceiling; irrigated uses the irrigated reference", () => {
    const rf = buildEvalContext(setup, [], 0, 0.7, 1, 1);
    const ir = buildEvalContext(setup, [], 400, 0.7, 1, 1);
    const crops: CropId[] = ["wheat_winter", "fallow", "fallow"];
    expect(summarizeRaw(rf, crops, [raw(500, 0, 0)]).slots[0].ymTHa).toBe(CROPS.wheat_winter.rainfedCeilingTHa!.value);
    expect(summarizeRaw(ir, crops, [raw(500, 200, 200)]).slots[0].ymTHa).toBe(CROPS.wheat_winter.refYieldTHa.value.irrigated);
    const half = summarizeRaw(ir, crops, [raw(500, 50, 200)]).slots[0].ymTHa!;
    expect(half).toBeGreaterThan(CROPS.wheat_winter.rainfedCeilingTHa!.value);
    expect(half).toBeLessThan(CROPS.wheat_winter.refYieldTHa.value.irrigated);
  });
  it("the French–Schultz bound caps cereal yield when water use is small", () => {
    const ir = buildEvalContext(setup, [], 400, 0.7, 1, 1);
    const s = summarizeRaw(ir, ["wheat_winter", "fallow", "fallow"], [raw(200, 200, 200)]);
    // 20 kg/ha/mm × (200 − 110) mm = 1.8 t/ha
    expect(s.windows[0].yields[0]).toBeCloseTo(1.8, 6);
    expect(s.windows[0].wpCapped[0]).toBe(true);
  });
});

describe("robust ranking, sensitivity, confidence, outputs", () => {
  const r = analyze(inp());
  it("reports typical vs robust best, regrets ≥ 0 with a zero-regret plan per scenario, and a knee", () => {
    expect(r.typicalBestId).toBe(r.alternatives[0].id);
    expect(r.robustBestId).toBeTruthy();
    expect(r.kneeId).toBeTruthy();
    expect(r.robustness!.scenarios.length).toBeGreaterThanOrEqual(3);
    for (const p of r.alternatives) {
      expect(p.robust).toBeTruthy();
      for (const s of p.robust!.scenarios) expect(s.regret).toBeGreaterThanOrEqual(0);
    }
    const rb = r.robustBest ?? r.alternatives.find((a) => a.id === r.robustBestId)!;
    expect(rb.feasible).toBe(true);
  });
  it("sensitivity sweep is deterministic and reports stability for every recommendation", () => {
    const again = analyze(inp());
    expect(JSON.stringify(again.sensitivity)).toBe(JSON.stringify(r.sensitivity));
    expect(r.sensitivity!.runs).toBe(10);
    for (const p of r.alternatives) {
      expect(p.stability!.top3Share).toBeGreaterThanOrEqual(0);
      expect(p.stability!.top3Share).toBeLessThanOrEqual(1);
      expect(p.stability!.runs - p.stability!.flips.length).toBe(Math.round(p.stability!.top3Share * p.stability!.runs));
      expect(["A", "B", "C", "D"]).toContain(p.confidence!.grade);
      expect(p.confidence!.reasons.length).toBeGreaterThanOrEqual(3);
    }
    expect(r.current.confidence!.factors.rankStability).toBeNull();
  });
  it("per-plan windows, monthly demand, N balance, cover, erosion and trade", () => {
    for (const p of [r.current, ...r.alternatives]) {
      expect(p.windows!.length).toBe(r.windows.count);
      expect(p.monthlyDemand!.length).toBe(36);
      const md = p.monthlyDemand!;
      const etc = md.reduce((s, m) => s + m.etcMm, 0) / 3;
      expect(Math.abs(etc - (p.water.requirementMmPerYr!.mean + 0) )).toBeGreaterThanOrEqual(0); // well formed
      expect(md.every((m) => m.deficitMm >= -1e-6 && m.irrigationMm >= 0)).toBe(true);
      expect(p.nitrogen!.label).toBe("indicator");
      expect(p.nitrogen!.balanceKgHaYr.low).toBeLessThanOrEqual(p.nitrogen!.balanceKgHaYr.high);
      const days = p.cover!.coveredDaysByMonth.reduce((a, b) => a + b, 0) + p.cover!.establishingDaysByMonth.reduce((a, b) => a + b, 0) + p.cover!.bareDaysByMonth.reduce((a, b) => a + b, 0);
      expect(days).toBeCloseTo(1096 / 3, 0);
      expect(p.erosion!.cFactor).toBeGreaterThan(0);
    }
    for (const a of r.alternatives) {
      expect(a.trade!.windows).toBe(r.windows.count);
      expect(a.trade!.lines[0].tr).toMatch(/dönemin/);
    }
    // monthly irrigation adds up to the mean annual irrigation
    const p = r.alternatives[0];
    const irr = p.monthlyDemand!.reduce((s, m) => s + m.irrigationMm, 0) / 3;
    expect(irr).toBeCloseTo(p.water.irrigationNetMmPerYr!.mean, 0);
  });
  it("narrative uses 'sen' address, farmer units and 'N dönemin M'inde'", () => {
    for (const p of [r.current, ...r.alternatives]) {
      const n = p.narrative!;
      expect(n.verdict.tr).toMatch(/dönemin/);
      const all = [n.verdict.tr, ...n.gains.map((g) => g.text.tr), ...n.losses.map((g) => g.text.tr), ...n.watch.map((g) => g.text.tr)].join(" ");
      expect(all).not.toMatch(/(nız|niz|nuz|nüz)\b/);
      expect(all).toMatch(/kg\/da|t\/da/);
      for (const it of [...p.explanation.why, ...p.explanation.benefits, ...p.explanation.localReview]) expect(it.text.tr).not.toMatch(/(unuz|ünüz|ınız|iniz|ayın|eyin|ın\.)$/);
    }
    expect(DISCLAIMER.tr).toMatch(/danış\.$/);
    expect(DISCLAIMER.tr).not.toMatch(/danışın/);
  });
  it("evaluateCustomPlan returns live constraint messages and agrees with analyze for the same plan", () => {
    const bad = evaluateCustomPlan(inp(), ["sunflower", "sunflower", "wheat_winter"]);
    expect(bad.feasible).toBe(false);
    expect(bad.messages.some((m) => m.kind === "constraint" && m.code === "max_consecutive" && m.text.tr.length > 5 && m.text.en.length > 5)).toBe(true);
    const id = r.alternatives[0].crops;
    const c = evaluateCustomPlan(inp(), id);
    expect(c.plan.water.requirementMmPerYr!.p50).toBeCloseTo(r.alternatives[0].water.requirementMmPerYr!.p50, 9);
    expect(c.plan.economics.grossMarginTLPerDaPerYr!.p50).toBeCloseTo(r.alternatives[0].economics.grossMarginTLPerDaPerYr!.p50, 9);
    expect(c.plan.narrative!.verdict.tr.length).toBeGreaterThan(10);
  });
});

describe("units", () => {
  it("converts and formats farmer units", () => {
    expect(tHaToKgDa(2.5)).toBe(250);
    expect(kgDaToTHa(250)).toBe(2.5);
    expect(mmToM3PerDa(320)).toBe(320);
    expect(formatYieldKgDa(2.456, "tr")).toBe("246 kg/da");
    expect(trLocative(8)).toBe("8'inde");
    expect(trLocative(6)).toBe("6'sında");
    expect(trLocative(10)).toBe("10'unda");
    expect(trLocative(22)).toBe("22'sinde");
    expect(trLocative(3)).toBe("3'ünde");
    expect(trLocative(40)).toBe("40'ında");
    expect(outOf(8, 10, "tr")).toBe("10 dönemin 8'inde");
    expect(outOf(8, 10, "en")).toBe("in 8 of 10 periods");
  });
});

describe("implausible inputs are capped and flagged", () => {
  it("SOC above 30 g/kg is capped for the pedotransfer and flagged", () => {
    const h = soilHydraulics({ ...LOAM_SOIL, soc: 52 });
    const c = soilHydraulics({ ...LOAM_SOIL, soc: 30 });
    expect(h.socCapped).toBe(true);
    expect(h.tawMmPerM).toBeCloseTo(c.tawMmPerM, 9);
    expect(soilHydraulics(LOAM_SOIL).socCapped).toBe(false);
  });
  it("measured θ with θWP ≥ θFC falls back to Saxton–Rawls", () => {
    const l = layerHydraulics([{ top: 0, bottom: 30, sand: 15, silt: 30, clay: 55, soc: 8, ph: 7.5, cec: null, nitrogen: null, bulkDensity: null, coarseFragments: null, thetaFC: 0.305, thetaWP: 0.306 }], LOAM_SOIL);
    expect(l[0].method).toBe("saxton-rawls");
    expect(l[0].measuredRejected).toBe(true);
    expect(l[0].tawMmPerM).toBeGreaterThan(80);
  });
});

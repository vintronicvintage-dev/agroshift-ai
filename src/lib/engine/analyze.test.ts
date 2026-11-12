import { describe, it, expect } from "vitest";
import { analyze, SCENARIO_PRESETS } from "./index";
import { syntheticClimate, LOAM_SOIL } from "./testFixtures";
import { CROPS } from "../crops/database";
import { scheduleSequence } from "../crops/calendar";
import type { AnalysisInput, ClimateSeries, CropId, ExplanationItem, FieldInput, PlanResult } from "../types";

// TEST FIXTURES: synthetic highland climate (Konya-like) and lowland southern climate.
const highland = syntheticClimate();
const southern = syntheticClimate({ lat: 36.9, lon: 35.4, elevation: 30, meanTemp: 19, wetDayMm: 7, seed: 7 });

const baseField: FieldInput = {
  areaDa: 50, soil: LOAM_SOIL, irrigationBudgetMm: 250, irrigationEfficiency: 0.7,
  currentRotation: ["wheat_winter", "fallow", "wheat_winter"],
};
const input = (over: Partial<AnalysisInput> = {}, field: Partial<FieldInput> = {}): AnalysisInput =>
  ({ climate: highland, field: { ...baseField, ...field }, ...over });

const highlandResult = analyze(input());

function allItems(p: PlanResult): ExplanationItem[] {
  const e = p.explanation;
  return [...e.why, ...e.evidence, ...e.benefits, ...e.gaps, ...e.localReview];
}
function maxRun(seq: readonly CropId[], id: CropId) {
  let best = 0, run = 0;
  for (const c of seq) { run = c === id ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}

describe("analyze — structure and determinism", () => {
  it("returns the current rotation plus 3 recommendations", () => {
    const r = highlandResult;
    expect(r.current.kind).toBe("current");
    expect(r.alternatives).toHaveLength(3);
    expect(r.alternatives.map((a) => a.rank)).toEqual([1, 2, 3]);
    expect(r.windows.count).toBeGreaterThanOrEqual(20);
    expect(r.optimizer.enumerated).toBe(12 ** 3);
    expect(r.optimizer.replayedExactly).toBeLessThan(r.optimizer.feasible);
    expect(r.optimizer.method.en).toMatch(/screened/);
    for (const p of [r.current, ...r.alternatives]) {
      expect(p.water.massBalanceMaxErrorMm!).toBeLessThan(0.01);
      expect(p.water.requirementMmPerYr).not.toBeNull();
      expect(p.economics.label).toBe("scenario");
      expect(p.score.composite).toBeGreaterThanOrEqual(0);
      expect(p.score.composite).toBeLessThanOrEqual(100);
      expect(p.soilHealth.score).toBeGreaterThanOrEqual(0);
      expect(p.soilHealth.score).toBeLessThanOrEqual(100);
      const d = p.water.requirementMmPerYr!;
      expect(d.p10).toBeLessThanOrEqual(d.p50);
      expect(d.p50).toBeLessThanOrEqual(d.p90);
    }
  });
  it("is deterministic", () => {
    const a = JSON.stringify(analyze(input()));
    const b = JSON.stringify(analyze(input()));
    expect(a).toBe(b);
  });
  it("explanations have why/evidence/gaps/localReview in both languages with no unfilled templates", () => {
    for (const p of [highlandResult.current, ...highlandResult.alternatives]) {
      expect(p.explanation.why.length).toBeGreaterThan(0);
      expect(p.explanation.evidence.length).toBeGreaterThan(0);
      expect(p.explanation.gaps.length).toBeGreaterThan(0);
      expect(p.explanation.localReview.length).toBeGreaterThan(0);
      for (const it of allItems(p)) {
        expect(it.key).toMatch(/^[a-zA-Z_.]+$/);
        expect(it.text.tr.length).toBeGreaterThan(5);
        expect(it.text.en.length).toBeGreaterThan(5);
        expect(it.text.tr).not.toMatch(/\{\w+\}/);
        expect(it.text.en).not.toMatch(/\{\w+\}/);
      }
    }
    const ev = highlandResult.alternatives[0].explanation.evidence;
    expect(ev.some((e) => e.key === "evidence.climate" && (e.sources ?? []).includes("Synthetic test fixture"))).toBe(true);
  });
  it("every crop parameter carries source and confidence; ≥ 12 crops incl. fallow", () => {
    const ids = Object.keys(CROPS);
    expect(ids.length).toBeGreaterThanOrEqual(12);
    expect(ids).toContain("fallow");
    for (const c of Object.values(CROPS)) {
      const fields: { source: string; confidence: string }[] = [c.nContributionKgHa, c.residue, c.refYieldTHa, c.priceTLPerKg, c.varCostTLPerDa, c.maxConsecutive];
      if (c.agronomy) {
        const a = c.agronomy;
        fields.push(...Object.values(a.calendar), a.kc, a.rootDepthMaxM, a.p, a.ky, a.frost, a.heat, a.gdd, a.cover);
      }
      for (const f of fields) {
        expect(f.source.length).toBeGreaterThan(0);
        expect(["literature", "assumption"]).toContain(f.confidence);
      }
      expect(c.priceTLPerKg.confidence === "assumption" || c.id === "fallow").toBe(true);
    }
  });
});

describe("optimizer — hard constraints (spec §4.6, §7)", () => {
  it("recommendations respect max-consecutive, exclusions, calendar and climate suitability", () => {
    const r = analyze(input({}, { excludedCrops: ["vetch", "chickpea"] }));
    for (const a of r.alternatives) {
      expect(a.feasible).toBe(true);
      expect(a.violations).toHaveLength(0);
      expect(a.crops).not.toContain("vetch");
      expect(a.crops).not.toContain("chickpea");
      for (const c of new Set(a.crops)) expect(maxRun(a.crops, c)).toBeLessThanOrEqual(CROPS[c].maxConsecutive.value);
      expect(scheduleSequence(a.crops, r.zone).conflictYears).toHaveLength(0);
      // cotton cannot reach its GDD on the cold plateau fixture
      expect(a.crops).not.toContain("cotton");
    }
    expect(r.optimizer.infeasibleByReason.excluded).toBeGreaterThan(0);
    expect(r.optimizer.infeasibleByReason.gdd_insufficient).toBeGreaterThan(0);
    expect(r.optimizer.infeasibleByReason.max_consecutive).toBeGreaterThan(0);
    for (const c of r.candidates) expect(c.crops.some((x) => x === "vetch" || x === "chickpea")).toBe(false);
  });
  it("sugar beet and sunflower are never grown two years in a row", () => {
    for (const c of highlandResult.candidates) {
      expect(maxRun(c.crops, "sugar_beet")).toBeLessThanOrEqual(1);
      expect(maxRun(c.crops, "sunflower")).toBeLessThanOrEqual(1);
      for (const id of new Set(c.crops)) expect(maxRun(c.crops, id)).toBeLessThanOrEqual(2);
    }
  });
  it("an infeasible current rotation is still evaluated and its violations are reported", () => {
    const r = analyze(input({}, { currentRotation: ["sunflower", "sunflower", "wheat_winter"] }));
    expect(r.current.feasible).toBe(false);
    expect(r.current.violations.map((v) => v.code)).toContain("max_consecutive");
    expect(r.current.water.requirementMmPerYr).not.toBeNull();
    expect(r.current.explanation.localReview.some((x) => x.key === "review.violation.max_consecutive")).toBe(true);
  });
  it("recommendations are diverse (no cyclic shifts, Hamming ≥ 2)", () => {
    const alts = highlandResult.alternatives;
    const shifts = (s: readonly CropId[]) => [0, 1, 2].map((k) => [s[k], s[(k + 1) % 3], s[(k + 2) % 3]].join(">"));
    for (let i = 0; i < alts.length; i++) {
      expect(shifts(highlandResult.current.crops)).not.toContain(alts[i].id);
      for (let j = i + 1; j < alts.length; j++) {
        expect(shifts(alts[i].crops)).not.toContain(alts[j].id);
        const h = alts[i].crops.filter((c, k) => c !== alts[j].crops[k]).length;
        expect(h).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it("Pareto front is non-dominated", () => {
    const P = highlandResult.pareto;
    expect(P.length).toBeGreaterThan(0);
    for (const a of P) for (const b of P) {
      if (a === b) continue;
      const dominates = b.requirementMmPerYr <= a.requirementMmPerYr && b.grossMarginTLPerDaPerYr >= a.grossMarginTLPerDaPerYr &&
        b.soilHealth >= a.soilHealth &&
        (b.requirementMmPerYr < a.requirementMmPerYr || b.grossMarginTLPerDaPerYr > a.grossMarginTLPerDaPerYr || b.soilHealth > a.soilHealth);
      expect(dominates).toBe(false);
    }
  });
  it("priorities steer the ranking", () => {
    const water = analyze(input({}, { priorities: { water: 1, income: 0, soil: 0, risk: 0 } }));
    const income = analyze(input({}, { priorities: { water: 0, income: 1, soil: 0, risk: 0 } }));
    const w0 = water.alternatives[0], i0 = income.alternatives[0];
    expect(w0.water.requirementMmPerYr!.p50).toBeLessThanOrEqual(i0.water.requirementMmPerYr!.p50);
    expect(i0.economics.grossMarginTLPerDaPerYr!.p50).toBeGreaterThanOrEqual(w0.economics.grossMarginTLPerDaPerYr!.p50);
  });
  it("runs in < 1.5 s for 12 crops × 24 years", () => {
    const t0 = performance.now();
    analyze(input({ scenario: { rainMultiplier: 0.9, tempDeltaC: 1 } }));
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1500);
  });
});

describe("budgets and scenarios (spec §4.4, §7)", () => {
  it("zero budget: no irrigation anywhere, all plans flagged where water is short", () => {
    const r = analyze(input({}, { irrigationBudgetMm: 0 }));
    for (const p of [r.current, ...r.alternatives]) {
      expect(p.water.irrigationNetMmPerYr!.p90).toBe(0);
      expect(p.water.irrigationGrossM3PerDaPerYr!.p90).toBe(0);
    }
  });
  it("all plans exceed a tiny budget: the analysis still ranks and reports it", () => {
    const r = analyze({ climate: southern, field: { ...baseField, irrigationBudgetMm: 5, currentRotation: ["maize_grain", "cotton", "maize_grain"],
      candidateCrops: ["maize_grain", "cotton", "sugar_beet", "dry_bean"] } });
    expect(r.alternatives.length).toBeGreaterThan(0);
    for (const p of [r.current, ...r.alternatives]) {
      expect(p.water.budgetExceededShare).toBe(1);
      expect(p.explanation.localReview.some((x) => x.key === "review.budgetYear")).toBe(true);
    }
  });
  it("lower budget never lowers the unmet deficit of the current plan (per window P-values)", () => {
    let prev = -Infinity;
    for (const b of [600, 400, 200, 100, 0]) {
      const r = analyze(input({}, { irrigationBudgetMm: b }));
      const u = r.current.water.unmetDeficitMmPerYr!;
      expect(u.mean).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = u.mean;
    }
  });
  it("drier and hotter presets raise the water deficit and ET0; price only moves margins", () => {
    const typ = highlandResult;
    const dry = analyze(input({ scenario: SCENARIO_PRESETS[1].scenario }));
    const hot = analyze(input({ scenario: SCENARIO_PRESETS[2].scenario }));
    expect(dry.current.water.requirementMmPerYr!.p50).toBeGreaterThanOrEqual(typ.current.water.requirementMmPerYr!.p50);
    expect(hot.current.water.requirementMmPerYr!.p50).toBeGreaterThanOrEqual(dry.current.water.requirementMmPerYr!.p50);
    expect(hot.climate.scenarioMeanAnnualEt0Mm!).toBeGreaterThan(typ.climate.scenarioMeanAnnualEt0Mm!);
    expect(dry.climate.scenarioMeanAnnualPrecipMm!).toBeCloseTo(typ.climate.scenarioMeanAnnualPrecipMm! * 0.75, 6);
    expect(hot.scenario.notes.length).toBeGreaterThan(0);
    const pricey = analyze(input({ scenario: { priceMultiplier: 1.5 } }));
    expect(pricey.current.water.requirementMmPerYr).toEqual(typ.current.water.requirementMmPerYr);
    expect(pricey.current.economics.grossMarginTLPerDaPerYr!.p50).toBeGreaterThan(typ.current.economics.grossMarginTLPerDaPerYr!.p50);
  });
});

describe("missing data propagates as gaps", () => {
  it("long gaps exclude agricultural years and appear in gaps; nothing is invented", () => {
    const gappy: ClimateSeries = { ...highland, daily: highland.daily.map((d) =>
      d.date >= "2015-01-01" && d.date <= "2015-01-20" ? { ...d, precip: null, tmax: null } : d.date === "2018-02-02" ? { ...d, rh: null } : d) };
    const r = analyze({ climate: gappy, field: baseField });
    expect(r.windows.excluded.map((e) => e.agYear)).toContain(2015);
    expect(r.windows.agYears).not.toContain(2015);
    expect(r.climate.quality.missingDays.precip).toBe(20);
    expect(r.climate.quality.interpolatedDays.rh).toBe(1);
    expect(r.climate.annual.find((a) => a.year === 2015)!.precipMm).toBeNull();
    const keys = r.current.explanation.gaps.map((g) => g.key);
    expect(keys).toContain("gap.excludedYears");
    expect(keys).toContain("gap.interpolated");
  });
  it("too little data: no windows, null distributions, explicit gap — no crash", () => {
    const short = syntheticClimate({ startYear: 2020, endYear: 2021 });
    const r = analyze({ climate: short, field: baseField });
    expect(r.windows.count).toBe(0);
    expect(r.current.water.requirementMmPerYr).toBeNull();
    expect(r.current.years[0].yieldRatio).toBeNull();
    expect(r.current.explanation.gaps.map((g) => g.key)).toContain("gap.noWindows");
    expect(r.alternatives).toHaveLength(0);
  });
  it("missing GWETROOT and SOC are reported as assumptions", () => {
    const noG: ClimateSeries = { ...highland, daily: highland.daily.map((d) => ({ ...d, gwetRoot: null })) };
    const r = analyze({ climate: noG, field: { ...baseField, soil: { ...LOAM_SOIL, soc: null } } });
    const keys = r.current.explanation.gaps.map((g) => g.key);
    expect(keys).toContain("gap.initialMoisture");
    expect(keys).toContain("gap.organicMatter");
    expect(r.assumptions.some((a) => a.key === "soil.om")).toBe(true);
    // GWETROOT trend cannot be computed without data
    expect(r.climate.trends.find((t) => t.variable === "gwet_root")).toBeUndefined();
  });
});

describe("southern lowland zone", () => {
  it("allows cotton and uses the southern calendar", () => {
    const r = analyze({ climate: southern, field: { ...baseField, irrigationBudgetMm: 700, currentRotation: ["cotton", "wheat_winter", "maize_grain"] } });
    expect(r.zone).toBe("south_lowland");
    expect(r.current.feasible).toBe(true);
    expect(r.current.calendar[1].sow).toBe("11-15");
    expect(r.current.calendar[0].harvest).toBe("11-01");
  });
});

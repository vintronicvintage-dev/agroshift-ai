// Benchmark: model yields on the REAL bundled pilot snapshots vs. APPROXIMATE Turkish provincial
// yields. Ranges are deliberately wide (order of magnitude): they make regressions visible, they are
// not a calibration. Sources (approximate, not a TÜİK table lookup for this build):
//  - Konya wheat, all management 2.6–3.2 t/ha 2015–2024: TÜİK via Konya İl Tarım ve Orman Müdürlüğü
//    "Konya Tarım" booklet (2025); rainfed fields are lower (dryland ≈ 2–2.5 t/ha, drought years far lower).
//  - Şanlıurfa dryland wheat/barley historically ≈ 200–250 kg/da (Harran University statement in the
//    regional press); Harran irrigated wheat 5.6–6.2 t/ha in tillage trials (Harran Univ., DergiPark).
//  - Seed cotton, sugar beet, chickpea: Türkiye/provincial order of magnitude (assumption).
// Also: performance of `analyze` (robust + sensitivity included) and `evaluateCustomPlan`.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expandSnapshot, type CompactSnapshot } from "../data/snapshots";
import { analyze, evaluateCustomPlan } from "./index";
import type { AnalysisInput, PlanResult, RotationSequence } from "../types";

const load = (id: string) => expandSnapshot(JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "snapshots", `${id}.json`), "utf8")) as CompactSnapshot);
const konya = load("konya-cumra"), urfa = load("sanliurfa-harran");
/** Approximate Konya station climatology ≈ 320 mm/yr vs POWER ≈ 551 mm/yr (assumption for the benchmark only). */
const KONYA_RAIN_FACTOR = 320 / 551;

function run(snap: ReturnType<typeof load>, budget: number, plan: RotationSequence, adj?: number): PlanResult {
  const input: AnalysisInput = {
    climate: snap.climate!,
    field: { areaDa: 100, soil: snap.soil, irrigationBudgetMm: budget, irrigationEfficiency: 0.7, currentRotation: plan },
    options: { robust: false, sensitivity: false },
    ...(adj ? { precipAdjustment: { mode: "annual" as const, factorAnnual: adj, provenance: "benchmark: approximate station climatology" } } : {}),
  };
  return analyze(input).current;
}
const meanYield = (p: PlanResult, crop: string) => {
  const ys = p.years.filter((y) => y.cropId === crop && y.yieldTHa).map((y) => y.yieldTHa!.p50);
  return ys.reduce((a, b) => a + b, 0) / ys.length;
};

interface Row { name: string; snap: ReturnType<typeof load>; budget: number; plan: RotationSequence; crop: string; lo: number; hi: number; adj?: number }
const TABLE: Row[] = [
  { name: "Konya rainfed wheat (W-F-W), rain calibrated", snap: konya, budget: 0, plan: ["wheat_winter", "fallow", "wheat_winter"], crop: "wheat_winter", lo: 1.5, hi: 3.0, adj: KONYA_RAIN_FACTOR },
  { name: "Konya rainfed wheat (W-F-W), POWER rain as is", snap: konya, budget: 0, plan: ["wheat_winter", "fallow", "wheat_winter"], crop: "wheat_winter", lo: 1.5, hi: 3.2 },
  { name: "Konya rainfed barley (B-F-W), calibrated", snap: konya, budget: 0, plan: ["barley_winter", "fallow", "wheat_winter"], crop: "barley_winter", lo: 1.3, hi: 3.0, adj: KONYA_RAIN_FACTOR },
  { name: "Konya rainfed chickpea (W-C-B), calibrated", snap: konya, budget: 0, plan: ["wheat_winter", "chickpea", "barley_winter"], crop: "chickpea", lo: 0.4, hi: 1.8, adj: KONYA_RAIN_FACTOR },
  { name: "Konya irrigated wheat, 300 mm", snap: konya, budget: 300, plan: ["wheat_winter", "chickpea", "barley_winter"], crop: "wheat_winter", lo: 4.5, hi: 7.5, adj: KONYA_RAIN_FACTOR },
  { name: "Konya irrigated sugar beet, 600 mm", snap: konya, budget: 600, plan: ["wheat_winter", "sugar_beet", "barley_winter"], crop: "sugar_beet", lo: 45, hi: 90, adj: KONYA_RAIN_FACTOR },
  { name: "Harran rainfed wheat (W-C-B)", snap: urfa, budget: 0, plan: ["wheat_winter", "chickpea", "barley_winter"], crop: "wheat_winter", lo: 1.5, hi: 3.2 },
  { name: "Harran irrigated wheat, 700 mm", snap: urfa, budget: 700, plan: ["wheat_winter", "chickpea", "barley_winter"], crop: "wheat_winter", lo: 4.5, hi: 7.5 },
  { name: "Harran irrigated seed cotton, 1000 mm", snap: urfa, budget: 1000, plan: ["wheat_winter", "cotton", "maize_grain"], crop: "cotton", lo: 3.0, hi: 6.0 },
];

describe("benchmark vs approximate provincial yields (real snapshots, wide tolerances)", () => {
  for (const row of TABLE) {
    it(row.name, () => {
      const y = meanYield(run(row.snap, row.budget, row.plan, row.adj), row.crop);
      expect(y).toBeGreaterThanOrEqual(row.lo);
      expect(y).toBeLessThanOrEqual(row.hi);
    });
  }
});

describe("performance on the real Konya snapshot", () => {
  const input: AnalysisInput = {
    climate: konya.climate!,
    field: { areaDa: 100, soil: konya.soil, irrigationBudgetMm: 300, irrigationEfficiency: 0.7, currentRotation: ["wheat_winter", "fallow", "wheat_winter"] },
  };
  it("analyze (incl. robust ranking and sensitivity sweep) < 1.5 s", () => {
    analyze({ ...input, scenario: { tempDeltaC: 0.5 } }); // warm other ET₀ caches differently
    const t0 = performance.now();
    const r = analyze({ ...input, scenario: { rainMultiplier: 0.9, tempDeltaC: 1 } });
    const ms = performance.now() - t0;
    expect(r.sensitivity!.runs).toBe(10);
    expect(ms).toBeLessThan(1500);
  });
  it("evaluateCustomPlan < 150 ms once the context is warm", () => {
    analyze(input);
    const plans: RotationSequence[] = [["wheat_winter", "chickpea", "barley_winter"], ["sugar_beet", "wheat_winter", "sunflower"], ["maize_grain", "wheat_winter", "vetch"]];
    for (const p of plans) {
      const t0 = performance.now();
      const c = evaluateCustomPlan(input, p);
      const ms = performance.now() - t0;
      expect(c.plan.windows!.length).toBeGreaterThan(10);
      expect(ms).toBeLessThan(150);
    }
  });
});

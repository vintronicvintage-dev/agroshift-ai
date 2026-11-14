/**
 * Print a compact summary of `analyze` on the bundled pilot snapshots (engine regression aid).
 *   npx tsx scripts/dump-engine.ts [konya-cumra sanliurfa-harran ...]
 * Rainfed and irrigated runs; rainfed wheat yield, top recommendations, timing.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expandSnapshot, type CompactSnapshot } from "../src/lib/data/snapshots";
import { analyze } from "../src/lib/engine";
import type { AnalysisInput, PlanResult, RotationSequence } from "../src/lib/types";

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ["konya-cumra", "sanliurfa-harran"];
const CURRENT: Record<string, RotationSequence> = {
  "konya-cumra": ["wheat_winter", "fallow", "wheat_winter"],
  "sanliurfa-harran": ["wheat_winter", "cotton", "cotton"],
  "adana-yuregir": ["wheat_winter", "maize_grain", "cotton"],
  "edirne-uzunkopru": ["wheat_winter", "sunflower", "wheat_winter"],
  "polatli-ankara": ["wheat_winter", "fallow", "barley_winter"],
};
const BUDGET: Record<string, number> = { "konya-cumra": 300, "sanliurfa-harran": 700, "adana-yuregir": 600, "edirne-uzunkopru": 200, "polatli-ankara": 150 };

const fmt = (x: number | null | undefined, d = 0) => (x === null || x === undefined || !Number.isFinite(x) ? "–" : x.toFixed(d));
function line(p: PlanResult): string {
  const y = p.years.map((v) => `${v.cropId}:${fmt(v.yieldTHa?.p50, 2)}t/ha(r${fmt(v.yieldRatio?.p50, 2)})`).join(" ");
  const x = p as PlanResult & { confidence?: { grade: string }; robust?: { cvar: number } };
  return `${p.crops.join(">")} score ${fmt(p.score.composite, 1)} req ${fmt(p.water.requirementMmPerYr?.p50)} unmet ${fmt(p.water.unmetDeficitMmPerYr?.p50)} margin ${fmt(p.economics.grossMarginTLPerDaPerYr?.p50)} soil ${fmt(p.soilHealth.score, 1)} conf ${x.confidence?.grade ?? "-"}\n      ${y}`;
}

const ADJ = process.env.ADJ ? Number(process.env.ADJ) : null;
/** V1=1: run without the v2 inputs (layers, terrain, precip check) for before/after comparisons. */
const V1 = process.env.V1 === "1";
for (const id of ids) {
  const raw = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "snapshots", `${id}.json`), "utf8")) as CompactSnapshot;
  const snap = expandSnapshot(raw);
  if (!snap.climate) { console.log(id, "no climate"); continue; }
  for (const budget of [0, BUDGET[id] ?? 300]) {
    const input: AnalysisInput = {
      climate: snap.climate,
      field: {
        areaDa: 100, soil: snap.soil, irrigationBudgetMm: budget, irrigationEfficiency: 0.7, currentRotation: CURRENT[id] ?? ["wheat_winter", "fallow", "wheat_winter"],
        ...(V1 ? {} : { soilLayers: snap.soilLayers ?? undefined, terrain: snap.terrain ?? undefined }),
      },
      ...(V1 || !snap.precipCheck ? {} : { precipCheck: snap.precipCheck }),
      ...(ADJ ? { precipAdjustment: { mode: "annual" as const, factorAnnual: ADJ, provenance: "dump-engine ADJ env (station mean / POWER mean)" } } : {}),
      options: { extraPlans: [["wheat_winter", "wheat_winter", "barley_winter"], ["wheat_winter", "chickpea", "barley_winter"]] },
    };
    analyze(input); // warm (ET0 memo)
    const t0 = performance.now();
    const r = analyze(input);
    const ms = performance.now() - t0;
    console.log(`\n=== ${id} budget ${budget} mm  zone ${r.zone}  windows ${r.windows.count}  P ${fmt(r.climate.meanAnnualPrecipMm)} ET0 ${fmt(r.climate.meanAnnualEt0Mm)}  ${ms.toFixed(0)} ms`);
    console.log("current  ", line(r.current));
    r.alternatives.forEach((a, i) => console.log(`alt ${i + 1}    `, line(a)));
    r.userPlans.forEach((a) => console.log("user     ", line(a)));
    console.log("typicalBest", r.typicalBestId, " robustBest", r.robustBestId, " knee", r.kneeId);
    if (r.robustBest) console.log("robust   ", line(r.robustBest));
    const pu = r.precipUncertainty;
    if (pu) console.log("precip  ", pu.sources.map((x) => `${x.id} ${x.annualMm.toFixed(0)}`).join(", "), " sensitive", pu.sensitive, " altTop3", pu.alternativeTop3?.join(" | "));
    console.log("soil TAW/m", r.soil.tawMmPerM.toFixed(0), "layers", r.soil.layers?.length ?? 0, "socCapped", r.soil.socCapped, "site elev", r.terrain?.siteElevation, "lapse", r.terrain?.lapseDeltaC, "zone", r.zone);
    for (const p of [r.current, ...r.alternatives]) if (p.rainSource) console.log("  rainSource", p.id, "inTop3", p.rainSource.inTop3, "alt P", p.rainSource.alternativeAnnualMm.toFixed(0), "conf", p.confidence?.grade, p.confidence?.score);
  }
}

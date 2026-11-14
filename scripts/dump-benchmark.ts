/** Benchmark rows + timings on the real snapshots (engine regression aid). npx tsx scripts/dump-benchmark.ts */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expandSnapshot, type CompactSnapshot } from "../src/lib/data/snapshots";
import { analyze, evaluateCustomPlan } from "../src/lib/engine";
import type { AnalysisInput, RotationSequence } from "../src/lib/types";
const load = (id: string) => expandSnapshot(JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "snapshots", `${id}.json`), "utf8")) as CompactSnapshot);
const konya = load("konya-cumra"), urfa = load("sanliurfa-harran");
const K = 320 / 551;
const rows: [string, ReturnType<typeof load>, number, RotationSequence, string, number?][] = [
  ["Konya rainfed wheat W-F-W calibrated", konya, 0, ["wheat_winter", "fallow", "wheat_winter"], "wheat_winter", K],
  ["Konya rainfed wheat W-F-W uncalibrated", konya, 0, ["wheat_winter", "fallow", "wheat_winter"], "wheat_winter"],
  ["Konya rainfed barley B-F-W calibrated", konya, 0, ["barley_winter", "fallow", "wheat_winter"], "barley_winter", K],
  ["Konya rainfed chickpea W-C-B calibrated", konya, 0, ["wheat_winter", "chickpea", "barley_winter"], "chickpea", K],
  ["Konya rainfed lentil W-L-B calibrated", konya, 0, ["wheat_winter", "lentil_red", "barley_winter"], "lentil_red", K],
  ["Konya rainfed chickpea W-C-B uncalibrated", konya, 0, ["wheat_winter", "chickpea", "barley_winter"], "chickpea"],
  ["Konya irrigated wheat 300mm calibrated", konya, 300, ["wheat_winter", "chickpea", "barley_winter"], "wheat_winter", K],
  ["Konya irrigated sugar beet 600mm calibrated", konya, 600, ["wheat_winter", "sugar_beet", "barley_winter"], "sugar_beet", K],
  ["Konya rainfed wheat W-F-W ERA5-monthly (over-correction check)", konya, 0, ["wheat_winter", "fallow", "wheat_winter"], "wheat_winter", -1],
  ["Harran rainfed wheat W-C-B", urfa, 0, ["wheat_winter", "chickpea", "barley_winter"], "wheat_winter"],
  ["Harran irrigated wheat 700mm", urfa, 700, ["wheat_winter", "chickpea", "barley_winter"], "wheat_winter"],
  ["Harran irrigated cotton 1000mm", urfa, 1000, ["wheat_winter", "cotton", "maize_grain"], "cotton"],
];
for (const [name, snap, budget, plan, crop, adj] of rows) {
  const r = analyze({ climate: snap.climate!, precipCheck: snap.precipCheck ?? undefined,
    field: { areaDa: 100, soil: snap.soil, irrigationBudgetMm: budget, irrigationEfficiency: 0.7, currentRotation: plan, soilLayers: snap.soilLayers ?? undefined, terrain: snap.terrain ?? undefined },
    options: { robust: false, sensitivity: false },
    ...(adj === -1 ? { precipAdjustment: { mode: "monthly" as const, factorsMonthly: snap.precipCheck!.monthlyRatio, provenance: "ERA5 monthly ratio" } } : adj ? { precipAdjustment: { mode: "annual" as const, factorAnnual: adj, provenance: "approx station" } } : {}) }).current;
  const ys = r.years.filter((y) => y.cropId === crop && y.yieldTHa);
  const m = ys.reduce((a, y) => a + y.yieldTHa!.p50, 0) / ys.length;
  console.log(`${name.padEnd(46)} ${m.toFixed(2)} t/ha = ${(m * 100).toFixed(0)} kg/da  (by year ${ys.map((y) => y.yieldTHa!.p50.toFixed(2) + " P10 " + y.yieldTHa!.p10.toFixed(2)).join(" | ")})`);
}
for (const [label, snap, budget, cur] of [["konya", konya, 300, ["wheat_winter", "fallow", "wheat_winter"]], ["harran", urfa, 700, ["wheat_winter", "cotton", "cotton"]]] as const) {
  const input: AnalysisInput = { climate: snap.climate!, precipCheck: snap.precipCheck ?? undefined, field: { areaDa: 100, soil: snap.soil, irrigationBudgetMm: budget, irrigationEfficiency: 0.7, currentRotation: [...cur] as RotationSequence, soilLayers: snap.soilLayers ?? undefined, terrain: snap.terrain ?? undefined } };
  let t0 = performance.now(); analyze(input); const cold = performance.now() - t0;
  const times: number[] = [];
  for (const rm of [0.9, 0.8, 0.95]) { t0 = performance.now(); analyze({ ...input, scenario: { rainMultiplier: rm, tempDeltaC: 1 } }); times.push(performance.now() - t0); }
  t0 = performance.now(); analyze({ ...input, options: { robust: false, sensitivity: false }, scenario: { rainMultiplier: 0.85 } }); const v1like = performance.now() - t0;
  analyze(input);
  const ct: number[] = [];
  for (const p of [["wheat_winter", "chickpea", "barley_winter"], ["sugar_beet", "wheat_winter", "sunflower"], ["maize_grain", "wheat_winter", "vetch"], ["vetch", "barley_winter", "fallow"]] as RotationSequence[]) { t0 = performance.now(); evaluateCustomPlan(input, p); ct.push(performance.now() - t0); }
  console.log(`${label}: analyze cold ${cold.toFixed(0)} ms; new-scenario runs ${times.map((x) => x.toFixed(0)).join("/")} ms; without robust+sweep ${v1like.toFixed(0)} ms; custom plan ${ct.map((x) => x.toFixed(1)).join("/")} ms`);
}

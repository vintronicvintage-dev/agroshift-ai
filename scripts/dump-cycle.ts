/**
 * Dump for scripts/crosscheck_cycle.py (engine v2 mechanisms):
 *  1. layered soil hydraulics for a test profile derived from the Konya-Çumra snapshot soil
 *     (texture shifts with depth, bulk density and coarse fragments below 60 cm),
 *  2. the rainfed repeating-cycle chain of wheat → fallow → wheat on that layered profile
 *     (phase chain starting at the first window), with each window's start state and results.
 *   npx tsx scripts/dump-cycle.ts > <tmp>/engine_cycle.json
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expandSnapshot, type CompactSnapshot } from "../src/lib/data/snapshots";
import { prepareClimate } from "../src/lib/engine/climate";
import { soilHydraulics, tawCum, tawProfileOf } from "../src/lib/engine/soil";
import { climateZone, scheduleSequence } from "../src/lib/crops/calendar";
import { createSetup, replayWindows, simulatePlanChain, slotIndices, initialWetnessFromGwet, ASSUMED_INITIAL_WETNESS } from "../src/lib/engine/rotation";
import { fromEpochDay } from "../src/lib/engine/dates";
import type { SoilLayer } from "../src/lib/types";

const raw = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "snapshots", "konya-cumra.json"), "utf8")) as CompactSnapshot;
const snap = expandSnapshot(raw);
const series = snap.climate!;
const s = snap.soil;
const L = (top: number, bottom: number, dClay: number, bd: number | null, cf: number | null, soc: number | null): SoilLayer => ({
  top, bottom, sand: s.sand - dClay / 2, silt: s.silt - dClay / 2, clay: s.clay + dClay, soc, ph: s.ph, cec: null, nitrogen: null,
  bulkDensity: bd, coarseFragments: cf, thetaFC: null, thetaWP: null,
});
const layers: SoilLayer[] = [
  L(0, 5, 0, null, null, s.soc), L(5, 15, 0, null, null, s.soc), L(15, 30, 0, null, null, s.soc),
  L(30, 60, 5, null, null, 8), L(60, 100, 8, 1.45, 10, 5), L(100, 200, 10, 1.5, 15, 4),
];
const soil = soilHydraulics(s, layers);
const clim = prepareClimate(series, 1, 0);
const zone = climateZone(series.lat, series.elevation);
const setup = createSetup(clim, soil, zone);
const prof = tawProfileOf(soil);
const windows = replayWindows(clim);
const plan = ["wheat_winter", "fallow", "wheat_winter"] as const;
const sched = scheduleSequence([...plan], zone);
const w0 = windows.map((w) => initialWetnessFromGwet(clim, soil, w.startIdx) ?? ASSUMED_INITIAL_WETNESS);
const out = simulatePlanChain(setup, sched, windows, 0, w0);
const phase = windows.map((w, i) => ({ w, i })).filter(({ w }) => (w.firstAy - windows[0].firstAy) % 3 === 0);
const cp = setup.params.wheat_winter!;
process.stdout.write(JSON.stringify({
  layers: soil.layers!.map((l) => ({ top: l.top, bottom: l.bottom, thetaFC: l.thetaFC, thetaWP: l.thetaWP, tawMmPerM: l.tawMmPerM, densityFactor: l.densityFactor })),
  layersInput: layers, omDefaultPct: 1.0,
  tawAt: [0.15, 0.3, 0.6, 1.0, 1.5].map((z) => ({ z, taw: tawCum(prof, z) })),
  ctx: { zCol: setup.ctx.zCol, zBare: setup.ctx.zBare, zMin: setup.ctx.zMin, rew: setup.ctx.rew, keMax: setup.ctx.keMax, cnSmallGrain: cp.cn, cnBare: setup.ctx.cn.bare, tawCol: setup.ctx.tawCol },
  crop: { kcIni: cp.kcIni, kcMid: cp.kcMid, kcEnd: cp.kcEnd, zMax: cp.zMax, pTab: cp.pTab },
  chain: phase.map(({ w, i }) => {
    const o = out[i]!;
    return {
      firstAy: w.firstAy, start: o.start, startDate: fromEpochDay(clim.startDay + w.startIdx), coreEndDate: fromEpochDay(clim.startDay + w.coreEndIdx),
      w0: w0[i],
      slots: sched.slots.map((sl) => (sl ? { sowDate: fromEpochDay(clim.startDay + slotIndices(clim, w, sl).sowIdx), stages: sl.stages } : null)),
      storageStart: o.storageStart, storageEnd: o.storageEnd,
      seasons: o.years.map((y) => (y.season ? { etc: y.season.etc, eta: y.season.eta, awAtSow: y.season.awAtSow } : null)),
      deepPerc: o.flux.deepPerc, runoff: o.flux.runoff, et: o.flux.et, precip: o.flux.precip,
    };
  }),
}));

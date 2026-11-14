/**
 * Dump the engine's daily ET₀ for the Konya-Çumra snapshot plus one rainfed winter-wheat season,
 * as JSON on stdout. Consumed by scripts/crosscheck_et0.py.
 *   npx tsx scripts/dump-et0.ts [sowDate=2010-10-10] [initialWetness=0.5]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expandSnapshot, type CompactSnapshot } from "../src/lib/data/snapshots";
import { prepareClimate } from "../src/lib/engine/climate";
import { soilHydraulics } from "../src/lib/engine/soil";
import { climateZone } from "../src/lib/crops/calendar";
import { createSetup } from "../src/lib/engine/rotation";
import { CROPS } from "../src/lib/crops/database";
import { newFluxes, simulateSeason, uniformState, yieldRatio, type CropParams } from "../src/lib/engine/waterBalance";
import { toEpochDay } from "../src/lib/engine/dates";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "snapshots", "konya-cumra.json"), "utf8")) as CompactSnapshot;
const snap = expandSnapshot(raw);
if (!snap.climate) throw new Error("no climate in snapshot");
const series = snap.climate;
const clim = prepareClimate(series, 1, 0);

const et0: Record<string, number | null> = {};
series.daily.forEach((d, i) => {
  const v = clim.et0[toEpochDay(d.date) - clim.startDay];
  et0[d.date] = Number.isFinite(v) && clim.et0Method[toEpochDay(d.date) - clim.startDay] === 1 ? v : null;
  void i;
});

const sow = process.argv[2] ?? "2010-10-10";
const w0 = Number(process.argv[3] ?? 0.5);
const soil = soilHydraulics(snap.soil);
const zone = climateZone(series.lat, series.elevation);
const setup = createSetup(clim, soil, zone);
const def = CROPS.wheat_winter.agronomy!;
const stages = def.calendar[zone].value.stages;
const cp = setup.params.wheat_winter as CropParams;
const state = uniformState(setup.ctx, w0);
const flux = newFluxes();
const sowIdx = toEpochDay(sow) - clim.startDay;
const out = simulateSeason(setup.ctx, cp, sowIdx, stages, state, 0, flux);

process.stdout.write(JSON.stringify({
  et0,
  wheat: {
    sow, zone,
    params: {
      lIni: stages[0], lDev: stages[1], lMid: stages[2], lLate: stages[3],
      kcIni: cp.kcIni, kcMid: cp.kcMid, kcEnd: cp.kcEnd, p: cp.pTab, ky: cp.ky,
      zrMin: setup.ctx.zMin, zrMax: cp.zMax,
    },
    thetaFC: soil.thetaFC, thetaWP: soil.thetaWP, tawPerM: soil.tawMmPerM, cnSmallGrain: cp.cn,
    initialDepletionFrac: 1 - w0,
    etc: out.etc, eta: out.eta, precip: flux.precip, runoff: flux.runoff, deepPerc: flux.deepPerc,
    yieldRatio: yieldRatio(cp.ky, out.eta, out.etc),
    frostDays: out.frostDays, heatDays: out.heatDays,
  },
}));

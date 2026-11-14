/**
 * Diagnostic trace for a crop year on a real snapshot (engine debugging aid).
 *   npx tsx scripts/dump-trace.ts [snapshot=konya-cumra] [factor=0.5808]
 * Plan wheat → chickpea → barley, rainfed, v2 inputs. Prints per window: soil water at chickpea
 * sowing, season ETc/ETa/ratio, rain in season; and for the preceding winter (after wheat harvest
 * until chickpea sowing): precipitation, precipitation on days with tmean ≤ 0 °C, runoff, bare
 * evaporation and deep percolation.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expandSnapshot, type CompactSnapshot } from "../src/lib/data/snapshots";
import { getContext } from "../src/lib/engine/context";
import { scheduleSequence } from "../src/lib/crops/calendar";
import { simulatePlanChain, slotIndices } from "../src/lib/engine/rotation";
import { scsRunoff } from "../src/lib/engine/soil";
import { fromEpochDay } from "../src/lib/engine/dates";
import type { RotationSequence } from "../src/lib/types";
import { CROPS } from "../src/lib/crops/database";
if (process.env.SOW) for (const c of ["chickpea", "lentil_red"] as const) CROPS[c].agronomy!.calendar.highland.value.sow = process.env.SOW;

const id = process.argv[2] ?? "konya-cumra";
const factor = Number(process.argv[3] ?? 320 / 551);
const snap = expandSnapshot(JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "snapshots", `${id}.json`), "utf8")) as CompactSnapshot);
const plan: RotationSequence = (process.argv[4]?.split(",") as RotationSequence) ?? ["wheat_winter", "chickpea", "barley_winter"];
const k = Number(process.argv[5] ?? 1);
const ctx = getContext({
  climate: snap.climate!, precipCheck: snap.precipCheck ?? undefined,
  field: { areaDa: 100, soil: snap.soil, irrigationBudgetMm: 0, irrigationEfficiency: 0.7, currentRotation: plan, soilLayers: process.env.NOLAYERS ? undefined : snap.soilLayers ?? undefined, terrain: snap.terrain ?? undefined },
  precipAdjustment: factor !== 1 ? { mode: "annual", factorAnnual: factor, provenance: "trace" } : undefined,
});
if (process.env.ZMAX) ctx.setup.params[plan[k]]!.zMax = Number(process.env.ZMAX);
const sched = scheduleSequence(plan, ctx.zone);
const out = simulatePlanChain(ctx.setup, sched, ctx.windows, 0, ctx.ev.w0);
const c = ctx.scen;
const slot = sched.slots[k]!, prevSlot = sched.slots[k - 1];
console.log(`zone ${ctx.zone}, ${plan[k]} sow offset ${slot.sowOffset} stages ${slot.stages.join("/")}, column TAW ${ctx.setup.ctx.tawCol.toFixed(0)} mm, cn bare ${ctx.setup.ctx.cn.bare}`);
let sum = { aw: 0, ratio: 0, n: 0, pw: 0, pcold: 0, ro: 0, rocold: 0, pSeason: 0, heat: 0 };
ctx.windows.forEach((w, i) => {
  const o = out[i];
  if (!o) return;
  const se = o.years[k].season!;
  const { sowIdx } = slotIndices(c, w, slot);
  const startW = prevSlot ? slotIndices(c, w, prevSlot).harvestIdx : sowIdx - 200;
  let pw = 0, pcold = 0, ro = 0, rocold = 0;
  for (let d = startW; d < sowIdx; d++) {
    const P = c.precip[d], tm = (c.tmax[d] + c.tmin[d]) / 2;
    const r = scsRunoff(P, ctx.setup.ctx.cn.bare);
    pw += P; ro += r;
    if (tm <= 0) { pcold += P; rocold += r; }
  }
  let ps = 0;
  const len = slot.stages.reduce((a, b) => a + b, 0);
  for (let d = sowIdx; d < sowIdx + len; d++) ps += c.precip[d];
  const ratio = 1 - (ctx.setup.params[plan[k]]?.ky ?? 1) * (1 - se.eta / se.etc);
  sum = { aw: sum.aw + se.awAtSow, ratio: sum.ratio + ratio, n: sum.n + 1, pw: sum.pw + pw, pcold: sum.pcold + pcold, ro: sum.ro + ro, rocold: sum.rocold + rocold, pSeason: sum.pSeason + ps, heat: sum.heat + se.heatDays };
  console.log(`${w.firstAy} sow ${fromEpochDay(c.startDay + sowIdx)} AW@sow ${se.awAtSow.toFixed(0)} ETc ${se.etc.toFixed(0)} ETa ${se.eta.toFixed(0)} r ${ratio.toFixed(2)} | Pseason ${ps.toFixed(0)} | pre-sow P ${pw.toFixed(0)} (tmean≤0: ${pcold.toFixed(0)}) runoff ${ro.toFixed(1)} (cold ${rocold.toFixed(1)}) heat ${se.heatDays}`);
});
const n = sum.n;
console.log(`MEAN AW@sow ${(sum.aw / n).toFixed(0)} ratio ${(sum.ratio / n).toFixed(2)} Pseason ${(sum.pSeason / n).toFixed(0)} preSowP ${(sum.pw / n).toFixed(0)} cold ${(sum.pcold / n).toFixed(0)} runoff ${(sum.ro / n).toFixed(1)} coldRunoff ${(sum.rocold / n).toFixed(1)} heat ${(sum.heat / n).toFixed(1)}`);

// Prints per-site statistics of the bundled snapshots: `npx tsx scripts/verify-snapshots.ts`
import { readFileSync } from "node:fs";
import path from "node:path";
import { DAILY_VARS, expandSnapshot, type CompactSnapshot, type SnapshotIndexEntry } from "../src/lib/data/snapshots";

const dir = path.resolve("src/data/snapshots");
const index = JSON.parse(readFileSync(path.join(dir, "index.json"), "utf8")) as SnapshotIndexEntry[];

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : "n/a");

for (const e of index) {
  const raw = JSON.parse(readFileSync(path.join(dir, `${e.id}.json`), "utf8")) as CompactSnapshot;
  const s = expandSnapshot(raw);
  const c = s.climate;
  console.log(`\n=== ${e.id}  (${e.nameEn}) lat ${e.lat} lon ${e.lon}  elev ${e.elevation} m  retrieved ${e.retrievedAt}`);
  if (!c) {
    console.log("   NO CLIMATE SERIES:", s.notes.join(" | "));
    continue;
  }
  console.log(`   records ${c.daily.length}   range ${c.start} .. ${c.end}`);
  const nulls = Object.fromEntries(DAILY_VARS.map((k) => [k, c.daily.filter((d) => d[k] === null).length]));
  console.log("   nulls:", JSON.stringify(nulls));

  // complete calendar years only
  const byYear = new Map<number, { p: number; t: number[]; n: number; nullP: number }>();
  for (const d of c.daily) {
    const y = Number(d.date.slice(0, 4));
    const o = byYear.get(y) ?? { p: 0, t: [], n: 0, nullP: 0 };
    o.n++;
    if (d.precip === null) o.nullP++;
    else o.p += d.precip;
    if (d.tmean !== null) o.t.push(d.tmean);
    byYear.set(y, o);
  }
  const full = [...byYear.entries()].filter(([, o]) => o.n >= 365 && o.nullP === 0);
  const P = full.map(([, o]) => o.p);
  const T = full.map(([, o]) => mean(o.t));
  console.log(
    `   complete years ${full.length} (${full[0]?.[0]}..${full[full.length - 1]?.[0]}):  mean annual precip ${f(mean(P), 0)} mm  (min ${f(Math.min(...P), 0)}, max ${f(Math.max(...P), 0)})   mean annual tmean ${f(mean(T))} C`,
  );
  const nd = s.ndvi.points.map((p) => p.ndvi);
  console.log(
    `   NDVI: ${nd.length} valid composites ${s.ndvi.points[0]?.date ?? "-"}..${s.ndvi.points[nd.length - 1]?.date ?? "-"}  mean ${f(mean(nd), 3)}  min ${f(Math.min(...nd), 2)} max ${f(Math.max(...nd), 2)}`,
  );
  const sl = s.soil;
  console.log(`   soil: ${sl.origin} ${sl.textureClass} sand ${sl.sand} silt ${sl.silt} clay ${sl.clay} soc ${sl.soc} pH ${sl.ph}`);
  // --- field-data extras ---
  const pc = s.precipCheck;
  if (pc) {
    const pm = mean(pc.powerAnnual);
    const rm = mean(pc.referenceAnnual);
    console.log(`   precip cross-check (${pc.years.length} common complete years ${pc.years[0]}..${pc.years[pc.years.length - 1]}): POWER ${f(pm, 0)} mm/yr vs ${pc.reference.toUpperCase()} ${f(rm, 0)} mm/yr, ratio ref/POWER ${f(pc.annualRatio, 3)}`);
    console.log(`   monthly ratio Jan..Dec: ${pc.monthlyRatio.map((r) => f(r, 2)).join(" ")}`);
  } else console.log("   precip cross-check: none");
  const t = s.terrain;
  console.log(t ? `   terrain (SRTM): elevation mean ${t.elevationMean} m (min ${t.elevationMin}, max ${t.elevationMax}), slope ${t.slopePct} %, aspect ${t.aspectDeg ?? "flat/none"}, samples ${t.samples}; POWER elevation ${e.elevation} m` : "   terrain: none");
  console.log(`   WRB: ${s.wrb ?? "n/a"}`);
  if (s.soilLayers) {
    console.log("   layer      sand silt clay   SOC   pH   CEC   N    BD   CF");
    for (const l of s.soilLayers) console.log(`   ${String(l.top + "-" + l.bottom + " cm").padEnd(10)} ${f(l.sand ?? NaN).padStart(4)} ${f(l.silt ?? NaN).padStart(4)} ${f(l.clay ?? NaN).padStart(4)} ${f(l.soc ?? NaN).padStart(5)} ${f(l.ph ?? NaN, 2).padStart(5)} ${f(l.cec ?? NaN).padStart(5)} ${f(l.nitrogen ?? NaN, 2).padStart(5)} ${f(l.bulkDensity ?? NaN, 2).padStart(5)} ${f(l.coarseFragments ?? NaN).padStart(4)}`);
  } else console.log("   soil layers: none");
  if (s.extrasNotes?.length) console.log("   extras notes:", s.extrasNotes.join(" | "));
  console.log(`   imerg: ${raw.imerg?.status}${raw.imerg?.reason ? ` (${raw.imerg.reason})` : ""}`);
  if (s.notes.length) console.log("   notes:", s.notes.join(" | "));
}

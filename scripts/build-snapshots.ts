// Build bundled snapshots from the live services: `npm run snapshots [-- --only <id>] [-- --no-imerg] [-- --extras-only]`
// --extras-only patches soilLayers / wrb / terrain / precipCheck into the existing files without re-downloading NDVI or climate.
// Never fabricates: any failed part is recorded in the snapshot's notes/sources and left empty or default-labelled.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ClimateSeries, NdviSeries } from "../src/lib/types";
import { imergCrossCheck } from "../src/lib/data/imerg";
import { errMsg } from "../src/lib/data/http";
import { fetchModisNdvi } from "../src/lib/data/modis";
import { PILOTS } from "../src/lib/data/pilots";
import { fetchPowerClimate } from "../src/lib/data/power";
import { compactSnapshot, expandClimate, type CompactSnapshot, type SnapshotIndexEntry } from "../src/lib/data/snapshots";
import { buildExtras } from "./snapshot-extras";
import { fetchSoilGrids } from "../src/lib/data/soilgrids";

try {
  process.loadEnvFile(path.resolve(".env.local")); // EARTHDATA_TOKEN for the optional IMERG check; never printed
} catch {
  /* no .env.local */
}

const OUT = path.resolve("src/data/snapshots");
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const skipImerg = args.includes("--no-imerg");
const NDVI_START = "2015-01-01";

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function buildOne(p: (typeof PILOTS)[number]): Promise<{ entry: SnapshotIndexEntry; bytes: number } | null> {
  const t0 = Date.now();
  const notes: string[] = [];
  const file = path.join(OUT, `${p.id}.json`);
  log(`== ${p.id} (${p.lat}, ${p.lon})`);

  let climate: ClimateSeries | null = null;
  try {
    climate = await fetchPowerClimate(p.lat, p.lon);
    log(`   POWER ok: ${climate.daily.length} days ${climate.start}..${climate.end}, elevation ${climate.elevation} m`);
  } catch (e) {
    notes.push(`NASA POWER failed: ${errMsg(e)}. Climate series left empty.`);
    log(`   POWER FAILED: ${errMsg(e)}`);
  }

  let ndvi: NdviSeries;
  try {
    ndvi = await fetchModisNdvi(p.lat, p.lon, { startDate: NDVI_START, concurrency: 4 });
    log(`   MODIS ok: ${ndvi.points.length} valid composites`);
    if (/WARNING/.test(ndvi.sources[0].note ?? "")) notes.push(ndvi.sources[0].note!);
  } catch (e) {
    notes.push(`MODIS NDVI failed: ${errMsg(e)}. NDVI series left empty.`);
    ndvi = { lat: p.lat, lon: p.lon, points: [], sources: [] };
    log(`   MODIS FAILED: ${errMsg(e)}`);
  }

  const soil = await fetchSoilGrids(p.lat, p.lon, { timeoutMs: 60_000, retries: 2, budgetMs: 240_000 });
  log(`   Soil ${soil.origin}: ${soil.textureClass} sand ${soil.sand} silt ${soil.silt} clay ${soil.clay} soc ${soil.soc} pH ${soil.ph}`);
  if (soil.origin === "default") notes.push(`SoilGrids unavailable; labelled regional default used. ${soil.sources[0].note}`);

  let imerg: CompactSnapshot["imerg"];
  if (skipImerg || !climate) {
    imerg = { status: "not_validated", reason: skipImerg ? "skipped by flag" : "no climate series" };
  } else {
    const r = await imergCrossCheck(climate);
    imerg =
      r.status === "validated"
        ? { status: "validated", detail: { months: r.months.length, meanBiasPct: r.meanBiasPct, correlation: r.correlation } }
        : { status: "not_validated", reason: r.reason };
    log(`   IMERG ${r.status}${r.status === "not_validated" ? `: ${r.reason}` : ""}`);
  }

  // Do not overwrite a previously good snapshot with a degraded rebuild.
  if (!climate && existsSync(file)) {
    const old = JSON.parse(readFileSync(file, "utf8")) as CompactSnapshot;
    if (old.climate) {
      log(`   keeping existing ${p.id}.json (rebuild failed)`);
      return null;
    }
  }

  const retrievedAt = new Date().toISOString();
  const extras = await buildExtras(p, climate);
  const snap = compactSnapshot(p.id, retrievedAt, climate, soil, ndvi, notes, { lat: p.lat, lon: p.lon, elevation: null }, imerg, extras);
  writeFileSync(file, JSON.stringify(snap));
  const bytes = statSync(file).size;
  log(`   wrote ${p.id}.json ${(bytes / 1024).toFixed(0)} KB in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return {
    bytes,
    entry: {
      id: p.id,
      nameTr: p.nameTr,
      nameEn: p.nameEn,
      lat: p.lat,
      lon: p.lon,
      elevation: snap.elevation,
      start: snap.start,
      end: snap.end,
      retrievedAt,
    },
  };
}

/** `--soil-only`: re-fetch SoilGrids for existing snapshots whose soil fell back to the default; patch in place. */
async function retrySoil() {
  for (const p of PILOTS) {
    if (only && p.id !== only) continue;
    const file = path.join(OUT, `${p.id}.json`);
    if (!existsSync(file)) continue;
    const snap = JSON.parse(readFileSync(file, "utf8")) as CompactSnapshot;
    if (snap.soil.origin !== "default") continue;
    const soil = await fetchSoilGrids(p.lat, p.lon, { timeoutMs: 90_000, retries: 3, budgetMs: 400_000 });
    log(`${p.id}: soil ${soil.origin} ${soil.textureClass} sand ${soil.sand} silt ${soil.silt} clay ${soil.clay}`);
    if (soil.origin === "soilgrids") {
      snap.soil = soil;
      snap.notes = snap.notes.filter((n) => !n.startsWith("SoilGrids unavailable"));
      snap.notes.push("SoilGrids default from the first build was replaced by a retried SoilGrids query.");
      writeFileSync(file, JSON.stringify(snap));
    }
  }
}

/** `--extras-only`: add the new field-data parts to existing snapshots in place (no NDVI / POWER re-download). */
async function extrasOnly() {
  for (const p of PILOTS) {
    if (only && p.id !== only) continue;
    const file = path.join(OUT, `${p.id}.json`);
    if (!existsSync(file)) {
      log(`${p.id}: no snapshot file, skipped`);
      continue;
    }
    log(`== extras ${p.id}`);
    const snap = JSON.parse(readFileSync(file, "utf8")) as CompactSnapshot;
    const climate = snap.climate ? expandClimate(snap, snap.climate) : null;
    const ex = await buildExtras(p, climate);
    // a failed retry must not erase parts that an earlier run fetched successfully
    if (!ex.soilLayers && snap.soilLayers) {
      ex.soilLayers = snap.soilLayers;
      ex.wrb = snap.wrb ?? ex.wrb;
    }
    if (!ex.terrain && snap.terrain) ex.terrain = snap.terrain;
    if (!ex.precipCheck && snap.precipCheck) ex.precipCheck = snap.precipCheck;
    Object.assign(snap, ex);
    writeFileSync(file, JSON.stringify(snap));
    log(`   wrote ${p.id}.json ${(statSync(file).size / 1024).toFixed(0)} KB`);
  }
}

async function main() {
  if (args.includes("--extras-only")) return extrasOnly();
  if (args.includes("--soil-only")) return retrySoil();
  mkdirSync(OUT, { recursive: true });
  const indexFile = path.join(OUT, "index.json");
  const prev: SnapshotIndexEntry[] = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, "utf8")) : [];
  const byId = new Map(prev.map((e) => [e.id, e]));
  for (const p of PILOTS) {
    if (only && p.id !== only) continue;
    const r = await buildOne(p);
    if (r) byId.set(p.id, r.entry);
  }
  const index = PILOTS.map((p) => byId.get(p.id)).filter((e): e is SnapshotIndexEntry => !!e);
  writeFileSync(indexFile, JSON.stringify(index, null, 1));
  log(`index.json: ${index.length} entries`);
}

main().catch((e) => {
  console.error("build-snapshots failed:", errMsg(e));
  process.exit(1);
});

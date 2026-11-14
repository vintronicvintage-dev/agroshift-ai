// Field-data extras for the pilot snapshots: SoilGrids layers + WRB, SRTM terrain, POWER vs ERA5 precipitation.
// Shared by build-snapshots.ts (full build and --extras-only). Never fabricates: failures go to extrasNotes.
import type { ClimateSeries } from "../src/lib/types";
import { errMsg } from "../src/lib/data/http";
import { fetchPrecipCrossCheck } from "../src/lib/data/precip";
import type { SnapshotExtras } from "../src/lib/data/snapshots";
import { fetchSoilBundle } from "../src/lib/data/soillayers";
import { fetchTerrain } from "../src/lib/data/terrain";
import type { Pilot } from "../src/lib/data/pilots";

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

export async function buildExtras(p: Pilot, climate: ClimateSeries | null): Promise<SnapshotExtras> {
  const extrasNotes: string[] = [];
  const out: SnapshotExtras = { soilLayers: null, wrb: null, terrain: null, precipCheck: null };

  const bundle = await fetchSoilBundle(p.lat, p.lon, { timeoutMs: 60_000, retries: 2, budgetMs: 240_000 });
  out.soilLayers = bundle.layers;
  out.wrb = bundle.wrb;
  extrasNotes.push(...bundle.notes);
  log(`   soil layers ${bundle.layers ? "ok" : "FAILED"}; WRB ${bundle.wrb ?? "n/a"}`);

  try {
    out.terrain = await fetchTerrain({ point: { lat: p.lat, lon: p.lon } });
    log(`   terrain ok: mean ${out.terrain.elevationMean} m, slope ${out.terrain.slopePct} %`);
  } catch (e) {
    extrasNotes.push(`Terrain (SRTM) failed: ${errMsg(e)}`);
    log(`   terrain FAILED: ${errMsg(e)}`);
  }

  if (climate) {
    try {
      out.precipCheck = await fetchPrecipCrossCheck(climate, p.lat, p.lon);
      log(`   precip check ${out.precipCheck ? `ok (${out.precipCheck.reference}, ratio ${out.precipCheck.annualRatio})` : "not computed"}`);
      if (!out.precipCheck) extrasNotes.push("Precipitation cross-check not computed: fewer than 3 complete common years.");
    } catch (e) {
      extrasNotes.push(`Precipitation cross-check failed: ${errMsg(e)}`);
      log(`   precip check FAILED: ${errMsg(e)}`);
    }
  } else {
    extrasNotes.push("No POWER climate series: precipitation cross-check skipped.");
  }
  out.extrasNotes = extrasNotes;
  return out;
}

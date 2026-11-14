// Requests one tile per registry source (over Konya) and prints status / type / size: `npx tsx scripts/verify-tiles.ts`
import { resolveTileUrl, TILE_SOURCES } from "../src/lib/data/tiles";

function tile(z: number, lat: number, lon: number): { x: number; y: number } {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return { x: Math.floor(((lon + 180) / 360) * n), y: Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n) };
}

async function main() {
  for (const s of TILE_SOURCES) {
    for (const z of [Math.min(6, s.maxNativeZoom), s.maxNativeZoom]) {
      const { x, y } = tile(z, 37.57, 32.77);
      const url = resolveTileUrl(s, z, x, y);
      let line = "";
      for (let a = 0; a < 3; a++) {
        const r = await fetch(url, { headers: { "User-Agent": "AgroShiftAI-research/1.0" } });
        const b = await r.arrayBuffer();
        line = `${r.status} ${r.headers.get("content-type")} ${b.byteLength} B`;
        if (r.ok) break;
      }
      console.log(s.id.padEnd(30), `z${z}`.padEnd(4), line);
    }
  }
}
void main();

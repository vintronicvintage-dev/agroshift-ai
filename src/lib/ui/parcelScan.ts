import type { FieldGeometry, FieldResponse, LonLat, TerrainInfo } from "@/lib/data/fieldTypes";
import {
  bbox,
  describeRing,
  isSelfIntersecting,
  metresPerDegree,
  pointInPolygon,
  type Ring,
} from "@/lib/data/geometry";
import { polygonGrid } from "@/lib/data/terrain";
import { findNearestBasin, type AgriculturalBasin } from "@/lib/data/basinNormals";

export type MicroZone = "upper" | "mid" | "lower";

export interface ScannedGridPoint {
  id: number;
  lat: number;
  lon: number;
  zone: MicroZone;
  relScore: number; // -1 (lowest/accumulation) .. +1 (highest/crest)
}

export interface ParcelSummary {
  ring: Ring;
  vertexCount: number;
  geometry: FieldGeometry;
  widthM: number;
  heightM: number;
  compactnessPct: number;
  selfIntersecting: boolean;
  dominantAxis: "ew" | "ns";
  scanPoints: ScannedGridPoint[];
  zoneShares: { upperPct: number; midPct: number; lowerPct: number };
  nearestBasin: { basin: AgriculturalBasin; distanceKm: number };
}

/**
 * Create a realistic irregular 7-vertex agricultural parcel (~75 dekar by default) around `center`
 * so users can either draw their own boundary with unlimited corners or test an irregular parcel scan in 1 click.
 */
export function buildSampleParcelRing(center: LonLat, targetDa = 75): Ring {
  const areaM2 = Math.max(5_000, targetDa * 1000);
  const sideM = Math.sqrt(areaM2);
  const k = metresPerDegree(center.lat);
  const dx = (sideM * 0.65) / k.lon;
  const dy = (sideM * 0.48) / k.lat;
  return [
    { lat: +(center.lat + dy * 0.92).toFixed(5), lon: +(center.lon - dx * 0.85).toFixed(5) },
    { lat: +(center.lat + dy * 1.05).toFixed(5), lon: +(center.lon - dx * 0.12).toFixed(5) },
    { lat: +(center.lat + dy * 0.88).toFixed(5), lon: +(center.lon + dx * 0.74).toFixed(5) },
    { lat: +(center.lat + dy * 0.22).toFixed(5), lon: +(center.lon + dx * 1.08).toFixed(5) },
    { lat: +(center.lat - dy * 0.64).toFixed(5), lon: +(center.lon + dx * 0.91).toFixed(5) },
    { lat: +(center.lat - dy * 1.02).toFixed(5), lon: +(center.lon + dx * 0.18).toFixed(5) },
    { lat: +(center.lat - dy * 0.86).toFixed(5), lon: +(center.lon - dx * 0.94).toFixed(5) },
  ];
}

/**
 * Compute interior scan points and geometric / micro-zone summary for a drawn polygon ring.
 * Uses the terrain downhill aspect (`terrain.aspectDeg`) when available to orient upper crest vs.
 * lower accumulation zones; otherwise uses a north-to-south solar/drainage gradient.
 */
export function analyzeParcelRing(ring: Ring, terrain?: TerrainInfo | null): ParcelSummary {
  const geometry = describeRing(ring);
  const [minLon, minLat, maxLon, maxLat] = bbox(ring);
  const k = metresPerDegree(geometry.centroid.lat);
  const widthM = Math.round((maxLon - minLon) * k.lon);
  const heightM = Math.round((maxLat - minLat) * k.lat);
  const compactnessPct =
    geometry.perimeterM > 0
      ? Math.min(100, Math.max(5, Math.round(((4 * Math.PI * geometry.areaM2) / (geometry.perimeterM * geometry.perimeterM)) * 100)))
      : 0;
  const selfIntersecting = isSelfIntersecting(ring);
  const dominantAxis: "ew" | "ns" = widthM >= heightM ? "ew" : "ns";

  // Build interior scan grid
  const grid = polygonGrid(ring);
  const inside = grid.points.filter((pt) => pointInPolygon(pt, ring));
  // If polygon is small/narrow and fewer than 5 grid points fell inside, add subdivided interior points around centroid
  if (inside.length < 5) {
    const c = geometry.centroid;
    const stepLon = (maxLon - minLon) * 0.22;
    const stepLat = (maxLat - minLat) * 0.22;
    for (const dLat of [-1, 0, 1]) {
      for (const dLon of [-1, 0, 1]) {
        const cand = { lat: c.lat + dLat * stepLat, lon: c.lon + dLon * stepLon };
        if (pointInPolygon(cand, ring) && !inside.some((p) => Math.hypot(p.lat - cand.lat, p.lon - cand.lon) < 1e-5)) {
          inside.push(cand);
        }
      }
    }
    if (inside.length === 0) inside.push(c);
  }

  // Downhill direction (aspectDeg clockwise from North); upslope is aspectDeg + 180°
  const aspectRad = (((terrain?.aspectDeg ?? 165) + 180) * Math.PI) / 180;
  const upX = Math.sin(aspectRad);
  const upY = Math.cos(aspectRad);

  const rawScores = inside.map((pt) => {
    const x = (pt.lon - geometry.centroid.lon) * k.lon;
    const y = (pt.lat - geometry.centroid.lat) * k.lat;
    return x * upX + y * upY;
  });
  const minS = Math.min(...rawScores);
  const maxS = Math.max(...rawScores);
  const span = Math.max(1e-6, maxS - minS);

  let upperCount = 0;
  let lowerCount = 0;

  const scanPoints: ScannedGridPoint[] = inside.map((pt, i) => {
    const norm = ((rawScores[i] - minS) / span) * 2 - 1; // -1 .. +1
    const zone: MicroZone = norm > 0.33 ? "upper" : norm < -0.33 ? "lower" : "mid";
    if (zone === "upper") upperCount++;
    else if (zone === "lower") lowerCount++;
    return {
      id: i + 1,
      lat: +pt.lat.toFixed(5),
      lon: +pt.lon.toFixed(5),
      zone,
      relScore: +norm.toFixed(2),
    };
  });

  const total = Math.max(1, scanPoints.length);
  const upperPct = Math.round((upperCount / total) * 100);
  const lowerPct = Math.round((lowerCount / total) * 100);
  const midPct = Math.max(0, 100 - upperPct - lowerPct);

  const nearestBasin = findNearestBasin(geometry.centroid.lat, geometry.centroid.lon);

  return {
    ring,
    vertexCount: ring.length,
    geometry,
    widthM,
    heightM,
    compactnessPct,
    selfIntersecting,
    dominantAxis,
    scanPoints,
    zoneShares: { upperPct, midPct, lowerPct },
    nearestBasin,
  };
}

/** Call POST /api/field with the open polygon ring to scan SRTM terrain, 6-layer SoilGrids & ERA5 rainfall check. */
export async function fetchFieldScan(ring: Ring, signal?: AbortSignal): Promise<FieldResponse> {
  const closed = [...ring, ring[0]].map((p) => [p.lon, p.lat]);
  const res = await fetch("/api/field", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "Polygon", coordinates: [closed] }),
    signal,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as FieldResponse;
}

export function compassLabel(aspectDeg: number | null | undefined, lang: "tr" | "en"): { dir: string; note: string } {
  if (aspectDeg === null || aspectDeg === undefined) {
    return lang === "tr"
      ? { dir: "Düz / Yatay taban", note: "Belirgin bakı yönü yok; güneşlenme ve toprak nemi parsel genelinde dengeli." }
      : { dir: "Flat / level", note: "No dominant aspect; solar exposure and soil moisture are uniform across the parcel." };
  }
  const dirsTr = ["Kuzey", "Kuzeydoğu", "Doğu", "Güneydoğu", "Güney", "Güneybatı", "Batı", "Kuzeybatı"];
  const dirsEn = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];
  const idx = Math.round((((aspectDeg % 360) + 360) % 360) / 45) % 8;
  const dir = `${(lang === "tr" ? dirsTr : dirsEn)[idx]} (${Math.round(aspectDeg)}°)`;
  const isSouth = idx >= 2 && idx <= 5;
  const isNorth = idx === 0 || idx === 1 || idx === 7;
  if (lang === "tr") {
    const note = isSouth
      ? "Güney/Doğu bakılı: ilkbaharda toprak erken ısınır, kışlık ve erkenci ekimlerde hızlı çıkış sağlar; yazın ET₀ su kaybı daha yüksektir."
      : isNorth
        ? "Kuzey/Batı bakılı: buharlaşma kaybı daha düşüktür ve kış kar/yağmur nemi toprakta daha uzun korunur; ilkbahar toprak ısınması birkaç gün gecikebilir."
        : "Batı bakılı: öğleden sonra ısınması belirgindir; rüzgâr kırıcı ve anızlı toprak işleme nem kaybını azaltır.";
    return { dir, note };
  }
  const note = isSouth
    ? "South/East-facing: warms earlier in spring for faster emergence, with slightly higher summer ET₀ demand."
    : isNorth
      ? "North-facing: lower evaporative demand preserves winter snow/rain moisture longer; spring warming is slightly later."
      : "West-facing: stronger afternoon warming; residue cover helps reduce surface evaporation.";
  return { dir, note };
}

export function recommendParcelManagement(
  slopePct: number | null | undefined,
  compactnessPct: number,
  dominantAxis: "ew" | "ns",
  lang: "tr" | "en",
): string {
  const s = slopePct ?? 1.5;
  const axisTr = dominantAxis === "ew" ? "Doğu–Batı" : "Kuzey–Güney";
  const axisEn = dominantAxis === "ew" ? "East–West" : "North–South";
  if (lang === "tr") {
    if (s >= 6) {
      return `Eğim (%${s.toFixed(1)}) yüksek: yüzey/salma sulama erozyon ve yüzey akışına yol açar. Basınç ayarlı damla sulama (%90 randıman) ve ${axisTr} doğrultusunda tesviye eğrilerine paralel sürüm önerilir.`;
    }
    if (s >= 2.5) {
      return `Orta eğimli parsel (%${s.toFixed(1)}, şekil bütünlüğü %${compactnessPct}): damla veya düşük basınçlı yağmurlama sulama uygundur; çıplak nadas yerine baklagil nöbeti RUSLE toprak kaybını azaltır.`;
    }
    return `Düz / hafif eğimli taban parsel (%${s.toFixed(1)}, şekil bütünlüğü %${compactnessPct}): su tutma ve makine işleme verimi yüksek; ${axisTr} uzun kenar boyunca hat çekilmesi dönüş kayıplarını azaltır.`;
  }
  if (s >= 6) {
    return `Steep slope (${s.toFixed(1)}%): avoid furrow irrigation to prevent runoff/erosion. Pressure-compensated drip (90% efficiency) and contour tillage along the ${axisEn} axis are recommended.`;
  }
  if (s >= 2.5) {
    return `Moderate slope (${s.toFixed(1)}%, shape compactness ${compactnessPct}%): drip or sprinkler irrigation fits well; replacing bare fallow with legumes lowers RUSLE soil loss.`;
  }
  return `Level / gently sloping parcel (${s.toFixed(1)}%, shape compactness ${compactnessPct}%): high infiltration and machinery efficiency along the ${axisEn} long axis.`;
}

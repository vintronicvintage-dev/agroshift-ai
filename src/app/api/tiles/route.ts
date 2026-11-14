import { promises as fs } from "node:fs";
import path from "node:path";

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII=",
  "base64",
);

const CACHE_ROOT = path.join(process.cwd(), ".cache", "tiles_v4");

function upstreamUrl(layer: string, z: number, x: number, y: number): { url: string; fallbackUrl?: string; contentType: string; ext: string } | null {
  if (layer === "satellite") {
    const sub = Math.abs(x + y) % 4;
    return {
      url: `https://mt${sub}.google.com/vt/lyrs=y&hl=tr&x=${x}&y=${y}&z=${z}&scale=2`,
      fallbackUrl: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
      contentType: "image/jpeg",
      ext: "jpg",
    };
  }
  if (layer === "ndvi") {
    return {
      url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_16Day/default/2026-10-16/GoogleMapsCompatible_Level9/${z}/${y}/${x}.png`,
      contentType: "image/png",
      ext: "png",
    };
  }
  if (layer === "osm") {
    const sub = ["a", "b", "c"][Math.abs(x + y) % 3];
    return {
      url: `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`,
      fallbackUrl: `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
      contentType: "image/png",
      ext: "png",
    };
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  const sp = new URL(request.url).searchParams;
  const layer = sp.get("layer") ?? "osm";
  const z = Math.round(Number(sp.get("z")));
  const x = Math.round(Number(sp.get("x")));
  const y = Math.round(Number(sp.get("y")));

  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y) || z < 0 || z > 20 || x < 0 || y < 0) {
    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  }

  const target = upstreamUrl(layer, z, x, y);
  if (!target) {
    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  }

  const file = path.join(CACHE_ROOT, layer, String(z), `${x}_${y}.${target.ext}`);
  try {
    const cached = await fs.readFile(file);
    return new Response(new Uint8Array(cached), {
      status: 200,
      headers: {
        "Content-Type": target.contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Tile-Source": "cache",
      },
    });
  } catch {
    // Not in disk cache yet
  }

  const urls = [target.url, ...(target.fallbackUrl ? [target.fallbackUrl] : [])];
  for (const candidateUrl of urls) {
    try {
      const res = await fetch(candidateUrl, {
        headers: {
          "User-Agent": "AgroShiftAI/2.2 (NASA Space Apps Field Shift Decision Support)",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > 64) {
          void fs
            .mkdir(path.dirname(file), { recursive: true })
            .then(() => fs.writeFile(file, buf))
            .catch(() => {});
          return new Response(new Uint8Array(buf), {
            status: 200,
            headers: {
              "Content-Type": res.headers.get("content-type") ?? target.contentType,
              "Cache-Control": "public, max-age=86400",
              "X-Tile-Source": "upstream",
            },
          });
        }
      }
    } catch {
      // try next url
    }
  }

  return new Response(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-Tile-Source": "fallback-vector",
    },
  });
}

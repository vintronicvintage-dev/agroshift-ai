/**
 * Place search proxy for the field map (Nominatim, OpenStreetMap). Follows the Nominatim usage
 * policy (operations.osmfoundation.org/policies/nominatim): an identifying User-Agent and Referer,
 * at most one upstream request per second for the whole server (requests queue), results cached,
 * no autocomplete (the UI only searches on submit), Türkiye only, at most 5 results.
 * Results carry the ODbL attribution the UI must show.
 */
const UA = "AgroShift/3.0 (NASA Space Apps Challenge 2026 prototype; crop-rotation decision support)";
const CACHE = new Map<string, { at: number; body: GeoResult[] }>();
const TTL = 24 * 3600_000;
let chain: Promise<unknown> = Promise.resolve();
let lastAt = 0;

export interface GeoResult {
  name: string;
  detail: string;
  lat: number;
  lon: number;
  kind: string;
  bbox: [number, number, number, number] | null;
}

function slot<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastAt + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    return fn();
  });
  chain = run.catch(() => undefined);
  return run;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "tr";
  if (q.length < 2) return Response.json({ error: { code: "bad_request", message: "q must have at least 2 characters" } }, { status: 400 });
  const key = `${lang}|${q.toLocaleLowerCase("tr")}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL) return Response.json({ results: hit.body, cached: true, attribution: "© OpenStreetMap contributors (ODbL)" });
  try {
    const body = await slot(async () => {
      const u = new URL("https://nominatim.openstreetmap.org/search");
      u.searchParams.set("q", q);
      u.searchParams.set("format", "jsonv2");
      u.searchParams.set("limit", "5");
      u.searchParams.set("countrycodes", "tr");
      u.searchParams.set("accept-language", lang);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      try {
        const res = await fetch(u, { headers: { "User-Agent": UA, Referer: "https://agroshift.app/", Accept: "application/json" }, signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { display_name: string; name?: string; lat: string; lon: string; type?: string; addresstype?: string; boundingbox?: string[] }[];
      } finally {
        clearTimeout(timer);
      }
    });
    const results: GeoResult[] = body.map((r) => {
      const parts = r.display_name.split(", ");
      const bb = r.boundingbox?.map(Number);
      return {
        name: r.name || parts[0],
        detail: parts.slice(1, 4).join(", "),
        lat: Number(r.lat),
        lon: Number(r.lon),
        kind: r.addresstype ?? r.type ?? "",
        bbox: bb && bb.length === 4 && bb.every(Number.isFinite) ? [bb[2], bb[0], bb[3], bb[1]] : null,
      };
    });
    CACHE.set(key, { at: Date.now(), body: results });
    if (CACHE.size > 500) CACHE.delete(CACHE.keys().next().value as string);
    return Response.json({ results, cached: false, attribution: "© OpenStreetMap contributors (ODbL)" });
  } catch (e) {
    return Response.json({ error: { code: "upstream_unavailable", message: e instanceof Error ? e.message : String(e) } }, { status: 502 });
  }
}

import { jsonError, jsonOk } from "@/lib/data/route-helpers";
import { getNdvi, parseLatLon } from "@/lib/data/service";

// Node.js runtime is the default; `export const runtime` is rejected when cacheComponents is enabled.

export async function GET(request: Request): Promise<Response> {
  try {
    const point = parseLatLon(new URL(request.url).searchParams);
    return jsonOk(await getNdvi(point));
  } catch (e) {
    return jsonError(e);
  }
}

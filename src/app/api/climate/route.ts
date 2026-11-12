import { jsonError, jsonOk } from "@/lib/data/route-helpers";
import { getClimate, parseLatLon } from "@/lib/data/service";

// Node.js runtime is the default; `export const runtime` is rejected when cacheComponents is enabled.

export async function GET(request: Request): Promise<Response> {
  try {
    const point = parseLatLon(new URL(request.url).searchParams);
    return jsonOk(await getClimate(point));
  } catch (e) {
    return jsonError(e);
  }
}

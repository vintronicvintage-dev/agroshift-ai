import { getField, parseFieldBody } from "@/lib/data/field";
import { jsonError, jsonOk } from "@/lib/data/route-helpers";
import { ValidationError } from "@/lib/data/service";

// Node.js runtime is the default; `export const runtime` is rejected when cacheComponents is enabled.

export async function POST(request: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Body must be valid JSON");
    }
    return jsonOk(await getField(parseFieldBody(body)), 0);
  } catch (e) {
    return jsonError(e);
  }
}

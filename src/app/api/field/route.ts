import { getField, getFieldParts, parseFieldBody, parseParts } from "@/lib/data/field";
import { jsonError, jsonOk } from "@/lib/data/route-helpers";
import { ValidationError } from "@/lib/data/service";

// Node.js runtime is the default; `export const runtime` is rejected when cacheComponents is enabled.
export const MAX_FIELD_BODY_BYTES = 64 * 1024;

export async function POST(request: Request): Promise<Response> {
  try {
    let body: unknown;
    // validate the selector before any upstream work
    parseParts(new URL(request.url).searchParams.get("parts"));
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_FIELD_BODY_BYTES) {
      throw new ValidationError(`Request body exceeds ${MAX_FIELD_BODY_BYTES} bytes limit`);
    }
    let rawText: string;
    try {
      rawText = await request.text();
    } catch {
      throw new ValidationError("Body must be valid JSON");
    }
    if (rawText.length > MAX_FIELD_BODY_BYTES) {
      throw new ValidationError(`Request body exceeds ${MAX_FIELD_BODY_BYTES} bytes limit`);
    }
    try {
      body = JSON.parse(rawText);
    } catch {
      throw new ValidationError("Body must be valid JSON");
    }
    const raw = new URL(request.url).searchParams.get("parts");
    const input = parseFieldBody(body);
    // ?parts=terrain,soil | precip | … selects independent parts; without it the full response is unchanged
    if (raw === null) return jsonOk(await getField(input), 0);
    return jsonOk(await getFieldParts(input, parseParts(raw)), 0);
  } catch (e) {
    return jsonError(e);
  }
}

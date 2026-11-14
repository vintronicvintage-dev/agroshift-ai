// Shared JSON response helpers for the /api routes.
import { errMsg } from "./http";
import { ValidationError } from "./service";

export function jsonOk(data: unknown, maxAge = 600): Response {
  return Response.json(data, { headers: { "Cache-Control": `public, max-age=${maxAge}` } });
}

export function jsonError(e: unknown): Response {
  if (e instanceof ValidationError) {
    return Response.json({ error: { code: "bad_request", message: e.message } }, { status: 400 });
  }
  return Response.json(
    { error: { code: "upstream_unavailable", message: `Upstream data service failed: ${errMsg(e)}` } },
    { status: 502 },
  );
}

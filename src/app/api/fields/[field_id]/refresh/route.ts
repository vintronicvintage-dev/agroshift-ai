import { NextResponse } from "next/server";
import { GeometryError } from "@/lib/data/geometry";
import { scientificRepository } from "@/lib/data-infra/repository";
import type { GeoJsonPolygonOrMulti } from "@/lib/data-infra/types";

export async function POST(
  req: Request,
  context: { params: Promise<{ field_id: string }> },
) {
  const { field_id } = await context.params;

  let body: {
    sources?: string[];
    forceLiveNetwork?: boolean;
    labSoilOverride?: {
      sandPct: number;
      siltPct: number;
      clayPct: number;
      phH2o: number;
      socGKg: number;
      nitrogenGKg?: number;
      bdodGCm3?: number;
    };
    geometryOverride?: GeoJsonPolygonOrMulti;
  } = {};

  try {
    const text = await req.text();
    if (text.length > 64 * 1024) {
      return NextResponse.json({ error: "Payload too large (max 64 KB)" }, { status: 413 });
    }
    if (text.trim()) {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ error: "JSON body must be an object" }, { status: 400 });
      }
      body = parsed as typeof body;
      if (body.sources !== undefined && (!Array.isArray(body.sources) || body.sources.some((s) => typeof s !== "string"))) {
        return NextResponse.json({ error: "sources must be an array of strings" }, { status: 400 });
      }
      if (body.labSoilOverride !== undefined) {
        const s = body.labSoilOverride;
        const nums = [s.sandPct, s.siltPct, s.clayPct, s.phH2o, s.socGKg];
        if (nums.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
          return NextResponse.json({ error: "labSoilOverride values must be finite non-negative numbers" }, { status: 400 });
        }
        if (s.phH2o > 14) {
          return NextResponse.json({ error: "labSoilOverride.phH2o must be between 0 and 14" }, { status: 400 });
        }
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body in POST /refresh" }, { status: 400 });
  }

  try {
    const result = await scientificRepository.refreshFieldData(field_id, body);
    if (!result) {
      return NextResponse.json(
        {
          error: `Field '${field_id}' not found. Registered pilot IDs: konya-cumra, sanliurfa-harran, adana-yuregir, edirne-uzunkopru, polatli-ankara`,
        },
        { status: 404 },
      );
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof GeometryError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 },
    );
  }
}

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
    if (text.trim()) {
      body = JSON.parse(text);
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

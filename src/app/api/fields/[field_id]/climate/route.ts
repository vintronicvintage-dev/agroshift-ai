import { NextResponse } from "next/server";
import { scientificRepository } from "@/lib/data-infra/repository";

export async function GET(
  req: Request,
  context: { params: Promise<{ field_id: string }> },
) {
  const { field_id } = await context.params;
  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit");
  const startDate = searchParams.get("start") ?? undefined;
  const endDate = searchParams.get("end") ?? undefined;
  const limitDays = limitRaw ? Math.max(1, Math.min(10000, Number(limitRaw))) : 365;

  const bundle = await scientificRepository.getFieldClimateBundle(field_id, {
    limitDays: Number.isFinite(limitDays) ? limitDays : 365,
    startDate,
    endDate,
  });

  if (!bundle) {
    return NextResponse.json(
      {
        error: `Field '${field_id}' not found. Registered pilot IDs: konya-cumra, sanliurfa-harran, adana-yuregir, edirne-uzunkopru, polatli-ankara`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(bundle, { status: 200 });
}

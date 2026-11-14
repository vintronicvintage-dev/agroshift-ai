import { NextResponse } from "next/server";
import { scientificRepository } from "@/lib/data-infra/repository";

export async function GET(
  _req: Request,
  context: { params: Promise<{ field_id: string }> },
) {
  const { field_id } = await context.params;
  const readiness = await scientificRepository.getFieldModelReadiness(field_id);

  if (!readiness) {
    return NextResponse.json(
      {
        error: `Field '${field_id}' not found. Registered pilot IDs: konya-cumra, sanliurfa-harran, adana-yuregir, edirne-uzunkopru, polatli-ankara`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(readiness, { status: 200 });
}

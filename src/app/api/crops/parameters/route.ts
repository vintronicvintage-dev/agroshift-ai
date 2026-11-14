import { NextResponse } from "next/server";
import { CROP_IDS } from "@/lib/crops/database";
import { CROP_REQUIREMENTS } from "@/lib/crops/cropRequirements";
import { scientificRepository } from "@/lib/data-infra/repository";
import type { CropId } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cropParam = searchParams.get("crop_id") ?? searchParams.get("cropId");

  if (cropParam && !CROP_IDS.includes(cropParam as CropId)) {
    return NextResponse.json(
      {
        error: `Unknown crop_id '${cropParam}'. Valid crop IDs: ${CROP_IDS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const bundle = await scientificRepository.getCropParametersBundle(
    cropParam ? (cropParam as CropId) : undefined,
  );
  const requirements = cropParam
    ? { [cropParam]: CROP_REQUIREMENTS[cropParam as CropId] }
    : CROP_REQUIREMENTS;

  return NextResponse.json(
    {
      ...bundle,
      requirements,
    },
    { status: 200 },
  );
}

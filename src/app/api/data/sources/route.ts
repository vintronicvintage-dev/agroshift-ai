import { NextResponse } from "next/server";
import { scientificRepository } from "@/lib/data-infra/repository";

export async function GET() {
  const catalog = await scientificRepository.getSourcesCatalog();
  return NextResponse.json(catalog, { status: 200 });
}

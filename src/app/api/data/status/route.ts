import { NextResponse } from "next/server";
import { scientificRepository } from "@/lib/data-infra/repository";

export async function GET() {
  const status = await scientificRepository.getInfrastructureStatus();
  return NextResponse.json(status, { status: 200 });
}

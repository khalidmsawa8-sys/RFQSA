import { NextRequest, NextResponse } from "next/server";
import { identityRepository } from "@/lib/bounded-contexts/identity/identity.repository";
import { createApiEnvelope, createApiErrorEnvelope } from "@/lib/bounded-contexts/types/common.types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const organization = await identityRepository.getOrganization();
    const memberships = await identityRepository.getMemberships();

    return NextResponse.json(createApiEnvelope({ organization, memberships }));
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "ORG_FETCH_ERROR", message: error?.message || "فشل جلب بيانات المؤسسة والعضويات" }]),
      { status: 500 }
    );
  }
}

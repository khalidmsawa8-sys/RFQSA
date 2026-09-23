import { NextRequest, NextResponse } from "next/server";
import { identityRepository } from "@/lib/bounded-contexts/identity/identity.repository";
import { createApiEnvelope, createApiErrorEnvelope } from "@/lib/bounded-contexts/types/common.types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await identityRepository.getUserIdentity();
    const sessions = await identityRepository.getActiveSessions();
    const subscription = await identityRepository.getSubscription();

    return NextResponse.json(createApiEnvelope({ user, sessions, subscription }));
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "ACCOUNT_FETCH_ERROR", message: error?.message || "فشل جلب بيانات الحساب والأمان" }]),
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { identityRepository } from "@/lib/bounded-contexts/identity/identity.repository";
import { createApiEnvelope, createApiErrorEnvelope } from "@/lib/bounded-contexts/types/common.types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const organization = await identityRepository.getOrganization();

    return NextResponse.json(
      createApiEnvelope({
        status: organization.verification_status,
        verified_badge: organization.verified_badge,
        cr_number: organization.cr_number,
        tax_number: organization.tax_number,
        documents: [
          { type: "commercial_register", status: "approved", expiry: "2028-05-20" },
          { type: "vat_certificate", status: "approved", expiry: "2027-12-31" }
        ]
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "VERIFICATION_FETCH_ERROR", message: error?.message || "فشل جلب حالة التوثيق" }]),
      { status: 500 }
    );
  }
}

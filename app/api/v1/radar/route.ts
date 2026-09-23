import { NextRequest, NextResponse } from "next/server";
import { smartRadarMatchingEngine, DEMO_VENDORS } from "@/lib/bounded-contexts/supplier/radar.matcher";
import { createApiEnvelope, createApiErrorEnvelope } from "@/lib/bounded-contexts/types/common.types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand") || "تويوتا";
    const city = searchParams.get("city") || "الرياض";

    const dummyRfq = {
      rfq_id: `RFQ-${Date.now().toString().slice(-4)}`,
      car_make: brand,
      car_model: "كامري",
      car_year: 2023,
      city: city,
      parts_description: "صدام أمامي أصلي + فحمات فرامل",
      created_at: new Date().toISOString(),
    };

    const matches = await Promise.all(
      DEMO_VENDORS.map((vendor) => smartRadarMatchingEngine.calculateMatchScore(dummyRfq, vendor))
    );

    // Sort by score descending
    matches.sort((a, b) => b.total_score - a.total_score);

    return NextResponse.json(createApiEnvelope({ rfq: dummyRfq, matches }));
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "RADAR_MATCH_ERROR", message: error?.message || "فشل احتساب درجات المطابقة بالرادار" }]),
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import {
  calculateDeliveryCost,
  createDeliverySnapshot,
  DeliveryCalculationRequest,
} from "@/lib/delivery-engine";
import { getServerDeliveryRules } from "@/lib/delivery-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/delivery/calculate
 * Central server-side calculation endpoint for delivery costs and immutable snapshot generation.
 */
export async function POST(req: Request) {
  try {
    const body: DeliveryCalculationRequest = await req.json();

    const rules = getServerDeliveryRules();
    const calculation = calculateDeliveryCost(body, rules);
    const snapshot = createDeliverySnapshot(calculation, body);

    return NextResponse.json({
      success: true,
      calculation,
      snapshot,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to calculate delivery costs",
      },
      { status: 500 }
    );
  }
}

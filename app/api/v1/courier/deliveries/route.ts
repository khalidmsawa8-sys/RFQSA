import { NextRequest, NextResponse } from "next/server";
import { CourierService } from "@/lib/courier-service";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    let courierId = request.headers.get("x-courier-id") || "courier-demo-id";

    // 1. Authenticate user session
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        courierId = user.id;
      }
    } catch (e) {
      // Fallback for demo environment
    }

    const deliveries = CourierService.getAssignedDeliveries(courierId);

    return NextResponse.json({
      success: true,
      deliveries,
      count: deliveries.length,
    });
  } catch (err: any) {
    console.error("Error fetching courier deliveries:", err);
    return NextResponse.json(
      { success: false, error: err.message || "فشل في جلب شحنات المندوب" },
      { status: 500 }
    );
  }
}

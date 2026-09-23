import { NextRequest, NextResponse } from "next/server";
import { CourierService } from "@/lib/courier-service";

export async function GET(request: NextRequest) {
  try {
    const courierId = request.headers.get("x-courier-id") || "courier-demo-id";
    const wallet = CourierService.getCourierWallet(courierId);

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (err: any) {
    console.error("Error fetching courier wallet:", err);
    return NextResponse.json(
      { success: false, error: err.message || "فشل في جلب بيانات المحفظة." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { CourierService } from "@/lib/courier-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commands } = body;
    const courierId = request.headers.get("x-courier-id") || body.courierId || "courier-demo-id";
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    if (!Array.isArray(commands) || commands.length === 0) {
      return NextResponse.json(
        { success: true, message: "لا توجد أوامر للمزامنة.", processedCount: 0 },
        { status: 200 }
      );
    }

    const results: any[] = [];
    let synced = 0;
    let conflicts = 0;
    let failed = 0;

    for (const cmd of commands) {
      const res = await CourierService.executeTransition({
        deliveryId: cmd.deliveryId,
        courierId,
        targetStatus: cmd.targetStatus,
        idempotencyKey: cmd.idempotencyKey,
        otpCode: cmd.otpCode,
        podPhotoUrl: cmd.podPhotoUrl,
        podMetadata: cmd.podMetadata,
        telemetry: cmd.telemetry,
        source: "offline_sync",
        clientIp,
      });

      results.push({
        commandId: cmd.id,
        deliveryId: cmd.deliveryId,
        status: res.statusCode,
        success: res.success,
        error: res.error,
      });

      if (res.success) synced++;
      else if (res.statusCode === 409) conflicts++;
      else failed++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: commands.length,
        synced,
        conflicts,
        failed,
      },
      results,
    });
  } catch (err: any) {
    console.error("Batch sync error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "فشلت عملية المزامنة الجماعية." },
      { status: 500 }
    );
  }
}

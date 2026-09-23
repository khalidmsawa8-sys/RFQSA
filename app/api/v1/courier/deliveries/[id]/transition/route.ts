import { NextRequest, NextResponse } from "next/server";
import { CourierService } from "@/lib/courier-service";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    let courierId = request.headers.get("x-courier-id") || body.courierId || "courier-demo-id";
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

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

    const {
      targetStatus,
      idempotencyKey,
      otpCode,
      podPhotoUrl,
      podMetadata,
      telemetry,
      source = "online",
      expectedVersion,
    } = body;

    if (!targetStatus) {
      return NextResponse.json(
        { success: false, error: "حقل targetStatus مطلوب." },
        { status: 400 }
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        { success: false, error: "حقل idempotencyKey مطلوب لمنع تكرار الإجراءات." },
        { status: 400 }
      );
    }

    const result = await CourierService.executeTransition({
      deliveryId: id,
      courierId,
      targetStatus,
      idempotencyKey,
      otpCode,
      podPhotoUrl,
      podMetadata,
      telemetry,
      source,
      clientIp,
      expectedVersion,
    });

    return NextResponse.json(result, { status: result.statusCode });
  } catch (err: any) {
    console.error("Error executing delivery transition:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ غير متوقع أثناء تحديث حالة الشحنة." },
      { status: 500 }
    );
  }
}

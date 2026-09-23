import { NextRequest, NextResponse } from "next/server";
import { CourierService } from "@/lib/courier-service";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let courierId = request.headers.get("x-courier-id") || "courier-demo-id";
    let role = request.headers.get("x-user-role") || "courier";

    // 1. Authenticate user session
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        courierId = user.id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (prof?.role) role = prof.role;
      }
    } catch (e) {
      // Fallback for demo environment
    }

    const delivery = CourierService.getDeliveryById(id, courierId, role);

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: "الشحنة غير موجودة أو غير مسندة لهذا الحساب." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      delivery,
    });
  } catch (err: any) {
    console.error("Error fetching delivery detail:", err);
    return NextResponse.json(
      { success: false, error: err.message || "فشل في جلب تفاصيل الشحنة" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getSystemSettings, updateSystemSettings } from "@/lib/system-settings";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("[api/v1/admin/settings GET] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل جلب الإعدادات" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("rfq_session")?.value;
    // Allow admin session
    const updatedBy = session === "admin" ? "admin" : "system_admin";

    const body = await req.json();
    const durationMinutes = body.rfq_visibility_duration_minutes !== undefined
      ? Math.max(1, parseInt(body.rfq_visibility_duration_minutes, 10) || 2880)
      : undefined;

    const partialUpdate: any = { ...body };
    if (durationMinutes !== undefined) {
      partialUpdate.rfq_visibility_duration_minutes = durationMinutes;
    }

    const { settings, affected } = await updateSystemSettings(
      partialUpdate,
      updatedBy
    );

    return NextResponse.json({
      success: true,
      message: durationMinutes !== undefined
        ? `تم حفظ الإعدادات وتطبيق مهلة الطلبات بنجاح (${affected.cancelledCount} طلب تحول إلى ملغي، ${affected.updatedCount} طلب تم تحديث مهلته)`
        : "تم حفظ إعدادات المنصة بنجاح",
      settings,
      affected,
    });
  } catch (error: any) {
    console.error("[api/v1/admin/settings POST] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل حفظ الإعدادات" },
      { status: 500 }
    );
  }
}

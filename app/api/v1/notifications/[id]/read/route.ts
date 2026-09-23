import { NextRequest, NextResponse } from "next/server";
import {
  loadAllNotifications,
  saveAllNotifications,
} from "@/lib/notification-service";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/notifications/[id]/read
 * Marks a specific notification as read
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const all = loadAllNotifications();
    const target = all.find((n) => n.id === id);

    if (!target) {
      return NextResponse.json(
        { success: false, error: "الإشعار غير موجود" },
        { status: 404 }
      );
    }

    target.is_read = true;
    saveAllNotifications(all);

    return NextResponse.json({
      success: true,
      message: "تم تحديث حالة الإشعار إلى مقروء ✓",
      notification: target,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

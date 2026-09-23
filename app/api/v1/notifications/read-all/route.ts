import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  loadAllNotifications,
  saveAllNotifications,
} from "@/lib/notification-service";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/notifications/read-all
 * Marks all notifications as read for the current user
 */
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let queryUserId = searchParams.get("userId") || searchParams.get("user_id");

    try {
      const body = await req.json();
      if (body) {
        queryUserId = queryUserId || body.userId || body.user_id;
      }
    } catch (_) {}

    let authUserId: string | undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authUserId = user?.id;
    } catch (_) {}

    const userId = queryUserId || authUserId || req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const all = loadAllNotifications();
    let updatedCount = 0;

    for (const n of all) {
      const belongs =
        (userId && n.user_id === userId) ||
        (userRole === "client" && n.user_id === "client-demo-id") ||
        (userRole === "vendor" && n.user_id === "vendor-demo-id") ||
        (userRole === "courier" && n.user_id === "courier-demo-id") ||
        !userId;

      if (belongs && !n.is_read) {
        n.is_read = true;
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      saveAllNotifications(all);
    }

    return NextResponse.json({
      success: true,
      message: `تم تحديد جميع الإشعارات (${updatedCount}) كمقروءة ✓`,
      updatedCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PATCH(req);
}

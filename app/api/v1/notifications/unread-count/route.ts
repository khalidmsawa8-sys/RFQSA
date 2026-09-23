import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadAllNotifications } from "@/lib/notification-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications/unread-count
 * Returns the unread notifications count for badge display
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get("userId") || searchParams.get("user_id") || searchParams.get("recipientId");

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

    const unread = all.filter((n) => {
      if (n.is_read) return false;
      if (userId) {
        if (n.user_id === userId) return true;
        if (userId.startsWith("client-demo") && n.user_id === "client-demo-id") return true;
        if (userId.startsWith("vendor-demo") && n.user_id === "vendor-demo-id") return true;
        if (userId.startsWith("courier-demo") && n.user_id === "courier-demo-id") return true;
        return false;
      }
      if (userRole === "client" && n.user_id === "client-demo-id") return true;
      if (userRole === "vendor" && n.user_id === "vendor-demo-id") return true;
      if (userRole === "courier" && n.user_id === "courier-demo-id") return true;
      return true;
    });

    return NextResponse.json({
      success: true,
      unreadCount: unread.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, unreadCount: 0, error: err?.message },
      { status: 500 }
    );
  }
}

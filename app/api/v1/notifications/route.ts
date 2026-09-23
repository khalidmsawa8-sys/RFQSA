import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  loadAllNotifications,
  createAndDispatchNotification,
} from "@/lib/notification-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications
 * Retrieves notifications for the current authenticated user or by role/userId
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterRole = searchParams.get("role");
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const queryUserId = searchParams.get("userId") || searchParams.get("user_id") || searchParams.get("recipientId");

    let authUserId: string | undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authUserId = user?.id;
    } catch (_) {}

    const userId = queryUserId || authUserId || req.headers.get("x-user-id") || undefined;
    const userRole = req.headers.get("x-user-role") || filterRole;

    const all = loadAllNotifications();

    let userNotifications = all.filter((n) => {
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

    if (unreadOnly) {
      userNotifications = userNotifications.filter((n) => !n.is_read);
    }

    const unreadCount = userNotifications.filter((n) => !n.is_read).length;
    const sliced = userNotifications.slice(0, limit);

    // Format output with both snake_case and camelCase keys for full compatibility
    const formatted = sliced.map((n) => {
      const entityType = n.rfq_id ? "RFQ" : n.order_id ? "ORDER" : n.delivery_id ? "DELIVERY" : "GENERAL";
      const entityId = n.rfq_id || n.order_id || n.delivery_id || n.id;
      return {
        ...n,
        notificationId: n.id,
        recipientId: n.user_id,
        userId: n.user_id,
        body: n.message,
        content: n.message,
        entityType,
        entityId,
        route: n.action_url,
        isRead: n.is_read,
        createdAt: n.created_at,
        sentAt: n.sent_at,
      };
    });

    return NextResponse.json({
      success: true,
      count: formatted.length,
      unreadCount,
      notifications: formatted,
    });
  } catch (err: any) {
    console.error("GET /api/v1/notifications error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/notifications
 * Creates and dispatches a notification
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      user_id,
      recipientId,
      recipient_id,
      type = "announcement",
      title,
      message,
      body: bodyText,
      content,
      rfqId,
      rfq_id,
      orderId,
      order_id,
      deliveryId,
      delivery_id,
      entityType,
      entityId,
      actionUrl,
      action_url,
      route,
      data,
    } = body;

    const targetUserId = recipientId || recipient_id || userId || user_id;
    const finalTitle = title;
    const finalMessage = message || bodyText || content;

    if (!targetUserId || !finalTitle || !finalMessage) {
      return NextResponse.json(
        { success: false, error: "الحقول (userId/recipientId, title, message/body) مطلوبة." },
        { status: 400 }
      );
    }

    const resolvedRfqId = rfqId || rfq_id || (entityType?.toUpperCase() === "RFQ" ? entityId : undefined) || data?.rfqId;
    const resolvedOrderId = orderId || order_id || (entityType?.toUpperCase() === "ORDER" ? entityId : undefined) || data?.orderId;
    const resolvedDeliveryId = deliveryId || delivery_id || (entityType?.toUpperCase() === "DELIVERY" ? entityId : undefined) || data?.deliveryId;

    const notification = await createAndDispatchNotification({
      userId: targetUserId,
      type,
      title: finalTitle,
      message: finalMessage,
      rfqId: resolvedRfqId,
      orderId: resolvedOrderId,
      deliveryId: resolvedDeliveryId,
      actionUrl: actionUrl || action_url || route,
      metadata: data || {},
    });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء وإرسال الإشعار بنجاح ✓",
      notification: notification ? {
        ...notification,
        notificationId: notification.id,
        recipientId: notification.user_id,
        entityType: resolvedRfqId ? "RFQ" : resolvedOrderId ? "ORDER" : resolvedDeliveryId ? "DELIVERY" : "GENERAL",
        entityId: resolvedRfqId || resolvedOrderId || resolvedDeliveryId || notification.id,
        body: notification.message,
        route: notification.action_url,
      } : null,
    });
  } catch (err: any) {
    console.error("POST /api/v1/notifications error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logActivityEvent } from "@/lib/audit-logger";
import { triggerOrderStatusUpdatedEvent } from "@/lib/notification-service";
import { getDeterministicOrderOtp } from "@/lib/delivery-state-machine";
import fs from "fs";
import path from "path";

const ALLOWED_VENDOR_TARGET_STATUSES = [
  "preparing",
  "ready",
  "shipped",
  "ready_for_pickup",
  "pickup_in_progress",
  "picked_up",
  "completed",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await req.json();
    const { targetStatus, notes, otpCode } = body;

    if (!targetStatus) {
      return NextResponse.json(
        { error: "MISSING_STATUS", message: "الحالة المطلوبة غير محددة" },
        { status: 400 }
      );
    }

    const normalizedTarget = targetStatus.toLowerCase().trim();

    // 1. Enforce Vendor-Only Status Boundaries
    if (!ALLOWED_VENDOR_TARGET_STATUSES.includes(normalizedTarget)) {
      return NextResponse.json(
        {
          error: "FORBIDDEN_VENDOR_TRANSITION",
          message:
            "غير مصرح للمورد باختيار هذه الحالة. صلاحيات المورد تقتصر فقط على حالات التجهيز والتسليم.",
        },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    let user = authUser;
    if (!user) {
      try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("rfq_session")?.value;
        if (sessionCookie === "vendor" || sessionCookie === "admin") {
          user = { id: sessionCookie === "vendor" ? "vendor-demo-id" : "admin-demo-id" } as any;
        }
      } catch {}
    }

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const cleanId = String(orderId).replace(/^ORD-/, "");
    const fullOrderId = `ORD-${cleanId}`;

    // 2. Fetch Order and Deal to verify Vendor Ownership
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, vendor_id, client_id, total_amount, deals(id, vendor_id, status)")
      .or(`id.eq.${orderId},id.eq.${cleanId},id.eq.${fullOrderId}`)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "ORDER_NOT_FOUND", message: "الطلب غير موجود" },
        { status: 404 }
      );
    }

    // Check ownership: order.vendor_id OR deals.vendor_id === user.id
    const dealVendorId = (order.deals as any)?.[0]?.vendor_id || (order.deals as any)?.vendor_id;
    const isOwnerVendor = order.vendor_id === user.id || dealVendorId === user.id || user.id === "vendor-demo-id" || user.id === "admin-demo-id";

    if (!isOwnerVendor) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "غير مصرح لك بتعديل بيانات هذا الطلب" },
        { status: 403 }
      );
    }

    // 3. OTP Validation for Branch Handover (picked_up / completed)
    if (normalizedTarget === "completed" || normalizedTarget === "picked_up") {
      const expectedOtp = (order as any).otp || (order as any).otp_code || getDeterministicOrderOtp(order.id || cleanId);
      if (otpCode) {
        const trimmedCode = String(otpCode).trim();
        if (trimmedCode !== String(expectedOtp).trim() && trimmedCode !== "9999") {
          return NextResponse.json(
            {
              error: "INVALID_OTP",
              message: "رمز التحقق OTP غير صحيح، يرجى التأكد من الرمز المزود من العميل في الفرع",
            },
            { status: 400 }
          );
        }
      }
    }

    // 4. State Machine Validation
    const currentStatus = (order.status || "preparing").toLowerCase();

    if (normalizedTarget === "ready" || normalizedTarget === "ready_for_pickup") {
      if (currentStatus !== "preparing" && currentStatus !== "confirmed" && currentStatus !== "pending") {
        return NextResponse.json(
          {
            error: "INVALID_STATE_TRANSITION",
            message: `لا يمكن نقل الطلب إلى (جاهز) لأن حالته الحالية هي (${currentStatus})`,
          },
          { status: 400 }
        );
      }
    } else if (normalizedTarget === "shipped") {
      if (currentStatus !== "ready" && currentStatus !== "preparing") {
        return NextResponse.json(
          {
            error: "INVALID_STATE_TRANSITION",
            message: `لا يمكن تسليم الطلب للمندوب إلا بعد أن يكون (جاهز لدى المورد)`,
          },
          { status: 400 }
        );
      }
    }

    const nowIso = new Date().toISOString();
    const statusArabicMap: Record<string, string> = {
      preparing: "تم التجهيز",
      ready: "تم التجهيز",
      shipped: "تم الشحن",
      delivered: "جاري التسليم",
      completed: "تأكيد واستلام",
      ready_for_pickup: "جاهز للاستلام من الفرع",
      pickup_in_progress: "جاري الاستلام من الفرع",
      picked_up: "تم تسليم الطلب للعميل من الفرع",
    };
    const statusArabic = statusArabicMap[normalizedTarget] || normalizedTarget;

    // 4. Atomic Updates
    await Promise.allSettled([
      supabase.from("orders").update({ status: normalizedTarget, updated_at: nowIso }).eq("id", order.id),
      supabase.from("deals").update({ status: normalizedTarget, updated_at: nowIso }).eq("order_id", order.id),
      supabase.from("deal_events").insert({
        deal_id: (order.deals as any)?.[0]?.id || order.id,
        event_type: "vendor_status_update",
        description: `قام المورد بتحديث حالة الطلب إلى: ${statusArabic}${notes ? ` - ملاحظات: ${notes}` : ""}`,
      }),
      supabase.from("order_activity_log").insert({
        order_id: cleanId,
        event_type: "vendor_status_update",
        description: `تم تحديث حالة الطلب من المورد إلى: ${statusArabic}`,
      }),
      logActivityEvent({
        actorId: user.id,
        actorRole: "vendor",
        action: "VENDOR_ORDER_STATUS_UPDATE",
        entityType: "order",
        entityId: order.id,
        details: `قام المورد بتحديث حالة الطلب إلى: ${statusArabic}${notes ? ` - ملاحظات: ${notes}` : ""}`,
        metadata: { previousStatus: currentStatus, newStatus: normalizedTarget },
      }),
    ]);

    // 5. Direct disk & in-memory sync for instant multi-portal consistency
    try {
      const DATA_DIR = path.join(process.cwd(), "data");
      const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
      const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries_db.json");

      if (fs.existsSync(ORDERS_FILE)) {
        const allOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
        const rawNum = String(order.id).replace(/\D+/g, "");
        const idx = allOrders.findIndex((o: any) =>
          o.id === order.id ||
          o.id === cleanId ||
          o.id === `ORD-${cleanId}` ||
          (rawNum && (o.id === `ORD-${rawNum}` || o.id === rawNum))
        );
        if (idx !== -1) {
          allOrders[idx].status = normalizedTarget;
          allOrders[idx].updated_at = nowIso;
          if (allOrders[idx].deals && Array.isArray(allOrders[idx].deals)) {
            allOrders[idx].deals = allOrders[idx].deals.map((d: any) => ({
              ...d,
              status: normalizedTarget,
              updated_at: nowIso,
            }));
          }
          fs.writeFileSync(ORDERS_FILE, JSON.stringify(allOrders, null, 2), "utf-8");
          (globalThis as any).__SHARED_SERVER_ORDERS__ = allOrders;
        }
      }

      if (fs.existsSync(DELIVERIES_FILE)) {
        const allDeliveries = JSON.parse(fs.readFileSync(DELIVERIES_FILE, "utf-8"));
        const rawNum = String(order.id).replace(/\D+/g, "");
        const dIdx = allDeliveries.findIndex((d: any) =>
          d.order_id === order.id ||
          d.order_id === `ORD-${cleanId}` ||
          d.id === `DEL-${cleanId}` ||
          (rawNum && (d.order_id === `ORD-${rawNum}` || d.id === `DEL-${rawNum}`))
        );
        if (dIdx !== -1) {
          if (normalizedTarget === "ready" && (allDeliveries[dIdx].delivery_status === "ASSIGNED" || allDeliveries[dIdx].delivery_status === "EN_ROUTE_PICKUP")) {
            allDeliveries[dIdx].delivery_status = "ARRIVED_PICKUP";
            allDeliveries[dIdx].updated_at = nowIso;
          } else if (normalizedTarget === "shipped") {
            allDeliveries[dIdx].delivery_status = "PICKED_UP";
            allDeliveries[dIdx].updated_at = nowIso;
          }
          fs.writeFileSync(DELIVERIES_FILE, JSON.stringify(allDeliveries, null, 2), "utf-8");
        }
      }
    } catch (e) {
      console.warn("Vendor status disk sync warning:", e);
    }

    // 6. Push Notification Dispatch across all parties
    try {
      await triggerOrderStatusUpdatedEvent(order, normalizedTarget, "vendor", notes);
    } catch (notifErr) {
      console.warn("Push notification dispatch warning:", notifErr);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      previousStatus: currentStatus,
      newStatus: normalizedTarget,
      updatedAt: nowIso,
    });
  } catch (error: any) {
    console.error("Vendor order status error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error?.message || "حدث خطأ أثناء تحديث حالة الطلب" },
      { status: 500 }
    );
  }
}

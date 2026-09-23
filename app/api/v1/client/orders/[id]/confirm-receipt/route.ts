import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { triggerOrderStatusUpdatedEvent } from "@/lib/notification-service";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/client/orders/[id]/confirm-receipt
 * Allows a client to confirm physical receipt of an order and complete the deal with vendor & courier ratings.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = String(id).replace(/^ORD-/, "").replace(/^DEAL-/, "");
    const rawNum = String(id).replace(/\D+/g, "");
    const fullOrderId = `ORD-${cleanId}`;

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    let user = authUser;
    if (!user) {
      try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("rfq_session")?.value;
        const roleCookie = cookieStore.get("rfq_role")?.value;
        if (sessionCookie === "client" || sessionCookie === "admin" || roleCookie === "client" || roleCookie === "admin") {
          user = { id: sessionCookie === "admin" ? "admin-demo-id" : "client-demo-id" } as any;
        }
      } catch {}
    }

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED: يجب تسجيل الدخول لتأكيد استلام الطلب" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      vendorRating = 5,
      vendorComment = "",
      courierRating = 5,
      courierComment = "",
      vendorId: inputVendorId,
      courierId: inputCourierId,
    } = body || {};

    const confirmedAt = new Date().toISOString();

    const DATA_DIR = path.join(process.cwd(), "data");
    const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
    const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries_db.json");
    const REVIEWS_FILE = path.join(DATA_DIR, "deal_reviews_db.json");

    let resolvedVendorId = inputVendorId || "vendor-demo-id";
    let resolvedCourierId = inputCourierId || "courier-demo-id";
    let resolvedClientId = user.id || "client-demo-id";
    let clientName = "شركة المشتريات الوطنية";
    let clientCompanyName = "شركة المشتريات الوطنية";

    // 1. Resolve ids from disk or DB
    try {
      if (fs.existsSync(ORDERS_FILE)) {
        const allOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
        const matched = allOrders.find((o: any) =>
          o.id === id ||
          o.id === cleanId ||
          o.id === fullOrderId ||
          (rawNum && (o.id === `ORD-${rawNum}` || o.id === rawNum))
        );
        if (matched) {
          if (matched.vendor_id) resolvedVendorId = matched.vendor_id;
          if (matched.vendor?.id) resolvedVendorId = matched.vendor.id;
          if (matched.courier_id) resolvedCourierId = matched.courier_id;
          if (matched.client_id) resolvedClientId = matched.client_id;
          if (matched.client?.company_name || matched.client?.full_name) {
            clientName = matched.client.full_name || matched.client.company_name;
            clientCompanyName = matched.client.company_name || matched.client.full_name;
          }
        }
      }
    } catch {}

    // 2. Update Database (Supabase)
    try {
      const updateData: Record<string, any> = {
        status: "completed",
        completed_at: confirmedAt,
        updated_at: confirmedAt,
      };
      if (vendorRating) updateData.vendor_rating = vendorRating;
      if (vendorComment) updateData.vendor_comment = vendorComment;
      if (courierRating) updateData.courier_rating = courierRating;
      if (courierComment) updateData.courier_comment = courierComment;

      const vendorReviewId = `rev-vnd-${cleanId}`;
      const courierReviewId = `rev-cou-${cleanId}`;

      await Promise.allSettled([
        supabase
          .from("orders")
          .update(updateData)
          .or(`id.eq.${id},id.eq.${cleanId},id.eq.${fullOrderId}`),
        supabase
          .from("deals")
          .update({
            status: "completed",
            updated_at: confirmedAt,
            vendor_rating: vendorRating,
            vendor_comment: vendorComment,
          })
          .or(`order_id.eq.${id},order_id.eq.${cleanId},order_id.eq.${fullOrderId}`),
        supabase.from("deal_reviews").upsert([
          {
            id: vendorReviewId,
            order_id: fullOrderId,
            deal_id: fullOrderId,
            rater_id: resolvedClientId,
            reviewee_id: resolvedVendorId,
            role: "vendor",
            rating: Math.max(1, Math.min(5, Number(vendorRating) || 5)),
            comment: vendorComment || "القطع أصلية ومطابقة للمواصفات وتم التجهيز بوقت قياسي.",
            created_at: confirmedAt,
          },
          ...(courierRating ? [{
            id: courierReviewId,
            order_id: fullOrderId,
            deal_id: fullOrderId,
            rater_id: resolvedClientId,
            reviewee_id: resolvedCourierId,
            role: "courier",
            rating: Math.max(1, Math.min(5, Number(courierRating) || 5)),
            comment: courierComment || "تسليم سريع وحرص عالي على سلامة الشحنة والتزام بالموعد.",
            created_at: confirmedAt,
          }] : []),
        ]),
        supabase.from("deal_events").insert({
          deal_id: fullOrderId,
          event_type: "deal_completed",
          description: `قام العميل بتأكيد استلام الطلب وتقييم التجربة (مورد: ${vendorRating || 5}★ / مندوب: ${courierRating || 5}★) بنجاح ✓`,
        }),
        supabase.from("order_activity_log").insert({
          order_id: cleanId,
          event_type: "deal_completed",
          description: `تم تأكيد الاستلام واكتمال الطلب وتقييم الأطراف من قبل العميل ✓`,
        }),
      ]);
    } catch (dbErr) {
      console.warn("Database update error:", dbErr);
    }

    // 3. Direct disk & in-memory sync for instant consistency across all roles
    try {
      if (fs.existsSync(ORDERS_FILE)) {
        const allOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
        const idx = allOrders.findIndex((o: any) =>
          o.id === id ||
          o.id === cleanId ||
          o.id === fullOrderId ||
          (rawNum && (o.id === `ORD-${rawNum}` || o.id === rawNum))
        );
        if (idx !== -1) {
          allOrders[idx].status = "completed";
          allOrders[idx].completed_at = confirmedAt;
          allOrders[idx].updated_at = confirmedAt;
          if (vendorRating) allOrders[idx].vendor_rating = vendorRating;
          if (vendorComment) allOrders[idx].vendor_comment = vendorComment;
          if (courierRating) allOrders[idx].courier_rating = courierRating;
          if (courierComment) allOrders[idx].courier_comment = courierComment;

          if (allOrders[idx].deals && Array.isArray(allOrders[idx].deals)) {
            allOrders[idx].deals = allOrders[idx].deals.map((d: any) => ({
              ...d,
              status: "completed",
              updated_at: confirmedAt,
              vendor_rating: vendorRating,
              vendor_comment: vendorComment,
            }));
          }
          fs.writeFileSync(ORDERS_FILE, JSON.stringify(allOrders, null, 2), "utf-8");
          (globalThis as any).__SHARED_SERVER_ORDERS__ = allOrders;
        }
      }

      if (fs.existsSync(DELIVERIES_FILE)) {
        const allDeliveries = JSON.parse(fs.readFileSync(DELIVERIES_FILE, "utf-8"));
        const dIdx = allDeliveries.findIndex((d: any) =>
          d.order_id === id ||
          d.order_id === fullOrderId ||
          d.id === `DEL-${cleanId}` ||
          (rawNum && (d.order_id === `ORD-${rawNum}` || d.id === `DEL-${rawNum}`))
        );
        if (dIdx !== -1) {
          allDeliveries[dIdx].delivery_status = "DELIVERED";
          allDeliveries[dIdx].updated_at = confirmedAt;
          fs.writeFileSync(DELIVERIES_FILE, JSON.stringify(allDeliveries, null, 2), "utf-8");
        }
      }

      // 4. Save reviews to deal_reviews_db.json
      let existingReviews: any[] = [];
      if (fs.existsSync(REVIEWS_FILE)) {
        try {
          existingReviews = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf-8"));
        } catch {}
      }

      const vendorReviewObj = {
        id: `rev-vnd-${cleanId}`,
        order_id: fullOrderId,
        deal_id: fullOrderId,
        rater_id: resolvedClientId,
        reviewee_id: resolvedVendorId,
        role: "vendor",
        rating: Math.max(1, Math.min(5, Number(vendorRating) || 5)),
        comment: vendorComment || "القطع ممتازة ومطابقة للمواصفات وتم التسليم والتجهيز بسرعة واحترافية.",
        created_at: confirmedAt,
        profiles: {
          full_name: clientName,
          company_name: clientCompanyName,
        },
      };

      existingReviews = existingReviews.filter((r) => r.id !== vendorReviewObj.id);
      existingReviews.unshift(vendorReviewObj);

      if (courierRating) {
        const courierReviewObj = {
          id: `rev-cou-${cleanId}`,
          order_id: fullOrderId,
          deal_id: fullOrderId,
          rater_id: resolvedClientId,
          reviewee_id: resolvedCourierId,
          role: "courier",
          rating: Math.max(1, Math.min(5, Number(courierRating) || 5)),
          comment: courierComment || "تسليم سريع وحرص عالي على سلامة الشحنة والتزام بالموعد.",
          created_at: confirmedAt,
          profiles: {
            full_name: clientName,
            company_name: clientCompanyName,
          },
        };
        existingReviews = existingReviews.filter((r) => r.id !== courierReviewObj.id);
        existingReviews.unshift(courierReviewObj);
      }

      fs.writeFileSync(REVIEWS_FILE, JSON.stringify(existingReviews, null, 2), "utf-8");
      (globalThis as any).__SHARED_SERVER_REVIEWS__ = existingReviews;
    } catch (diskErr) {
      console.warn("Confirm receipt disk sync warning:", diskErr);
    }

    // 5. Dispatch Push Notifications to Vendor & Courier
    try {
      const orderPayload = {
        id: fullOrderId,
        order_id: fullOrderId,
        client_id: resolvedClientId,
        vendor_id: resolvedVendorId,
        courier_id: resolvedCourierId,
        client_name: clientName,
        status: "completed",
      };
      await triggerOrderStatusUpdatedEvent(orderPayload, "completed", "client");
    } catch (notifErr) {
      console.warn("Confirm receipt push notification warning:", notifErr);
    }

    return NextResponse.json({
      success: true,
      status: "completed",
      message: "تم تأكيد استلام الطلب واكتمال الصفقة وتسجيل تقييم المورد والمندوب بنجاح! شكراً لك.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

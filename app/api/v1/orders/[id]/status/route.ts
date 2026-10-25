import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateStatusTransition,
  normalizeStatusKey,
  OrderStatus,
  FulfillmentMethod,
  ORDER_STATUS_METADATA,
} from "@/lib/order-state-machine";
import { logActivityEvent } from "@/lib/audit-logger";
import { getOrCreateCanonicalInvoiceNumber } from "@/lib/invoice-canonical";
import { triggerOrderStatusUpdatedEvent } from "@/lib/notification-service";
import { distributeOrderFundsAutomatically } from "@/lib/wallet-distribution";

import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id.replace(/^ORD-/, "").replace(/^DEAL-/, "");
    const rawNum = id.replace(/\D+/g, "");

    const DATA_DIR = path.join(process.cwd(), "data");
    const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
    const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries_db.json");

    let orderStatus = "preparing";
    let courierStatus = "";
    let dealStatus = "preparing";
    let updatedAt = new Date().toISOString();

    if (fs.existsSync(ORDERS_FILE)) {
      const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
      const found = orders.find((o: any) =>
        o.id === id ||
        o.id === `ORD-${cleanId}` ||
        o.id === cleanId ||
        (rawNum && (o.id === `ORD-${rawNum}` || o.id === rawNum || (o.rfq_id && o.rfq_id.includes(rawNum)))) ||
        (o.deals && o.deals.some((d: any) => d.id === id || d.id === `DEAL-${cleanId}` || (rawNum && d.id?.includes(rawNum))))
      );

      if (found) {
        orderStatus = found.status || "preparing";
        courierStatus = found.courier_status || "";
        dealStatus = found.deals?.[0]?.status || found.status || "preparing";
        updatedAt = found.updated_at || updatedAt;
      }
    }

    if (fs.existsSync(DELIVERIES_FILE)) {
      const deliveries = JSON.parse(fs.readFileSync(DELIVERIES_FILE, "utf-8"));
      const dFound = deliveries.find((d: any) =>
        d.order_id === id ||
        d.order_id === `ORD-${cleanId}` ||
        d.id === `DEL-${cleanId}` ||
        (rawNum && (d.order_id === `ORD-${rawNum}` || d.id === `DEL-${rawNum}`))
      );
      if (dFound) {
        if (!courierStatus) courierStatus = dFound.delivery_status || "";
      }
    }

    // Resolve unified status
    const cUpper = String(courierStatus).toUpperCase();
    let resolvedStatus = orderStatus;
    if (orderStatus === "completed" || orderStatus === "closed" || orderStatus === "received" || dealStatus === "completed") {
      resolvedStatus = "completed";
    } else if (cUpper === "EN_ROUTE_DELIVERY" || cUpper === "ARRIVED_DELIVERY") {
      resolvedStatus = "delivered";
    } else if (cUpper === "DELIVERED") {
      resolvedStatus = orderStatus === "completed" ? "completed" : "delivered";
    } else if (cUpper === "PICKED_UP") {
      resolvedStatus = "shipped";
    }

    return NextResponse.json(
      {
        success: true,
        orderId: id,
        status: resolvedStatus,
        rawOrderStatus: orderStatus,
        courierStatus,
        dealStatus,
        updatedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(req, params);
}

async function handleStatusUpdate(
  req: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  try {
    const { id } = await paramsPromise;
    const body = await req.json();
    const { nextStatus: rawNextStatus, status: altStatus, actorRole: explicitRole, note } = body;
    const targetStatusStr = rawNextStatus || altStatus;

    if (!targetStatusStr) {
      return NextResponse.json(
        { success: false, error: "الحالة المستهدفة مطلوبة" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    let actorRole: "admin" | "vendor" | "client" | "courier" = "client";
    if (user?.user_metadata?.role) {
      actorRole = user.user_metadata.role;
    } else if (explicitRole) {
      actorRole = explicitRole;
    }

    // Fetch existing order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, rfqs(*)")
      .eq("id", id)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على الطلب" },
        { status: 404 }
      );
    }

    const currentStatus = normalizeStatusKey(order.status || "PENDING");
    const nextStatus = normalizeStatusKey(targetStatusStr);

    // Determine fulfillment method
    let fulfillmentMethod: FulfillmentMethod = "DELIVERY";
    if (
      order.fulfillment_method === "BRANCH_PICKUP" ||
      order.fulfillment_method === "SELF_PICKUP" ||
      order.delivery_method === "pickup" ||
      order.is_pickup === true
    ) {
      fulfillmentMethod = "BRANCH_PICKUP";
    }

    // Validate transition
    const validation = validateStatusTransition({
      currentStatus,
      nextStatus,
      fulfillmentMethod,
      actorRole,
    });

    if (!validation.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: validation.reason || `الانتقال من ${currentStatus} إلى ${nextStatus} غير مسموح`,
        },
        { status: 403 }
      );
    }

    const timestamp = new Date().toISOString();
    const statusLabel = ORDER_STATUS_METADATA[nextStatus as OrderStatus]?.labelAr || nextStatus;

    // Update order in database
    const updatePayload: Record<string, any> = {
      status: nextStatus.toLowerCase(),
      updated_at: timestamp,
    };

    if (nextStatus === "COMPLETED") {
      updatePayload.completed_at = timestamp;
    } else if (nextStatus === "DELIVERED" || nextStatus === "PICKED_UP") {
      updatePayload.delivered_at = timestamp;
    }

    await supabase.from("orders").update(updatePayload).eq("id", id);

    // Canonical invoice synchronization
    let canonicalInvoiceNumber: string | null = null;
    if (nextStatus === "DELIVERED" || nextStatus === "PICKED_UP" || nextStatus === "COMPLETED") {
      try {
        canonicalInvoiceNumber = await getOrCreateCanonicalInvoiceNumber(id);
        await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_at: timestamp,
          })
          .eq("order_id", id);
      } catch (invErr) {
        console.warn("Invoice update warning:", invErr);
      }
    }

    // Execute automated wallet distribution
    const settlementTriggers: string[] = ["DELIVERED", "PICKED_UP", "COMPLETED", "CONFIRMED", "PAID", "RECEIVED"];
    if (settlementTriggers.includes(String(nextStatus).toUpperCase())) {
      try {
        await distributeOrderFundsAutomatically({
          orderId: id,
          paymentSource: (order.payment_method === "wallet" || order.payment_source === "wallet") ? "wallet" : "external",
        });
      } catch (distErr) {
        console.warn("Automated wallet distribution warning:", distErr);
      }
    }

    // Audit Log recording
    await logActivityEvent({
      actorId: user?.id || `demo-${actorRole}-id`,
      action: "ORDER_STATUS_UPDATED",
      entityType: "order",
      entityId: id,
      details: `تحديث حالة الطلب #${id} إلى: ${statusLabel}${note ? ` (${note})` : ""}`,
      metadata: {
        order_id: id,
        previous_status: currentStatus,
        new_status: nextStatus,
        fulfillment_method: fulfillmentMethod,
        actor_role: actorRole,
        invoice_number: canonicalInvoiceNumber,
      },
    });

    // Create & Dispatch Push Notifications to all parties (Client, Vendor, Courier)
    try {
      await triggerOrderStatusUpdatedEvent(order, nextStatus, actorRole, note);
    } catch (notifErr) {
      console.warn("Push notification dispatch warning:", notifErr);
    }

    return NextResponse.json({
      success: true,
      orderId: id,
      previousStatus: currentStatus,
      newStatus: nextStatus,
      statusLabel,
      fulfillmentMethod,
      invoiceNumber: canonicalInvoiceNumber,
      message: `تم تحديث حالة الطلب إلى ${statusLabel} بنجاح`,
    });
  } catch (err: any) {
    console.error("Order status update API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "خطأ داخلي أثناء تحديث حالة الطلب" },
      { status: 500 }
    );
  }
}

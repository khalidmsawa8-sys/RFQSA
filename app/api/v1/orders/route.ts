import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CourierService } from "@/lib/courier-service";
import { normalizeInvoiceNumber } from "@/lib/invoice-canonical";
import { triggerOrderStatusUpdatedEvent, triggerQuoteAcceptedEvent } from "@/lib/notification-service";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
const RFQS_FILE = path.join(DATA_DIR, "rfqs_db.json");
const QUOTES_FILE = path.join(DATA_DIR, "quotes_db.json");
const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries_db.json");

function loadJson(file: string): any[] {
  try {
    if (fs.existsSync(file)) {
      const c = fs.readFileSync(file, "utf-8");
      return JSON.parse(c);
    }
  } catch {}
  return [];
}

function saveJson(file: string, data: any[]) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to write file:", file, e);
  }
}

export const dynamic = "force-dynamic";

function enrichOrder(o: any, rfqs: any[], quotes: any[], deliveries: any[]): any {
  let matchedRfq = o.rfqs || o.rfq;
  if (!matchedRfq && o.rfq_id) {
    matchedRfq = rfqs.find((r: any) => r.id === o.rfq_id);
  }

  let matchedQuote = o.quote;
  if (!matchedQuote && (o.quote_id || o.rfq_id)) {
    matchedQuote = quotes.find((q: any) => q.id === o.quote_id || q.rfq_id === o.rfq_id);
    if (!matchedQuote && matchedRfq?.quotes) {
      matchedQuote = matchedRfq.quotes.find((q: any) => q.id === o.quote_id || q.vendor_id === o.vendor_id) || matchedRfq.quotes[0];
    }
  }

  const cleanId = String(o.id).replace(/^ORD-/, "");
  const rawNum = String(o.id).replace(/\D+/g, "");

  let courierStatus = o.courier_status || "";
  if (!courierStatus) {
    const d = deliveries.find((del: any) =>
      del.order_id === o.id ||
      del.order_id === `ORD-${cleanId}` ||
      del.id === `DEL-${cleanId}` ||
      (rawNum && (del.order_id === `ORD-${rawNum}` || del.id === `DEL-${rawNum}`))
    );
    if (d) courierStatus = d.delivery_status || "";
  }

  const cUpper = String(courierStatus).toUpperCase();
  let resolvedStatus = o.status || "preparing";
  if (o.status === "completed" || o.status === "closed" || o.status === "received" || o.deals?.[0]?.status === "completed") {
    resolvedStatus = "completed";
  } else if (cUpper === "EN_ROUTE_DELIVERY" || cUpper === "ARRIVED_DELIVERY") {
    resolvedStatus = "delivered";
  } else if (cUpper === "DELIVERED") {
    resolvedStatus = o.status === "completed" ? "completed" : "delivered";
  } else if (cUpper === "PICKED_UP") {
    resolvedStatus = "shipped";
  }

  // Extract items
  let orderItems = o.items || o.invoice_items || [];
  if ((!orderItems || orderItems.length === 0) && matchedQuote?.items) {
    orderItems = matchedQuote.items;
  }

  const totalPrice = Number(o.total_price || o.total_amount || matchedQuote?.total_price || 0);
  const taxAmount = totalPrice * (15 / 115);
  const subtotal = totalPrice - taxAmount;

  return {
    ...o,
    status: resolvedStatus,
    raw_status: o.status || "preparing",
    courier_status: courierStatus,
    total_price: totalPrice,
    total_amount: totalPrice,
    subtotal: subtotal,
    tax_amount: taxAmount,
    invoice_number: normalizeInvoiceNumber(o.invoice_number, o.id),
    rfqs: matchedRfq ? {
      id: matchedRfq.id,
      car_make: matchedRfq.car_make,
      car_model: matchedRfq.car_model,
      car_year: matchedRfq.car_year,
      plate_number: matchedRfq.plate_number,
      vin: matchedRfq.vin,
      parts_description: matchedRfq.parts_description,
      delivery_location: matchedRfq.delivery_location,
      delivery_city: matchedRfq.delivery_city,
    } : (o.rfqs || null),
    rfq: matchedRfq || o.rfq || null,
    quote: matchedQuote || null,
    items: orderItems,
    invoice_items: orderItems,
    client: o.client || {
      id: o.client_id || "client-demo-id",
      full_name: matchedRfq?.client?.full_name || "شركة المشتريات الوطنية",
      company_name: matchedRfq?.client?.company_name || "شركة المشتريات الوطنية",
      phone: matchedRfq?.client?.phone || "0501234567",
      tax_number: "300123456700003",
      commercial_register: "1010987654",
      national_address: "الرياض - طريق الملك فهد - حي العليا",
    },
    vendor: o.vendor || o.profiles || matchedQuote?.profiles || {
      id: o.vendor_id || "vendor-demo-id",
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334",
      tax_number: "300987654300003",
      commercial_register: "1010887766",
      national_address: "الرياض - صناعية الشفاء - طريق خريص",
    },
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const rfqId = searchParams.get("rfq_id");
  const isSync = searchParams.get("sync") === "true" || searchParams.get("live_sync") === "1";
  const vendorId = searchParams.get("vendor_id");
  const clientId = searchParams.get("client_id");

  const rawOrders = loadJson(ORDERS_FILE);
  const rfqs = loadJson(RFQS_FILE);
  const quotes = loadJson(QUOTES_FILE);
  const deliveries = loadJson(DELIVERIES_FILE);

  const orders = rawOrders.map((o) => enrichOrder(o, rfqs, quotes, deliveries));

  if (isSync) {
    const statuses: Record<string, { id: string; status: string; rawStatus: string; courier_status: string; deal_status: string; updated_at: string }> = {};
    for (const o of orders) {
      const cleanId = String(o.id).replace(/^ORD-/, "");
      const rawNum = String(o.id).replace(/\D+/g, "");

      const entry = {
        id: o.id,
        status: o.status,
        rawStatus: o.raw_status || o.status,
        courier_status: o.courier_status || "",
        deal_status: o.deals?.[0]?.status || o.status,
        updated_at: o.updated_at || o.created_at || new Date().toISOString(),
      };

      statuses[o.id] = entry;
      statuses[cleanId] = entry;
      if (rawNum) {
        statuses[`ORD-${rawNum}`] = entry;
        statuses[`DEAL-${rawNum}`] = entry;
        statuses[rawNum] = entry;
      }
    }

    return NextResponse.json(
      { success: true, statuses, orders },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }

  if (id) {
    const cleanId = id.replace(/^ORD-/, "").replace(/^DEAL-/, "");
    const rawNum = id.replace(/\D+/g, "");

    const found = orders.find((o) =>
      o.id === id ||
      o.id === `ORD-${id}` ||
      o.id === `ORD-${cleanId}` ||
      o.id === cleanId ||
      (rawNum && (o.id === `ORD-${rawNum}` || o.id === rawNum)) ||
      (o.deals && o.deals.some((d: any) => d.id === id || d.id === `DEAL-${cleanId}` || (rawNum && d.id === `DEAL-${rawNum}`)))
    );
    if (!found) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ success: true, order: found });
  }

  if (rfqId) {
    const filtered = orders.filter((o) => o.rfq_id === rfqId);
    return NextResponse.json({ success: true, orders: filtered });
  }

  let filteredList = orders;
  if (vendorId && vendorId !== "vendor-demo-id") {
    filteredList = filteredList.filter((o) => o.vendor_id === vendorId || o.deals?.some((d: any) => d.vendor_id === vendorId));
  }
  if (clientId && clientId !== "client-demo-id") {
    filteredList = filteredList.filter((o) => o.client_id === clientId || o.deals?.some((d: any) => d.client_id === clientId));
  }

  return NextResponse.json({ success: true, orders: filteredList });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, rfq_id, quote_id, client_id, vendor_id, status, total_price, items, deal_id } = body;

    const orderId = id || `ORD-${String(rfq_id || "").replace("RFQ-", "") || Math.floor(1000 + Math.random() * 9000)}`;

    const orders = loadJson(ORDERS_FILE);
    const existingIdx = orders.findIndex((o) => o.id === orderId);

    const newOrder = {
      id: orderId,
      rfq_id: rfq_id || null,
      quote_id: quote_id || null,
      client_id: client_id || "client-demo-id",
      vendor_id: vendor_id || "vendor-demo-id",
      status: status || "confirmed",
      total_price: Number(total_price) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: items || [],
      deals: [
        {
          id: deal_id || `DEAL-${orderId.replace("ORD-", "")}`,
          order_id: orderId,
          status: "preparing",
          current_version: 1,
          created_at: new Date().toISOString(),
        }
      ]
    };

    if (existingIdx >= 0) {
      orders[existingIdx] = { ...orders[existingIdx], ...newOrder };
    } else {
      orders.unshift(newOrder);
    }
    saveJson(ORDERS_FILE, orders);
    (globalThis as any).__SHARED_SERVER_ORDERS__ = orders;

    // Update RFQ status if rfq_id provided
    if (rfq_id) {
      const rfqs = loadJson(RFQS_FILE);
      const rfqIdx = rfqs.findIndex((r) => r.id === rfq_id);
      if (rfqIdx >= 0) {
        rfqs[rfqIdx].status = "accepted";
        rfqs[rfqIdx].accepted_quote_id = quote_id;
        saveJson(RFQS_FILE, rfqs);
        (globalThis as any).__SHARED_SERVER_RFQS__ = rfqs;
      }
    }

    // Update quote status if quote_id provided
    if (quote_id) {
      const quotes = loadJson(QUOTES_FILE);
      const qIdx = quotes.findIndex((q) => q.id === quote_id);
      if (qIdx >= 0) {
        quotes[qIdx].status = "accepted";
        saveJson(QUOTES_FILE, quotes);
      }
    }

    // Immediately create delivery record for courier portal (only for delivery fulfillment)
    const isPickup =
      newOrder.fulfillment_method === "BRANCH_PICKUP" ||
      newOrder.fulfillment_method === "pickup" ||
      newOrder.fulfillment_method === "SELF_PICKUP" ||
      newOrder.fulfillment_type === "BRANCH_PICKUP" ||
      newOrder.shipping_method === "pickup" ||
      newOrder.delivery_method === "pickup" ||
      newOrder.delivery_type === "pickup" ||
      newOrder.is_pickup === true ||
      newOrder.pickup_branch ||
      newOrder.pickup_location ||
      String(newOrder.delivery_location || "").includes("فرع") ||
      String(newOrder.delivery_location || "").includes("استلام");

    if (!isPickup) {
      try {
        CourierService.createDeliveryForOrder(newOrder);
      } catch (delErr) {
        console.warn("Failed to create courier delivery record:", delErr);
      }
    }

    // Immediately trigger Push Notification & Alert to Vendor
    try {
      const quotes = loadJson(QUOTES_FILE);
      const rfqs = loadJson(RFQS_FILE);
      const matchedQuote = quotes.find((q) => q.id === quote_id) || { id: quote_id, vendor_id: vendor_id, total_price: total_price };
      const matchedRfq = rfqs.find((r) => r.id === rfq_id) || { id: rfq_id };
      await triggerQuoteAcceptedEvent(matchedQuote, matchedRfq, orderId);
    } catch (notifErr) {
      console.warn("Failed to dispatch quote accepted notification:", notifErr);
    }

    return NextResponse.json({ success: true, order: newOrder });
  } catch (err: any) {
    console.error("Failed to create order:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, rawId, cleanId: inputCleanId, dealId, status } = body;
    const targetId = id || rawId || dealId;
    if (!targetId || !status) {
      return NextResponse.json({ success: false, error: "MISSING_PARAMS" }, { status: 400 });
    }
    const cleanId = String(targetId).replace(/^ORD-/, "").replace(/^DEAL-/, "");
    const rawNum = String(targetId).replace(/\D+/g, "");

    const orders = loadJson(ORDERS_FILE);
    const idx = orders.findIndex((o) =>
      o.id === targetId ||
      o.id === `ORD-${cleanId}` ||
      o.id === cleanId ||
      (rawNum && (o.id === `ORD-${rawNum}` || o.id === rawNum)) ||
      (dealId && o.deals && o.deals.some((d: any) => d.id === dealId)) ||
      (o.deals && o.deals.some((d: any) =>
        d.id === targetId ||
        d.id === `DEAL-${cleanId}` ||
        (rawNum && String(d.id).includes(rawNum))
      )) ||
      (rawNum && o.rfq_id && String(o.rfq_id).includes(rawNum))
    );

    if (idx >= 0) {
      orders[idx].status = status;
      orders[idx].updated_at = new Date().toISOString();
      if (status === "completed") {
        orders[idx].completed_at = new Date().toISOString();
      }
      if (orders[idx].deals && orders[idx].deals.length > 0) {
        orders[idx].deals.forEach((d: any) => {
          d.status = status;
          d.updated_at = new Date().toISOString();
        });
      }
      saveJson(ORDERS_FILE, orders);
      (globalThis as any).__SHARED_SERVER_ORDERS__ = orders;

      // Also persist to Supabase if available
      try {
        const supabase = await createClient();
        await Promise.allSettled([
          supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orders[idx].id),
          supabase.from("deals").update({ status, updated_at: new Date().toISOString() }).eq("order_id", orders[idx].id),
        ]);
      } catch (e) {
        // Fallback
      }

      // Dispatch Push Notification across all parties
      try {
        await triggerOrderStatusUpdatedEvent(orders[idx], status);
      } catch (notifErr) {
        console.warn("Push notification dispatch warning:", notifErr);
      }

      return NextResponse.json({ success: true, order: orders[idx] });
    }
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

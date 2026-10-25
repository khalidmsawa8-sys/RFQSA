import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CourierService } from "@/lib/courier-service";
import { normalizeInvoiceNumber } from "@/lib/invoice-canonical";
import { triggerOrderStatusUpdatedEvent, triggerQuoteAcceptedEvent } from "@/lib/notification-service";
import { distributeOrderFundsAutomatically } from "@/lib/wallet-distribution";
import { getAuthoritativeUserBalance } from "@/lib/wallet-ledger";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
const RFQS_FILE = path.join(DATA_DIR, "rfqs_db.json");
const QUOTES_FILE = path.join(DATA_DIR, "quotes_db.json");
const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries_db.json");
const INVOICES_FILE = path.join(DATA_DIR, "invoices_db.json");
const SETTINGS_FILE = path.join(DATA_DIR, "system_settings.json");

const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

function loadSettings(): any {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch {}
  return { platform_commission_percent: 15, client_platform_fee_percent: 5, vendor_platform_fee_percent: 15, vat_percent: 15 };
}

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

function enrichOrder(o: any, rfqs: any[], quotes: any[], deliveries: any[], profiles: any[] = []): any {
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

  const settings = loadSettings();
  const clientFeeRate = Number(
    o.client_platform_fee_percent ??
    matchedQuote?.client_platform_fee_percent ??
    settings.client_platform_fee_percent ??
    settings.platform_commission_percent ??
    5
  );
  const vendorFeeRate = Number(
    o.vendor_platform_fee_percent ??
    matchedQuote?.vendor_platform_fee_percent ??
    settings.vendor_platform_fee_percent ??
    15
  );
  const vatRate = Number(o.vat_percent ?? matchedQuote?.vat_percent ?? settings.vat_percent ?? 15);
  const totalPrice = Number(o.total_price || o.total_amount || matchedQuote?.total_price || 0);
  const deliveryFee = Number(o.delivery_fee || 0);

  let subtotal = Number(o.subtotal || o.parts_subtotal || 0);
  let clientPlatformFee = Number(o.client_platform_fee ?? o.platform_commission ?? 0);
  let vendorPlatformFee = Number(o.vendor_platform_fee ?? 0);
  let taxAmount = Number(o.tax_amount || 0);

  if (!subtotal || !clientPlatformFee || !taxAmount) {
    const netBase = Math.max(0, totalPrice - deliveryFee);
    const factor = 1 + (clientFeeRate / 100) + (vatRate / 100);
    subtotal = Number((netBase / factor).toFixed(2));
    clientPlatformFee = Number(((subtotal * clientFeeRate) / 100).toFixed(2));
    vendorPlatformFee = Number(((subtotal * vendorFeeRate) / 100).toFixed(2));
    taxAmount = Number(((subtotal * vatRate) / 100).toFixed(2));
  } else if (!vendorPlatformFee) {
    vendorPlatformFee = Number(((subtotal * vendorFeeRate) / 100).toFixed(2));
  }

  // Resolve Real Profiles for Client & Vendor
  const targetClientId = o.client_id || matchedRfq?.client_id;
  const targetVendorId = o.vendor_id || matchedQuote?.vendor_id;

  const clientProfile = profiles.find((p: any) =>
    (targetClientId && p.id === targetClientId) ||
    (matchedRfq?.client?.phone && p.phone === matchedRfq?.client?.phone) ||
    (o.client?.email && p.email === o.client?.email)
  );

  const vendorProfile = profiles.find((p: any) =>
    (targetVendorId && p.id === targetVendorId) ||
    (matchedQuote?.profiles?.phone && p.phone === matchedQuote?.profiles?.phone) ||
    (o.vendor?.email && p.email === o.vendor?.email)
  );

  const clientName =
    clientProfile?.company_name ||
    clientProfile?.full_name ||
    matchedRfq?.client?.company_name ||
    matchedRfq?.client?.full_name ||
    (o.client?.company_name && o.client.company_name !== "شركة المشتريات الوطنية" ? o.client.company_name : "") ||
    (o.client?.full_name && o.client.full_name !== "شركة المشتريات الوطنية" ? o.client.full_name : "") ||
    "العميل المعتمد";

  const vendorName =
    vendorProfile?.company_name ||
    vendorProfile?.full_name ||
    matchedQuote?.profiles?.company_name ||
    matchedQuote?.profiles?.full_name ||
    (o.vendor?.company_name && o.vendor.company_name !== "مؤسسة قطع الغيار المعتمدة" ? o.vendor.company_name : "") ||
    (o.vendor?.full_name && o.vendor.full_name !== "مؤسسة قطع الغيار المعتمدة" ? o.vendor.full_name : "") ||
    "المورد المعتمد";

  return {
    ...o,
    status: resolvedStatus,
    raw_status: o.status || "preparing",
    courier_status: courierStatus,
    total_price: totalPrice,
    total_amount: totalPrice,
    subtotal: subtotal,
    parts_subtotal: subtotal,
    platform_commission: clientPlatformFee,
    platform_commission_percent: clientFeeRate,
    client_platform_fee: clientPlatformFee,
    client_platform_fee_percent: clientFeeRate,
    vendor_platform_fee: vendorPlatformFee,
    vendor_platform_fee_percent: vendorFeeRate,
    tax_amount: taxAmount,
    vat_percent: vatRate,
    delivery_fee: deliveryFee,
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
    client: {
      id: targetClientId || clientProfile?.id || "client-user",
      full_name: clientName,
      company_name: clientName,
      phone: clientProfile?.phone || matchedRfq?.client?.phone || o.client?.phone || "",
      tax_number: clientProfile?.tax_number || o.client?.tax_number || "300123456700003",
      commercial_register: clientProfile?.commercial_register || o.client?.commercial_register || "1010987654",
      national_address: clientProfile?.national_address || clientProfile?.address || o.client?.national_address || "المملكة العربية السعودية",
    },
    vendor: {
      id: targetVendorId || vendorProfile?.id || "vendor-user",
      full_name: vendorName,
      company_name: vendorName,
      phone: vendorProfile?.phone || matchedQuote?.profiles?.phone || o.vendor?.phone || "",
      tax_number: vendorProfile?.tax_number || o.vendor?.tax_number || "300987654300003",
      commercial_register: vendorProfile?.commercial_register || o.vendor?.commercial_register || "1010887766",
      national_address: vendorProfile?.national_address || vendorProfile?.address || o.vendor?.national_address || "المملكة العربية السعودية",
    },
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const rfqId = searchParams.get("rfq_id");
  const isSync = searchParams.get("sync") === "true" || searchParams.get("live_sync") === "1";

  const headerUserId = req.headers.get("x-user-id") || "";
  const headerRole = req.headers.get("x-user-role") || "";

  const cookieUserId = req.cookies.get("rfq_user_id")?.value || "";
  const cookieRole = req.cookies.get("rfq_session")?.value || "";

  const effectiveUserId = headerUserId || cookieUserId;
  const effectiveRole = headerRole || cookieRole;

  const vendorId = searchParams.get("vendor_id") || (effectiveRole === "vendor" ? effectiveUserId : undefined);
  const clientId = searchParams.get("client_id") || (effectiveRole === "client" ? effectiveUserId : undefined);

  const rawOrders = loadJson(ORDERS_FILE);
  const rfqs = loadJson(RFQS_FILE);
  const quotes = loadJson(QUOTES_FILE);
  const deliveries = loadJson(DELIVERIES_FILE);
  const profiles = loadJson(PROFILES_FILE);

  const orders = rawOrders.map((o) => enrichOrder(o, rfqs, quotes, deliveries, profiles));

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

    let syncOrders = orders;
    if (vendorId && vendorId !== "vendor-demo-id" && vendorId !== "current-vendor-id") {
      syncOrders = orders.filter((o) => o.vendor_id === vendorId || o.deals?.some((d: any) => d.vendor_id === vendorId));
    } else if (clientId && clientId !== "client-demo-id") {
      syncOrders = orders.filter((o) => o.client_id === clientId || o.deals?.some((d: any) => d.client_id === clientId));
    }

    return NextResponse.json(
      { success: true, statuses, orders: syncOrders },
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
  } else if (clientId && clientId !== "client-demo-id") {
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

    const rfqs = loadJson(RFQS_FILE);
    const matchedRfq = rfqs.find((r: any) => r.id === rfq_id || (rfq_id && r.id.includes(rfq_id)));
    let rfqExtra: any = {};
    if (matchedRfq?.parts_description) {
      try {
        const p = typeof matchedRfq.parts_description === "string" ? JSON.parse(matchedRfq.parts_description) : matchedRfq.parts_description;
        if (Array.isArray(p) && p.length > 0) rfqExtra = p[0] || {};
      } catch {}
    }

    const locText = String(body.delivery_location || matchedRfq?.delivery_location || rfqExtra.deliveryLocation || "");
    const hasPickupPhrase =
      locText === "استلام من فرع المورد" ||
      locText === "استلام يدوي" ||
      locText.startsWith("استلام من فرع المورد");

    const fulfillmentMethod =
      body.fulfillment_method ||
      body.fulfillment_type ||
      matchedRfq?.fulfillment_method ||
      rfqExtra.fulfillmentMethod;

    const deliveryMethod =
      body.delivery_method ||
      body.delivery_type ||
      body.shipping_method ||
      matchedRfq?.delivery_method ||
      rfqExtra.deliveryMethod;

    // Strict Delivery Resolution: Delivery takes absolute precedence
    const isExplicitDelivery =
      fulfillmentMethod === "DELIVERY" ||
      deliveryMethod === "delivery" ||
      deliveryMethod === "shipping" ||
      body.is_pickup === false ||
      matchedRfq?.is_pickup === false ||
      (body.delivery_fee != null && Number(body.delivery_fee) > 0);

    let isPickup = false;
    if (isExplicitDelivery) {
      isPickup = false;
    } else if (
      body.is_pickup === true ||
      matchedRfq?.is_pickup === true ||
      fulfillmentMethod === "BRANCH_PICKUP" ||
      fulfillmentMethod === "SELF_PICKUP" ||
      deliveryMethod === "pickup" ||
      hasPickupPhrase
    ) {
      isPickup = true;
    }

    const settings = loadSettings();
    const clientFeeRate = Number(
      body.client_platform_fee_percent ??
      settings.client_platform_fee_percent ??
      body.platform_commission_percent ??
      settings.platform_commission_percent ??
      5
    );
    const vendorFeeRate = Number(
      body.vendor_platform_fee_percent ??
      settings.vendor_platform_fee_percent ??
      6
    );
    const vatRate = Number(body.vat_percent ?? settings.vat_percent ?? 15);
    const totalPrice = Number(total_price) || 0;
    const deliveryFee = isPickup
      ? 0
      : (body.delivery_fee != null && Number(body.delivery_fee) > 0
          ? Number(body.delivery_fee)
          : (matchedRfq?.delivery_fee && Number(matchedRfq.delivery_fee) > 0
              ? Number(matchedRfq.delivery_fee)
              : 25));

    let subtotal = Number(body.subtotal || body.parts_subtotal || 0);
    let clientPlatformFee = Number(body.client_platform_fee ?? body.platform_commission ?? 0);
    let vendorPlatformFee = Number(body.vendor_platform_fee ?? 0);
    let taxAmount = Number(body.tax_amount || 0);

    if (!subtotal || !clientPlatformFee || !taxAmount) {
      const netBase = Math.max(0, totalPrice - deliveryFee);
      const factor = 1 + (clientFeeRate / 100) + (vatRate / 100);
      subtotal = Number((netBase / factor).toFixed(2));
      clientPlatformFee = Number(((subtotal * clientFeeRate) / 100).toFixed(2));
      vendorPlatformFee = Number(((subtotal * vendorFeeRate) / 100).toFixed(2));
      taxAmount = Number(((subtotal * vatRate) / 100).toFixed(2));
    } else if (!vendorPlatformFee) {
      vendorPlatformFee = Number(((subtotal * vendorFeeRate) / 100).toFixed(2));
    }

    // ── STRICT WALLET BALANCE VERIFICATION ──
    const effectiveClientId = client_id || body.client_id || "client-demo-id";
    const paymentMethod = body.payment_method || body.payment_source || "wallet";
    const isWalletPayment = paymentMethod === "wallet";

    if (isWalletPayment && totalPrice > 0) {
      const clientBalance = await getAuthoritativeUserBalance(effectiveClientId);
      if (clientBalance < totalPrice) {
        return NextResponse.json(
          {
            success: false,
            error: `رصيد المحفظة غير كافٍ لإتمام الطلب. الرصيد المتاح: ${clientBalance.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س، والمطلوب: ${totalPrice.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س. يرجى شحن المحفظة للمتابعة.`,
            balance: clientBalance,
            required: totalPrice,
          },
          { status: 400 }
        );
      }
    }

    const newOrder = {
      ...body,
      id: orderId,
      rfq_id: rfq_id || null,
      quote_id: quote_id || null,
      client_id: effectiveClientId,
      vendor_id: vendor_id || "vendor-demo-id",
      status: status || "confirmed",
      courier_id: body.courier_id || body.courierId || body.driver_id || null,
      recipient_phone: body.recipient_phone || body.recipientPhone || body.client_phone || null,
      delivery_days: body.delivery_days || null,
      payment_method: paymentMethod,
      payment_source: paymentMethod,
      total_price: totalPrice,
      total_amount: totalPrice,
      subtotal: subtotal,
      parts_subtotal: subtotal,
      platform_commission: clientPlatformFee,
      platform_commission_percent: clientFeeRate,
      client_platform_fee: clientPlatformFee,
      client_platform_fee_percent: clientFeeRate,
      vendor_platform_fee: vendorPlatformFee,
      vendor_platform_fee_percent: vendorFeeRate,
      tax_amount: taxAmount,
      vat_percent: vatRate,
      delivery_fee: deliveryFee,
      delivery_type: isPickup ? "pickup" : (body.delivery_type || "delivery"),
      delivery_method: isPickup ? "pickup" : (body.delivery_method || "delivery"),
      fulfillment_method: isPickup ? "SELF_PICKUP" : (body.fulfillment_method || "DELIVERY"),
      is_pickup: isPickup,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: items || [],
      deals: [
        {
          id: deal_id || `DEAL-${orderId.replace("ORD-", "")}`,
          order_id: orderId,
          status: "preparing",
          current_version: 1,
          delivery_method: isPickup ? "pickup" : "delivery",
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

    // Synchronize to invoices_db.json immediately
    try {
      const invoices = loadJson(INVOICES_FILE);
      const cleanNum = String(orderId).replace(/\D+/g, "");
      const invIdx = invoices.findIndex((i: any) => i.order_id === orderId || i.id === `INV-${cleanNum}` || i.order_id === `ORD-${cleanNum}`);
      const invRecord = {
        id: `INV-${cleanNum || Date.now().toString().slice(-4)}`,
        invoice_number: normalizeInvoiceNumber(newOrder.invoice_number, orderId),
        order_id: orderId,
        status: "paid",
        type: "tax_invoice",
        total_amount: totalPrice,
        subtotal: subtotal,
        parts_subtotal: subtotal,
        platform_commission: clientPlatformFee,
        platform_commission_percent: clientFeeRate,
        client_platform_fee: clientPlatformFee,
        client_platform_fee_percent: clientFeeRate,
        vendor_platform_fee: vendorPlatformFee,
        vendor_platform_fee_percent: vendorFeeRate,
        tax_amount: taxAmount,
        vat_percent: vatRate,
        delivery_fee: deliveryFee,
        delivery_method: newOrder.delivery_method,
        fulfillment_method: newOrder.fulfillment_method,
        is_pickup: newOrder.is_pickup,
        issued_at: newOrder.created_at,
        created_at: newOrder.created_at,
        paid_at: newOrder.created_at,
        client_id: newOrder.client_id,
        vendor_id: newOrder.vendor_id,
        items: items || [],
      };
      if (invIdx >= 0) {
        invoices[invIdx] = { ...invoices[invIdx], ...invRecord };
      } else {
        invoices.unshift(invRecord);
      }
      saveJson(INVOICES_FILE, invoices);
      (globalThis as any).__SHARED_SERVER_INVOICES__ = invoices;
    } catch (invErr) {
      console.warn("Failed to sync invoice for order:", invErr);
    }

    // Dual Persistence: Also persist order & deal to Supabase SQL tables
    try {
      const supabase = await createClient();
      await Promise.allSettled([
        supabase.from("orders").upsert({
          id: orderId,
          rfq_id: rfq_id || null,
          quote_id: quote_id || null,
          client_id: newOrder.client_id,
          vendor_id: newOrder.vendor_id,
          status: newOrder.status,
          total_price: totalPrice,
          subtotal: subtotal,
          parts_subtotal: subtotal,
          platform_commission: clientPlatformFee,
          platform_commission_percent: clientFeeRate,
          client_platform_fee: clientPlatformFee,
          client_platform_fee_percent: clientFeeRate,
          vendor_platform_fee: vendorPlatformFee,
          vendor_platform_fee_percent: vendorFeeRate,
          tax_amount: taxAmount,
          vat_percent: vatRate,
          delivery_fee: deliveryFee,
          delivery_method: newOrder.delivery_method,
          fulfillment_method: newOrder.fulfillment_method,
          is_pickup: newOrder.is_pickup,
          created_at: newOrder.created_at,
          updated_at: newOrder.updated_at,
        }),
        supabase.from("deals").upsert({
          id: deal_id || `DEAL-${orderId.replace("ORD-", "")}`,
          order_id: orderId,
          client_id: newOrder.client_id,
          vendor_id: newOrder.vendor_id,
          status: "preparing",
          current_version: 1,
          created_at: newOrder.created_at,
          updated_at: newOrder.updated_at,
        }),
        rfq_id ? supabase.from("rfqs").update({ status: "accepted", accepted_quote_id: quote_id }).eq("id", rfq_id) : Promise.resolve(),
        quote_id ? supabase.from("quotes").update({ status: "accepted" }).eq("id", quote_id) : Promise.resolve(),
      ]);
    } catch (sbErr) {
      console.warn("Dual persistence to Supabase warning:", sbErr);
    }

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
    if (!isPickup) {
      try {
        const orderCourierId = newOrder.courier_id || (newOrder as any).courierId || (newOrder as any).driver_id;
        CourierService.createDeliveryForOrder(newOrder, orderCourierId);
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

    // Execute automated wallet distribution
    try {
      await distributeOrderFundsAutomatically({
        orderId,
        paymentSource: isWalletPayment ? "wallet" : "external",
      });
    } catch (distErr) {
      console.warn("Automated wallet distribution warning on order creation:", distErr);
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

      // Automated wallet distribution upon status completion or payment
      if (status === "completed" || status === "paid" || status === "delivered") {
        try {
          await distributeOrderFundsAutomatically({
            orderId: orders[idx].id,
            paymentSource: (orders[idx].payment_method === "wallet" || orders[idx].payment_source === "wallet") ? "wallet" : "external",
          });
        } catch (distErr) {
          console.warn("Automated wallet distribution warning on status update:", distErr);
        }
      }

      return NextResponse.json({ success: true, order: orders[idx] });
    }
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

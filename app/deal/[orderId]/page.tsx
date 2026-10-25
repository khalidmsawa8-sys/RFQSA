export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DealPageClient } from "./deal-page-client";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function DealPage({ params }: PageProps) {
  const { orderId } = await params;
  const cookieStore = await cookies();
  const sessionRole = cookieStore.get("rfq_session")?.value;
  const rfqRole = cookieStore.get("rfq_role")?.value;

  let resolvedRole: "client" | "vendor" | "courier" | "admin" = "client";
  if (rfqRole === "courier" || sessionRole === "courier") {
    resolvedRole = "courier";
  } else if (rfqRole?.startsWith("vendor") || sessionRole === "vendor") {
    resolvedRole = "vendor";
  } else if (rfqRole?.startsWith("admin") || sessionRole === "admin") {
    resolvedRole = "admin";
  } else {
    resolvedRole = "client";
  }

  let user = {
    id:
      resolvedRole === "vendor"
        ? "vendor-demo-id"
        : resolvedRole === "courier"
        ? "courier-1"
        : resolvedRole === "admin"
        ? "admin-demo-id"
        : "client-demo-id",
  };
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) user = data.user;
  } catch (e) {
    // Session fallback
  }

  const supabase = await createClient();

  // Helper to load JSON database files
  const loadJsonDb = (filename: string) => {
    try {
      const filePath = path.join(process.cwd(), "data", filename);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
    } catch (err) {
      console.error(`Error reading ${filename}:`, err);
    }
    return [];
  };

  const localOrders = loadJsonDb("orders_db.json");
  const localQuotes = loadJsonDb("quotes_db.json");
  const localRfqs = loadJsonDb("rfqs_db.json");

  // Clean the search key
  const cleanId = orderId.trim();
  const rawNum = cleanId.replace(/\D+/g, "") || "";

  /* ─────────────────────────────────────────────────────────────
     1. Search for Order in Local Database & Supabase
  ───────────────────────────────────────────────────────────── */
  let order: any = null;
  let deal: any = null;
  let rfq: any = null;
  let quote: any = null;
  let clientProfile: any = null;
  let vendorProfile: any = null;

  // 1a. Search in local orders database first (matches live disk files)
  if (localOrders.length > 0) {
    const foundOrder = localOrders.find((o: any) =>
      o.id === cleanId ||
      o.id === `ORD-${cleanId}` ||
      (rawNum && o.id === `ORD-${rawNum}`) ||
      (rawNum && o.id.includes(rawNum)) ||
      (rawNum && o.rfq_id && o.rfq_id.includes(rawNum)) ||
      (o.deals && o.deals.some((d: any) => d.id === cleanId || (rawNum && d.id.includes(rawNum))))
    );

    if (foundOrder) {
      order = foundOrder;
      const courierSt = String(foundOrder.courier_status || "").toUpperCase();
      let resolvedSt = foundOrder.status === "confirmed" ? "preparing" : (foundOrder.status || "preparing");
      if (courierSt === "EN_ROUTE_DELIVERY" || courierSt === "ARRIVED_DELIVERY") {
        resolvedSt = "delivered";
      } else if (courierSt === "DELIVERED") {
        resolvedSt = foundOrder.status === "completed" ? "completed" : "delivered";
      }
      deal = {
        ...(foundOrder.deals?.[0] || {}),
        id: foundOrder.deals?.[0]?.id || `DEAL-${rawNum || foundOrder.id.replace("ORD-", "")}`,
        order_id: foundOrder.id,
        status: resolvedSt,
      };
    }
  }

  // 1b. Try Supabase Orders if not found locally
  if (!order) {
    try {
      const { data: dbOrder } = await supabase
        .from("orders")
        .select("*, rfqs(*), vendor:profiles!orders_vendor_id_fkey(*), client:profiles!orders_client_id_fkey(*), quotes(*), deals(*)")
        .or(`id.eq.${cleanId},id.eq.ORD-${cleanId},id.eq.ORD-${rawNum}`)
        .maybeSingle();

      if (dbOrder && (dbOrder.id === cleanId || dbOrder.id === `ORD-${cleanId}` || (rawNum && dbOrder.id.includes(rawNum)))) {
        order = dbOrder;
        rfq = dbOrder.rfqs;
        quote = dbOrder.quotes;
        clientProfile = dbOrder.client;
        vendorProfile = dbOrder.vendor;
        deal = Array.isArray(dbOrder.deals) && dbOrder.deals.length > 0 ? dbOrder.deals[0] : dbOrder.deals;
      }
    } catch (e) {
      // Supabase query error fallback
    }
  }

  // 1c. Find associated RFQ
  if (!rfq) {
    const targetRfqId = order?.rfq_id || `RFQ-${rawNum}`;
    rfq = localRfqs.find((r: any) =>
      r.id === targetRfqId ||
      r.id === cleanId ||
      r.id === `RFQ-${cleanId}` ||
      (rawNum && r.id.includes(rawNum))
    );
  }

  // 1d. Find associated Quote
  if (!quote) {
    const targetQuoteId = order?.quote_id;
    quote = localQuotes.find((q: any) =>
      (targetQuoteId && q.id === targetQuoteId) ||
      (rfq?.id && q.rfq_id === rfq.id) ||
      (rawNum && (q.id?.includes(rawNum) || q.rfq_id?.includes(rawNum)))
    );
  }

  // 1e. Synthesize order if RFQ found but order record was missing
  if (!order) {
    const targetOrderId = cleanId.startsWith("ORD-") ? cleanId : `ORD-${rawNum || cleanId}`;
    order = {
      id: targetOrderId,
      rfq_id: rfq?.id || `RFQ-${rawNum}`,
      quote_id: quote?.id || null,
      client_id: rfq?.client_id || user.id,
      vendor_id: quote?.vendor_id || "vendor-demo-id",
      status: "preparing",
      total_price: quote?.total_price || 600,
      created_at: rfq?.created_at || new Date().toISOString(),
      rfqs: rfq,
    };
    deal = {
      id: `DEAL-${rawNum || targetOrderId.replace("ORD-", "")}`,
      order_id: targetOrderId,
      client_id: rfq?.client_id || user.id,
      vendor_id: quote?.vendor_id || "vendor-demo-id",
      status: "preparing",
      current_version: 1,
      created_at: order.created_at,
    };
  }

  // Ensure deal object exists
  if (!deal) {
    deal = {
      id: order ? `DEAL-${order.id.replace("ORD-", "")}` : `DEAL-${cleanId}`,
      order_id: order?.id || cleanId,
      client_id: order?.client_id || user.id,
      vendor_id: order?.vendor_id || "vendor-demo-id",
      status: order?.status === "confirmed" ? "preparing" : (order?.status || "preparing"),
      current_version: 1,
      created_at: order?.created_at || new Date().toISOString(),
    };
  }

  // Attach RFQ if not already attached
  if (!rfq && order?.rfq_id) {
    rfq = localRfqs.find((r: any) => r.id === order.rfq_id) || order.rfqs;
  }
  if (!rfq && order?.rfqs) {
    rfq = order.rfqs;
  }

  // Attach Quote if not already attached
  if (!quote && order?.quote_id) {
    quote = localQuotes.find((q: any) => q.id === order.quote_id) || order.quotes;
  }

  // Determine delivery mode: Delivery (توصيل) vs Pickup (استلام من الفرع)
  let rfqExtra: any = {};
  if (rfq?.parts_description) {
    try {
      const parsed = typeof rfq.parts_description === "string" ? JSON.parse(rfq.parts_description) : rfq.parts_description;
      if (Array.isArray(parsed) && parsed.length > 0) rfqExtra = parsed[0] || {};
    } catch {}
  }

  const locText = String(
    (order as any)?.rfqs?.delivery_location ||
    (order as any)?.delivery_location ||
    (order as any)?.pickup_location ||
    rfq?.delivery_location ||
    rfqExtra?.deliveryLocation ||
    ""
  );

  const hasPickupPhrase =
    locText.includes("استلام من فرع") ||
    locText.includes("استلام من الفرع") ||
    locText.includes("استلام من معرض") ||
    locText.includes("استلام يدوي") ||
    locText === "استلام من فرع المورد";

  const fulfillmentMethod =
    (order as any)?.fulfillment_method ||
    (order as any)?.fulfillment_type ||
    (rfq as any)?.fulfillment_method ||
    rfqExtra?.fulfillmentMethod ||
    (deal as any)?.fulfillment_method ||
    (hasPickupPhrase ? "BRANCH_PICKUP" : undefined);

  const deliveryMethod =
    order?.delivery_method ||
    order?.delivery_type ||
    (order as any)?.shipping_method ||
    rfq?.delivery_method ||
    rfq?.delivery_type ||
    rfqExtra?.deliveryMethod ||
    quote?.delivery_method ||
    (hasPickupPhrase ? "pickup" : undefined);

  let isPickup = false;
  const deliveryFeeVal = Number((order as any)?.delivery_fee ?? (order as any)?.delivery_cost ?? (deal as any)?.delivery_fee ?? 0);

  if (
    fulfillmentMethod === "DELIVERY" ||
    deliveryMethod === "delivery" ||
    deliveryMethod === "shipping" ||
    order?.is_pickup === false ||
    deliveryFeeVal > 0
  ) {
    isPickup = false;
  } else if (
    fulfillmentMethod === "BRANCH_PICKUP" ||
    fulfillmentMethod === "SELF_PICKUP" ||
    deliveryMethod === "pickup" ||
    order?.is_pickup === true ||
    rfq?.is_pickup === true ||
    order?.pickup_branch ||
    rfq?.pickup_branch ||
    hasPickupPhrase
  ) {
    isPickup = true;
  }

  /* ─────────────────────────────────────────────────────────────
     2. Extract & Format REAL Items from Quotes / RFQs / Deal Items
  ───────────────────────────────────────────────────────────── */
  let realItems: any[] = [];

  // Try 1: deal_version_items from Supabase
  try {
    const { data: dbVersion } = await supabase
      .from("deal_versions")
      .select("*, deal_version_items(*)")
      .eq("deal_id", deal.id)
      .maybeSingle();

    if (dbVersion?.deal_version_items && dbVersion.deal_version_items.length > 0) {
      realItems = dbVersion.deal_version_items;
    }
  } catch (e) {}

  // Try 2: deal_items from Supabase
  if (realItems.length === 0 && order?.id) {
    try {
      const { data: dbItems } = await supabase
        .from("deal_items")
        .select("*")
        .eq("order_id", order.id);

      if (dbItems && dbItems.length > 0) {
        realItems = dbItems;
      }
    } catch (e) {}
  }

  // Try 3: quote.items from local or DB quote
  if (realItems.length === 0 && quote?.items && Array.isArray(quote.items) && quote.items.length > 0) {
    realItems = quote.items.map((it: any, idx: number) => ({
      id: `QI-${idx + 1}`,
      part_name: it.part_name || it.name || `قطعة ${idx + 1}`,
      part_number: it.part_number || it.sku || null,
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.unit_price || it.original_price || it.price || 0),
      line_total: Number(it.line_total || (it.unit_price || it.original_price || 0) * (it.quantity || 1)),
      part_type: it.part_type === "commercial" || it.part_type === "تجاري" ? "تجاري" : "أصلي",
    }));
  }

  // Try 3b: order.items from order payload
  if (realItems.length === 0 && Array.isArray(order?.items) && order.items.length > 0) {
    realItems = order.items.map((it: any, idx: number) => ({
      id: `OI-${idx + 1}`,
      part_name: it.part_name || it.name || `قطعة ${idx + 1}`,
      part_number: it.part_number || it.sku || null,
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.unit_price || it.original_price || it.price || 0),
      line_total: Number(it.line_total || (Number(it.unit_price || it.price || 0) * Number(it.quantity || 1))),
      part_type: it.part_type === "commercial" || it.part_type === "تجاري" ? "تجاري" : "أصلي",
    }));
  }

  // Try 4: parse rfq.parts_description if it's JSON or structured text
  if (realItems.length === 0 && rfq?.parts_description) {
    try {
      const parsed = JSON.parse(rfq.parts_description);
      if (Array.isArray(parsed) && parsed.length > 0) {
        realItems = parsed.map((it: any, idx: number) => {
          const qty = Number(it.quantity || 1);
          const price = Number(it.price || it.unit_price || 500);
          return {
            id: `RFQI-${idx + 1}`,
            part_name: it.partName || it.part_name || it.name || `قطعة ${idx + 1}`,
            part_number: it.partNumber || it.part_number || null,
            quantity: qty,
            unit_price: price,
            line_total: price * qty,
            part_type: it.partType === "commercial" || it.partType === "تجاري" ? "تجاري" : "أصلي",
          };
        });
      }
    } catch (e) {
      // If parts_description is plain text
      if (typeof rfq.parts_description === "string" && rfq.parts_description.trim()) {
        realItems = [
          {
            id: "RFQI-1",
            part_name: rfq.parts_description,
            part_number: null,
            quantity: 1,
            unit_price: order?.total_price || 600,
            line_total: order?.total_price || 600,
            part_type: "أصلي",
          }
        ];
      }
    }
  }

  // Fallback items if absolutely nothing was found
  if (realItems.length === 0) {
    realItems = [
      { id: "DVI-1", part_name: "قطعة غيار معتمدة", part_number: "OEM-101", quantity: 1, unit_price: Number(order?.total_price || 600), line_total: Number(order?.total_price || 600), part_type: "أصلي" }
    ];
  }

  /* ─────────────────────────────────────────────────────────────
     3. Build Profiles & Real Details
  ───────────────────────────────────────────────────────────── */
  if (!clientProfile) {
    clientProfile = rfq?.client || order?.client || {
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية",
      phone: "0559876543",
      national_address: rfq?.delivery_location || "الرياض",
    };
  }

  if (!vendorProfile) {
    vendorProfile = quote?.profiles || order?.vendor || {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334",
      national_address: "الرياض - طريق خريص",
      tax_number: "300123456700003",
      commercial_register: "1010987654",
    };
  }

  if (!quote) {
    quote = {
      id: order?.quote_id || "Q-1",
      delivery_cost: isPickup ? 0 : 25,
      delivery_days: 1,
      notes: "القطع أصلية معتمدة مع ضمان الوكيل",
      created_at: order?.created_at || new Date().toISOString(),
      total_price: order?.total_price || 600,
    };
  }

  const currentVersion = {
    id: "DV-1",
    deal_id: deal.id,
    version_number: deal.current_version || 1,
    total_price: order?.total_price || realItems.reduce((acc, it) => acc + (it.line_total || it.unit_price * it.quantity), 0),
    delivery_days: quote.delivery_days || 1,
    warranty_terms: "ضمان الوكيل المعتمد",
    warranty_duration: "سنة واحدة",
    notes: quote.notes || null,
    created_at: order?.created_at || new Date().toISOString(),
    deal_version_items: realItems,
  };

  const userRole: "client" | "vendor" | "courier" | "admin" = resolvedRole;

  // Build real order representation
  const courierSt = String(order?.courier_status || "").toUpperCase();
  let effectiveOrderStatus = order?.status === "confirmed" ? "preparing" : (order?.status || deal?.status || "preparing");
  if (courierSt === "EN_ROUTE_DELIVERY" || courierSt === "ARRIVED_DELIVERY") {
    effectiveOrderStatus = "delivered";
  } else if (courierSt === "DELIVERED") {
    effectiveOrderStatus = order?.status === "completed" ? "completed" : "delivered";
  } else if (courierSt === "PICKED_UP") {
    effectiveOrderStatus = "shipped";
  }

  const finalOrder = {
    ...order,
    id: order?.id || (cleanId.startsWith("ORD-") ? cleanId : `ORD-${cleanId}`),
    status: effectiveOrderStatus,
    courier_status: courierSt || order?.courier_status,
    total_price: order?.total_price || currentVersion.total_price,
    created_at: order?.created_at || new Date().toISOString(),
    delivery_type: isPickup ? "pickup" : "delivery",
    delivery_method: isPickup ? "pickup" : "shipping",
    is_pickup: isPickup,
    courier_name: order?.courier_name || "سعيد المطيري",
    courier_vehicle: order?.courier_vehicle || "دراجة نارية - لوحة د هـ 2214",
    courier_phone: order?.courier_phone || "0559876543",
    rfqs: {
      car_make: rfq?.car_make || order?.rfqs?.car_make || "تويوتا",
      car_model: rfq?.car_model || order?.rfqs?.car_model || "كامري",
      car_year: rfq?.car_year || order?.rfqs?.car_year || 2023,
      vin: rfq?.vin || order?.rfqs?.vin || "—",
      plate_number: rfq?.plate_number || order?.rfqs?.plate_number || "—",
      delivery_location: rfq?.delivery_location || order?.rfqs?.delivery_location || "الرياض",
      delivery_city: rfq?.delivery_city || order?.rfqs?.delivery_city || "الرياض",
      delivery_district: rfq?.delivery_district || order?.rfqs?.delivery_district || "",
      parts_description: typeof rfq?.parts_description === "string" ? rfq.parts_description : JSON.stringify(realItems),
      client_id: order?.client_id || user.id,
    },
  };

  return (
    <DealPageClient
      deal={deal}
      order={finalOrder}
      currentVersion={currentVersion}
      amendments={[]}
      files={[]}
      events={[
        { id: "E1", event_type: "created", description: "تم قبول عرض السعر واعتماد الطلب", created_at: finalOrder.created_at },
        { id: "E2", event_type: "processing", description: isPickup ? "جاري تجهيز القطع بالفرع للاستلام" : "جاري تجهيز القطع وتغليف الشحنة للتوصيل", created_at: finalOrder.created_at },
      ]}
      activityLog={[]}
      reviews={[]}
      userRole={userRole}
      userId={user.id}
      vendorName={vendorProfile?.company_name || vendorProfile?.full_name || "مؤسسة قطع الغيار المعتمدة"}
      clientName={clientProfile?.company_name || clientProfile?.full_name || "شركة المشتريات الوطنية"}
      clientPhone={clientProfile?.phone || "0559876543"}
      vendorProfile={vendorProfile}
      clientProfile={clientProfile}
      quote={quote}
      isPickup={isPickup}
    />
  );
}

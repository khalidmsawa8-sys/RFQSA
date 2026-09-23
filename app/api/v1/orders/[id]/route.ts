import { NextRequest, NextResponse } from "next/server";
import { getDeterministicOrderOtp } from "@/lib/delivery-state-machine";
import { normalizeInvoiceNumber } from "@/lib/invoice-canonical";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
const RFQS_FILE = path.join(DATA_DIR, "rfqs_db.json");
const QUOTES_FILE = path.join(DATA_DIR, "quotes_db.json");
const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries_db.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

function loadJson(file: string): any[] {
  try {
    if (fs.existsSync(file)) {
      const c = fs.readFileSync(file, "utf-8");
      return JSON.parse(c);
    }
  } catch {}
  return [];
}

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    if (!rawId) {
      return NextResponse.json(
        { success: false, error: "معرف الطلب مطلوب" },
        { status: 400 }
      );
    }

    const cleanId = rawId.trim();
    const rawNum = cleanId.replace(/\D+/g, "") || "";

    const orders = loadJson(ORDERS_FILE);
    const rfqs = loadJson(RFQS_FILE);
    const quotes = loadJson(QUOTES_FILE);
    const deliveries = loadJson(DELIVERIES_FILE);
    const profiles = loadJson(PROFILES_FILE);

    // 1. Locate Order
    const foundOrder = orders.find((o: any) =>
      o.id === cleanId ||
      o.id === `ORD-${cleanId}` ||
      (rawNum && (o.id === `ORD-${rawNum}` || o.id === rawNum)) ||
      (rawNum && o.rfq_id && (o.rfq_id === `REQ-${rawNum}` || o.rfq_id.includes(rawNum))) ||
      (o.deals && o.deals.some((d: any) => d.id === cleanId || (rawNum && d.id.includes(rawNum))))
    );

    // If order not found directly, check if this is an RFQ ID or quote ID
    let orderObj = foundOrder;
    if (!orderObj) {
      const matchedRfq = rfqs.find((r: any) =>
        r.id === cleanId ||
        r.id === `REQ-${cleanId}` ||
        (rawNum && (r.id === `REQ-${rawNum}` || r.id === rawNum))
      );

      if (matchedRfq) {
        orderObj = {
          id: `ORD-${rawNum || matchedRfq.id.replace(/\D+/g, "")}`,
          rfq_id: matchedRfq.id,
          status: matchedRfq.status === "accepted" ? "preparing" : "open",
          total_price: matchedRfq.budget || 1850,
          created_at: matchedRfq.created_at || new Date().toISOString(),
          rfqs: matchedRfq,
        };
      }
    }

    if (!orderObj) {
      return NextResponse.json(
        { success: false, error: "الطلب غير موجود" },
        { status: 404 }
      );
    }

    // 2. Resolve Relationships
    let matchedRfq = orderObj.rfqs || orderObj.rfq;
    if (!matchedRfq && orderObj.rfq_id) {
      matchedRfq = rfqs.find((r: any) => r.id === orderObj.rfq_id);
    }

    let matchedQuote = orderObj.quote;
    if (!matchedQuote && (orderObj.quote_id || orderObj.rfq_id)) {
      matchedQuote = quotes.find(
        (q: any) => q.id === orderObj.quote_id || q.rfq_id === orderObj.rfq_id
      );
      if (!matchedQuote && matchedRfq?.quotes && Array.isArray(matchedRfq.quotes)) {
        matchedQuote =
          matchedRfq.quotes.find(
            (q: any) =>
              q.id === orderObj.quote_id || q.vendor_id === orderObj.vendor_id
          ) || matchedRfq.quotes[0];
      }
    }

    // 3. Resolve Delivery & Courier
    const delivery = deliveries.find(
      (del: any) =>
        del.order_id === orderObj.id ||
        del.order_id === `ORD-${rawNum}` ||
        del.id === `DEL-${rawNum}` ||
        (rawNum && (del.order_id === `ORD-${rawNum}` || del.id === `DEL-${rawNum}`))
    );

    const courierStatus = delivery?.delivery_status || orderObj.courier_status || "";
    const cUpper = String(courierStatus).toUpperCase();

    let resolvedStatus = orderObj.status || "preparing";
    if (
      orderObj.status === "completed" ||
      orderObj.status === "closed" ||
      orderObj.status === "received" ||
      orderObj.deals?.[0]?.status === "completed"
    ) {
      resolvedStatus = "completed";
    } else if (cUpper === "EN_ROUTE_DELIVERY" || cUpper === "ARRIVED_DELIVERY") {
      resolvedStatus = "delivered";
    } else if (cUpper === "DELIVERED") {
      resolvedStatus = orderObj.status === "completed" ? "completed" : "delivered";
    } else if (cUpper === "PICKED_UP") {
      resolvedStatus = "shipped";
    }

    // 4. Resolve Dynamic Deterministic OTP
    const dynamicOtp =
      orderObj.otp ||
      orderObj.otp_code ||
      orderObj.delivery_otp ||
      delivery?.otp_code ||
      getDeterministicOrderOtp(orderObj.id || cleanId);

    // 5. Financials & Line Items
    let orderItems =
      orderObj.items ||
      orderObj.invoice_items ||
      matchedQuote?.items ||
      matchedRfq?.items ||
      [];

    const deliveryFee = Number(
      orderObj.delivery_fee ??
      matchedQuote?.delivery_fee ??
      (delivery?.delivery_fee || 50.0)
    );

    let totalPrice = Number(
      orderObj.total_price ||
      orderObj.total_amount ||
      matchedQuote?.total_price ||
      0
    );

    if (totalPrice === 0 && orderItems.length > 0) {
      const itemsSum = orderItems.reduce(
        (sum: number, it: any) => sum + Number(it.unit_price || it.price || 0) * Number(it.quantity || 1),
        0
      );
      totalPrice = itemsSum + deliveryFee;
    }

    const subtotal = Math.max(0, totalPrice - deliveryFee);
    const taxAmount = (subtotal * 0.15);

    // 6. Profiles (Client & Vendor)
    const clientProfile = profiles.find(
      (p: any) => p.id === (orderObj.client_id || matchedRfq?.client_id)
    ) || {
      id: "client-demo-id",
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية",
      phone: "0501234567",
      city: "الرياض",
      national_address: "الرياض - طريق الملك فهد - حي العليا",
    };

    const vendorProfile = profiles.find(
      (p: any) => p.id === (orderObj.vendor_id || matchedQuote?.vendor_id)
    ) || {
      id: "v-supplier-1",
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334",
      city: "الرياض",
      address: "طريق خريص - حي المنار",
      national_address: "الرياض - طريق خريص - حي المنار",
    };

    const courierObj = {
      id: delivery?.courier_id || orderObj.courier_id || "courier-1",
      name: delivery?.courier_name || orderObj.courier_name || "مندوب التوصيل السريع (أسطول رفق)",
      phone: delivery?.courier_phone || orderObj.courier_phone || "0550011223",
      vehicle: "تويوتا هايلكس 2023 (أ ب ج 1234)",
      status: courierStatus || "ASSIGNED",
    };

    const enrichedOrder = {
      id: orderObj.id || `ORD-${rawNum}`,
      order_id: orderObj.id || `ORD-${rawNum}`,
      rfq_id: matchedRfq?.id || orderObj.rfq_id,
      quote_id: matchedQuote?.id || orderObj.quote_id,
      status: resolvedStatus,
      raw_status: orderObj.status || "preparing",
      courier_status: courierStatus,
      otp: dynamicOtp,
      otp_code: dynamicOtp,
      delivery_otp: dynamicOtp,
      total_price: totalPrice,
      total_amount: totalPrice,
      subtotal: subtotal,
      delivery_fee: deliveryFee,
      tax_amount: taxAmount,
      vat: taxAmount,
      currency: "SAR",
      created_at: orderObj.created_at || new Date().toISOString(),
      updated_at: orderObj.updated_at || new Date().toISOString(),
      invoice_number: normalizeInvoiceNumber(orderObj.invoice_number, orderObj.id),
      parts_description:
        matchedRfq?.parts_description ||
        orderObj.parts_description ||
        (orderItems.length > 0 ? orderItems.map((i: any) => i.name || i.part_name || i.description).join(" + ") : "قطع غيار معتمدة"),
      items: orderItems,
      invoice_items: orderItems,
      delivery_location:
        matchedRfq?.delivery_location ||
        orderObj.delivery_location ||
        "فرع الرياض الرئيسي - حي العليا",
      delivery_city: matchedRfq?.delivery_city || orderObj.delivery_city || "الرياض",
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
        items: matchedRfq.items || orderItems,
      } : null,
      rfq: matchedRfq || null,
      quote: matchedQuote || null,
      client: clientProfile,
      profiles: clientProfile,
      vendor: vendorProfile,
      courier: courierObj,
      courier_id: courierObj.id,
      courier_name: courierObj.name,
      courier_phone: courierObj.phone,
      courier_vehicle: courierObj.vehicle,
    };

    return NextResponse.json({
      success: true,
      order: enrichedOrder,
      data: enrichedOrder,
      otp: dynamicOtp,
    });
  } catch (err: any) {
    console.error("Error in GET /api/v1/orders/[id]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "خطأ داخلي أثناء جلب تفاصيل الطلب" },
      { status: 500 }
    );
  }
}

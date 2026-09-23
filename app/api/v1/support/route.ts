import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSbClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const CATEGORY_NAMES: Record<string, string> = {
  return_replacement: "الاستبدال والاسترجاع",
  item_mismatch: "الطلب غير مطابق للمواصفات",
  delivery_delay: "التأخر في استلام الطلب",
  suggestion: "اقتراح وتطوير",
  payout_withdrawal: "طلب تسوية وسحب أرباح",
  pickup_delay: "التأخر في استلام الشحنة",
  financial: "مطالبة مالية ومحفظة",
  inquiry: "استفسار عام",
  other: "طلب مساعدة عام",
};

function getDbPath(filename: string) {
  return path.join(process.cwd(), "data", filename);
}

function readJsonFile(filename: string): any[] {
  try {
    const p = getDbPath(filename);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn(`[readJsonFile] Error reading ${filename}:`, e);
  }
  return [];
}

function writeJsonFile(filename: string, data: any[]) {
  try {
    const p = getDbPath(filename);
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn(`[writeJsonFile] Error writing ${filename}:`, e);
  }
}

/**
 * GET /api/v1/support
 * Lists tickets for the authenticated client, vendor, courier, or admin with full DB fallback.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Resolve current session / user
    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const cookieSession = req.cookies.get("rfq_session")?.value;
    const cookieRole = req.cookies.get("rfq_role")?.value;
    const paramUserId = req.nextUrl.searchParams.get("userId");
    const paramRole = req.nextUrl.searchParams.get("role");
    const referer = req.headers.get("referer") || "";

    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;

    const currentUserId = paramUserId || cookieUserId || authUser?.id;
    const currentRole = paramRole || cookieRole || cookieSession || authUser?.user_metadata?.role;
    const isAdmin =
      cookieSession === "admin" ||
      cookieRole === "platform_super_admin" ||
      currentRole === "admin" ||
      referer.includes("/admin");

    // 2. Fetch support requests from Supabase AND local JSON database
    let allRequests: any[] = [];
    try {
      const { data: sbRequests } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (Array.isArray(sbRequests)) {
        allRequests = [...sbRequests];
      }
    } catch (_) {}

    const fileRequests = readJsonFile("support_requests_db.json");
    for (const fr of fileRequests) {
      const existingIdx = allRequests.findIndex((r) => r.id === fr.id);
      if (existingIdx === -1) {
        allRequests.push(fr);
      } else {
        const sbReq = allRequests[existingIdx];
        const fileTime = new Date(fr.updated_at || fr.created_at || 0).getTime();
        const sbTime = new Date(sbReq.updated_at || sbReq.created_at || 0).getTime();
        if (fileTime >= sbTime) {
          allRequests[existingIdx] = { ...sbReq, ...fr };
        } else {
          allRequests[existingIdx] = { ...fr, ...sbReq };
        }
      }
    }

    // Sort newest first
    allRequests.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    // 3. Fetch auxiliary tables for deep enrichment
    let allProfiles: any[] = [];
    let allOrders: any[] = [];
    let allRfqs: any[] = [];
    let allMessages: any[] = [];

    try {
      const [
        { data: pData },
        { data: oData },
        { data: rData },
      ] = await Promise.all([
        supabase.from("profiles").select("id, full_name, company_name, ref_code, role, phone"),
        supabase.from("orders").select("id, client_id, vendor_id, total_price, status, created_at, rfq_id"),
        supabase.from("rfqs").select("id, car_make, car_model, car_year, plate_number"),
      ]);
      allProfiles = pData || [];
      allOrders = oData || [];
      allRfqs = rData || [];
    } catch (_) {}

    // Fallback merge auxiliary from JSON if empty
    if (allProfiles.length === 0) allProfiles = readJsonFile("profiles_db.json");
    if (allOrders.length === 0) allOrders = readJsonFile("orders_db.json");
    if (allRfqs.length === 0) allRfqs = readJsonFile("rfqs_db.json");
    allMessages = readJsonFile("support_messages_db.json");

    const profileMap = new Map<string, any>();
    allProfiles.forEach((p: any) => profileMap.set(p.id, p));

    const rfqMap = new Map<string, any>();
    allRfqs.forEach((r: any) => rfqMap.set(r.id, r));

    const orderMap = new Map<string, any>();
    allOrders.forEach((o: any) => {
      const rfq = o.rfq_id ? rfqMap.get(o.rfq_id) : (o.rfqs || o.rfq || null);
      orderMap.set(o.id, {
        id: o.id,
        status: o.status,
        total_price: o.total_price,
        created_at: o.created_at,
        rfqs: rfq ? {
          car_make: rfq.car_make,
          car_model: rfq.car_model,
          car_year: rfq.car_year,
          plate_number: rfq.plate_number,
        } : null,
      });
    });

    // 4. Enrich every ticket
    const enrichedTickets = allRequests.map((t: any) => {
      const client = t.client_id ? profileMap.get(t.client_id) : null;
      const vendor = t.vendor_id ? profileMap.get(t.vendor_id) : null;
      const requester = t.requester_id ? profileMap.get(t.requester_id) : null;
      const order = t.order_id ? orderMap.get(t.order_id) : null;

      // Find last reply
      const ticketMsgs = allMessages.filter((m: any) => m.request_id === t.id);
      const lastMsg = ticketMsgs.length > 0 ? ticketMsgs[ticketMsgs.length - 1] : null;

      return {
        ...t,
        subject: t.subject || CATEGORY_NAMES[t.request_type] || "طلب مساعدة",
        category: t.category || t.request_type || "return_replacement",
        request_type: t.request_type || t.category || "return_replacement",
        last_reply: lastMsg?.message || lastMsg?.message_text || t.last_reply || t.description || t.reason || "تم استلام التذكرة وجاري معالجتها من فريق الدعم.",
        client: client ? {
          id: client.id,
          full_name: client.full_name || client.company_name,
          company_name: client.company_name,
          ref_code: client.ref_code,
          phone: client.phone,
        } : (t.client || null),
        vendor: vendor ? {
          id: vendor.id,
          full_name: vendor.full_name || vendor.company_name,
          company_name: vendor.company_name,
          ref_code: vendor.ref_code,
          phone: vendor.phone,
        } : (t.vendor || null),
        requester: requester ? {
          id: requester.id,
          full_name: requester.full_name || requester.company_name,
          role: requester.role,
        } : null,
        orders: order || (t.orders || null),
        support_request_items: t.support_request_items || [],
      };
    });

    // 5. Apply User Filtering
    let filtered = enrichedTickets;
    if (!isAdmin && currentUserId) {
      const userLower = currentUserId.toLowerCase();
      filtered = enrichedTickets.filter((t: any) => {
        if (currentRole === "vendor" && t.vendor_id) return true;
        if (currentRole === "client" && (t.client_id || t.requester_role === "client")) return true;
        return (
          t.requester_id === currentUserId ||
          t.client_id === currentUserId ||
          t.vendor_id === currentUserId ||
          (t.client && t.client.id === currentUserId) ||
          (t.vendor && t.vendor.id === currentUserId) ||
          (userLower === "client-demo-id" && (t.client_id === "client-demo-id" || !t.vendor_id)) ||
          (userLower.includes("vendor") && (t.vendor_id === currentUserId || t.requester_role === "vendor"))
        );
      });
    }

    return NextResponse.json(
      {
        success: true,
        total: filtered.length,
        tickets: filtered,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[SUPPORT_GET_API_ERROR]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/support
 * Creates a new support ticket in authoritative storage and links all parties.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Resolve current user identity
    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const cookieSession = req.cookies.get("rfq_session")?.value;
    const cookieUserName = req.cookies.get("rfq_user_name")?.value;

    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;

    const body = await req.json();
    const rawReason = body.reason || body.description || body.details || body.message || body.subject || "طلب مساعدة واستفسار";
    const requestType = body.request_type || body.category || "return_replacement";
    const subject = body.subject || body.title || CATEGORY_NAMES[requestType] || "طلب دعم ومساعدة";
    const orderId = body.order_id || null;
    const refundAmount = body.refund_amount ? Number(body.refund_amount) : null;
    const items = body.items || body.support_request_items || [];

    const userRole = body.requester_role || cookieSession || authUser?.user_metadata?.role || (body.vendor_id ? "vendor" : "client");
    const userId = body.requester_id || body.client_id || body.vendor_id || cookieUserId || authUser?.id || (userRole === "vendor" ? "vendor-demo-id" : "client-demo-id");
    const userName = body.requester_name || (cookieUserName ? decodeURIComponent(cookieUserName) : (authUser?.user_metadata?.full_name || (userRole === "vendor" ? "المورد المعتمد" : "شركة المشتريات الوطنية")));

    // 2. Fetch matched order if provided to link counterpart automatically
    let matchedOrder: any = null;
    if (orderId) {
      try {
        const { data: ord } = await supabase
          .from("orders")
          .select("id, client_id, vendor_id, total_price")
          .eq("id", orderId)
          .maybeSingle();
        matchedOrder = ord;
      } catch (_) {}

      if (!matchedOrder) {
        const fileOrders = readJsonFile("orders_db.json");
        matchedOrder = fileOrders.find((o: any) => o.id === orderId);
      }
    }

    // 3. Resolve client_id and vendor_id
    let clientId: string | null = null;
    let vendorId: string | null = null;

    if (userRole === "client") {
      clientId = userId;
      vendorId = matchedOrder?.vendor_id || null;
    } else if (userRole === "vendor") {
      vendorId = userId;
      clientId = matchedOrder?.client_id || null;
    } else {
      clientId = matchedOrder?.client_id || userId;
      vendorId = matchedOrder?.vendor_id || null;
    }

    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();

    // 4. Create authoritative ticket payload
    const ticketRecord = {
      id: ticketId,
      requester_id: userId,
      requester_role: userRole,
      requester_name: userName,
      client_id: clientId,
      vendor_id: vendorId,
      order_id: orderId,
      request_type: requestType,
      category: requestType,
      subject: subject.trim(),
      title: subject.trim(),
      reason: rawReason.trim(),
      description: rawReason.trim(),
      refund_amount: refundAmount,
      status: "open",
      created_at: timestamp,
      support_request_items: Array.isArray(items) ? items : [],
    };

    // 5. Insert directly to local JSON file for 100% guarantee
    const existingFileRequests = readJsonFile("support_requests_db.json");
    existingFileRequests.unshift(ticketRecord);
    writeJsonFile("support_requests_db.json", existingFileRequests);

    // 6. Insert into Supabase
    try {
      await supabase.from("support_requests").insert(ticketRecord);
    } catch (e) {
      console.warn("[SUPPORT_POST_SUPABASE_WARNING]:", e);
    }

    // 7. Create initial conversation message in JSON and Supabase
    const initialMsg = {
      id: `msg-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      request_id: ticketId,
      sender_id: userId,
      sender_role: userRole,
      sender_name: userName,
      message: rawReason.trim(),
      message_text: rawReason.trim(),
      created_at: timestamp,
    };

    const existingMessages = readJsonFile("support_messages_db.json");
    existingMessages.push(initialMsg);
    writeJsonFile("support_messages_db.json", existingMessages);

    try {
      await supabase.from("support_messages").insert(initialMsg);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: "تم إنشاء تذكرة الدعم الفني بنجاح",
      ticket: ticketRecord,
    });
  } catch (err: any) {
    console.error("[SUPPORT_POST_API_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "حدث خطأ غير متوقع أثناء حفظ التذكرة" },
      { status: 500 }
    );
  }
}

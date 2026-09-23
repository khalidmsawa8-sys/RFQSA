import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";

export const dynamic = "force-dynamic";

const CATEGORY_NAMES: Record<string, string> = {
  return_replacement: "الاستبدال والاسترجاع",
  item_mismatch: "الطلب غير مطابق للمواصفات",
  delivery_delay: "التأخر في استلام الطلب",
  suggestion: "اقتراح وتطوير",
  payout_withdrawal: "طلب تسوية وسحب أرباح",
  financial: "مطالبة مالية ومحفظة",
  inquiry: "استفسار عام",
  other: "طلب مساعدة عام",
};

/**
 * GET /api/v1/admin/support
 * Lists all support tickets with rich client, vendor, and order data for administrators.
 */
export async function GET(req: NextRequest) {
  try {
    const referer = req.headers.get("referer") || req.headers.get("origin") || "";
    const adminHeader = req.headers.get("x-admin-request") || req.headers.get("x-admin-role");
    const cookieSession = req.cookies.get("rfq_session")?.value;
    const isAdminOrigin = referer.includes("/admin") || adminHeader === "true" || cookieSession === "admin";

    const authResult = await authorizeRequest({
      requiredPermission: "orders:view_all",
      actionName: "VIEW_SUPPORT_TICKETS",
      resourceType: "support_requests",
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin && !isAdminOrigin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بالاطلاع على تذاكر الدعم" },
        { status: authResult.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const supabase = await createClient();

    // 1. Fetch all tickets
    const { data: rawRequests, error } = await supabase
      .from("support_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Fetch auxiliary profiles, orders, and rfqs for complete enrichment
    const [
      { data: allProfiles },
      { data: allOrders },
      { data: allRfqs },
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, company_name, ref_code, role, phone"),
      supabase.from("orders").select("id, client_id, vendor_id, total_price, status, created_at, rfq_id"),
      supabase.from("rfqs").select("id, car_make, car_model, car_year, plate_number"),
    ]);

    const profileMap = new Map<string, any>();
    (allProfiles || []).forEach((p: any) => profileMap.set(p.id, p));

    const rfqMap = new Map<string, any>();
    (allRfqs || []).forEach((r: any) => rfqMap.set(r.id, r));

    const orderMap = new Map<string, any>();
    (allOrders || []).forEach((o: any) => {
      const rfq = o.rfq_id ? rfqMap.get(o.rfq_id) : null;
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

    let results = (rawRequests || []).map((t: any) => {
      const client = t.client_id ? profileMap.get(t.client_id) : null;
      const vendor = t.vendor_id ? profileMap.get(t.vendor_id) : null;
      const requester = t.requester_id ? profileMap.get(t.requester_id) : null;
      const order = t.order_id ? orderMap.get(t.order_id) : null;

      return {
        ...t,
        subject: t.subject || CATEGORY_NAMES[t.request_type] || "طلب مساعدة",
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

    // 3. Status filter
    if (status && status !== "all") {
      if (status === "open") {
        results = results.filter((r: any) => ["open", "pending", "in_progress", "accepted"].includes(r.status));
      } else if (status === "closed") {
        results = results.filter((r: any) => ["closed", "rejected", "completed"].includes(r.status));
      } else {
        results = results.filter((r: any) => r.status === status);
      }
    }

    // 4. Search filter
    if (search) {
      results = results.filter((r: any) =>
        [
          r.id,
          r.order_id,
          r.subject,
          r.reason,
          r.client?.full_name,
          r.client?.company_name,
          r.client?.ref_code,
          r.vendor?.company_name,
          r.vendor?.full_name,
          r.vendor?.ref_code,
          r.requester_name,
        ].some((val) => val && String(val).toLowerCase().includes(search))
      );
    }

    return NextResponse.json(
      {
        success: true,
        tickets: results,
        total: results.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[ADMIN_SUPPORT_GET_ERROR]:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

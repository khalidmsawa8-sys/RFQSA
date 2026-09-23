import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";
import { formatPartsDescriptionText } from "@/lib/excel-export";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/export/orders
 * Generates a full server-side dataset of all orders with line item details,
 * prices, vehicles, client and vendor information.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorizeRequest({
      requiredPermission: "orders:view_all",
      actionName: "EXPORT_ORDERS_DATA",
      resourceType: "orders",
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بتصدير بيانات الطلبات" },
        { status: authResult.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");

    const supabase = await createClient();

    let query = supabase
      .from("orders")
      .select(`
        id, status, total_price, created_at, updated_at,
        client:profiles!orders_client_id_fkey(id, full_name, company_name, ref_code, phone, tax_number),
        vendor:profiles!orders_vendor_id_fkey(id, full_name, company_name, ref_code, phone, tax_number),
        rfq:rfqs!orders_rfq_id_fkey(id, car_make, car_model, car_year, plate_number, vin, parts_description, delivery_location, delivery_city),
        deal:deals!deals_order_id_fkey(id, deal_items(id, part_name, part_number, quantity, unit_price, line_total, availability))
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo + "T23:59:59");
    }

    const { data: orders, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const STATUS_MAP: Record<string, string> = {
      pending: "معلق",
      confirmed: "تم التجهيز",
      active: "نشط",
      in_progress: "تم التجهيز",
      preparing: "تم التجهيز",
      processing: "تم التجهيز",
      ready: "تم التجهيز",
      shipped: "تم الشحن",
      delivered: "جاري التسليم",
      completed: "تأكيد واستلام",
      cancelled: "ملغي",
    };

    // Build comprehensive CSV rows
    const header = [
      "رقم الطلب",
      "حالة الطلب",
      "كود العميل",
      "اسم العميل",
      "شركة العميل",
      "جوال العميل",
      "كود المورد",
      "اسم المورد",
      "شركة المورد",
      "جوال المورد",
      "المركبة",
      "سنة الصنع",
      "رقم اللوحة",
      "رقم الهيكل VIN",
      "القطع المطلوبة وتفاصيلها",
      "إجمالي المبلغ (ر.س)",
      "مدينة التوصيل",
      "تاريخ الإنشاء",
    ];

    const rows = (orders || []).map((o: any) => {
      // Extract line items details
      let itemsSummary = "";
      const dealItems = o.deal?.[0]?.deal_items || [];
      if (dealItems.length > 0) {
        itemsSummary = dealItems
          .map(
            (it: any) =>
              `${it.part_name || "قطعة"} (${it.part_number || "بدون رقم"}) × ${it.quantity || 1} بسعر ${it.unit_price || 0} ر.س`
          )
          .join(" | ");
      } else if (o.rfq?.parts_description) {
        itemsSummary = formatPartsDescriptionText(o.rfq.parts_description);
      }

      return [
        o.id ? `#${o.id.slice(0, 8).toUpperCase()}` : "",
        STATUS_MAP[o.status] || o.status,
        o.client?.ref_code || "",
        o.client?.full_name || "",
        o.client?.company_name || "",
        o.client?.phone || "",
        o.vendor?.ref_code || "",
        o.vendor?.full_name || "",
        o.vendor?.company_name || "",
        o.vendor?.phone || "",
        `${o.rfq?.car_make || ""} ${o.rfq?.car_model || ""}`.trim(),
        o.rfq?.car_year || "",
        o.rfq?.plate_number || "",
        o.rfq?.vin || "",
        itemsSummary,
        Number(o.total_price || 0).toFixed(2),
        o.rfq?.delivery_city || o.rfq?.delivery_location || "",
        o.created_at ? new Date(o.created_at).toLocaleDateString("ar-SA") : "",
      ];
    });

    const csvContent = [header, ...rows]
      .map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    return new NextResponse(bom + csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders_comprehensive_export_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

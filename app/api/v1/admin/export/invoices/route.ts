import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";
import { formatPartsDescriptionText } from "@/lib/excel-export";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/export/invoices
 * Server-side comprehensive invoices export with vehicle, order, and party details.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorizeRequest({
      requiredPermission: "finance:view_all",
      actionName: "EXPORT_INVOICES_DATA",
      resourceType: "invoices",
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بتصدير بيانات الفواتير" },
        { status: authResult.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const supabase = await createClient();

    let query = supabase
      .from("invoices")
      .select(`
        id, invoice_number, status, total_amount, subtotal, tax_amount, issued_at, due_date, paid_at, type,
        client:profiles!invoices_client_id_fkey(id, full_name, company_name, ref_code, tax_number),
        vendor:profiles!invoices_vendor_id_fkey(id, full_name, company_name, ref_code, tax_number),
        deal:deals!invoices_deal_id_fkey(
          order_id,
          orders(id, rfq:rfqs!orders_rfq_id_fkey(car_make, car_model, car_year, plate_number, vin))
        )
      `)
      .order("issued_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (type && type !== "all") {
      query = query.eq("type", type);
    }
    if (dateFrom) {
      query = query.gte("issued_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("issued_at", dateTo + "T23:59:59");
    }

    const { data: invoices, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const STATUS_MAP: Record<string, string> = {
      draft: "مسودة",
      issued: "صادرة",
      sent: "مُرسلة",
      paid: "مدفوعة",
      overdue: "متأخرة",
      cancelled: "ملغية",
    };

    const header = [
      "رقم الفاتورة",
      "رقم الطلب",
      "نوع الفاتورة",
      "الحالة",
      "العميل",
      "كود العميل",
      "الرقم الضريبي للعميل",
      "المورد",
      "كود المورد",
      "الرقم الضريبي للمورد",
      "المركبة",
      "رقم اللوحة",
      "رقم الهيكل VIN",
      "تفاصيل الطلب والقطع",
      "المبلغ قبل الضريبة (ر.س)",
      "ضريبة القيمة المضافة 15%",
      "الإجمالي الكلي شامل الضريبة (ر.س)",
      "تاريخ الإصدار",
      "تاريخ السداد",
    ];

    const rows = (invoices || []).map((inv: any) => {
      const order = inv.deal?.orders;
      const rfq = order?.rfq;
      const partsSummary = rfq?.parts_description ? formatPartsDescriptionText(rfq.parts_description) : "قطع غيار ومستلزمات صيانة";
      return [
        inv.invoice_number || `#${inv.id.slice(0, 8)}`,
        order?.id ? `#${order.id.slice(0, 8).toUpperCase()}` : "",
        inv.type === "client" ? "فاتورة عميل" : "فاتورة مورد",
        STATUS_MAP[inv.status] || inv.status,
        inv.client?.company_name || inv.client?.full_name || "",
        inv.client?.ref_code || "",
        inv.client?.tax_number || "",
        inv.vendor?.company_name || inv.vendor?.full_name || "",
        inv.vendor?.ref_code || "",
        inv.vendor?.tax_number || "",
        rfq ? `${rfq.car_make} ${rfq.car_model} ${rfq.car_year}` : "",
        rfq?.plate_number || "",
        rfq?.vin || "",
        partsSummary,
        Number(inv.subtotal || 0).toFixed(2),
        Number(inv.tax_amount || 0).toFixed(2),
        Number(inv.total_amount || 0).toFixed(2),
        inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("ar-SA") : "",
        inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("ar-SA") : "",
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
        "Content-Disposition": `attachment; filename="invoices_export_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

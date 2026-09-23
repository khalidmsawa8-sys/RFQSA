import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface UnifiedAuditLogItem {
  id: string;
  action: string;
  action_label: string;
  entity_type: "order" | "rfq" | "quote" | "invoice" | "wallet" | "user" | "delivery" | "support" | "system";
  entity_type_label: string;
  entity_id: string | null;
  actor_name: string;
  actor_company?: string;
  actor_role: string;
  actor_ref_code?: string;
  details: string;
  old_values?: any;
  new_values?: any;
  severity: "info" | "warning" | "critical";
  created_at: string;
  source: string;
}

const ENTITY_LABELS: Record<string, { label: string; type: UnifiedAuditLogItem["entity_type"] }> = {
  order: { label: "الطلبات والصفقات", type: "order" },
  orders: { label: "الطلبات والصفقات", type: "order" },
  rfq: { label: "مناقصات التسعير", type: "rfq" },
  rfqs: { label: "مناقصات التسعير", type: "rfq" },
  quote: { label: "عروض الأسعار", type: "quote" },
  quotes: { label: "عروض الأسعار", type: "quote" },
  invoice: { label: "الفواتير الضريبية", type: "invoice" },
  invoices: { label: "الفواتير الضريبية", type: "invoice" },
  wallet: { label: "المحافظ المالية", type: "wallet" },
  wallet_transactions: { label: "المحافظ المالية", type: "wallet" },
  user: { label: "المستخدمين والعضويات", type: "user" },
  profiles: { label: "المستخدمين والعضويات", type: "user" },
  delivery: { label: "أسطول التوصيل", type: "delivery" },
  deliveries: { label: "أسطول التوصيل", type: "delivery" },
  support: { label: "الدعم والمساعدة", type: "support" },
  support_tickets: { label: "الدعم والمساعدة", type: "support" },
  system: { label: "النظام والأمان", type: "system" },
};

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const severity = searchParams.get("severity");
    const limit = Math.min(Number(searchParams.get("limit") || 250), 500);

    // 1. Fetch Recorded Audit Logs
    const [staffLogsRes, auditLogsRes, ordersRes, rfqsRes, invoicesRes, walletTxRes, profilesRes] = await Promise.all([
      supabase.from("staff_audit_logs").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase.from("audit_logs").select("*, profiles(full_name, company_name, ref_code, role)").order("created_at", { ascending: false }).limit(limit),
      supabase.from("orders").select("id, status, total_price, created_at, client:profiles!orders_client_id_fkey(full_name, company_name, ref_code), vendor:profiles!orders_vendor_id_fkey(full_name, company_name, ref_code), rfqs(car_make, car_model, car_year)").order("created_at", { ascending: false }).limit(40),
      supabase.from("rfqs").select("id, car_make, car_model, car_year, status, created_at, profiles:profiles!rfqs_client_id_fkey(full_name, company_name, ref_code)").order("created_at", { ascending: false }).limit(40),
      supabase.from("invoices").select("id, invoice_number, total_amount, status, issued_at, created_at, client:profiles!invoices_client_id_fkey(full_name, company_name, ref_code), vendor:profiles!invoices_vendor_id_fkey(full_name, company_name, ref_code)").order("created_at", { ascending: false }).limit(30),
      supabase.from("wallet_transactions").select("id, type, amount, balance_after, description, reference, created_at, user:profiles!wallet_transactions_user_id_fkey(full_name, company_name, ref_code, role)").order("created_at", { ascending: false }).limit(40),
      supabase.from("profiles").select("id, full_name, company_name, role, ref_code, created_at").order("created_at", { ascending: false }).limit(20),
    ]);

    const unifiedList: UnifiedAuditLogItem[] = [];
    const seenIds = new Set<string>();

    // Process Recorded Staff & Audit Logs
    const rawStaffLogs = staffLogsRes.data || [];
    const rawAuditLogs = auditLogsRes.data || [];

    [...rawStaffLogs, ...rawAuditLogs].forEach((l: any) => {
      if (!l || !l.id || seenIds.has(l.id)) return;
      seenIds.add(l.id);

      const ent = (l.entity_type || l.table_name || "system").toLowerCase();
      const mapped = ENTITY_LABELS[ent] || { label: "النظام والأمان", type: "system" };

      unifiedList.push({
        id: l.id,
        action: l.action || "عملية نظام",
        action_label: l.action || "تسجيل حركة",
        entity_type: mapped.type,
        entity_type_label: mapped.label,
        entity_id: l.entity_id || l.record_id || null,
        actor_name: l.actor_name || l.profiles?.company_name || l.profiles?.full_name || "مشرف النظام",
        actor_company: l.profiles?.company_name || l.actor?.company_name,
        actor_role: l.actor_role || l.profiles?.role || "admin",
        actor_ref_code: l.actor_ref_code || l.profiles?.ref_code || "ADM",
        details: l.details || l.description || l.action || "عملية مسجلة في السجل",
        old_values: l.old_values || l.before_data,
        new_values: l.new_values || l.after_data,
        severity: (l.severity as any) || "info",
        created_at: l.created_at || l.timestamp || new Date().toISOString(),
        source: "audit_logger",
      });
    });

    // Synthesize Live Orders Events
    (ordersRes.data || []).forEach((o: any) => {
      const synId = `syn-ord-${o.id}`;
      if (seenIds.has(synId)) return;
      seenIds.add(synId);

      const clientName = o.client?.company_name || o.client?.full_name || "العميل";
      const vendorName = o.vendor?.company_name || o.vendor?.full_name || "المورد";
      const car = o.rfqs ? `${o.rfqs.car_make || ""} ${o.rfqs.car_model || ""}` : "قطع غيار";

      let actionTitle = `أمر شراء وصفقة معتمدة #${o.id.slice(0, 8)}`;
      let sev: UnifiedAuditLogItem["severity"] = "info";
      if (o.status === "completed") {
        actionTitle = `إتمام وتسليم صفقة #${o.id.slice(0, 8)}`;
      } else if (o.status === "cancelled") {
        actionTitle = `إلغاء صفقة #${o.id.slice(0, 8)}`;
        sev = "warning";
      }

      unifiedList.push({
        id: synId,
        action: actionTitle,
        action_label: actionTitle,
        entity_type: "order",
        entity_type_label: "الطلبات والصفقات",
        entity_id: o.id,
        actor_name: clientName,
        actor_company: o.client?.company_name,
        actor_role: "client",
        actor_ref_code: o.client?.ref_code || "CUST",
        details: `صفقة شراء مع ${vendorName} لسيارة ${car} بقيمة ${Number(o.total_price || 0).toLocaleString("ar-SA")} ر.س [الحالة: ${o.status}]`,
        new_values: { order_id: o.id, total_price: o.total_price, status: o.status },
        severity: sev,
        created_at: o.created_at,
        source: "orders_stream",
      });
    });

    // Synthesize Live RFQs Events
    (rfqsRes.data || []).forEach((r: any) => {
      const synId = `syn-rfq-${r.id}`;
      if (seenIds.has(synId)) return;
      seenIds.add(synId);

      const clientName = r.profiles?.company_name || r.profiles?.full_name || "العميل";
      unifiedList.push({
        id: synId,
        action: `إنشاء مناقصة تسعير #${r.id.slice(0, 8)}`,
        action_label: `طلب تسعير جديد`,
        entity_type: "rfq",
        entity_type_label: "مناقصات التسعير",
        entity_id: r.id,
        actor_name: clientName,
        actor_company: r.profiles?.company_name,
        actor_role: "client",
        actor_ref_code: r.profiles?.ref_code || "CUST",
        details: `طرح طلب تسعير لسيارة ${r.car_make || ""} ${r.car_model || ""} (${r.car_year || ""}) في المنصة`,
        new_values: { rfq_id: r.id, make: r.car_make, model: r.car_model, status: r.status },
        severity: "info",
        created_at: r.created_at,
        source: "rfqs_stream",
      });
    });

    // Synthesize Live Invoices Events
    (invoicesRes.data || []).forEach((inv: any) => {
      const synId = `syn-inv-${inv.id}`;
      if (seenIds.has(synId)) return;
      seenIds.add(synId);

      const vendorName = inv.vendor?.company_name || inv.vendor?.full_name || "المورد المعتمد";
      const isPaid = inv.status === "paid";

      unifiedList.push({
        id: synId,
        action: isPaid ? `سداد فاتورة ضريبية ZATCA (${inv.invoice_number})` : `إصدار فاتورة ضريبية (${inv.invoice_number})`,
        action_label: "الفواتير الضريبية",
        entity_type: "invoice",
        entity_type_label: "الفواتير والضرائب",
        entity_id: inv.id,
        actor_name: vendorName,
        actor_company: inv.vendor?.company_name,
        actor_role: "vendor",
        actor_ref_code: inv.vendor?.ref_code || "SUP",
        details: `فاتورة ضريبية رقم ${inv.invoice_number} بقيمة ${Number(inv.total_amount || 0).toLocaleString("ar-SA")} ر.س - ${isPaid ? "مدفوعة بالكامل" : "قيد السداد"}`,
        new_values: { invoice_number: inv.invoice_number, total_amount: inv.total_amount, status: inv.status },
        severity: "info",
        created_at: inv.issued_at || inv.created_at,
        source: "invoices_stream",
      });
    });

    // Synthesize Live Wallet Events
    (walletTxRes.data || []).forEach((t: any) => {
      const synId = `syn-wtx-${t.id}`;
      if (seenIds.has(synId)) return;
      seenIds.add(synId);

      const userName = t.user?.company_name || t.user?.full_name || "مستخدم المحفظة";
      const isCredit = t.type === "credit";

      unifiedList.push({
        id: synId,
        action: isCredit ? `إيداع رصيد بالمحفظة (+)` : `خصم/سحب من المحفظة (-)`,
        action_label: "حركة محفظة مالية",
        entity_type: "wallet",
        entity_type_label: "المحافظ والعمليات المالية",
        entity_id: t.id,
        actor_name: userName,
        actor_company: t.user?.company_name,
        actor_role: t.user?.role || "client",
        actor_ref_code: t.user?.ref_code || "ACC",
        details: `${isCredit ? "إيداع" : "خصم"} مبلغ ${Number(t.amount || 0).toLocaleString("ar-SA")} ر.س - البيان: ${t.description || "عملية رصيد"}`,
        new_values: { amount: t.amount, balance_after: t.balance_after, reference: t.reference },
        severity: "info",
        created_at: t.created_at,
        source: "wallet_stream",
      });
    });

    // Sort descending by timestamp
    unifiedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply filters
    let filtered = unifiedList;
    if (entityType && entityType !== "all") {
      filtered = filtered.filter((l) => l.entity_type === entityType);
    }
    if (severity && severity !== "all") {
      filtered = filtered.filter((l) => l.severity === severity);
    }
    if (dateFrom) {
      filtered = filtered.filter((l) => l.created_at >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((l) => l.created_at <= dateTo + "T23:59:59");
    }

    // Stats Calculation
    const stats = {
      totalLogs: unifiedList.length,
      ordersCount: unifiedList.filter((l) => l.entity_type === "order").length,
      rfqsCount: unifiedList.filter((l) => l.entity_type === "rfq").length,
      invoicesCount: unifiedList.filter((l) => l.entity_type === "invoice").length,
      walletCount: unifiedList.filter((l) => l.entity_type === "wallet").length,
      securityCount: unifiedList.filter((l) => l.entity_type === "system" || l.severity === "warning").length,
    };

    return NextResponse.json({
      success: true,
      logs: filtered.slice(0, limit),
      stats,
    });
  } catch (err: any) {
    console.error("[API_ADMIN_AUDIT_ERROR]:", err);
    return NextResponse.json({ error: err.message || "فشل جلب سجل النشاط الموحد" }, { status: 500 });
  }
}

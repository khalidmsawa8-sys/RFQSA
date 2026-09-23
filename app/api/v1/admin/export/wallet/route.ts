import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/export/wallet
 * Server-side complete wallet transactions and ledger export.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorizeRequest({
      requiredPermission: "finance:view_all",
      actionName: "EXPORT_WALLET_DATA",
      resourceType: "wallet_transactions",
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بتصدير بيانات المحافظ المالية" },
        { status: authResult.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const type = searchParams.get("type"); // 'credit' | 'debit'

    const supabase = await createClient();

    let query = supabase
      .from("wallet_transactions")
      .select(`
        id, type, amount, balance_after, description, reference, created_at, performed_by,
        user:profiles!wallet_transactions_user_id_fkey(id, full_name, company_name, ref_code, role, phone),
        actor:profiles!wallet_transactions_performed_by_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    if (type && type !== "all") {
      query = query.eq("type", type);
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo + "T23:59:59");
    }

    const { data: transactions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const header = [
      "رقم المرجع",
      "رقم الفاتورة / الطلب",
      "المستخدم والمنشأة",
      "كود الحساب",
      "نوع الحساب",
      "نوع العملية",
      "المبلغ (ر.س)",
      "الرصيد بعد الحركة (ر.س)",
      "البيان والسبب",
      "التاريخ والوقت",
    ];

    const rows = (transactions || []).map((t: any) => [
      t.reference || (t.id ? `#${t.id.slice(0, 8)}` : "—"),
      t.reference?.startsWith("INV-") ? t.reference : (t.invoice_number || "—"),
      t.user?.company_name || t.user?.full_name || "—",
      t.user?.ref_code || "—",
      t.user?.role === "client" ? "عميل" : t.user?.role === "vendor" ? "مورد" : t.user?.role === "courier" ? "مندوب" : "إداري",
      t.type === "credit" ? "دائن (إيداع +)" : "مدين (سحب/دفع -)",
      Number(t.amount || 0).toFixed(2),
      Number(t.balance_after || 0).toFixed(2),
      t.description || "—",
      t.created_at ? new Date(t.created_at).toLocaleString("ar-SA") : "",
    ]);

    const csvContent = [header, ...rows]
      .map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    return new NextResponse(bom + csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="wallet_ledger_export_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

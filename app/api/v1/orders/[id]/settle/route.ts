import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  distributeOrderFundsAutomatically,
  computeOrderDistributionBreakdown,
} from "@/lib/wallet-distribution";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/orders/[id]/settle
 * Returns the authoritative settlement status and financial breakdown for an order.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id.replace(/^ORD-/, "").replace(/^DEAL-/, "");
    const canonicalOrderId = `ORD-${cleanId}`;

    const supabase = await createClient();
    const { data: order } = await supabase
      .from("orders")
      .select("*, rfqs(*)")
      .or(`id.eq.${canonicalOrderId},id.eq.${cleanId}`)
      .maybeSingle();

    let targetOrder = order;
    if (!targetOrder) {
      const DATA_DIR = path.join(process.cwd(), "data");
      const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
      if (fs.existsSync(ORDERS_FILE)) {
        try {
          const diskOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
          targetOrder = diskOrders.find((o: any) => o.id === canonicalOrderId || o.id === cleanId || o.id === id);
        } catch {}
      }
    }

    if (!targetOrder) {
      return NextResponse.json({ success: false, error: "الطلب غير موجود" }, { status: 404 });
    }

    const breakdown = computeOrderDistributionBreakdown(targetOrder);

    return NextResponse.json({
      success: true,
      orderId: canonicalOrderId,
      wallet_split_settled: Boolean(targetOrder.wallet_split_settled),
      wallet_split_settled_at: targetOrder.wallet_split_settled_at || null,
      breakdown,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/orders/[id]/settle
 * Executes the automated funds distribution on wallets (Vendor, Courier, Platform Admin).
 * Idempotent: repeated calls will NOT duplicate transactions.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id.replace(/^ORD-/, "").replace(/^DEAL-/, "");
    const canonicalOrderId = `ORD-${cleanId}`;

    const body = await req.json().catch(() => ({}));
    const { paymentSource = "wallet", paymentReference, actorName } = body || {};

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const performedBy = authData?.user?.id || "system";

    const result = await distributeOrderFundsAutomatically(canonicalOrderId, {
      paymentSource,
      paymentReference,
      performedBy,
      actorName: actorName || authData?.user?.user_metadata?.full_name || "مستخدم موثق",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, orderId: canonicalOrderId, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: canonicalOrderId,
      alreadySettled: result.alreadySettled || false,
      breakdown: result.breakdown,
      transactionsCount: Object.keys(result.transactions || {}).length,
      message: result.alreadySettled
        ? "تمت تسوية هذا الطلب مسبقاً، تم الحفاظ على الأرصدة بدون تكرار."
        : "تم توزيع مبالغ الطلب بنجاح على المحافظ (المورد، المندوب، والمنصة).",
    });
  } catch (err: any) {
    console.error("Order settlement API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "خطأ غير متوقع أثناء تسوية مبالغ الطلب" },
      { status: 500 }
    );
  }
}

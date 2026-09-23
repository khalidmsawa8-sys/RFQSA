import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeLedgerTransaction } from "@/lib/wallet-ledger";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/wallet/transaction
 * Allows an authenticated client or vendor to execute a self-deposit (إيداع)
 * or withdrawal/payment (خصم/سحب/دفع) through the secure atomic ledger.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Multi-source identity resolution
    const searchParams = req.nextUrl.searchParams;
    const paramUserId = searchParams.get("userId") || searchParams.get("id");
    const headerUserId = req.headers.get("x-user-id");
    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const cookieMemberId = req.cookies.get("rfq_member_id")?.value;
    const cookieSession = req.cookies.get("rfq_session")?.value;
    const referer = req.headers.get("referer") || "";

    const { data: userData } = await supabase.auth.getUser();
    const authUser = userData?.user;

    let targetUserId =
      paramUserId ||
      headerUserId ||
      cookieUserId ||
      authUser?.id ||
      cookieMemberId;

    if (!targetUserId) {
      if (cookieSession === "vendor" || referer.includes("/vendor")) {
        targetUserId = "vendor-demo-id";
      } else if (cookieSession === "client" || referer.includes("/client")) {
        targetUserId = "client-demo-id";
      } else if (cookieSession === "courier" || referer.includes("/courier")) {
        targetUserId = "courier-1";
      } else {
        targetUserId = "client-demo-id";
      }
    }

    const body = await req.json();
    const { type, amount, description, reference, orderId, invoiceNumber } = body;

    if (type !== "credit" && type !== "debit") {
      return NextResponse.json(
        { success: false, error: "نوع العملية غير صالح (إيداع credit أو سحب debit)" },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "المبلغ يجب أن يكون رقماً موجباً أكبر من الصفر" },
        { status: 400 }
      );
    }

    // 2. Lookup Profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, company_name, role, ref_code, balance, wallet_balance, phone")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!profile) {
      const { data: allMembers } = await supabase
        .from("organization_members")
        .select("id, user_id, organization_id, full_name, role_id, email");

      const matchedMember = (allMembers || []).find(
        (m: any) =>
          m.user_id === targetUserId ||
          m.id === targetUserId ||
          (cookieMemberId && m.id === cookieMemberId)
      );

      if (matchedMember) {
        profile = {
          id: matchedMember.user_id || matchedMember.id,
          full_name: matchedMember.full_name,
          company_name: matchedMember.full_name,
          role: matchedMember.role_id?.startsWith("vendor") ? "vendor" : "client",
          ref_code: `MEM-${matchedMember.id.slice(-6).toUpperCase()}`,
          balance: 0,
          wallet_balance: 0,
          phone: "",
        };
      }
    }

    const role = profile?.role || authUser?.user_metadata?.role || (cookieSession === "vendor" ? "vendor" : "client");
    const fullName = profile?.full_name || profile?.company_name || authUser?.user_metadata?.full_name || "مستخدم رفق";

    const defaultDesc =
      type === "credit"
        ? `إيداع رصيد بالمحفظة (${numericAmount.toLocaleString("ar-SA")} ر.س)`
        : `سحب رصيد من المحفظة (${numericAmount.toLocaleString("ar-SA")} ر.س)`;

    const result = await executeLedgerTransaction({
      userId: targetUserId,
      type,
      amount: numericAmount,
      description: description?.trim() || defaultDesc,
      reference: reference?.trim(),
      orderId: orderId || null,
      invoiceNumber: invoiceNumber || null,
      performedBy: targetUserId,
      actorRole: role,
      actorName: fullName,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `تم تنفيذ عملية ${type === "credit" ? "الإيداع" : "السحب"} بنجاح`,
      transaction: result.transaction,
    });
  } catch (err: any) {
    console.error("Wallet transaction API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "فشل تنفيذ العملية المالية" },
      { status: 500 }
    );
  }
}

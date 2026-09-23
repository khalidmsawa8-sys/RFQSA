import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeLedgerTransfer } from "@/lib/wallet-ledger";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/wallet/transfer
 * Performs an atomic double-entry transfer between two users (e.g. client to vendor or client to client).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول لإجراء التحويل" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { toUserId, toUserRef, amount, description } = body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "المبلغ يجب أن يكون رقماً موجباً أكبر من الصفر" },
        { status: 400 }
      );
    }

    let targetId = toUserId;
    // Resolve target by reference code if ID was not provided
    if (!targetId && toUserRef) {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("ref_code", toUserRef.trim())
        .maybeSingle();

      if (targetProfile) {
        targetId = targetProfile.id;
      }
    }

    if (!targetId) {
      return NextResponse.json(
        { success: false, error: "يجب تحديد المستفيد المراد التحويل إليه (معرف أو رمز مرجعي)" },
        { status: 400 }
      );
    }

    if (targetId === user.id) {
      return NextResponse.json(
        { success: false, error: "لا يمكن التحويل لنفس الحساب" },
        { status: 400 }
      );
    }

    const role = user.user_metadata?.role || "client";
    const fullName = user.user_metadata?.full_name || "مستخدم رفق";

    const result = await executeLedgerTransfer({
      fromUserId: user.id,
      toUserId: targetId,
      amount: numericAmount,
      description: description?.trim() || `تحويل مالي مباشر بقيمة ${numericAmount.toLocaleString("ar-SA")} ر.س`,
      performedBy: user.id,
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
      message: `تم تحويل ${numericAmount.toLocaleString("ar-SA")} ر.س بنجاح`,
      outflowTransaction: result.senderTx,
      inflowTransaction: result.receiverTx,
    });
  } catch (err: any) {
    console.error("Wallet transfer API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "فشل تنفيذ عملية التحويل" },
      { status: 500 }
    );
  }
}

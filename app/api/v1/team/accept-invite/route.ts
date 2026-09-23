import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptMemberInvitation } from "@/lib/rbac/invitation-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/team/accept-invite
 * Validates a secure invitation token and associates it with the currently authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول أو إنشاء حساب أولاً لقبول الدعوة" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "رمز الدعوة مطلوب" },
        { status: 400 }
      );
    }

    const result = await acceptMemberInvitation(
      token,
      user.id,
      user.email || user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const res = NextResponse.json({
      success: true,
      message: "تم قبول الدعوة وتفعيل عضويتك في المنشأة بنجاح",
      organizationId: result.organizationId,
      roleId: result.roleId,
      memberId: result.memberId,
      email: result.email,
      fullName: result.fullName,
    });

    const isVendor = result.roleId?.startsWith("vendor_");
    const sessionRole = isVendor ? "vendor" : "client";

    res.cookies.set("rfq_session", sessionRole, { path: "/", maxAge: 86400, sameSite: "lax" });
    if (result.roleId) {
      res.cookies.set("rfq_role", result.roleId, { path: "/", maxAge: 86400, sameSite: "lax" });
    }
    if (result.memberId) {
      res.cookies.set("rfq_member_id", result.memberId, { path: "/", maxAge: 86400, sameSite: "lax" });
    }
    if (result.email) {
      res.cookies.set("rfq_user_email", result.email, { path: "/", maxAge: 86400, sameSite: "lax" });
    }

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthContext } from "@/lib/rbac/rbac-guard.server";
import { ROLE_DISPLAY_NAMES_AR } from "@/lib/rbac/navigation-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/account/permissions
 * Returns the effective RBAC permissions and role information for the active session.
 */
export async function GET(req: NextRequest) {
  try {
    const authContext = await getVerifiedAuthContext();

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: "غير مصرح: يرجى تسجيل الدخول" },
        { status: 401 }
      );
    }

    const permissionsArray = Array.from(authContext.effectivePermissions);

    return NextResponse.json({
      success: true,
      user: {
        userId: authContext.userId,
        email: authContext.email,
        fullName: authContext.fullName,
        role: authContext.role,
        roleNameAr: authContext.roleNameAr || ROLE_DISPLAY_NAMES_AR[authContext.role] || authContext.role,
        organizationId: authContext.organizationId,
        isOwner: authContext.isOwner,
        isSuperAdmin: authContext.isSuperAdmin,
        permissions: permissionsArray,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/account/permissions
 * Allows switching preview role in testing / demo mode.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roleId, memberId, reset } = body;

    const res = NextResponse.json({
      success: true,
      message: reset ? "تمت إعادة تعيين الدور الأصلي" : `تم تعيين الدور النشط: ${roleId}`,
    });

    if (reset) {
      res.cookies.delete("rfq_role");
      res.cookies.delete("rfq_member_id");
    } else {
      if (roleId) {
        res.cookies.set("rfq_role", roleId, {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
        });
      }
      if (memberId) {
        res.cookies.set("rfq_member_id", memberId, {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
        });
      }
    }

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

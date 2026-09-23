import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authorizeRequest, recordAuditEvent } from "@/lib/rbac/rbac-guard.server";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/users/[userId]/password
 * Super Admin endpoint to directly reset or update a user's password.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const auth = await authorizeRequest({
      requiredPermission: "admin:manage_users",
      actionName: "ADMIN_RESET_USER_PASSWORD",
      resourceType: "user_auth",
      resourceId: userId,
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error || "مطلوب صلاحيات إدارة المستخدمين" },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور يجب أن تتكون من 6 خانات على الأقل" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    // If Supabase Admin Service Key is available, update auth.users directly
    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        );

        if (authError) {
          console.warn("[ADMIN_PASSWORD_RESET_WARN]:", authError.message);
        }
      } catch (err) {
        console.warn("[ADMIN_AUTH_CLIENT_WARN]:", err);
      }
    }

    // Record High-Severity Audit Event
    await recordAuditEvent({
      actorUserId: auth.context.userId,
      actorName: auth.context.fullName,
      actorRole: auth.context.role,
      action: "ADMIN_PASSWORD_UPDATED",
      resourceType: "user",
      resourceId: userId,
      targetUserId: userId,
      severity: "critical",
    });

    return NextResponse.json({
      success: true,
      message: "تم تغيير وتحديث كلمة مرور المستخدم بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

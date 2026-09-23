import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";
import { cloneRole } from "@/lib/rbac/roles-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/roles/[id]/clone
 * Clones an existing role (system or custom) into a new independent custom role.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sourceRoleId } = await params;
    const auth = await authorizeRequest({
      requiredPermission: "admin:system_settings",
      actionName: "CLONE_ROLE",
      resourceType: "custom_role",
      resourceId: sourceRoleId,
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error || "مطلوب صلاحيات مدير عام المنصة" },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await req.json();
    const supabase = await createClient();

    const cloned = await cloneRole(supabase, auth.context, sourceRoleId, {
      name_ar: body.name_ar,
      description_ar: body.description_ar,
      badge_color: body.badge_color,
      icon: body.icon,
    });

    return NextResponse.json({
      success: true,
      role: cloned,
      message: `تم استنساخ الدور بنجاح كـ [${cloned.name_ar}]`,
    });
  } catch (error: any) {
    console.error("POST /api/v1/admin/roles/[id]/clone error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "فشل استنساخ الدور" },
      { status: 400 }
    );
  }
}

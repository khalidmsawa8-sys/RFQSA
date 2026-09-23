import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";
import { getRoleById, updateCustomRole, deleteCustomRole } from "@/lib/rbac/roles-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/roles/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    const auth = await authorizeRequest({
      actionName: "GET_ROLE_BY_ID",
      resourceType: "custom_role",
      resourceId: roleId,
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error || "مطلوب تسجيل الدخول" },
        { status: auth.statusCode || 401 }
      );
    }

    const supabase = await createClient();
    const role = await getRoleById(supabase, roleId);

    if (!role) {
      return NextResponse.json({ success: false, error: "الدور غير موجود" }, { status: 404 });
    }

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "فشل جلب بيانات الدور" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/admin/roles/[id]
 * Updates custom role details or permissions. Protects system roles.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    const auth = await authorizeRequest({
      requiredPermission: "admin:system_settings",
      actionName: "UPDATE_CUSTOM_ROLE",
      resourceType: "custom_role",
      resourceId: roleId,
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error || "مطلوب صلاحيات مدير عام المنصة" },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await req.json();
    const supabase = await createClient();

    const updatedRole = await updateCustomRole(supabase, auth.context, roleId, {
      name_ar: body.name_ar,
      name_en: body.name_en,
      description_ar: body.description_ar,
      description_en: body.description_en,
      badge_color: body.badge_color,
      icon: body.icon,
      permissions: body.permissions,
    });

    return NextResponse.json({
      success: true,
      role: updatedRole,
      message: `تم تحديث الدور [${updatedRole.name_ar}] بنجاح`,
    });
  } catch (error: any) {
    console.error("PUT /api/v1/admin/roles/[id] error:", error);
    const statusCode = error?.message?.includes("PROTECTED_SYSTEM_ROLE") || error?.message?.includes("PRIVILEGE_ESCALATION") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: error?.message || "فشل تحديث الدور" },
      { status: statusCode }
    );
  }
}

/**
 * DELETE /api/v1/admin/roles/[id]
 * Deletes custom role safely. Refuses deletion if active members are assigned.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    const auth = await authorizeRequest({
      requiredPermission: "admin:system_settings",
      actionName: "DELETE_CUSTOM_ROLE",
      resourceType: "custom_role",
      resourceId: roleId,
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error || "مطلوب صلاحيات مدير عام المنصة" },
        { status: auth.statusCode || 403 }
      );
    }

    const supabase = await createClient();
    const result = await deleteCustomRole(supabase, auth.context, roleId);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("DELETE /api/v1/admin/roles/[id] error:", error);
    const statusCode = error?.message?.includes("PROTECTED_SYSTEM_ROLE") || error?.message?.includes("CANNOT_DELETE_ROLE_WITH_MEMBERS") ? 400 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "فشل حذف الدور المخصص" },
      { status: statusCode }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";
import { getAllRoles, createCustomRole } from "@/lib/rbac/roles-service";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/roles
 * Lists all system roles and custom roles with permissions & member counts.
 * Optionally returns live server members if includeMembers=true.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest({
      actionName: "GET_ALL_ROLES",
      resourceType: "role_catalog",
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error || "مطلوب تسجيل الدخول" },
        { status: auth.statusCode || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") as any;
    const includeMembers = searchParams.get("includeMembers") === "true";

    const supabase = await createClient();
    const roles = await getAllRoles(supabase, { scope: scope || "all" });

    let users: any[] = [];
    if (includeMembers) {
      const DATA_DIR = path.join(process.cwd(), "data");
      const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");
      const ORG_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");

      let profilesList: any[] = [];
      let membersList: any[] = [];

      try {
        if (fs.existsSync(PROFILES_FILE)) {
          profilesList = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
        }
      } catch (e) {}

      try {
        if (fs.existsSync(ORG_MEMBERS_FILE)) {
          membersList = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
        }
      } catch (e) {}

      const memberMap = new Map<string, any>();
      membersList.forEach((m: any) => {
        if (m.user_id && m.status === "active") {
          memberMap.set(m.user_id, m);
        }
      });

      users = profilesList.map((p: any) => {
        const mem = memberMap.get(p.id);
        let resolvedRole = p.role_id || mem?.role_id;
        if (!resolvedRole) {
          if (p.is_admin) {
            resolvedRole = p.admin_role === "super_admin" || !p.admin_role ? "platform_super_admin" : `platform_${p.admin_role}`;
          } else {
            resolvedRole = p.role === "vendor" ? "vendor_owner" : "client_owner";
          }
        }

        return {
          id: p.id,
          full_name: p.full_name || p.company_name || "مستخدم",
          phone: p.phone || "—",
          role: p.role,
          company_name: p.company_name,
          ref_code: p.ref_code,
          is_admin: p.is_admin,
          admin_role: p.admin_role,
          current_role_id: resolvedRole,
          custom_permissions: mem?.custom_permissions || [],
          explicit_denies: mem?.explicit_denies || [],
          organization_id: mem?.organization_id || (p.role === "vendor" ? "org-vendor-demo-id" : "org-client-demo-id"),
          created_at: p.created_at || new Date().toISOString(),
        };
      });
    }

    return NextResponse.json({
      success: true,
      roles,
      total: roles.length,
      users: includeMembers ? users : undefined,
    });
  } catch (error: any) {
    console.error("GET /api/v1/admin/roles error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "فشل جلب قائمة الأدوار" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/roles
 * Creates a new custom role with granular permissions and privilege escalation checks.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest({
      requiredPermission: "admin:system_settings",
      actionName: "CREATE_CUSTOM_ROLE",
      resourceType: "custom_role",
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error || "مطلوب صلاحيات مدير عام المنصة" },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await req.json();
    const supabase = await createClient();

    const newRole = await createCustomRole(supabase, auth.context, {
      id: body.id,
      scope: body.scope,
      name_ar: body.name_ar,
      name_en: body.name_en,
      description_ar: body.description_ar,
      description_en: body.description_en,
      badge_color: body.badge_color,
      icon: body.icon,
      permissions: body.permissions || [],
    });

    return NextResponse.json({
      success: true,
      role: newRole,
      message: `تم إنشاء الدور المخصص [${newRole.name_ar}] بنجاح`,
    });
  } catch (error: any) {
    console.error("POST /api/v1/admin/roles error:", error);
    const statusCode = error?.message?.includes("FORBIDDEN") || error?.message?.includes("PRIVILEGE_ESCALATION") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: error?.message || "فشل إنشاء الدور المخصص" },
      { status: statusCode }
    );
  }
}

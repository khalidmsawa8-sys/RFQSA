import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest, recordAuditEvent } from "@/lib/rbac/rbac-guard.server";
import { SENSITIVE_PERMISSIONS, SystemPermission, validatePrivilegeEscalation } from "@/lib/rbac/permissions";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");
const ORGANIZATION_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");
const ORGANIZATIONS_FILE = path.join(DATA_DIR, "organizations_db.json");

/**
 * POST /api/v1/admin/assign-role
 * Super Admin endpoint to assign or change roles for platform staff, clients, or vendors.
 * Supports assigning system roles, custom roles, and fine-grained user permission overrides (ALLOW / DENY).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest({
      requiredPermission: "admin:system_settings",
      actionName: "ADMIN_ASSIGN_ROLE",
      resourceType: "user_role_assignment",
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error || "مطلوب صلاحيات مدير عام المنصة" },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await req.json();
    const { userId, roleId, customPermissions, explicitDenies, organizationId } = body;

    if (!userId || !roleId) {
      return NextResponse.json(
        { success: false, error: "معرف المستخدم والدور الوظيفي مطلوبان" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch Target Profile
    const { data: targetProfile, error: profError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, is_admin, admin_role, company_name")
      .eq("id", userId)
      .maybeSingle();

    if (profError || !targetProfile) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // 2. Validate custom permissions escalation if provided
    if (customPermissions && Array.isArray(customPermissions) && customPermissions.length > 0) {
      const escalationCheck = validatePrivilegeEscalation(
        auth.context.effectivePermissions,
        customPermissions as SystemPermission[],
        auth.context.isSuperAdmin
      );

      if (!escalationCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `PRIVILEGE_ESCALATION_BLOCKED: لا يمكنك منح استثناءات صلاحيات تتجاوز صلاحياتك: [${escalationCheck.unauthorizedPermissions.join(", ")}]`,
          },
          { status: 403 }
        );
      }
    }

    // 3. Check if assigning a platform staff role vs client/vendor role
    const isPlatformRole = roleId.startsWith("platform_");
    const isSuperAdminRole = roleId === "platform_super_admin";

    // Update profile admin flags and assigned role_id
    const profileUpdates: any = {
      role_id: roleId,
      custom_role: roleId,
      updated_at: new Date().toISOString(),
    };

    if (isPlatformRole) {
      profileUpdates.is_admin = true;
      profileUpdates.admin_role = isSuperAdminRole ? "super_admin" : roleId.replace("platform_", "");
    } else {
      profileUpdates.is_admin = false;
      profileUpdates.admin_role = null;
      if (roleId.startsWith("vendor_")) {
        profileUpdates.role = "vendor";
      } else if (roleId.startsWith("client_")) {
        profileUpdates.role = "client";
      }
    }

    await supabase.from("profiles").update(profileUpdates).eq("id", userId);

    // Direct persistence to profiles_db.json
    try {
      if (fs.existsSync(PROFILES_FILE)) {
        const raw = fs.readFileSync(PROFILES_FILE, "utf-8");
        const list = JSON.parse(raw);
        const idx = list.findIndex((p: any) => p.id === userId);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...profileUpdates };
          fs.writeFileSync(PROFILES_FILE, JSON.stringify(list, null, 2), "utf-8");
          if ((globalThis as any).__SHARED_SERVER_PROFILES__) {
            (globalThis as any).__SHARED_SERVER_PROFILES__ = list;
          }
        }
      }
    } catch (e) {
      console.warn("Direct profiles file update error:", e);
    }

    // 4. Update or Insert Organization Membership
    let targetOrgId = organizationId;
    if (!targetOrgId) {
      // Find existing membership or owned organization
      const { data: mem } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      targetOrgId = mem?.organization_id;

      if (!targetOrgId) {
        const { data: ownedOrg } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_user_id", userId)
          .limit(1)
          .maybeSingle();

        targetOrgId = ownedOrg?.id;
      }

      if (!targetOrgId) {
        if (userId === "vendor-demo-id" || targetProfile.role === "vendor" || roleId.startsWith("vendor_")) {
          targetOrgId = "org-vendor-demo-id";
        } else if (userId === "client-demo-id" || targetProfile.role === "client" || roleId.startsWith("client_")) {
          targetOrgId = "org-client-demo-id";
        } else {
          targetOrgId = `org-${userId}`;
        }

        // Ensure organization exists in organizations file
        try {
          if (fs.existsSync(ORGANIZATIONS_FILE)) {
            const orgs = JSON.parse(fs.readFileSync(ORGANIZATIONS_FILE, "utf-8"));
            if (!orgs.some((o: any) => o.id === targetOrgId)) {
              orgs.push({
                id: targetOrgId,
                owner_user_id: userId,
                type: (roleId.startsWith("vendor_") || targetProfile.role === "vendor") ? "vendor" : "client",
                name: targetProfile.company_name || targetProfile.full_name || "المنشأة",
                created_at: new Date().toISOString(),
                verification_status: "approved",
                verified_badge: true,
              });
              fs.writeFileSync(ORGANIZATIONS_FILE, JSON.stringify(orgs, null, 2), "utf-8");
              if ((globalThis as any).__SHARED_SERVER_ORGANIZATIONS__) {
                (globalThis as any).__SHARED_SERVER_ORGANIZATIONS__ = orgs;
              }
            }
          }
        } catch (e) {
          console.warn("Direct organizations file update warning:", e);
        }
      }
    }

    const cleanCustomPerms = Array.isArray(customPermissions) ? customPermissions : [];
    const cleanExplicitDenies = Array.isArray(explicitDenies) ? explicitDenies : [];

    // Directly update or insert in organization_members_db.json
    try {
      if (fs.existsSync(ORGANIZATION_MEMBERS_FILE)) {
        const members = JSON.parse(fs.readFileSync(ORGANIZATION_MEMBERS_FILE, "utf-8"));
        let foundIdx = members.findIndex((m: any) => m.user_id === userId && m.organization_id === targetOrgId);
        if (foundIdx === -1) {
          foundIdx = members.findIndex((m: any) => m.user_id === userId);
        }

        if (foundIdx !== -1) {
          members[foundIdx] = {
            ...members[foundIdx],
            organization_id: targetOrgId,
            role_id: roleId,
            custom_permissions: cleanCustomPerms,
            explicit_denies: cleanExplicitDenies,
            status: "active",
            updated_at: new Date().toISOString(),
          };
        } else {
          members.push({
            id: `mem_${Date.now().toString(36)}`,
            created_at: new Date().toISOString(),
            status: "active",
            organization_id: targetOrgId,
            user_id: userId,
            email: (targetProfile as any)?.email || `${userId}@rfqsa.tech`,
            phone: targetProfile.phone || "—",
            full_name: targetProfile.full_name || targetProfile.company_name || "عضو",
            role_id: roleId,
            custom_permissions: cleanCustomPerms,
            explicit_denies: cleanExplicitDenies,
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        fs.writeFileSync(ORGANIZATION_MEMBERS_FILE, JSON.stringify(members, null, 2), "utf-8");
        if ((globalThis as any).__SHARED_SERVER_ORG_MEMBERS__) {
          (globalThis as any).__SHARED_SERVER_ORG_MEMBERS__ = members;
        }
      }
    } catch (e) {
      console.warn("Direct organization_members file update error:", e);
    }

    // Also update via supabase client for consistency
    if (targetOrgId) {
      const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id, role_id, custom_permissions, explicit_denies")
        .eq("organization_id", targetOrgId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMember) {
        await supabase
          .from("organization_members")
          .update({
            role_id: roleId,
            custom_permissions: cleanCustomPerms,
            explicit_denies: cleanExplicitDenies,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingMember.id);
      } else {
        await supabase.from("organization_members").insert({
          organization_id: targetOrgId,
          user_id: userId,
          email: `${userId}@rfqsa.tech`,
          full_name: targetProfile.full_name,
          phone: targetProfile.phone,
          role_id: roleId,
          custom_permissions: cleanCustomPerms,
          explicit_denies: cleanExplicitDenies,
          status: "active",
          created_at: new Date().toISOString(),
        });
      }
    }

    // 5. Record High-Severity Audit Event
    await recordAuditEvent({
      organizationId: targetOrgId || null,
      actorUserId: auth.context.userId,
      actorName: auth.context.fullName,
      actorRole: auth.context.role,
      action: "ADMIN_ASSIGNED_ROLE",
      resourceType: "user_role",
      resourceId: userId,
      targetUserId: userId,
      beforeData: {
        admin_role: targetProfile.admin_role,
        is_admin: targetProfile.is_admin,
      },
      afterData: {
        roleId,
        customPermissions: cleanCustomPerms,
        explicitDenies: cleanExplicitDenies,
        is_admin: profileUpdates.is_admin,
      },
      severity: "high",
    });

    return NextResponse.json({
      success: true,
      message: `تم إسناد الدور [${roleId}] للمستخدم (${targetProfile.full_name || userId}) بنجاح`,
      roleId,
      organizationId: targetOrgId,
    });
  } catch (err: any) {
    console.error("assign-role error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

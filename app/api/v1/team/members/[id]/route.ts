import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest, recordAuditEvent } from "@/lib/rbac/rbac-guard.server";
import { SENSITIVE_PERMISSIONS, SystemPermission } from "@/lib/rbac/permissions";
import { revokeOrSuspendMember } from "@/lib/rbac/invitation-service";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/team/members/[id]
 * Updates role, custom permissions, or status of an existing team member.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;

    const auth = await authorizeRequest({
      requiredPermission: "team:update",
      actionName: "UPDATE_TEAM_MEMBER",
      resourceType: "organization_member",
      resourceId: memberId,
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await req.json();
    const { roleId, customPermissions, explicitDenies, status, fullName, email, phone, password } = body;

    const supabase = await createClient();

    // 1. Fetch current target member
    let targetMember: any = null;
    const { data: dbTarget } = await supabase
      .from("organization_members")
      .select("id, organization_id, user_id, role_id, status, email, phone, full_name")
      .eq("id", memberId)
      .maybeSingle();

    if (dbTarget) {
      targetMember = dbTarget;
    } else {
      try {
        const DATA_DIR = path.join(process.cwd(), "data");
        const ORG_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");
        if (fs.existsSync(ORG_MEMBERS_FILE)) {
          const allMembers = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
          targetMember = allMembers.find((m: any) => m.id === memberId);
        }
      } catch (e) {}
    }

    if (!targetMember) {
      return NextResponse.json({ success: false, error: "العضو غير موجود" }, { status: 404 });
    }

    // 2. Strict Tenant Isolation
    if (targetMember.organization_id !== auth.context.organizationId && !auth.context.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "لا يمكن تعديل عضو منشأة أخرى" },
        { status: 403 }
      );
    }

    // 3. Self-Elevation Protection: Member cannot elevate their own role
    if (targetMember.user_id === auth.context.userId && roleId && roleId !== targetMember.role_id) {
      return NextResponse.json(
        { success: false, error: "لا يمكن للموظف ترقية أو تعديل دوره بنفسه" },
        { status: 403 }
      );
    }

    // 4. Owner Protection: Check if demoting the last owner
    const isTargetOwner = targetMember.role_id === "client_owner" || targetMember.role_id === "vendor_owner";
    if (isTargetOwner && roleId && roleId !== targetMember.role_id) {
      const { data: ownerCount } = await supabase
        .from("organization_members")
        .select("id", { count: "exact" })
        .eq("organization_id", auth.context.organizationId)
        .in("role_id", ["client_owner", "vendor_owner"])
        .eq("status", "active");

      if ((ownerCount?.length || 0) <= 1) {
        return NextResponse.json(
          { success: false, error: "لا يمكن تجريد المالك الوحيد للمنشأة من صلاحياته، يجب تعيين مالك بديل أولاً" },
          { status: 400 }
        );
      }
    }

    // 5. Sanitize custom permissions (strip sensitive permissions)
    let sanitizedCustomPermissions: string[] | undefined = undefined;
    if (customPermissions && Array.isArray(customPermissions)) {
      sanitizedCustomPermissions = customPermissions.filter(
        (perm) => !SENSITIVE_PERMISSIONS.has(perm as SystemPermission)
      );
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    if (fullName !== undefined) updates.full_name = fullName.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (phone !== undefined) updates.phone = phone.trim();
    if (password !== undefined && password.trim()) updates.password = password.trim();
    if (roleId) updates.role_id = roleId;
    if (sanitizedCustomPermissions) updates.custom_permissions = sanitizedCustomPermissions;
    if (explicitDenies && Array.isArray(explicitDenies)) updates.explicit_denies = explicitDenies;
    if (status && ["active", "suspended", "revoked"].includes(status)) updates.status = status;

    const { error: updateError } = await supabase
      .from("organization_members")
      .update(updates)
      .eq("id", memberId);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // 6. Direct disk persistence & profile synchronization
    try {
      const DATA_DIR = path.join(process.cwd(), "data");
      const ORG_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");
      if (fs.existsSync(ORG_MEMBERS_FILE)) {
        const allMembers = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
        const mIdx = allMembers.findIndex((m: any) => m.id === memberId);
        if (mIdx >= 0) {
          allMembers[mIdx] = { ...allMembers[mIdx], ...updates };
          fs.writeFileSync(ORG_MEMBERS_FILE, JSON.stringify(allMembers, null, 2), "utf-8");
        }
      }

      // Update matching user profile if exists
      const targetUserId = targetMember.user_id || `user_${memberId}`;
      const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");
      if (fs.existsSync(PROFILES_FILE)) {
        const allProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
        const pIdx = allProfiles.findIndex(
          (p: any) => p.id === targetUserId || (targetMember.email && p.email?.toLowerCase() === targetMember.email.toLowerCase())
        );
        const profileUpdates: any = {
          updated_at: new Date().toISOString(),
        };
        if (fullName !== undefined) {
          profileUpdates.full_name = fullName.trim();
          profileUpdates.company_name = fullName.trim();
        }
        if (email !== undefined) profileUpdates.email = email.trim().toLowerCase();
        if (phone !== undefined) profileUpdates.phone = phone.trim();
        if (roleId !== undefined) {
          profileUpdates.role_id = roleId;
          profileUpdates.role = roleId.startsWith("vendor_") ? "vendor" : "client";
        }
        if (password !== undefined && password.trim()) profileUpdates.password = password.trim();
        if (status !== undefined) profileUpdates.is_active = status !== "suspended" && status !== "revoked";

        if (pIdx >= 0) {
          allProfiles[pIdx] = { ...allProfiles[pIdx], ...profileUpdates };
          fs.writeFileSync(PROFILES_FILE, JSON.stringify(allProfiles, null, 2), "utf-8");
        }
      }
    } catch (diskErr) {
      console.error("Error writing member updates to disk:", diskErr);
    }

    // 7. Record Audit Trail
    await recordAuditEvent({
      organizationId: auth.context.organizationId,
      actorUserId: auth.context.userId,
      actorName: auth.context.fullName,
      actorRole: auth.context.role,
      action: "TEAM_MEMBER_UPDATED",
      resourceType: "organization_member",
      resourceId: memberId,
      targetUserId: targetMember.user_id,
      beforeData: { roleId: targetMember.role_id, status: targetMember.status },
      afterData: updates,
      severity: isTargetOwner ? "high" : "info",
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات وصلاحيات العضو بنجاح",
      member: { ...targetMember, ...updates },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/team/members/[id]
 * Removes or revokes a team member.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;

    const auth = await authorizeRequest({
      requiredPermission: "team:remove",
      actionName: "REMOVE_TEAM_MEMBER",
      resourceType: "organization_member",
      resourceId: memberId,
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.statusCode || 403 }
      );
    }

    const result = await revokeOrSuspendMember(
      memberId,
      auth.context.userId,
      auth.context.fullName,
      auth.context.role,
      "revoke"
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم إلغاء عضوية الموظف بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

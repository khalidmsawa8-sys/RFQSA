/**
 * Enterprise Dynamic Roles & Permissions Service Layer (Server-Side)
 * Handles Database CRUD, Privilege Escalation Guard, System Role Protection,
 * Safe Deletion with Member Counts, and Immutable Audit Logging.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  CustomRoleDefinition,
  RoleScope,
  SystemPermission,
  ROLE_DEFAULT_PERMISSIONS,
  validatePrivilegeEscalation,
  PERMISSION_CATALOG,
} from "./permissions";
import { recordAuditEvent, AuthContext } from "./rbac-guard.server";

export interface CreateRoleParams {
  id?: string;
  scope: RoleScope;
  name_ar: string;
  name_en?: string;
  description_ar: string;
  description_en?: string;
  badge_color?: string;
  icon?: string;
  permissions: SystemPermission[];
}

export interface UpdateRoleParams {
  name_ar?: string;
  name_en?: string;
  description_ar?: string;
  description_en?: string;
  badge_color?: string;
  icon?: string;
  permissions?: SystemPermission[];
}

export const SYSTEM_ROLE_METADATA: Record<string, { nameAr: string; descAr: string }> = {
  // Platform Staff
  platform_super_admin: { nameAr: "المدير العام للمنصة", descAr: "صلاحيات سيادية كاملة على مستوى المنظومة والبيانات" },
  platform_ops_lead: { nameAr: "رئيس العمليات والرقابة", descAr: "إدارة العمليات ومتابعة مؤشرات الأداء والنزاعات" },
  platform_finance_officer: { nameAr: "المراقب المالي للمنصة", descAr: "التدقيق المالي، الفواتير، ومراجعة سجلات المحافظ" },
  platform_rfq_monitor: { nameAr: "مراقب طلبات التسعير والنشاط", descAr: "متابعة تدفق طلبات قطع الغيار والعروض الفورية" },
  platform_support_agent: { nameAr: "أخصائي الدعم والنزاعات", descAr: "الرد على تذاكر الدعم والتدخل في نزاعات الطلبات" },
  platform_compliance_auditor: { nameAr: "مدقق الامتثال والحوكمة", descAr: "فحص سجلات التدقيق والتأكد من مطابقة السياسات" },

  // Client
  client_owner: { nameAr: "المالك / المدير العام", descAr: "إشراف كامل على حساب المنشأة، الصلاحيات، والميزانيات" },
  client_procurement_manager: { nameAr: "مدير المشتريات", descAr: "إنشاء الطلبات، قبول العروض، واعتماد الشراء والدفع" },
  client_rfq_supervisor: { nameAr: "مراقب طلبات التسعير والنشاط", descAr: "مراقبة وتدقيق الطلبات والعروض بدون صلاحيات دفع" },
  client_accountant: { nameAr: "محاسب المنشأة", descAr: "الفواتير الضريبية، شحن المحفظة، والتقارير المالية" },
  client_technician: { nameAr: "فني الورشة / طالب القطع", descAr: "رفع طلبات القطع واستلام الشحنات بالورش" },

  // Vendor
  vendor_owner: { nameAr: "مالك المتجر / المعرض", descAr: "إدارة كاملة لحساب التوريد، الفروع، وسحب الأرباح" },
  vendor_sales_agent: { nameAr: "مسؤول التسعير والمبيعات", descAr: "متابعة الرادار، تسعير القطع، والرد على الطلبات" },
  vendor_warehouse_clerk: { nameAr: "أمين المستودع والتجهيز", descAr: "تجهيز الطلبات وتسليمها في الفرع أو للشحن" },
  vendor_accountant: { nameAr: "محاسب مبيعات المتجر", descAr: "الفواتير الضريبية وكشف حساب الأرباح والمبيعات" },
};

/**
 * ── 1. GET ALL ROLES (System + Custom) WITH PERMISSIONS & MEMBER STATS ──
 */
export async function getAllRoles(
  supabase: SupabaseClient,
  options?: { scope?: RoleScope | "all" }
): Promise<CustomRoleDefinition[]> {
  try {
    // 1. Fetch from organization_roles
    let query = supabase
      .from("organization_roles")
      .select("*")
      .order("created_at", { ascending: true });

    if (options?.scope && options.scope !== "all") {
      query = query.eq("scope", options.scope);
    }

    const { data: dbRoles, error: rolesError } = await query;

    // 2. Fetch role_permissions mappings
    const { data: dbPerms } = await supabase
      .from("role_permissions")
      .select("role_id, permission_key");

    const permsMap = new Map<string, Set<SystemPermission>>();
    (dbPerms || []).forEach((row: { role_id: string; permission_key: string }) => {
      if (!permsMap.has(row.role_id)) {
        permsMap.set(row.role_id, new Set());
      }
      permsMap.get(row.role_id)!.add(row.permission_key as SystemPermission);
    });

    // 3. Fetch active member counts per role
    const { data: members } = await supabase
      .from("organization_members")
      .select("role_id")
      .eq("status", "active");

    const memberCounts = new Map<string, number>();
    (members || []).forEach((m: { role_id: string }) => {
      if (m.role_id) {
        memberCounts.set(m.role_id, (memberCounts.get(m.role_id) || 0) + 1);
      }
    });

    // Also count platform staff profiles
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("is_admin, admin_role");

    (adminProfiles || []).forEach((p: { is_admin?: boolean; admin_role?: string }) => {
      if (p.is_admin) {
        const roleId = p.admin_role === "super_admin" || !p.admin_role ? "platform_super_admin" : `platform_${p.admin_role}`;
        memberCounts.set(roleId, (memberCounts.get(roleId) || 0) + 1);
      }
    });

    // 4. Merge DB roles with defaults fallback
    const systemRoleIds = Object.keys(ROLE_DEFAULT_PERMISSIONS);
    const existingRoleIds = new Set((dbRoles || []).map((r) => r.id));

    const result: CustomRoleDefinition[] = [];

    // First process DB roles
    (dbRoles || []).forEach((r: any) => {
      const dbSet = permsMap.get(r.id);
      let permissions: SystemPermission[] = [];

      if (dbSet && dbSet.size > 0) {
        permissions = Array.from(dbSet);
      } else if (ROLE_DEFAULT_PERMISSIONS[r.id]) {
        permissions = ROLE_DEFAULT_PERMISSIONS[r.id];
      }

      result.push({
        id: r.id,
        scope: r.scope as RoleScope,
        name_ar: r.name_ar,
        name_en: r.name_en || undefined,
        description_ar: r.description_ar,
        description_en: r.description_en || undefined,
        badge_color: r.badge_color || (r.scope === "platform" ? "purple" : r.scope === "vendor" ? "emerald" : "blue"),
        icon: r.icon || "Shield",
        permissions,
        is_system: Boolean(r.is_system),
        members_count: memberCounts.get(r.id) || 0,
        created_by: r.created_by || undefined,
        updated_by: r.updated_by || undefined,
        created_at: r.created_at,
        updated_at: r.updated_at,
      });
    });

    // Ensure all base system roles exist even if not yet in DB table
    systemRoleIds.forEach((sysId) => {
      if (!existingRoleIds.has(sysId)) {
        let scope: RoleScope = "client";
        let nameAr = sysId;
        let descAr = "دور نظام أساسي";
        let badgeColor = "blue";

        const meta = SYSTEM_ROLE_METADATA[sysId];
        if (sysId.startsWith("platform_")) {
          scope = "platform";
          badgeColor = "purple";
          nameAr = meta?.nameAr || (sysId === "platform_super_admin" ? "المدير العام للمنصة" : sysId.replace("platform_", ""));
          descAr = meta?.descAr || "دور إداري لمنصة الإدارة المركزية";
        } else if (sysId.startsWith("vendor_")) {
          scope = "vendor";
          badgeColor = "emerald";
          nameAr = meta?.nameAr || sysId.replace("vendor_", "");
          descAr = meta?.descAr || "دور تشغيلي معتمد لمتاجر الموردين";
        } else if (sysId.startsWith("client_")) {
          scope = "client";
          badgeColor = "blue";
          nameAr = meta?.nameAr || sysId.replace("client_", "");
          descAr = meta?.descAr || "دور معتمد لمنشآت العملاء والأسطول";
        }

        if (options?.scope && options.scope !== "all" && options.scope !== scope) {
          return;
        }

        result.push({
          id: sysId,
          scope,
          name_ar: nameAr,
          description_ar: descAr,
          badge_color: badgeColor,
          icon: "Shield",
          permissions: ROLE_DEFAULT_PERMISSIONS[sysId],
          is_system: true,
          members_count: memberCounts.get(sysId) || 0,
          created_at: new Date().toISOString(),
        });
      }
    });

    return result;
  } catch (error) {
    console.error("Error in getAllRoles:", error);
    throw error;
  }
}

/**
 * ── 2. GET SINGLE ROLE BY ID ──
 */
export async function getRoleById(
  supabase: SupabaseClient,
  roleId: string
): Promise<CustomRoleDefinition | null> {
  const roles = await getAllRoles(supabase);
  return roles.find((r) => r.id === roleId) || null;
}

/**
 * ── 3. CREATE CUSTOM ROLE WITH PRIVILEGE ESCALATION VALIDATION ──
 */
export async function createCustomRole(
  supabase: SupabaseClient,
  actorContext: AuthContext,
  params: CreateRoleParams
): Promise<CustomRoleDefinition> {
  // 1. Authorization: Only authorized admin or owner can create roles
  if (!actorContext.isSuperAdmin && !actorContext.effectivePermissions.has("admin:system_settings")) {
    throw new Error("FORBIDDEN: يتطلب إنشاء الأدوار المخصصة صلاحيات مدير عام المنصة");
  }

  // 2. Validate input
  if (!params.name_ar || params.name_ar.trim().length < 2) {
    throw new Error("اسم الدور بالعربية مطلوب ويجب ألا يقل عن حرفين");
  }
  if (!params.description_ar || params.description_ar.trim().length < 5) {
    throw new Error("الوصف الوظيفي للدور مطلوب ويجب ألا يقل عن 5 أحرف");
  }
  if (!["platform", "client", "vendor"].includes(params.scope)) {
    throw new Error("نطاق الدور يجب أن يكون أحد القيم: platform, client, vendor");
  }
  if (!params.permissions || !Array.isArray(params.permissions) || params.permissions.length === 0) {
    throw new Error("يجب اختيار صلاحية واحدة على الأقل للدور المخصص");
  }

  // 3. Validate Privilege Escalation (NewPerms ⊆ CreatorPerms)
  const escalationCheck = validatePrivilegeEscalation(
    actorContext.effectivePermissions,
    params.permissions,
    actorContext.isSuperAdmin
  );

  if (!escalationCheck.allowed) {
    throw new Error(
      `PRIVILEGE_ESCALATION_BLOCKED: لا يمكنك منح صلاحيات تتجاوز صلاحياتك الفعلية: [${escalationCheck.unauthorizedPermissions.join(", ")}]`
    );
  }

  // 4. Generate normalized ID / Slug
  let roleId = params.id ? params.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") : "";
  if (!roleId) {
    const timestamp = Date.now().toString(36);
    roleId = `${params.scope}_custom_${timestamp}`;
  }

  // Ensure prefix matches scope
  if (!roleId.startsWith(`${params.scope}_`)) {
    roleId = `${params.scope}_${roleId}`;
  }

  // 5. Check if role ID already exists
  const { data: existingRole } = await supabase
    .from("organization_roles")
    .select("id")
    .eq("id", roleId)
    .maybeSingle();

  if (existingRole || ROLE_DEFAULT_PERMISSIONS[roleId]) {
    throw new Error(`معرف الدور [${roleId}] موجود بالفعل، يرجى اختيار اسم أو معرف آخر`);
  }

  // 6. Insert Role into DB
  const newRoleData = {
    id: roleId,
    scope: params.scope,
    name_ar: params.name_ar.trim(),
    name_en: params.name_en?.trim() || null,
    description_ar: params.description_ar.trim(),
    description_en: params.description_en?.trim() || null,
    badge_color: params.badge_color || (params.scope === "platform" ? "purple" : params.scope === "vendor" ? "emerald" : "blue"),
    icon: params.icon || "Shield",
    is_system: false,
    created_by: actorContext.userId,
    updated_by: actorContext.userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from("organization_roles")
    .insert(newRoleData);

  if (insertError) {
    console.error("Failed to insert organization_role:", insertError);
    throw new Error(`فشل إنشاء الدور في قاعدة البيانات: ${insertError.message}`);
  }

  // 7. Insert Role Permissions
  const permissionRows = params.permissions.map((permKey) => ({
    role_id: roleId,
    permission_key: permKey,
  }));

  const { error: permsError } = await supabase
    .from("role_permissions")
    .insert(permissionRows);

  if (permsError) {
    console.error("Failed to insert role_permissions:", permsError);
    // Cleanup role if permissions insertion failed
    await supabase.from("organization_roles").delete().eq("id", roleId);
    throw new Error(`فشل ربط الصلاحيات بالدور: ${permsError.message}`);
  }

  // 8. Record High-Severity Audit Event
  await recordAuditEvent({
    organizationId: actorContext.organizationId || null,
    actorUserId: actorContext.userId,
    actorName: actorContext.fullName,
    actorRole: actorContext.role,
    action: "CREATE_CUSTOM_ROLE",
    resourceType: "custom_role",
    resourceId: roleId,
    targetUserId: undefined,
    beforeData: undefined,
    afterData: {
      roleId,
      scope: params.scope,
      name_ar: params.name_ar,
      permissionsCount: params.permissions.length,
      permissions: params.permissions,
    },
    severity: "high",
  });

  return {
    id: roleId,
    scope: params.scope,
    name_ar: newRoleData.name_ar,
    name_en: newRoleData.name_en || undefined,
    description_ar: newRoleData.description_ar,
    description_en: newRoleData.description_en || undefined,
    badge_color: newRoleData.badge_color,
    icon: newRoleData.icon,
    permissions: params.permissions,
    is_system: false,
    members_count: 0,
    created_by: actorContext.userId,
    updated_by: actorContext.userId,
    created_at: newRoleData.created_at,
    updated_at: newRoleData.updated_at,
  };
}

/**
 * ── 4. UPDATE CUSTOM ROLE WITH SYSTEM ROLE IMMUTABILITY CHECK ──
 */
export async function updateCustomRole(
  supabase: SupabaseClient,
  actorContext: AuthContext,
  roleId: string,
  params: UpdateRoleParams
): Promise<CustomRoleDefinition> {
  // 1. Authorization
  if (!actorContext.isSuperAdmin && !actorContext.effectivePermissions.has("admin:system_settings")) {
    throw new Error("FORBIDDEN: يتطلب تعديل الأدوار صلاحيات مدير عام المنصة");
  }

  // 2. Fetch existing role
  const { data: existingRole, error: fetchError } = await supabase
    .from("organization_roles")
    .select("*")
    .eq("id", roleId)
    .maybeSingle();

  const isSystemRole = existingRole ? existingRole.is_system : Boolean(ROLE_DEFAULT_PERMISSIONS[roleId]);

  // 3. System Role Protection: Cannot modify permissions or core fields of system roles
  if (isSystemRole && params.permissions) {
    throw new Error(`PROTECTED_SYSTEM_ROLE: لا يمكن تعديل الصلاحيات المعتمدة للأدوار الأساسية للنظام [${roleId}]`);
  }

  // 4. Validate Privilege Escalation on new permissions
  if (params.permissions) {
    const escalationCheck = validatePrivilegeEscalation(
      actorContext.effectivePermissions,
      params.permissions,
      actorContext.isSuperAdmin
    );

    if (!escalationCheck.allowed) {
      throw new Error(
        `PRIVILEGE_ESCALATION_BLOCKED: لا يمكنك منح صلاحيات تتجاوز صلاحياتك الفعلية: [${escalationCheck.unauthorizedPermissions.join(", ")}]`
      );
    }
  }

  // 5. Update organization_roles table
  const updateData: any = {
    updated_by: actorContext.userId,
    updated_at: new Date().toISOString(),
  };

  if (params.name_ar) updateData.name_ar = params.name_ar.trim();
  if (params.name_en !== undefined) updateData.name_en = params.name_en?.trim() || null;
  if (params.description_ar) updateData.description_ar = params.description_ar.trim();
  if (params.description_en !== undefined) updateData.description_en = params.description_en?.trim() || null;
  if (params.badge_color) updateData.badge_color = params.badge_color;
  if (params.icon) updateData.icon = params.icon;

  if (existingRole) {
    const { error: updateError } = await supabase
      .from("organization_roles")
      .update(updateData)
      .eq("id", roleId);

    if (updateError) {
      throw new Error(`فشل تحديث بيانات الدور: ${updateError.message}`);
    }
  }

  // 6. Update role_permissions if custom role and permissions provided
  if (!isSystemRole && params.permissions) {
    // Delete existing permissions
    await supabase.from("role_permissions").delete().eq("role_id", roleId);

    // Insert new permissions
    const permissionRows = params.permissions.map((permKey) => ({
      role_id: roleId,
      permission_key: permKey,
    }));

    const { error: insertPermsError } = await supabase
      .from("role_permissions")
      .insert(permissionRows);

    if (insertPermsError) {
      throw new Error(`فشل تحديث صلاحيات الدور: ${insertPermsError.message}`);
    }
  }

  // 7. Count affected members
  const { count: affectedMembersCount } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .eq("status", "active");

  // 8. Record High-Severity Audit Event
  await recordAuditEvent({
    organizationId: actorContext.organizationId || null,
    actorUserId: actorContext.userId,
    actorName: actorContext.fullName,
    actorRole: actorContext.role,
    action: "UPDATE_CUSTOM_ROLE",
    resourceType: "custom_role",
    resourceId: roleId,
    targetUserId: null,
    beforeData: {
      name_ar: existingRole?.name_ar,
      description_ar: existingRole?.description_ar,
    },
    afterData: {
      roleId,
      ...updateData,
      permissions: params.permissions,
      affectedMembersCount: affectedMembersCount || 0,
    },
    severity: "high",
  });

  const updatedRole = await getRoleById(supabase, roleId);
  if (!updatedRole) throw new Error("تعذر جلب الدور بعد التحديث");
  return updatedRole;
}

/**
 * ── 5. DELETE CUSTOM ROLE (SAFE DELETION GUARD) ──
 */
export async function deleteCustomRole(
  supabase: SupabaseClient,
  actorContext: AuthContext,
  roleId: string
): Promise<{ success: boolean; message: string }> {
  // 1. Authorization
  if (!actorContext.isSuperAdmin && !actorContext.effectivePermissions.has("admin:system_settings")) {
    throw new Error("FORBIDDEN: يتطلب حذف الأدوار المخصصة صلاحيات مدير عام المنصة");
  }

  // 2. Check if System Role (Protected)
  if (ROLE_DEFAULT_PERMISSIONS[roleId]) {
    throw new Error(`PROTECTED_SYSTEM_ROLE: لا يمكن حذف الدور الأساسي للنظام [${roleId}]`);
  }

  const { data: roleData } = await supabase
    .from("organization_roles")
    .select("id, is_system, name_ar")
    .eq("id", roleId)
    .maybeSingle();

  if (roleData?.is_system) {
    throw new Error(`PROTECTED_SYSTEM_ROLE: لا يمكن حذف الدور الأساسي للنظام [${roleId}]`);
  }

  // 3. Safe Deletion: Check if any active users are assigned this role
  const { count: assignedCount } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);

  if (assignedCount && assignedCount > 0) {
    throw new Error(
      `CANNOT_DELETE_ROLE_WITH_MEMBERS: لا يمكن حذف الدور [${roleData?.name_ar || roleId}] نظراً لوجود (${assignedCount}) عضو مسند لهم هذا الدور حالياً. يرجى نقل الأعضاء لدور بديل أولاً قبل الحذف.`
    );
  }

  // 4. Delete cascaded permissions and role
  await supabase.from("role_permissions").delete().eq("role_id", roleId);
  const { error: deleteError } = await supabase
    .from("organization_roles")
    .delete()
    .eq("id", roleId);

  if (deleteError) {
    throw new Error(`فشل حذف الدور: ${deleteError.message}`);
  }

  // 5. Record High-Severity Audit Event
  await recordAuditEvent({
    organizationId: actorContext.organizationId || null,
    actorUserId: actorContext.userId,
    actorName: actorContext.fullName,
    actorRole: actorContext.role,
    action: "DELETE_CUSTOM_ROLE",
    resourceType: "custom_role",
    resourceId: roleId,
    targetUserId: undefined,
    beforeData: { roleId, name_ar: roleData?.name_ar },
    afterData: undefined,
    severity: "high",
  });

  return {
    success: true,
    message: `تم حذف الدور المخصص [${roleData?.name_ar || roleId}] بنجاح`,
  };
}

/**
 * ── 6. CLONE ROLE AS A NEW INDEPENDENT CUSTOM ROLE ──
 */
export async function cloneRole(
  supabase: SupabaseClient,
  actorContext: AuthContext,
  sourceRoleId: string,
  targetParams: {
    name_ar: string;
    description_ar: string;
    badge_color?: string;
    icon?: string;
  }
): Promise<CustomRoleDefinition> {
  const sourceRole = await getRoleById(supabase, sourceRoleId);
  if (!sourceRole) {
    throw new Error(`الدور المصدر [${sourceRoleId}] غير موجود`);
  }

  const timestamp = Date.now().toString(36);
  const newRoleId = `${sourceRole.scope}_custom_copy_${timestamp}`;

  return await createCustomRole(supabase, actorContext, {
    id: newRoleId,
    scope: sourceRole.scope,
    name_ar: targetParams.name_ar,
    description_ar: targetParams.description_ar,
    badge_color: targetParams.badge_color || sourceRole.badge_color,
    icon: targetParams.icon || sourceRole.icon,
    permissions: sourceRole.permissions,
  });
}

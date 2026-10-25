/**
 * Secure Invitation Lifecycle Management
 * Cryptographic token hashing, expiration, one-time-use validation, and audit tracking
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { RoleId, SENSITIVE_PERMISSIONS, SystemPermission } from "./permissions";
import { recordAuditEvent } from "./rbac-guard.server";

export interface InviteMemberParams {
  organizationId: string;
  email: string;
  phone?: string;
  fullName?: string;
  roleId: RoleId;
  customPermissions?: string[];
  password?: string;
  invitedByUserId: string;
  invitedByName: string;
  invitedByRole: string;
}

export interface InvitationResult {
  success: boolean;
  memberId?: string;
  rawToken?: string;
  invitationUrl?: string;
  password?: string;
  error?: string;
}

/**
 * Creates a secure hashed invitation for a new team member.
 */
export async function createMemberInvitation(
  params: InviteMemberParams
): Promise<InvitationResult> {
  const supabase = await createClient();

  // 1. Sanitize custom permissions (strip sensitive permissions that regular owners cannot grant)
  const safeCustomPermissions = (params.customPermissions || []).filter(
    (perm) => !SENSITIVE_PERMISSIONS.has(perm as SystemPermission)
  );

  const cleanEmail = params.email.toLowerCase().trim();

  // 2. Check for existing member for the same email in the same organization
  const { data: existing } = await supabase
    .from("organization_members")
    .select("id, status, user_id, full_name, phone")
    .eq("organization_id", params.organizationId)
    .eq("email", cleanEmail)
    .maybeSingle();

  // 3. Generate Cryptographically Secure Random Token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days expiry

  let memberId: string;
  const isVendor = params.roleId.startsWith("vendor_");
  const assignedPassword = params.password?.trim() || "123456";

  if (existing) {
    // Re-invite / refresh / reactivate existing membership
    const { data: updated, error } = await supabase
      .from("organization_members")
      .update({
        role_id: params.roleId,
        custom_permissions: safeCustomPermissions,
        status: "active",
        invitation_token_hash: tokenHash,
        invitation_expires_at: expiresAt,
        invited_by: params.invitedByUserId,
        phone: params.phone || existing.phone || null,
        full_name: params.fullName || existing.full_name || null,
        password: assignedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    memberId = updated?.id || existing.id;
  } else {
    // Insert fresh invitation
    const { data: inserted, error } = await supabase
      .from("organization_members")
      .insert({
        organization_id: params.organizationId,
        email: cleanEmail,
        phone: params.phone || null,
        full_name: params.fullName || null,
        role_id: params.roleId,
        custom_permissions: safeCustomPermissions,
        status: "active",
        password: assignedPassword,
        invitation_token_hash: tokenHash,
        invitation_expires_at: expiresAt,
        invited_by: params.invitedByUserId,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    memberId = inserted.id;
  }

  // 3.5 Resolve Inviter's Profile & Company Information
  let facilityCompanyName = isVendor ? "مؤسسة مورد معتمد" : "منشأة عميل معتمد";
  let facilityCr: string | null = null;
  let facilityVat: string | null = null;
  let facilityAddress: string | null = null;

  try {
    const DATA_DIR = path.join(process.cwd(), "data");
    const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");
    let allDiskProfiles: any[] = [];
    if (fs.existsSync(PROFILES_FILE)) {
      allDiskProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
    }

    let inviterProf = allDiskProfiles.find(
      (p: any) => p.id === params.invitedByUserId || (p.email && p.email.toLowerCase() === params.invitedByUserId?.toLowerCase())
    );

    if (!inviterProf && params.invitedByUserId) {
      const { data: dbInviter } = await supabase
        .from("profiles")
        .select("company_name, commercial_register, tax_number, national_address, full_name")
        .eq("id", params.invitedByUserId)
        .maybeSingle();
      if (dbInviter) inviterProf = dbInviter;
    }

    if (inviterProf?.company_name) {
      facilityCompanyName = inviterProf.company_name;
      facilityCr = inviterProf.commercial_register || null;
      facilityVat = inviterProf.tax_number || null;
      facilityAddress = inviterProf.national_address || null;
    } else if (params.invitedByName) {
      facilityCompanyName = params.invitedByName;
    }
  } catch (e) {
    console.warn("Could not resolve inviter company name:", e);
  }

  // 4. Synchronize profile and credentials
  const { data: existingProfiles } = await supabase.from("profiles").select("*");
  const existingProfile = (existingProfiles || []).find(
    (p: any) =>
      (p.email && p.email.toLowerCase() === cleanEmail) ||
      (params.phone && p.phone && p.phone === params.phone)
  );

  let profileUserId = existingProfile?.id;
  if (existingProfile) {
    await supabase
      .from("profiles")
      .update({
        password: assignedPassword,
        role_id: params.roleId,
        role: isVendor ? "vendor" : "client",
        full_name: params.fullName || existingProfile.full_name,
        company_name: facilityCompanyName,
        parent_user_id: params.invitedByUserId,
        parent_company_name: facilityCompanyName,
        commercial_register: facilityCr || existingProfile.commercial_register || null,
        tax_number: facilityVat || existingProfile.tax_number || null,
        national_address: facilityAddress || existingProfile.national_address || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProfile.id);
  } else {
    profileUserId = `user_${memberId}`;
    await supabase.from("profiles").insert({
      id: profileUserId,
      email: cleanEmail,
      phone: params.phone || null,
      full_name: params.fullName || (isVendor ? "موظف مبيعات المورد" : "موظف منشأة"),
      company_name: facilityCompanyName,
      parent_user_id: params.invitedByUserId,
      parent_company_name: facilityCompanyName,
      commercial_register: facilityCr,
      tax_number: facilityVat,
      national_address: facilityAddress,
      role: isVendor ? "vendor" : "client",
      role_id: params.roleId,
      password: assignedPassword,
      ref_code: isVendor
        ? `SUP-${Math.floor(10000 + Math.random() * 90000)}`
        : `CUST-${Math.floor(10000 + Math.random() * 90000)}`,
      is_active: true,
      created_at: new Date().toISOString(),
    });
  }

  // Link member to user_id and password
  await supabase
    .from("organization_members")
    .update({
      user_id: profileUserId,
      password: assignedPassword,
      status: "active",
    })
    .eq("id", memberId);

  // 5. Direct file persistence to ensure immediate sync on disk
  try {
    const DATA_DIR = path.join(process.cwd(), "data");
    const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");
    const ORG_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");

    if (fs.existsSync(ORG_MEMBERS_FILE)) {
      const allMembers = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
      const mIdx = allMembers.findIndex(
        (m: any) => m.id === memberId || (m.email && m.email.toLowerCase() === cleanEmail)
      );
      const memberEntry = {
        id: memberId,
        organization_id: params.organizationId,
        user_id: profileUserId,
        email: cleanEmail,
        phone: params.phone || null,
        full_name: params.fullName || "عضو فريق العمل",
        company_name: facilityCompanyName,
        role_id: params.roleId,
        custom_permissions: safeCustomPermissions,
        status: "active",
        password: assignedPassword,
        invitation_token_hash: tokenHash,
        invitation_expires_at: expiresAt,
        invited_by: params.invitedByUserId,
        updated_at: new Date().toISOString(),
      };
      if (mIdx >= 0) {
        allMembers[mIdx] = { ...allMembers[mIdx], ...memberEntry };
      } else {
        allMembers.push({ ...memberEntry, created_at: new Date().toISOString() });
      }
      fs.writeFileSync(ORG_MEMBERS_FILE, JSON.stringify(allMembers, null, 2), "utf-8");
    }

    if (fs.existsSync(PROFILES_FILE)) {
      const allProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
      const pIdx = allProfiles.findIndex(
        (p: any) => p.id === profileUserId || (p.email && p.email.toLowerCase() === cleanEmail)
      );
      const profileEntry = {
        id: profileUserId,
        email: cleanEmail,
        phone: params.phone || null,
        full_name: params.fullName || "عضو فريق العمل",
        company_name: facilityCompanyName,
        parent_user_id: params.invitedByUserId,
        parent_company_name: facilityCompanyName,
        commercial_register: facilityCr,
        tax_number: facilityVat,
        national_address: facilityAddress,
        role: isVendor ? "vendor" : "client",
        role_id: params.roleId,
        password: assignedPassword,
        ref_code: isVendor
          ? `SUP-${Math.floor(10000 + Math.random() * 90000)}`
          : `CUST-${Math.floor(10000 + Math.random() * 90000)}`,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (pIdx >= 0) {
        allProfiles[pIdx] = { ...allProfiles[pIdx], ...profileEntry };
      } else {
        allProfiles.push({ ...profileEntry, created_at: new Date().toISOString() });
      }
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(allProfiles, null, 2), "utf-8");
    }

    // Also update global shared memory if active
    if ((globalThis as any).__SHARED_SERVER_PROFILES__) {
      const gIdx = (globalThis as any).__SHARED_SERVER_PROFILES__.findIndex(
        (p: any) => p.id === profileUserId || (p.email && p.email.toLowerCase() === cleanEmail)
      );
      const profileEntry = {
        id: profileUserId,
        email: cleanEmail,
        phone: params.phone || null,
        full_name: params.fullName || "عضو فريق العمل",
        company_name: facilityCompanyName,
        parent_user_id: params.invitedByUserId,
        parent_company_name: facilityCompanyName,
        role: isVendor ? "vendor" : "client",
        role_id: params.roleId,
        is_active: true,
      };
      if (gIdx >= 0) {
        (globalThis as any).__SHARED_SERVER_PROFILES__[gIdx] = {
          ...(globalThis as any).__SHARED_SERVER_PROFILES__[gIdx],
          ...profileEntry,
        };
      } else {
        (globalThis as any).__SHARED_SERVER_PROFILES__.push(profileEntry);
      }
    }
  } catch (e) {
    console.error("Direct file write error in invitation-service:", e);
  }

  // 6. Record Audit Trail
  await recordAuditEvent({
    organizationId: params.organizationId,
    actorUserId: params.invitedByUserId,
    actorName: params.invitedByName,
    actorRole: params.invitedByRole,
    action: "TEAM_MEMBER_INVITED",
    resourceType: "organization_member",
    resourceId: memberId,
    afterData: {
      email: params.email,
      roleId: params.roleId,
      expiresAt,
    },
    severity: "info",
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rfqsa.tech";
  const invitationUrl = `${baseUrl}/auth/accept-invite?token=${rawToken}&org=${params.organizationId}`;

  return {
    success: true,
    memberId,
    rawToken,
    invitationUrl,
    password: assignedPassword,
  };
}

/**
 * Accepts and activates a member invitation using the raw token.
 */
export async function acceptMemberInvitation(
  rawToken: string,
  acceptingUserId: string,
  acceptingUserEmail: string
): Promise<{
  success: boolean;
  memberId?: string;
  organizationId?: string;
  roleId?: string;
  email?: string;
  fullName?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // 1. Hash the incoming token to query the database
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const { data: member, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, role_id, email, full_name, status, invitation_expires_at")
    .eq("invitation_token_hash", tokenHash)
    .maybeSingle();

  if (error || !member) {
    return { success: false, error: "رمز الدعوة غير صالح أو غير موجود" };
  }

  if (member.status === "active") {
    return { success: false, error: "تم استخدام وقبول هذه الدعوة مسبقاً" };
  }

  if (member.status === "revoked") {
    return { success: false, error: "تم إلغاء هذه الدعوة من قبل إدارة المنشأة" };
  }

  // 2. Check expiration
  if (member.invitation_expires_at && new Date(member.invitation_expires_at) < new Date()) {
    return { success: false, error: "انتهت صلاحية رمز الدعوة، يرجى طلب دعوة جديدة" };
  }

  // 3. Atomically activate membership and invalidate token
  const finalUserId = (acceptingUserId === "client-demo-id" || acceptingUserId === "vendor-demo-id")
    ? `user_${member.id}`
    : acceptingUserId;

  const { error: updateError } = await supabase
    .from("organization_members")
    .update({
      user_id: finalUserId,
      status: "active",
      invitation_token_hash: null, // Clear token for single-use guarantee
      accepted_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 4. Record Audit Trail
  await recordAuditEvent({
    organizationId: member.organization_id,
    actorUserId: acceptingUserId,
    actorName: acceptingUserEmail,
    actorRole: member.role_id,
    action: "TEAM_MEMBER_JOINED",
    resourceType: "organization_member",
    resourceId: member.id,
    afterData: {
      userId: acceptingUserId,
      roleId: member.role_id,
    },
    severity: "info",
  });

  return {
    success: true,
    memberId: member.id,
    organizationId: member.organization_id,
    roleId: member.role_id,
    email: member.email,
    fullName: member.full_name,
  };
}

/**
 * Revokes a pending invitation or suspends an active member.
 */
export async function revokeOrSuspendMember(
  memberId: string,
  actorUserId: string,
  actorName: string,
  actorRole: string,
  action: "revoke" | "suspend"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  let member: any = null;
  const { data: dbMember } = await supabase
    .from("organization_members")
    .select("id, organization_id, role_id, user_id, email, phone, full_name")
    .eq("id", memberId)
    .maybeSingle();

  if (dbMember) {
    member = dbMember;
  } else {
    try {
      const DATA_DIR = path.join(process.cwd(), "data");
      const ORG_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");
      if (fs.existsSync(ORG_MEMBERS_FILE)) {
        const allMembers = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
        member = allMembers.find((m: any) => m.id === memberId);
      }
    } catch (e) {}
  }

  if (!member) {
    return { success: false, error: "العضو غير موجود" };
  }

  // Owner Protection: cannot suspend/revoke an owner
  if (member.role_id === "client_owner" || member.role_id === "vendor_owner") {
    return { success: false, error: "لا يمكن تعليق أو حذف مالك المنشأة" };
  }

  if (action === "revoke") {
    const targetUserId = member.user_id;
    const targetEmail = member.email ? String(member.email).toLowerCase().trim() : null;

    // 1. Delete from organization_members table
    try {
      await supabase.from("organization_members").delete().eq("id", memberId);
      if (targetUserId) {
        await supabase.from("organization_members").delete().eq("user_id", targetUserId);
      }
    } catch (e) {
      console.warn("Supabase organization_members delete error:", e);
    }

    // 2. ROOT-CAUSE PURGE from profiles table in Supabase
    try {
      if (targetUserId) {
        await supabase.from("profiles").delete().eq("id", targetUserId);
      }
      if (targetEmail) {
        await supabase.from("profiles").delete().eq("email", targetEmail);
      }
      await supabase.from("profiles").delete().eq("id", `user_${memberId}`);
    } catch (e) {
      console.warn("Supabase profiles delete error:", e);
    }

    // 3. Remove permanently from organization_members_db.json & profiles_db.json
    try {
      const DATA_DIR = path.join(process.cwd(), "data");
      const ORG_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");
      if (fs.existsSync(ORG_MEMBERS_FILE)) {
        const allMembers = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
        const filtered = allMembers.filter(
          (m: any) =>
            m.id !== memberId &&
            (!targetUserId || m.user_id !== targetUserId) &&
            (!targetEmail || m.email?.toLowerCase().trim() !== targetEmail)
        );
        fs.writeFileSync(ORG_MEMBERS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      }

      const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");
      if (fs.existsSync(PROFILES_FILE)) {
        const allProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
        const remainingProfiles = allProfiles.filter(
          (p: any) =>
            p.id !== targetUserId &&
            p.id !== `user_${memberId}` &&
            (!targetEmail || p.email?.toLowerCase().trim() !== targetEmail)
        );
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(remainingProfiles, null, 2), "utf-8");
      }

      // 4. Purge from in-memory caches
      if ((globalThis as any).__SHARED_SERVER_PROFILES__) {
        (globalThis as any).__SHARED_SERVER_PROFILES__ = (globalThis as any).__SHARED_SERVER_PROFILES__.filter(
          (p: any) =>
            p.id !== targetUserId &&
            p.id !== `user_${memberId}` &&
            (!targetEmail || p.email?.toLowerCase().trim() !== targetEmail)
        );
      }
      if ((globalThis as any).__SHARED_SERVER_ORG_MEMBERS__) {
        (globalThis as any).__SHARED_SERVER_ORG_MEMBERS__ = (globalThis as any).__SHARED_SERVER_ORG_MEMBERS__.filter(
          (m: any) =>
            m.id !== memberId &&
            (!targetUserId || m.user_id !== targetUserId) &&
            (!targetEmail || m.email?.toLowerCase().trim() !== targetEmail)
        );
      }
    } catch (e) {
      console.error("Error syncing disk after member deletion:", e);
    }
  } else {
    // Suspend action
    const { error: updateError } = await supabase
      .from("organization_members")
      .update({
        status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    try {
      const DATA_DIR = path.join(process.cwd(), "data");
      const ORG_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");
      if (fs.existsSync(ORG_MEMBERS_FILE)) {
        const allMembers = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
        const mIdx = allMembers.findIndex((m: any) => m.id === memberId);
        if (mIdx >= 0) {
          allMembers[mIdx].status = "suspended";
          fs.writeFileSync(ORG_MEMBERS_FILE, JSON.stringify(allMembers, null, 2), "utf-8");
        }
      }
    } catch (e) {}
  }

  await recordAuditEvent({
    organizationId: member.organization_id,
    actorUserId,
    actorName,
    actorRole,
    action: action === "revoke" ? "TEAM_MEMBER_REVOKED" : "TEAM_MEMBER_SUSPENDED",
    resourceType: "organization_member",
    resourceId: memberId,
    severity: "warning",
  });

  return { success: true };
}

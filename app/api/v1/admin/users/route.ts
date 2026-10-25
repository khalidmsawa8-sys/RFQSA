import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest, recordAuditEvent } from "@/lib/rbac/rbac-guard.server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Generate a unique, formatted reference code for a user role.
 */
function generateRefCode(role: string): string {
  const prefix = role === "admin" ? "ADM" : role === "vendor" ? "SUP" : role === "courier" ? "COU" : "CUST";
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${randomNum}`;
}

/**
 * GET /api/v1/admin/users
 * Returns list of users with search, role filters, and full profile data.
 * Protected by server-side RBAC.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorizeRequest({
      requiredPermission: "admin:manage_users",
      actionName: "VIEW_USERS_LIST",
      resourceType: "profiles",
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بالوصول إلى قائمة المستخدمين" },
        { status: authResult.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const supabase = await createClient();

    let query = supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, role_id, custom_role, company_name, ref_code, tax_number, commercial_register, national_address, is_admin, admin_role, is_active, created_at, parent_user_id, parent_company_name")
      .order("created_at", { ascending: false });

    if (role && role !== "all") {
      if (role === "admin") {
        query = query.eq("role", "admin");
      } else {
        query = query.eq("role", role);
      }
    }

    const { data: dbProfiles } = await query;

    // Load from profiles_db.json to merge any local or mock profiles
    const DATA_DIR = path.join(process.cwd(), "data");
    const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");
    let diskProfiles: any[] = [];
    if (fs.existsSync(PROFILES_FILE)) {
      try {
        diskProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
      } catch (e) {}
    }

    // Merge DB and Disk profiles without duplicates
    const profilesMap = new Map<string, any>();
    (dbProfiles || []).forEach((p: any) => {
      if (p && p.id) profilesMap.set(p.id, p);
    });
    diskProfiles.forEach((p: any) => {
      if (p && p.id) {
        if (!profilesMap.has(p.id)) {
          profilesMap.set(p.id, p);
        } else {
          const current = profilesMap.get(p.id);
          profilesMap.set(p.id, { ...current, ...p });
        }
      }
    });

    // Check organization_members to enrich sub-users with parent vendor company_name and filter out revoked
    const ORG_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");
    let orgMembers: any[] = [];
    if (fs.existsSync(ORG_MEMBERS_FILE)) {
      try {
        orgMembers = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
      } catch (e) {}
    }

    try {
      const { data: dbMembers } = await supabase.from("organization_members").select("*");
      if (dbMembers && Array.isArray(dbMembers)) {
        dbMembers.forEach((m: any) => {
          if (!orgMembers.some((x: any) => x.id === m.id)) orgMembers.push(m);
        });
      }
    } catch (e) {}

    // Track revoked / deleted user IDs
    const revokedUserIds = new Set<string>();
    const revokedEmails = new Set<string>();
    orgMembers.forEach((m: any) => {
      if (m.status === "revoked") {
        if (m.user_id) revokedUserIds.add(m.user_id);
        if (m.email) revokedEmails.add(m.email.toLowerCase().trim());
      }
    });

    const allMerged = Array.from(profilesMap.values()).filter((p: any) => {
      if (revokedUserIds.has(p.id)) return false;
      if (p.email && revokedEmails.has(p.email.toLowerCase().trim())) return false;
      return true;
    });

    // Build map of vendor owners by ID and organization
    const vendorOwnersMap = new Map<string, any>();
    allMerged.forEach((p: any) => {
      if (p.role === "vendor" && (!p.role_id || p.role_id === "vendor_owner") && p.company_name) {
        vendorOwnersMap.set(p.id, p);
        if (p.email) vendorOwnersMap.set(p.email.toLowerCase().trim(), p);
      }
    });

    let results = allMerged.map((p: any) => {
      const refCode = p.ref_code || (p.is_admin || p.role === "admin" ? "ADM-001" : `USR-${p.id.slice(0, 5)}`);

      // Resolve company name for sub-users
      let companyName = p.company_name;
      let parentCompanyName = p.parent_company_name;

      const matchingMember = orgMembers.find(
        (m: any) => m.user_id === p.id || (m.email && p.email && m.email.toLowerCase() === p.email.toLowerCase())
      );
      const parentVendorId = p.parent_user_id || matchingMember?.invited_by;

      if (parentVendorId) {
        const parentVendor = vendorOwnersMap.get(parentVendorId) || allMerged.find((v: any) => v.id === parentVendorId);
        if (parentVendor?.company_name) {
          companyName = parentVendor.company_name;
          parentCompanyName = parentVendor.company_name;
        }
      }

      if ((!companyName || companyName === p.full_name || companyName === "عضو فريق العمل" || companyName === "موظف منشأة") && matchingMember?.company_name) {
        companyName = matchingMember.company_name;
      }

      return {
        ...p,
        ref_code: refCode,
        company_name: companyName || (p.role === "vendor" ? "مؤسسة مورد معتمد" : ""),
        parent_company_name: parentCompanyName || companyName || "",
        email: p.email || `${refCode.toLowerCase()}@rfqsa.tech`,
        created_at: p.created_at || "2026-08-01T08:00:00.000Z",
      };
    });

    if (role && role !== "all") {
      if (role === "admin") {
        results = results.filter((p: any) => p.role === "admin" || p.is_admin === true);
      } else {
        results = results.filter((p: any) => !p.is_admin && p.role === role);
      }
    }

    if (search) {
      results = results.filter((p: any) =>
        [p.full_name, p.email, p.company_name, p.phone, p.ref_code, p.tax_number, p.commercial_register]
          .some((val) => val && String(val).toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      users: results,
      total: results.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/admin/users
 * Creates a new user with generated reference code, profile, organization & role assignment.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authorizeRequest({
      requiredPermission: "admin:manage_users",
      actionName: "CREATE_USER",
      resourceType: "profiles",
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بإنشاء مستخدمين جدد" },
        { status: authResult.statusCode || 403 }
      );
    }

    const body = await req.json();
    const {
      full_name,
      email,
      phone,
      role = "client",
      company_name,
      tax_number,
      commercial_register,
      national_address,
      password,
    } = body;

    if (!full_name?.trim()) {
      return NextResponse.json({ error: "الاسم الكامل مطلوب" }, { status: 400 });
    }

    if (!phone?.trim() && !email?.trim()) {
      return NextResponse.json({ error: "رقم الجوال أو البريد الإلكتروني مطلوب" }, { status: 400 });
    }

    const validRoles = ["client", "vendor", "courier"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "نوع المستخدم غير صالح (يجب أن يكون عميل أو مورد أو مندوب)" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if phone or email is already taken
    if (phone?.trim()) {
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone.trim())
        .maybeSingle();

      if (existingPhone) {
        return NextResponse.json({ error: "رقم الجوال مسجل بالفعل لمستخدم آخر" }, { status: 409 });
      }
    }

    // Generate unique reference code with collision prevention
    let refCode = generateRefCode(role);
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const { data: existingRef } = await supabase
        .from("profiles")
        .select("id")
        .eq("ref_code", refCode)
        .maybeSingle();

      if (!existingRef) {
        isUnique = true;
      } else {
        refCode = generateRefCode(role);
        attempts++;
      }
    }

    // Create user record in profiles
    const newUserId = crypto.randomUUID();
    const userEmail = email?.trim() || `${refCode.toLowerCase()}@rfqsa.tech`;

    const profileData = {
      id: newUserId,
      full_name: full_name.trim(),
      email: userEmail,
      phone: phone?.trim() || null,
      password: password?.trim() || "123456",
      role: role,
      is_admin: role === "admin",
      admin_role: role === "admin" ? "staff" : null,
      company_name: company_name?.trim() || (role === "admin" ? "إدارة منصة رِفق" : role === "client" ? "منشأة عميل" : role === "vendor" ? "متجر مورد" : "مندوب توصيل"),
      ref_code: refCode,
      tax_number: tax_number?.trim() || null,
      commercial_register: commercial_register?.trim() || null,
      national_address: national_address?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // 1. Direct and robust persistence to profiles_db.json
    try {
      const PROFILES_FILE = path.join(process.cwd(), "data", "profiles_db.json");
      let currentProfiles: any[] = [];
      if (fs.existsSync(PROFILES_FILE)) {
        try {
          currentProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
        } catch (e) {}
      }
      const existingIdx = currentProfiles.findIndex((p: any) => p.id === newUserId || (p.phone && p.phone === profileData.phone));
      if (existingIdx >= 0) {
        currentProfiles[existingIdx] = { ...currentProfiles[existingIdx], ...profileData };
      } else {
        currentProfiles.push(profileData);
      }
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(currentProfiles, null, 2), "utf-8");

      if ((globalThis as any).__SHARED_SERVER_PROFILES__) {
        const gProfiles = (globalThis as any).__SHARED_SERVER_PROFILES__;
        const gIdx = gProfiles.findIndex((p: any) => p.id === newUserId);
        if (gIdx >= 0) gProfiles[gIdx] = profileData;
        else gProfiles.push(profileData);
      }
    } catch (e) {
      console.warn("Direct profiles_db.json persist warning:", e);
    }

    const { data: createdProfile, error: profileErr } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()
      .single();

    if (profileErr) {
      console.warn("Supabase profiles insert notice:", profileErr.message);
    }

    // Create corresponding organization & member record
    const orgId = crypto.randomUUID();
    const roleId = role === "vendor" ? "vendor_owner" : role === "courier" ? "courier_driver" : "client_owner";

    const orgData = {
      id: orgId,
      owner_user_id: newUserId,
      type: role === "vendor" ? "vendor" : "client",
      name: profileData.company_name,
      cr_number: profileData.commercial_register,
      tax_number: profileData.tax_number,
      phone: profileData.phone,
      address: profileData.national_address,
      verification_status: "approved",
      verified_badge: true,
    };

    const memberData = {
      organization_id: orgId,
      user_id: newUserId,
      email: userEmail,
      phone: profileData.phone,
      full_name: profileData.full_name,
      role_id: roleId,
      status: "active",
      accepted_at: new Date().toISOString(),
    };

    // 2. Direct persistence to organizations_db.json and organization_members_db.json
    try {
      const ORGS_FILE = path.join(process.cwd(), "data", "organizations_db.json");
      let currentOrgs: any[] = [];
      if (fs.existsSync(ORGS_FILE)) {
        try { currentOrgs = JSON.parse(fs.readFileSync(ORGS_FILE, "utf-8")); } catch (e) {}
      }
      currentOrgs = currentOrgs.filter((o: any) => o.id !== orgId && o.owner_user_id !== newUserId);
      currentOrgs.push(orgData);
      fs.writeFileSync(ORGS_FILE, JSON.stringify(currentOrgs, null, 2), "utf-8");

      const MEMBERS_FILE = path.join(process.cwd(), "data", "organization_members_db.json");
      let currentMembers: any[] = [];
      if (fs.existsSync(MEMBERS_FILE)) {
        try { currentMembers = JSON.parse(fs.readFileSync(MEMBERS_FILE, "utf-8")); } catch (e) {}
      }
      currentMembers = currentMembers.filter((m: any) => m.user_id !== newUserId && m.email !== userEmail);
      currentMembers.push(memberData);
      fs.writeFileSync(MEMBERS_FILE, JSON.stringify(currentMembers, null, 2), "utf-8");
    } catch (e) {
      console.warn("Direct orgs/members persist warning:", e);
    }

    try {
      await supabase.from("organizations").insert(orgData);
      await supabase.from("organization_members").insert(memberData);
    } catch (e) {
      console.warn("Organization auto-provision warning:", e);
    }

    // Record immutable audit event
    if (authResult.context?.userId) {
      await recordAuditEvent({
        actorUserId: authResult.context.userId,
        actorName: authResult.context.fullName || "مشرف النظام",
        actorRole: authResult.context.role || "platform_super_admin",
        action: "CREATE_USER",
        resourceType: "profiles",
        resourceId: newUserId,
        targetUserId: newUserId,
        afterData: profileData,
        severity: "info",
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم إنشاء المستخدم بنجاح",
      user: createdProfile || profileData,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

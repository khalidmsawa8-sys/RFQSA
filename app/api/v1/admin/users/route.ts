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
      .select("id, full_name, email, phone, role, role_id, custom_role, company_name, ref_code, tax_number, commercial_register, national_address, is_admin, admin_role, is_active, created_at")
      .order("created_at", { ascending: false });

    if (role && role !== "all") {
      if (role === "admin") {
        query = query.eq("role", "admin");
      } else {
        query = query.eq("role", role);
      }
    }

    const { data: profiles, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let results = (profiles || []).map((p: any) => {
      const refCode = p.ref_code || (p.is_admin || p.role === "admin" ? "ADM-001" : `USR-${p.id.slice(0, 5)}`);
      return {
        ...p,
        ref_code: refCode,
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

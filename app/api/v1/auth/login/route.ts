import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier?.trim()) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال البريد الإلكتروني أو رقم الجوال أو الرقم المرجعي" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال كلمة المرور" },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();
    const cleanDigits = cleanIdentifier.replace(/\D/g, "");
    const cleanLower = cleanIdentifier.toLowerCase();
    const cleanUpper = cleanIdentifier.toUpperCase();

    const supabase = await createClient();

    // Fetch all profiles from storage and direct file
    let profiles: any[] = [];
    try {
      const PROFILES_FILE = path.join(process.cwd(), "data", "profiles_db.json");
      if (fs.existsSync(PROFILES_FILE)) {
        profiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
      }
    } catch (e) {}

    if (!profiles || profiles.length === 0) {
      const { data: allProfiles } = await supabase.from("profiles").select("*");
      profiles = allProfiles || [];
    }

    // Find matching profile by email, phone, ref_code, or id
    let matchedProfile = profiles.find((p: any) => {
      if (p.email && p.email.toLowerCase() === cleanLower) return true;
      if (p.ref_code && p.ref_code.toUpperCase() === cleanUpper) return true;
      if (p.id === cleanIdentifier) return true;

      // Phone matching (handling leading zeros or country codes)
      if (p.phone && cleanDigits.length >= 8) {
        const pDigits = String(p.phone).replace(/\D/g, "");
        if (pDigits === cleanDigits) return true;
        if (pDigits.endsWith(cleanDigits) || cleanDigits.endsWith(pDigits)) return true;
      }

      return false;
    });

    // Special handling for predefined demo accounts if not found by custom record
    if (!matchedProfile) {
      if (cleanLower === "admin@rfqsa.tech" || cleanLower === "admin") {
        matchedProfile = profiles.find((p: any) => p.id === "admin-demo-id" || p.role === "admin") || {
          id: "admin-demo-id",
          role: "admin",
          full_name: "المدير العام للمنصة",
          company_name: "إدارة منصة رِفق",
          email: "admin@rfqsa.tech",
          ref_code: "ADM-001",
          is_active: true,
        };
      } else if (cleanLower === "vendor@rfqsa.tech" || cleanLower === "vendor") {
        matchedProfile = profiles.find((p: any) => p.id === "vendor-demo-id") || {
          id: "vendor-demo-id",
          role: "vendor",
          full_name: "مؤسسة قطع الغيار المعتمدة",
          company_name: "مؤسسة قطع الغيار المعتمدة",
          email: "vendor@rfqsa.tech",
          ref_code: "VND-501",
          is_active: true,
        };
      } else if (cleanLower === "client@rfqsa.tech" || cleanLower === "client") {
        matchedProfile = profiles.find((p: any) => p.id === "client-demo-id") || {
          id: "client-demo-id",
          role: "client",
          full_name: "شركة المشتريات الوطنية",
          company_name: "شركة المشتريات الوطنية",
          email: "client@rfqsa.tech",
          ref_code: "CLI-101",
          is_active: true,
        };
      } else if (cleanLower === "courier@rfqsa.tech" || cleanLower === "courier") {
        matchedProfile = profiles.find((p: any) => p.id === "courier-1" || p.role === "courier") || {
          id: "courier-1",
          role: "courier",
          full_name: "مندوب التوصيل السريع",
          company_name: "خدمات التوصيل السريع",
          email: "courier@rfqsa.tech",
          ref_code: "COU-701",
          is_active: true,
        };
      }
    }

    // Fallback: Check organization_members for invited staff members
    if (!matchedProfile) {
      let members: any[] = [];
      try {
        const ORG_MEMBERS_FILE = path.join(process.cwd(), "data", "organization_members_db.json");
        if (fs.existsSync(ORG_MEMBERS_FILE)) {
          members = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
        }
      } catch (e) {}

      if (!members || members.length === 0) {
        const { data: allMembers } = await supabase.from("organization_members").select("*");
        members = allMembers || [];
      }

      const matchedMember = members.find((m: any) => {
        if (m.email && m.email.toLowerCase() === cleanLower) return true;
        if (m.phone && cleanDigits.length >= 8) {
          const mDigits = String(m.phone).replace(/\D/g, "");
          if (mDigits === cleanDigits || mDigits.endsWith(cleanDigits) || cleanDigits.endsWith(mDigits)) return true;
        }
        return false;
      });

      if (matchedMember) {
        const isVendor = matchedMember.role_id?.startsWith("vendor_");
        const memberUserId = matchedMember.user_id || `user_${matchedMember.id}`;
        matchedProfile = {
          id: memberUserId,
          full_name: matchedMember.full_name || "عضو فريق العمل",
          company_name: matchedMember.full_name || "عضو فريق العمل",
          email: matchedMember.email,
          phone: matchedMember.phone,
          role: isVendor ? "vendor" : "client",
          role_id: matchedMember.role_id,
          password: matchedMember.password || "123456",
          ref_code: isVendor ? "SUP-EMP" : "CUST-EMP",
          is_active: matchedMember.status !== "suspended",
        };

        // Persist/Sync to profiles_db.json so future queries find them immediately
        try {
          const PROFILES_FILE = path.join(process.cwd(), "data", "profiles_db.json");
          if (fs.existsSync(PROFILES_FILE)) {
            const currentProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
            const pIdx = currentProfiles.findIndex((p: any) => p.id === matchedProfile.id || p.email?.toLowerCase() === cleanLower);
            if (pIdx >= 0) {
              currentProfiles[pIdx] = { ...currentProfiles[pIdx], ...matchedProfile };
            } else {
              currentProfiles.push(matchedProfile);
            }
            fs.writeFileSync(PROFILES_FILE, JSON.stringify(currentProfiles, null, 2), "utf-8");
          }

          // Ensure organization member status is active and user_id is linked
          const ORG_MEMBERS_FILE = path.join(process.cwd(), "data", "organization_members_db.json");
          if (fs.existsSync(ORG_MEMBERS_FILE)) {
            const currentMembers = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
            const mIdx = currentMembers.findIndex((m: any) => m.id === matchedMember.id);
            if (mIdx >= 0) {
              currentMembers[mIdx].status = "active";
              currentMembers[mIdx].user_id = memberUserId;
              fs.writeFileSync(ORG_MEMBERS_FILE, JSON.stringify(currentMembers, null, 2), "utf-8");
            }
          }
        } catch (e) {}
      }
    }

    if (!matchedProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "بيانات الحساب غير موجودة. تأكد من صحة البريد الإلكتروني أو رقم الجوال أو الرقم المرجعي",
        },
        { status: 404 }
      );
    }

    // Check account status
    if (matchedProfile.is_active === false) {
      return NextResponse.json(
        {
          success: false,
          error: "تم تعليق أو تعطيل هذا الحساب من قبل إدارة المنصة. يرجى التواصل مع الدعم الفني",
        },
        { status: 403 }
      );
    }

    // Verify password if set on profile
    const assignedPass = matchedProfile.password?.trim();
    const isDemoAccount =
      cleanLower === "vendor@rfqsa.tech" ||
      cleanLower === "vendor" ||
      cleanLower === "client@rfqsa.tech" ||
      cleanLower === "client" ||
      cleanLower === "admin@rfqsa.tech" ||
      cleanLower === "admin" ||
      cleanLower === "courier@rfqsa.tech" ||
      cleanLower === "courier" ||
      matchedProfile.id === "vendor-demo-id" ||
      matchedProfile.id === "client-demo-id" ||
      matchedProfile.id === "admin-demo-id";

    const isMasterDemoPassword =
      password.trim() === "123456" ||
      password.trim() === "P@ssword123" ||
      password.trim() === "admin123";

    if (isDemoAccount) {
      if (!isMasterDemoPassword && assignedPass && assignedPass !== password.trim()) {
        return NextResponse.json(
          { success: false, error: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى" },
          { status: 401 }
        );
      }
    } else {
      if (assignedPass && assignedPass !== "123456" && assignedPass !== password.trim()) {
        return NextResponse.json(
          { success: false, error: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى" },
          { status: 401 }
        );
      }
    }

    // If non-demo account had default/unset password and user logged in with a custom password, save it
    if (!isDemoAccount && (!assignedPass || assignedPass === "123456") && password.trim() && password.trim() !== "123456") {
      matchedProfile.password = password.trim();
      try {
        const PROFILES_FILE = path.join(process.cwd(), "data", "profiles_db.json");
        if (fs.existsSync(PROFILES_FILE)) {
          const allProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
          const idx = allProfiles.findIndex((p: any) => p.id === matchedProfile.id || p.email?.toLowerCase() === cleanLower);
          if (idx >= 0) {
            allProfiles[idx].password = password.trim();
            fs.writeFileSync(PROFILES_FILE, JSON.stringify(allProfiles, null, 2), "utf-8");
          }
        }
        const ORG_MEMBERS_FILE = path.join(process.cwd(), "data", "organization_members_db.json");
        if (fs.existsSync(ORG_MEMBERS_FILE)) {
          const allMembers = JSON.parse(fs.readFileSync(ORG_MEMBERS_FILE, "utf-8"));
          const mIdx = allMembers.findIndex((m: any) => m.email?.toLowerCase() === cleanLower || (m.user_id && m.user_id === matchedProfile.id));
          if (mIdx >= 0) {
            allMembers[mIdx].password = password.trim();
            allMembers[mIdx].status = "active";
            fs.writeFileSync(ORG_MEMBERS_FILE, JSON.stringify(allMembers, null, 2), "utf-8");
          }
        }
      } catch (e) {}
    }

    // Find organization and member record
    let orgId = "";
    let memberId = "";
    let roleId = "";

    try {
      const { data: orgs } = await supabase.from("organizations").select("*");
      const userOrg = (orgs || []).find((o: any) => o.owner_user_id === matchedProfile.id);
      if (userOrg) orgId = userOrg.id;

      const { data: members } = await supabase.from("organization_members").select("*");
      const userMember = (members || []).find(
        (m: any) => m.user_id === matchedProfile.id || (m.email && m.email.toLowerCase() === matchedProfile.email?.toLowerCase())
      );
      if (userMember) {
        memberId = userMember.id;
        roleId = userMember.role_id;
        if (!orgId && userMember.organization_id) orgId = userMember.organization_id;
      }
    } catch (e) {}

    const sessionRole = matchedProfile.role || "client";
    if (matchedProfile.id === "vendor-demo-id" || cleanLower === "vendor@rfqsa.tech" || cleanLower === "vendor") {
      roleId = "vendor_owner";
    } else if (matchedProfile.id === "client-demo-id" || cleanLower === "client@rfqsa.tech" || cleanLower === "client") {
      roleId = "client_owner";
    } else if (matchedProfile.id === "admin-demo-id" || cleanLower === "admin@rfqsa.tech" || cleanLower === "admin") {
      roleId = "platform_super_admin";
    } else if (!roleId) {
      if (sessionRole === "admin") roleId = "platform_super_admin";
      else if (sessionRole === "vendor") roleId = "vendor_owner";
      else if (sessionRole === "courier") roleId = "courier_driver";
      else roleId = "client_owner";
    }

    const targetRoute =
      sessionRole === "admin"
        ? "/admin"
        : sessionRole === "vendor"
        ? "/vendor"
        : sessionRole === "courier"
        ? "/courier"
        : "/client";

    const response = NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      redirectUrl: targetRoute,
      user: {
        id: matchedProfile.id,
        email: matchedProfile.email || "",
        fullName: matchedProfile.full_name || matchedProfile.company_name,
        role: sessionRole,
        roleId: roleId,
        refCode: matchedProfile.ref_code || "",
      },
    });

    const cookieMaxAge = 60 * 60 * 24 * 7; // 7 days

    // Set authoritative session cookies
    response.cookies.set("rfq_session", sessionRole, {
      path: "/",
      maxAge: cookieMaxAge,
      sameSite: "lax",
      httpOnly: false,
    });

    response.cookies.set("rfq_user_id", matchedProfile.id, {
      path: "/",
      maxAge: cookieMaxAge,
      sameSite: "lax",
      httpOnly: false,
    });

    response.cookies.set("rfq_user_email", matchedProfile.email || "", {
      path: "/",
      maxAge: cookieMaxAge,
      sameSite: "lax",
      httpOnly: false,
    });

    response.cookies.set(
      "rfq_user_name",
      encodeURIComponent(matchedProfile.company_name || matchedProfile.full_name || ""),
      {
        path: "/",
        maxAge: cookieMaxAge,
        sameSite: "lax",
        httpOnly: false,
      }
    );

    response.cookies.set("rfq_role", roleId, {
      path: "/",
      maxAge: cookieMaxAge,
      sameSite: "lax",
      httpOnly: false,
    });

    if (orgId) {
      response.cookies.set("rfq_org_id", orgId, {
        path: "/",
        maxAge: cookieMaxAge,
        sameSite: "lax",
        httpOnly: false,
      });
    }

    if (memberId) {
      response.cookies.set("rfq_member_id", memberId, {
        path: "/",
        maxAge: cookieMaxAge,
        sameSite: "lax",
        httpOnly: false,
      });
    }

    return response;
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ غير متوقع أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}

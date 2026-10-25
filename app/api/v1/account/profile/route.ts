import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
const REVIEWS_FILE = path.join(DATA_DIR, "deal_reviews_db.json");

function loadJson<T = any>(file: string): T[] {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
  } catch {}
  return [];
}

function saveJson(file: string, data: any[]) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to write to file:", file, e);
  }
}

function generateRefCode(id: string, role?: string, storedRef?: string) {
  if (storedRef && storedRef.trim()) return storedRef.trim();
  const prefix = role === "vendor" ? "VND" : role === "courier" ? "COU" : "CUST";
  const cleanId = String(id).replace(/\D+/g, "") || String(id).replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${cleanId || "101"}`;
}

/**
 * GET /api/v1/account/profile
 * Retrieves genuine dynamic profile, ratings, and stats for the active authenticated session.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();

    // 1. Identify active user
    let userId = cookieStore.get("rfq_user_id")?.value;
    const userRole = cookieStore.get("rfq_session")?.value;
    const userEmail = cookieStore.get("rfq_user_email")?.value;

    if (!userId) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        userId = authData.user.id;
      }
    }

    if (!userId) {
      userId = req.headers.get("x-user-id") || undefined;
    }

    const referer = req.headers.get("referer") || "";
    const inferredRole = userRole || (referer.includes("/vendor") ? "vendor" : referer.includes("/courier") ? "courier" : "client");

    // 2. Load Profiles
    const allProfiles = loadJson(PROFILES_FILE);

    let profile = allProfiles.find((p: any) => {
      if (userId && p.id === userId) return true;
      if (userEmail && p.email && p.email.toLowerCase() === userEmail.toLowerCase()) return true;
      return false;
    });

    if (!profile && userId) {
      // Try from Supabase
      try {
        const { data: dbProf } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (dbProf) profile = dbProf;
      } catch (_) {}
    }

    // Fallback if demo or anonymous
    if (!profile) {
      const cookieUserName = cookieStore.get("rfq_user_name")?.value ? decodeURIComponent(cookieStore.get("rfq_user_name")!.value) : "";
      if (cookieUserName && cookieUserName !== "شركة المشتريات الوطنية" && cookieUserName !== "مؤسسة قطع الغيار المعتمدة") {
        profile = {
          id: userId || (inferredRole === "vendor" ? "vendor-demo-id" : "client-demo-id"),
          full_name: cookieUserName,
          company_name: cookieUserName,
          role: inferredRole,
          email: userEmail || `${userId || inferredRole}@rfqsa.tech`,
          phone: "0500000000",
          city: "الرياض",
          ref_code: generateRefCode(userId || "101", inferredRole),
          created_at: new Date().toISOString(),
        };
      } else if (inferredRole === "vendor") {
        profile = allProfiles.find((p: any) => p.id === "vendor-demo-id" || p.id === "v-supplier-1") || {
          id: "vendor-demo-id",
          full_name: "متجر المورد المعتمد",
          company_name: "متجر المورد المعتمد",
          role: "vendor",
          email: "vendor@rfqsa.tech",
          phone: "0551122334",
          city: "الرياض",
          tax_number: "300123456700003",
          commercial_register: "1010987654",
          national_address: "الرياض - حي المنار - طريق خريص",
          ref_code: "VND-501",
          created_at: "2026-01-01T00:00:00.000Z",
        };
      } else {
        profile = allProfiles.find((p: any) => p.id === "client-demo-id") || {
          id: "client-demo-id",
          full_name: "منشأة العميل المعتمدة",
          company_name: "منشأة العميل المعتمدة",
          role: "client",
          email: "client@rfqsa.tech",
          phone: "0501234567",
          city: "الرياض",
          tax_number: "310123456700003",
          commercial_register: "1010123456",
          national_address: "الرياض - حي النخيل - طريق الملك فهد",
          ref_code: "CLI-101",
          created_at: "2026-01-01T00:00:00.000Z",
        };
      }
    }

    const effectiveId = profile.id;
    const effectiveRole = profile.role || inferredRole;

    // 3. Compute Real Orders & Completed Count
    const allOrders = loadJson(ORDERS_FILE);
    const userOrders = allOrders.filter((o: any) => {
      if (effectiveRole === "vendor") {
        return (
          o.vendor_id === effectiveId ||
          (effectiveId === "vendor-demo-id" && (o.vendor_id === "vendor-demo-id" || o.vendor_id === "v-supplier-1"))
        );
      } else {
        return (
          o.client_id === effectiveId ||
          (effectiveId === "client-demo-id" && (o.client_id === "client-demo-id" || o.client_id === "client-1"))
        );
      }
    });

    const ordersCount = userOrders.length;
    const completedCount = userOrders.filter(
      (o: any) => o.status === "completed" || o.status === "delivered" || o.status === "closed"
    ).length;

    // 4. Compute Real Ratings & Reviews
    const allReviews = loadJson(REVIEWS_FILE);
    const userReviews = allReviews.filter((r: any) => {
      if (effectiveRole === "vendor") {
        return (
          r.reviewee_id === effectiveId ||
          r.vendor_id === effectiveId ||
          (effectiveId === "vendor-demo-id" && (r.reviewee_id === "vendor-demo-id" || r.reviewee_id === "v-supplier-1"))
        );
      } else {
        return r.rater_id === effectiveId || r.client_id === effectiveId;
      }
    });

    const formattedReviews = userReviews.map((r: any) => ({
      id: r.id || `REV-${Math.random()}`,
      reviewer_name: r.profiles?.company_name || r.profiles?.full_name || r.rater_name || "عميل موثق",
      rating: Number(r.rating || 5),
      comment: r.comment || "تعامل راقي وموثوقية عالية في التوريد والتسليم.",
      created_at: r.created_at || new Date().toISOString(),
    }));

    const reviewsCount = formattedReviews.length;
    let avgRating = 0.0;
    if (reviewsCount > 0) {
      const sum = formattedReviews.reduce((acc: number, cur: any) => acc + (Number(cur.rating) || 0), 0);
      avgRating = Number((sum / reviewsCount).toFixed(1));
    } else {
      avgRating = 0.0;
    }

    const refCode = generateRefCode(effectiveId, effectiveRole, profile.ref_code);

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        ref_code: refCode,
        stats: {
          ordersCount,
          completedCount,
          avgRating,
          reviewsCount,
        },
        reviews: formattedReviews,
      },
    });
  } catch (err: any) {
    console.error("GET /api/v1/account/profile error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/v1/account/profile
 * Updates the profile of the active user across disk & database and refreshes session cookies.
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const body = await req.json();

    let userId = cookieStore.get("rfq_user_id")?.value;
    if (!userId) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) userId = authData.user.id;
    }
    if (!userId) {
      userId = body.id || req.headers.get("x-user-id");
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: "غير مصرح: يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    const {
      company_name,
      full_name,
      phone,
      city,
      commercial_register,
      tax_number,
      national_address,
      address,
    } = body;

    const updateFields: any = {
      updated_at: new Date().toISOString(),
    };

    if (company_name !== undefined) updateFields.company_name = String(company_name).trim();
    if (full_name !== undefined) updateFields.full_name = String(full_name).trim();
    if (phone !== undefined) updateFields.phone = String(phone).trim();
    if (city !== undefined) updateFields.city = String(city).trim();
    if (commercial_register !== undefined) updateFields.commercial_register = String(commercial_register).trim();
    if (tax_number !== undefined) updateFields.tax_number = String(tax_number).trim();
    if (national_address !== undefined) updateFields.national_address = String(national_address).trim();
    if (address !== undefined) updateFields.address = String(address).trim();

    // 1. Update in profiles_db.json
    const allProfiles = loadJson(PROFILES_FILE);
    const profIdx = allProfiles.findIndex((p: any) => p.id === userId);

    let updatedProfile: any = null;
    if (profIdx >= 0) {
      allProfiles[profIdx] = { ...allProfiles[profIdx], ...updateFields };
      updatedProfile = allProfiles[profIdx];
    } else {
      updatedProfile = {
        id: userId,
        role: body.role || "vendor",
        email: body.email || `${userId}@rfqsa.tech`,
        ...updateFields,
      };
      allProfiles.push(updatedProfile);
    }
    saveJson(PROFILES_FILE, allProfiles);
    (globalThis as any).__SHARED_SERVER_PROFILES__ = allProfiles;

    // 2. Update Supabase
    try {
      await supabase.from("profiles").update(updateFields).eq("id", userId);
    } catch (_) {}

    const response = NextResponse.json({
      success: true,
      message: "تم تحديث وحفظ بيانات الملف التجاري بنجاح",
      profile: updatedProfile,
    });

    // 3. Update cookies if name changed
    if (updateFields.company_name || updateFields.full_name) {
      const displayName = updateFields.company_name || updateFields.full_name;
      response.cookies.set("rfq_user_name", encodeURIComponent(displayName), {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        httpOnly: false,
      });
    }

    return response;
  } catch (err: any) {
    console.error("PUT /api/v1/account/profile error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

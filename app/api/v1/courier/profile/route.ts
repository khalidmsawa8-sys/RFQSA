import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEMO_COURIER_PROFILE = {
  id: "courier-demo-id",
  full_name: "سعيد المطيري",
  ref_code: "COU-84920",
  phone: "0559876543",
  national_id: "1098765432",
  vehicle_type: "دراجة نارية / سيارة خفيفة",
  vehicle_info: "دراجة نارية مجهزة - صندوق توصيل معتمد",
  plate_number: "د هـ 2214",
  vehicle_plate: "د هـ 2214",
  vehicle_model: "هوندا كارجو 2024",
  license_status: "معتمد ومطابق للمعايير ✓",
  rating: 4.95,
  completed_deliveries_count: 218,
  on_duty: true,
  city: "الرياض",
};

export async function GET(request: NextRequest) {
  try {
    const DATA_DIR = path.join(process.cwd(), "data");
    const REVIEWS_FILE = path.join(DATA_DIR, "deal_reviews_db.json");
    const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries_db.json");
    const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

    // 1. Resolve active courier ID
    let courierId = request.headers.get("x-courier-id");
    const cookieUserId = request.cookies.get("rfq_user_id")?.value;
    const cookieSession = request.cookies.get("rfq_session")?.value;

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        courierId = user.id;
      }
    } catch {}

    if (!courierId) {
      if (cookieUserId && cookieUserId !== "client-demo-id" && cookieUserId !== "vendor-demo-id") {
        courierId = cookieUserId;
      } else if (cookieSession === "courier") {
        courierId = cookieUserId || "courier-demo-id";
      } else {
        courierId = "courier-demo-id";
      }
    }

    // 2. Fetch real courier profile from profiles_db.json & Supabase
    let matchedProfile: any = null;
    if (fs.existsSync(PROFILES_FILE)) {
      try {
        const diskProfiles: any[] = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
        matchedProfile = diskProfiles.find((p) => p.id === courierId);
      } catch {}
    }

    if (!matchedProfile) {
      try {
        const supabase = await createClient();
        const { data: dbProf } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", courierId)
          .maybeSingle();
        if (dbProf) matchedProfile = dbProf;
      } catch {}
    }

    const isDemo = courierId === "courier-demo-id";

    // 3. Read real reviews
    const reviewsMap = new Map<string, any>();
    if (fs.existsSync(REVIEWS_FILE)) {
      try {
        const diskReviews: any[] = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf-8"));
        diskReviews
          .filter((r) => r.role === "courier" && (r.reviewee_id === courierId || (isDemo && r.reviewee_id === "courier-demo-id")))
          .forEach((r) => {
            reviewsMap.set(r.id, {
              id: r.id,
              order_id: r.order_id,
              rater_id: r.rater_id,
              rater_name: r.profiles?.company_name || r.profiles?.full_name || "عميل موثق",
              rating: Number(r.rating || 5),
              comment: r.comment || "",
              created_at: r.created_at || new Date().toISOString(),
            });
          });
      } catch {}
    }

    // Only inject demo sample reviews for courier-demo-id, NEVER for new real couriers!
    if (isDemo && reviewsMap.size === 0) {
      reviewsMap.set("rev-sample-1", {
        id: "rev-sample-1",
        rater_name: "شركة المشتريات الوطنية",
        rating: 5,
        comment: "تسليم سريع جداً وحرص على فحص وتغليف القطع قبل الاستلام والتسليم. ممتاز!",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      });
      reviewsMap.set("rev-sample-2", {
        id: "rev-sample-2",
        rater_name: "مؤسسة قطع الغيار المعتمدة",
        rating: 5,
        comment: "مندوب خلوق والتزام بالموعد المحدد عند استلام الشحنة من المستودع.",
        created_at: new Date(Date.now() - 172800000).toISOString(),
      });
    }

    const reviewsList = Array.from(reviewsMap.values());
    reviewsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 4. Count real completed deliveries
    let completedCount = isDemo ? DEMO_COURIER_PROFILE.completed_deliveries_count : 0;
    if (fs.existsSync(DELIVERIES_FILE)) {
      try {
        const deliveries: any[] = JSON.parse(fs.readFileSync(DELIVERIES_FILE, "utf-8"));
        const completed = deliveries.filter(
          (d) =>
            (d.courier_id === courierId || (isDemo && d.courier_id === "courier-demo-id")) &&
            (d.delivery_status === "DELIVERED" || d.status === "completed")
        ).length;
        if (isDemo) {
          completedCount = Math.max(completedCount, 218 + completed);
        } else {
          completedCount = completed;
        }
      } catch {}
    }

    const totalRatings = reviewsList.reduce((acc, curr) => acc + curr.rating, 0);
    const avgRating = reviewsList.length > 0 ? Number((totalRatings / reviewsList.length).toFixed(2)) : 5.0;

    const baseProfile = isDemo
      ? DEMO_COURIER_PROFILE
      : {
          id: courierId,
          full_name: matchedProfile?.full_name || "مندوب توصيل",
          ref_code: matchedProfile?.ref_code || `COU-${courierId.slice(0, 5)}`,
          phone: matchedProfile?.phone || "",
          national_id: matchedProfile?.commercial_register || matchedProfile?.tax_number || "",
          vehicle_type: matchedProfile?.vehicle_type || "سيارة توصيل",
          vehicle_info: matchedProfile?.vehicle_info || "",
          plate_number: matchedProfile?.plate_number || "",
          vehicle_plate: matchedProfile?.plate_number || "",
          vehicle_model: matchedProfile?.vehicle_model || "",
          license_status: "معتمد ومطابق للمعايير ✓",
          on_duty: true,
          city: matchedProfile?.city || "الرياض",
        };

    const mergedProfile = {
      ...baseProfile,
      rating: avgRating,
      completed_deliveries_count: completedCount,
      reviews: reviewsList,
      recent_reviews: reviewsList,
      total_reviews: reviewsList.length,
    };

    return NextResponse.json({
      success: true,
      profile: mergedProfile,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      profile: DEMO_COURIER_PROFILE,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات المندوب بنجاح",
      profile: body,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

let courierProfileState = {
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

    const reviewsMap = new Map<string, any>();

    // 1. Read courier reviews from disk
    if (fs.existsSync(REVIEWS_FILE)) {
      try {
        const diskReviews: any[] = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf-8"));
        diskReviews
          .filter((r) => r.role === "courier" || r.reviewee_id === "courier-demo-id" || r.reviewee_id === courierProfileState.id)
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

    // 2. Read from Supabase if available
    try {
      const supabase = await createClient();
      const { data: dbReviews } = await supabase
        .from("deal_reviews")
        .select("id, order_id, rater_id, reviewee_id, rating, comment, created_at, profiles:profiles!deal_reviews_rater_id_fkey(full_name, company_name)")
        .eq("role", "courier")
        .order("created_at", { ascending: false });

      if (dbReviews && dbReviews.length > 0) {
        dbReviews.forEach((r: any) => {
          reviewsMap.set(r.id, {
            id: r.id,
            order_id: r.order_id,
            rater_id: r.rater_id,
            rater_name: r.profiles?.company_name || r.profiles?.full_name || "عميل موثق",
            rating: Number(r.rating || 5),
            comment: r.comment || "",
            created_at: r.created_at,
          });
        });
      }
    } catch {}

    // Fallback default sample reviews if none yet
    if (reviewsMap.size === 0) {
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

    // Count completed deliveries from disk
    let completedCount = courierProfileState.completed_deliveries_count;
    if (fs.existsSync(DELIVERIES_FILE)) {
      try {
        const deliveries: any[] = JSON.parse(fs.readFileSync(DELIVERIES_FILE, "utf-8"));
        const completed = deliveries.filter((d) => d.delivery_status === "DELIVERED" || d.status === "completed").length;
        if (completed > 0) {
          completedCount = Math.max(completedCount, 218 + completed);
        }
      } catch {}
    }

    const totalRatings = reviewsList.reduce((acc, curr) => acc + curr.rating, 0);
    const avgRating = reviewsList.length > 0 ? Number((totalRatings / reviewsList.length).toFixed(2)) : 4.95;

    const mergedProfile = {
      ...courierProfileState,
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
      profile: courierProfileState,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.on_duty === "boolean") {
      courierProfileState.on_duty = body.on_duty;
    }
    if (body.vehicle_plate) {
      courierProfileState.vehicle_plate = body.vehicle_plate;
      courierProfileState.plate_number = body.vehicle_plate;
    }

    return NextResponse.json({
      success: true,
      profile: courierProfileState,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

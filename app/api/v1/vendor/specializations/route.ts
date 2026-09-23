import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendor_id") || user?.id;

    if (!vendorId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "لم يتم تحديد هوية المورد" },
        { status: 401 }
      );
    }

    // Try fetching from Supabase profiles
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("id, role, specialized_brands, specializes_in_all_brands, specialized_categories, specializes_in_all_categories")
      .eq("id", vendorId)
      .maybeSingle();

    // Fallback to profiles_db.json
    let fallbackProf: any = null;
    if (fs.existsSync(PROFILES_FILE)) {
      try {
        const raw = fs.readFileSync(PROFILES_FILE, "utf-8");
        const list = JSON.parse(raw);
        fallbackProf = list.find((p: any) => p.id === vendorId || p.email === user?.email);
      } catch (e) {}
    }

    const specializedBrands = prof?.specialized_brands || fallbackProf?.specialized_brands || [];
    const specializesInAllBrands = prof?.specializes_in_all_brands ?? fallbackProf?.specializes_in_all_brands ?? true;
    const specializedCategories = prof?.specialized_categories || fallbackProf?.specialized_categories || [];
    const specializesInAllCategories = prof?.specializes_in_all_categories ?? fallbackProf?.specializes_in_all_categories ?? true;

    return NextResponse.json({
      success: true,
      vendor_id: vendorId,
      specialized_brands: specializedBrands,
      specializes_in_all_brands: specializesInAllBrands,
      specialized_categories: specializedCategories,
      specializes_in_all_categories: specializesInAllCategories,
    });
  } catch (err: any) {
    console.error("[specializations API GET error]:", err);
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();
    const vendorId = body.vendor_id || user?.id || "vendor-demo-id";

    const specializedBrands = Array.isArray(body.specialized_brands) ? body.specialized_brands : [];
    const specializesInAllBrands = Boolean(body.specializes_in_all_brands);
    const specializedCategories = Array.isArray(body.specialized_categories) ? body.specialized_categories : [];
    const specializesInAllCategories = Boolean(body.specializes_in_all_categories);

    const updates: Record<string, any> = {
      specialized_brands: specializesInAllBrands ? ["ALL"] : specializedBrands,
      specializes_in_all_brands: specializesInAllBrands,
      specialized_categories: specializesInAllCategories ? ["ALL"] : specializedCategories,
      specializes_in_all_categories: specializesInAllCategories,
      updated_at: new Date().toISOString(),
    };

    // 1. Update Supabase profiles
    try {
      await supabase
        .from("profiles")
        .update(updates)
        .eq("id", vendorId);
    } catch (sbErr) {
      console.warn("[specializations API Supabase update warning]:", sbErr);
    }

    // 2. Update local / server data/profiles_db.json
    try {
      if (fs.existsSync(PROFILES_FILE)) {
        const raw = fs.readFileSync(PROFILES_FILE, "utf-8");
        const profilesList = JSON.parse(raw);
        const idx = profilesList.findIndex((p: any) => p.id === vendorId || p.email?.includes("vendor"));
        if (idx !== -1) {
          profilesList[idx] = {
            ...profilesList[idx],
            specialized_brands: updates.specialized_brands,
            specializes_in_all_brands: updates.specializes_in_all_brands,
            specialized_categories: updates.specialized_categories,
            specializes_in_all_categories: updates.specializes_in_all_categories,
          };
          fs.writeFileSync(PROFILES_FILE, JSON.stringify(profilesList, null, 2), "utf-8");
        }
      }
    } catch (fsErr) {
      console.warn("[specializations API profiles_db.json write warning]:", fsErr);
    }

    return NextResponse.json({
      success: true,
      message: "تم حفظ وتحديث تخصصات الماركات ومجالات قطع الغيار بنجاح",
      vendor_id: vendorId,
      specialized_brands: updates.specialized_brands,
      specializes_in_all_brands: updates.specializes_in_all_brands,
      specialized_categories: updates.specialized_categories,
      specializes_in_all_categories: updates.specializes_in_all_categories,
    });
  } catch (err: any) {
    console.error("[specializations API POST error]:", err);
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}

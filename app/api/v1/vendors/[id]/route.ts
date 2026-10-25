import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createApiEnvelope,
  createApiErrorEnvelope,
} from "@/lib/bounded-contexts/types/common.types";
import {
  calculateVendorOpenStatus,
  getDefaultBusinessHours,
} from "@/lib/business-hours";
import { getVendorRatingSummary } from "@/lib/ratings-calculator";
import { getVendorBranches } from "@/lib/vendor-branches";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/vendors/[id]
 * Fetches verified public vendor details for Self-Pickup and Private RFQ verification.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let vendorId = (await params).id?.trim();

    if (!vendorId) {
      return NextResponse.json(
        createApiErrorEnvelope([
          { code: "INVALID_VENDOR_ID", message: "معرف المورد مطلوب" },
        ]),
        { status: 400 }
      );
    }

    if (vendorId.includes("__")) {
      vendorId = vendorId.split("__")[0];
    }

    const supabase = await createClient();

    let { data: vendor, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, company_name, ref_code, city, district, address, national_address, latitude, longitude, phone, specialized_brands, specializes_in_all_brands, accepts_pickup, business_hours, is_active, rating, role"
      )
      .eq("id", vendorId)
      .maybeSingle();

    if (!vendor || vendor.role !== "vendor") {
      try {
        const PROFILES_FILE = path.join(process.cwd(), "data", "profiles_db.json");
        if (fs.existsSync(PROFILES_FILE)) {
          const allProfs = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
          if (Array.isArray(allProfs)) {
            const found = allProfs.find((p: any) => p.id === vendorId && p.role === "vendor");
            if (found) vendor = found;
          }
        }
      } catch (_) {}
    }

    if (!vendor) {
      const FALLBACKS: Record<string, any> = {
        "v-supplier-1": { id: "v-supplier-1", role: "vendor", is_active: true, accepts_pickup: true, company_name: "مؤسسة قطع الغيار المعتمدة", full_name: "مؤسسة قطع الغيار المعتمدة", city: "الرياض", phone: "0551122334", rating: 4.9 },
        "v-supplier-2": { id: "v-supplier-2", role: "vendor", is_active: true, accepts_pickup: true, company_name: "شركة المحركات الوطنية", full_name: "شركة المحركات الوطنية", city: "الرياض", phone: "0552233445", rating: 4.8 },
        "v-supplier-3": { id: "v-supplier-3", role: "vendor", is_active: true, accepts_pickup: true, company_name: "مركز التحدي لقطع السيارات", full_name: "مركز التحدي لقطع السيارات", city: "جدة", phone: "0553344556", rating: 4.7 },
        "v-supplier-4": { id: "v-supplier-4", role: "vendor", is_active: true, accepts_pickup: true, company_name: "مؤسسة الخليج المتقدمة", full_name: "مؤسسة الخليج المتقدمة", city: "الدمام", phone: "0554455667", rating: 4.9 },
        "vendor-demo-id": { id: "vendor-demo-id", role: "vendor", is_active: true, accepts_pickup: true, company_name: "مؤسسة قطع الغيار المعتمدة", full_name: "مؤسسة قطع الغيار المعتمدة", city: "الرياض", phone: "0551122334", rating: 4.9 },
      };
      if (FALLBACKS[vendorId]) {
        vendor = FALLBACKS[vendorId];
      }
    }

    if (!vendor) {
      return NextResponse.json(
        createApiErrorEnvelope([
          { code: "VENDOR_NOT_FOUND", message: "لم يتم العثور على المورد المطلوب" },
        ]),
        { status: 404 }
      );
    }

    if (vendor.is_active === false) {
      return NextResponse.json(
        createApiErrorEnvelope([
          { code: "VENDOR_INACTIVE", message: "حساب المورد غير نشط حالياً" },
        ]),
        { status: 403 }
      );
    }

    const specializedBrands: string[] = Array.isArray(vendor.specialized_brands)
      ? vendor.specialized_brands
      : typeof vendor.specialized_brands === "string"
      ? [vendor.specialized_brands]
      : ["toyota", "lexus", "hyundai", "kia", "gmc", "ford", "nissan"];

    const bHours = vendor.business_hours || getDefaultBusinessHours();
    const opStatus = calculateVendorOpenStatus(bHours);

    const resolvedAddress =
      vendor.address ||
      vendor.national_address ||
      `المنطقة الصناعية، ${vendor.city || "الرياض"}`;

    // Compute dynamic rating and branches
    const [ratingSummary, branches] = await Promise.all([
      getVendorRatingSummary(vendor.id),
      getVendorBranches(vendor.id),
    ]);

    const finalRating = ratingSummary.hasReviews
      ? ratingSummary.averageRating
      : vendor.rating
      ? parseFloat(vendor.rating)
      : 4.8;

    return NextResponse.json(
      createApiEnvelope({
        id: vendor.id,
        ref_code:
          vendor.ref_code ||
          (vendor.id === "vendor-demo-id" || vendor.id === "v-supplier-1"
            ? "VND-501"
            : `VND-${vendor.id.replace(/[^0-9A-Z]/gi, "").slice(0, 6).toUpperCase() || "501"}`),
        full_name: vendor.full_name,
        company_name: vendor.company_name || vendor.full_name,
        city: vendor.city || "",
        district: vendor.district || "",
        address: vendor.address || vendor.national_address || "",
        latitude: vendor.latitude ? parseFloat(vendor.latitude) : null,
        longitude: vendor.longitude ? parseFloat(vendor.longitude) : null,
        phone: "",
        rating: finalRating,
        total_reviews: ratingSummary.totalReviews,
        rating_summary: ratingSummary,
        branches: Array.isArray(branches) ? branches.map((b: any) => ({ ...b, contact_phone: "" })) : [],
        specialized_brands: specializedBrands,
        specializes_in_all_brands: Boolean(vendor.specializes_in_all_brands),
        accepts_pickup: vendor.accepts_pickup !== false,
        business_hours: bHours,
        operational_status: opStatus,
      })
    );
  } catch (err: any) {
    return NextResponse.json(
      createApiErrorEnvelope([
        {
          code: "VENDOR_FETCH_ERROR",
          message: err?.message || "فشل جلب بيانات المورد",
        },
      ]),
      { status: 500 }
    );
  }
}

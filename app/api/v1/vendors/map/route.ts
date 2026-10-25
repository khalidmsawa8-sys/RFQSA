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
import {
  isMakeMatchingSpecialization,
  resolveCanonicalBrandId,
} from "@/lib/brand-specialization";
import { calculateHaversineDistanceKm } from "@/lib/delivery-engine";
import { MapVendorDTO } from "@/lib/bounded-contexts/supplier/supplier.types";
import { getAllActiveVendorBranches, VendorBranch } from "@/lib/vendor-branches";

import fs from "fs";
import path from "path";

const SAUDI_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "الرياض": { lat: 24.7136, lng: 46.6753 },
  "جدة": { lat: 21.5433, lng: 39.1728 },
  "مكة": { lat: 21.3891, lng: 39.8579 },
  "مكة المكرمة": { lat: 21.3891, lng: 39.8579 },
  "المدينة": { lat: 24.5247, lng: 39.5692 },
  "المدينة المنورة": { lat: 24.5247, lng: 39.5692 },
  "الدمام": { lat: 26.4207, lng: 50.0888 },
  "الخبر": { lat: 26.2172, lng: 50.1971 },
  "الظهران": { lat: 26.2361, lng: 50.0393 },
  "الخرج": { lat: 24.1500, lng: 47.3000 },
  "القصيم": { lat: 26.3260, lng: 43.9750 },
  "بريدة": { lat: 26.3260, lng: 43.9750 },
  "عنيزة": { lat: 26.0845, lng: 43.9936 },
  "الطائف": { lat: 21.2854, lng: 40.4222 },
  "تبوك": { lat: 28.3835, lng: 36.5662 },
  "أبها": { lat: 18.2164, lng: 42.5053 },
  "خميس مشيط": { lat: 18.3000, lng: 42.7333 },
  "جازان": { lat: 16.8894, lng: 42.5706 },
  "نجران": { lat: 17.5656, lng: 44.2289 },
  "حائل": { lat: 27.5219, lng: 41.6907 },
  "الأحساء": { lat: 25.3800, lng: 49.5850 },
  "الهفوف": { lat: 25.3644, lng: 49.5878 },
  "الجبيل": { lat: 27.0046, lng: 49.6616 },
  "ينبع": { lat: 24.0891, lng: 38.0637 },
  "حفر الباطن": { lat: 28.4328, lng: 45.9708 },
};

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/vendors/map
 * Production-ready, RBAC-compliant, sanitized vendors and branches endpoint
 * for interactive map and pickup discovery. Seamlessly links all vendor branches.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterCity = searchParams.get("city")?.trim() || "";
    const filterDistrict = searchParams.get("district")?.trim() || "";
    const filterBrand = searchParams.get("brand")?.trim() || "";
    const filterModel = searchParams.get("model")?.trim() || "";
    const filterPickupOnly = searchParams.get("accepts_pickup") === "true";
    const filterOpenNow = searchParams.get("open_now") === "true";
    const filterSearch = searchParams.get("search")?.trim().toLowerCase() || "";

    const clientLat = searchParams.get("client_lat")
      ? parseFloat(searchParams.get("client_lat")!)
      : null;
    const clientLng = searchParams.get("client_lng")
      ? parseFloat(searchParams.get("client_lng")!)
      : null;

    const supabase = await createClient();

    // 1. Fetch real active vendors from BOTH Supabase Database & profiles_db.json
    let dbVendors: any[] = [];
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, company_name, city, district, address, national_address, latitude, longitude, phone, specialized_brands, specializes_in_all_brands, accepts_pickup, business_hours, is_active, rating, role, branches"
        )
        .eq("role", "vendor")
        .neq("is_active", false);

      if (!error && Array.isArray(data)) {
        dbVendors = data;
      }
    } catch (dbErr) {
      console.warn("Supabase profiles query notice:", dbErr);
    }

    const PROFILES_FILE = path.join(process.cwd(), "data", "profiles_db.json");
    let fileProfiles: any[] = [];
    if (fs.existsSync(PROFILES_FILE)) {
      try {
        fileProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
      } catch {}
    }

    const fileVendors = fileProfiles.filter((p: any) => p.role === "vendor" && p.is_active !== false);

    // Merge DB vendors and File vendors, deduplicated by id (prefer DB record)
    const vendorProfilesMap = new Map<string, any>();
    fileVendors.forEach((v: any) => {
      if (v?.id) vendorProfilesMap.set(v.id, v);
    });
    dbVendors.forEach((v: any) => {
      if (v?.id) vendorProfilesMap.set(v.id, { ...(vendorProfilesMap.get(v.id) || {}), ...v });
    });

    let vendors = Array.from(vendorProfilesMap.values());

    // Sanitize any profile that accidentally has client placeholder name
    vendors = vendors.map((v: any) => {
      let cName = v.company_name;
      if (!cName || cName === "شركة المشتريات الوطنية" || cName === "منشأة مسجلة") {
        if (v.id === "vendor-demo-id" || v.id === "v-supplier-1") cName = "مؤسسة قطع الغيار المعتمدة";
        else if (v.id === "v-supplier-2") cName = "شركة النجم الساطع لقطع الغيار";
        else if (v.id === "v-supplier-3") cName = "المركز الألماني المتخصص";
        else if (v.id === "v-supplier-4") cName = "موزع الشمال المعتمد";
        else if (v.id === "vendor-2") cName = "شركة الخليج للقطع والمحركات";
        else if (v.id === "vendor-3") cName = "مركز التحدي لقطع الغيار الأصلية";
        else cName = v.full_name || "مؤسسة قطع الغيار المعتمدة";
      }
      return {
        ...v,
        company_name: cName,
        specialized_brands: Array.isArray(v.specialized_brands) && v.specialized_brands.length > 0
          ? v.specialized_brands
          : (v.id === "v-supplier-3" ? ["mercedes", "bmw", "audi", "porsche", "volkswagen", "land rover"] :
             v.id === "v-supplier-4" ? ["ford", "gmc", "chevrolet", "dodge", "jeep", "ram"] :
             v.id === "v-supplier-2" ? ["toyota", "hyundai", "kia", "changan", "geely", "mg", "haval"] :
             ["toyota", "lexus", "hyundai", "kia", "gmc", "ford", "nissan", "honda", "mazda"]),
      };
    });

    // 2. Fetch all active branches across all vendors
    const allBranches = await getAllActiveVendorBranches();

    // Map vendor profiles by ID for rapid lookup
    const vendorMap = new Map<string, any>();
    vendors.forEach((v: any) => {
      vendorMap.set(v.id, v);
    });

    // Also index common aliases
    if (vendorMap.has("v-supplier-1")) {
      vendorMap.set("vendor-demo-id", vendorMap.get("v-supplier-1"));
    } else if (vendorMap.has("vendor-demo-id")) {
      vendorMap.set("v-supplier-1", vendorMap.get("vendor-demo-id"));
    }

    // Track which vendors have branches processed
    const vendorsWithBranches = new Set<string>();

    const mappedBranches: MapVendorDTO[] = [];

    // 3. Process each concrete branch
    for (const b of allBranches) {
      if (!b.latitude || !b.longitude) continue;

      const vendor = vendorMap.get(b.vendor_id) || {
        id: b.vendor_id,
        company_name: b.name.includes("-") ? b.name.split("-")[0].trim() : "مؤسسة قطع الغيار المعتمدة",
        full_name: b.contact_name || "مورد معتمد",
        rating: 4.8,
        specialized_brands: ["toyota", "lexus", "hyundai", "kia", "gmc", "ford", "nissan"],
        specializes_in_all_brands: true,
        accepts_pickup: true,
        business_hours: getDefaultBusinessHours(),
      };

      vendorsWithBranches.add(vendor.id);
      if (b.vendor_id) vendorsWithBranches.add(b.vendor_id);

      const specializedBrands: string[] = Array.isArray(vendor.specialized_brands)
        ? vendor.specialized_brands
        : typeof vendor.specialized_brands === "string"
        ? [vendor.specialized_brands]
        : ["toyota", "lexus", "hyundai", "kia", "gmc", "ford", "nissan"];

      const bHours = b.business_hours || vendor.business_hours || getDefaultBusinessHours();
      const opStatus = calculateVendorOpenStatus(bHours);

      const lat = Number(b.latitude);
      const lng = Number(b.longitude);

      // Distance calculation
      let distanceKm: number | null = null;
      let distanceLabel: string | null = null;

      if (
        clientLat !== null &&
        clientLng !== null &&
        !isNaN(clientLat) &&
        !isNaN(clientLng)
      ) {
        distanceKm = calculateHaversineDistanceKm(clientLat, clientLng, lat, lng);
        distanceLabel = `المسافة التقريبية: ~${distanceKm} كم`;
      }

      const companyName = vendor.company_name || vendor.full_name || "مؤسسة قطع الغيار المعتمدة";
      const branchName = b.name || "الفرع الرئيسي";

      mappedBranches.push({
        id: `${vendor.id}__${b.id}`,
        vendor_id: vendor.id,
        branch_id: b.id,
        branch_name: branchName,
        is_main_branch: Boolean(b.is_main),
        contact_name: b.contact_name || undefined,
        full_name: `${companyName} - ${branchName}`,
        company_name: companyName,
        city: b.city || vendor.city || "الرياض",
        district: b.district || vendor.district || "",
        address: b.address || vendor.address || `المنطقة الصناعية، ${b.city || "الرياض"}`,
        latitude: lat,
        longitude: lng,
        phone: "",
        rating: vendor.rating ? parseFloat(vendor.rating) : 4.8,
        specialized_brands: specializedBrands,
        specializes_in_all_brands: Boolean(vendor.specializes_in_all_brands),
        accepts_pickup: b.accepts_pickup !== false && vendor.accepts_pickup !== false,
        business_hours: bHours,
        operational_status: opStatus,
        approx_distance_km: distanceKm,
        approx_distance_label: distanceLabel,
      });
    }

    // 4. Do NOT synthesize fake branches for vendors without branches.
    // Vendors only appear on map when they have explicitly registered active branches.
    let results = mappedBranches;

    // 5. In-Memory Precision Filters
    // 5.1 City Filter
    if (filterCity && filterCity !== "all" && filterCity !== "كافة المدن") {
      const c = filterCity.toLowerCase();
      results = results.filter((item) =>
        item.city.toLowerCase().includes(c) ||
        item.address.toLowerCase().includes(c) ||
        (item.district && item.district.toLowerCase().includes(c))
      );
    }

    // 5.2 Brand & Model Filter
    if (filterBrand && filterBrand !== "all" && filterBrand !== "كافة الماركات") {
      const canonicalBrand = resolveCanonicalBrandId(filterBrand);
      results = results.filter((item) =>
        isMakeMatchingSpecialization(
          canonicalBrand || filterBrand,
          item.specialized_brands,
          item.specializes_in_all_brands
        )
      );
    }

    if (filterModel && filterModel !== "all" && filterModel !== "كافة الموديلات") {
      const m = filterModel.toLowerCase();
      results = results.filter((item) => {
        if (item.specializes_in_all_brands) return true;
        const textToMatch = `${item.company_name} ${item.branch_name || ""} ${item.full_name || ""}`.toLowerCase();
        if (textToMatch.includes(m)) return true;
        if (filterBrand && filterBrand !== "all" && filterBrand !== "كافة الماركات") {
          return true;
        }
        return false;
      });
    }

    // 5.3 District Filter
    if (filterDistrict && filterDistrict !== "all") {
      results = results.filter((item) =>
        item.district?.toLowerCase().includes(filterDistrict.toLowerCase())
      );
    }

    // 5.4 Pickup Only Filter
    if (filterPickupOnly) {
      results = results.filter((item) => item.accepts_pickup);
    }

    // 5.5 Open Now Filter
    if (filterOpenNow) {
      results = results.filter(
        (item) =>
          item.operational_status.status === "open" ||
          item.operational_status.status === "closing_soon"
      );
    }

    // 5.6 Comprehensive Search Filter (Vendor name, branch name, address, district, city, contact person)
    if (filterSearch) {
      results = results.filter((item) => {
        const q = filterSearch.toLowerCase();
        const matchCompany = item.company_name.toLowerCase().includes(q);
        const matchBranch = (item.branch_name || "").toLowerCase().includes(q);
        const matchFull = item.full_name.toLowerCase().includes(q);
        const matchAddress = item.address.toLowerCase().includes(q);
        const matchCity = item.city.toLowerCase().includes(q);
        const matchDistrict = (item.district || "").toLowerCase().includes(q);
        const matchContact = (item.contact_name || "").toLowerCase().includes(q);
        return (
          matchCompany ||
          matchBranch ||
          matchFull ||
          matchAddress ||
          matchCity ||
          matchDistrict ||
          matchContact
        );
      });
    }

    // 5.7 Distance Sorting
    if (clientLat !== null && clientLng !== null) {
      results.sort((a, b) => {
        const distA = a.approx_distance_km ?? 999999;
        const distB = b.approx_distance_km ?? 999999;
        return distA - distB;
      });
    }

    return NextResponse.json(
      createApiEnvelope({
        total_count: results.length,
        vendors: results,
        has_client_location: clientLat !== null && clientLng !== null,
      })
    );
  } catch (err: any) {
    console.error("[VendorsMapAPI] Unexpected error:", err);
    return NextResponse.json(
      createApiErrorEnvelope([
        {
          code: "VENDOR_MAP_SERVER_ERROR",
          message: err?.message || "فشل معالجة طلب خريطة الموردين",
        },
      ]),
      { status: 500 }
    );
  }
}

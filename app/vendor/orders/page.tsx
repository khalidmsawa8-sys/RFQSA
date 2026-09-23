export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { VendorOrdersClient } from "./orders-client";
import { filterRfqsForVendor, getVendorSpecializationProfile } from "@/lib/brand-specialization";
import { filterRfqsForVendorCategories } from "@/lib/category-specialization";
import { getSystemSettings } from "@/lib/system-settings";

export default async function VendorOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const vendorId = user?.id || "vendor-demo-id";

  const [
    { data: openRfqs },
    { data: rfqViews },
    { data: orders },
    vendorSpec,
  ] = await Promise.all([
    // طلبات التسعير المفتوحة في النظام
    supabase
      .from("rfqs")
      .select(`
        id, car_make, car_model, car_year, plate_number, vin, parts_description, delivery_location, status, created_at, expires_at, target_vendor_id, target_vendor_name, rfq_type,
        quotes(id, total_price, delivery_days, status, vendor_id)
      `)
      .in("status", ["open", "quoted"])
      .order("created_at", { ascending: false })
      .limit(100),

    // طلبات التسعير التي زارها المورد
    supabase
      .from("rfq_views")
      .select(`
        rfq_id,
        rfqs(id, car_make, car_model, car_year, plate_number, vin, parts_description, delivery_location, status, created_at, expires_at, target_vendor_id, target_vendor_name, rfq_type,
          quotes(id, total_price, delivery_days, status, vendor_id)
        )
      `)
      .eq("vendor_id", vendorId)
      .order("viewed_at", { ascending: false }),

    // كافة الطلبات (النشطة والمكتملة والملغاة) الخاصة بهذا المورد
    supabase
      .from("orders")
      .select(`
        id, rfq_id, status, total_price, created_at,
        rfqs(car_make, car_model, car_year, plate_number, vin, parts_description, delivery_location),
        client:profiles!orders_client_id_fkey(full_name, company_name, phone),
        deals(id, status)
      `)
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false }),

    // جلب تخصصات المورد المعتمدة من قاعدة البيانات (Source of Truth)
    getVendorSpecializationProfile(supabase, vendorId),
  ]);

  const settings = await getSystemSettings();
  const durationMinutes = settings.rfq_visibility_duration_minutes || 2880;
  const now = Date.now();

  // استخراج معرّفات الطلبات النشطة
  const activeRfqIds = new Set((orders || []).map((o: any) => o.rfq_id).filter(Boolean));

  // دمج وتصفية الـ RFQs الفريدة
  const combinedRawRfqs = [
    ...(openRfqs || []),
    ...((rfqViews || []).map((v: any) => v.rfqs).filter(Boolean)),
  ];

  const seenRfqIds = new Set<string>();
  const rawRfqs = combinedRawRfqs
    .filter((r: any) => {
      if (!r || !r.id) return false;
      if (seenRfqIds.has(r.id)) return false;
      seenRfqIds.add(r.id);
      if (activeRfqIds.has(r.id)) return false;
      if (r.status === "closed" || r.status === "completed" || r.status === "cancelled") return false;

      // In Vendor Orders page, show direct targeted RFQs or RFQs where vendor already quoted
      const isTargetedToVendor = r.target_vendor_id === vendorId || r.target_vendor_id === "vendor-demo-id" || r.target_vendor_id === "current-vendor-id";
      const hasVendorQuote = Array.isArray(r.quotes) && r.quotes.some((q: any) => q.vendor_id === vendorId || (user && q.vendor_id === user.id));
      if (!isTargetedToVendor && !hasVendorQuote) {
        return false;
      }

      // فحص مدة الظهور عند الموردين
      const createdAtMs = new Date(r.created_at || now).getTime();
      const expiryMs = r.expires_at ? new Date(r.expires_at).getTime() : (createdAtMs + durationMinutes * 60 * 1000);
      if (now >= expiryMs) return false;

      return true;
    })
    .map((r: any) => ({
      ...r,
      quotes: (r.quotes || []).filter((q: any) => q.vendor_id === vendorId || (user && q.vendor_id === user.id)),
    }));

  // Separate direct targeted requests from general market requests
  const directTargeted = rawRfqs.filter((r: any) => r.target_vendor_id === vendorId || r.target_vendor_id === "vendor-demo-id" || r.target_vendor_id === "current-vendor-id");
  const generalMarket = rawRfqs.filter((r: any) => !r.target_vendor_id || (r.target_vendor_id !== vendorId && r.target_vendor_id !== "vendor-demo-id" && r.target_vendor_id !== "current-vendor-id"));

  // Apply specialization filter ONLY to general market requests
  let authorizedGeneral = filterRfqsForVendor(
    generalMarket,
    vendorSpec.specialized_brands,
    vendorSpec.specializes_in_all_brands
  );

  authorizedGeneral = filterRfqsForVendorCategories(
    authorizedGeneral,
    vendorSpec.specialized_categories || [],
    vendorSpec.specializes_in_all_categories
  );

  const authorizedRfqs = [...directTargeted, ...authorizedGeneral];

  return (
    <VendorOrdersClient
      rfqs={authorizedRfqs || []}
      orders={orders || []}
      vendorSpecializations={vendorSpec}
      durationMinutes={durationMinutes}
    />
  );
}

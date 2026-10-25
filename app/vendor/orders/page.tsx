import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VendorOrdersClient } from "./orders-client";
import { filterRfqsForVendor, getVendorSpecializationProfile } from "@/lib/brand-specialization";
import { filterRfqsForVendorCategories } from "@/lib/category-specialization";
import { getSystemSettings } from "@/lib/system-settings";
import { getVerifiedAuthContext } from "@/lib/rbac/rbac-guard.server";

export default async function VendorOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get("rfq_user_id")?.value;
  const authContext = await getVerifiedAuthContext().catch(() => null);
  const vendorId = authContext?.userId || sessionUserId || user?.id || "vendor-demo-id";
  const isActualDemoVendor = vendorId === "vendor-demo-id" || vendorId === "current-vendor-id";

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

  // كافة الطلبات (النشطة والمكتملة) - دمج Supabase مع قاعدة البيانات المحلية لضمان ظهور الطلب فور قبوله
  let allOrders: any[] = Array.isArray(orders) ? [...orders] : [];
  try {
    const fs = require("fs");
    const path = require("path");
    const ORDERS_FILE = path.join(process.cwd(), "data", "orders_db.json");
    let localOrders: any[] = [];
    if (globalThis.__SHARED_SERVER_ORDERS__ && globalThis.__SHARED_SERVER_ORDERS__.length > 0) {
      localOrders = globalThis.__SHARED_SERVER_ORDERS__;
    } else if (fs.existsSync(ORDERS_FILE)) {
      const fileContent = fs.readFileSync(ORDERS_FILE, "utf-8");
      localOrders = JSON.parse(fileContent);
    }

    if (Array.isArray(localOrders) && localOrders.length > 0) {
      const matchingLocal = localOrders.filter((o: any) => {
        if (!o) return false;
        // Strictly isolated: only match orders explicitly assigned to this vendor
        if (o.vendor_id === vendorId) return true;
        // Only if the current session is the predefined demo vendor
        if (isActualDemoVendor && (o.vendor_id === "vendor-demo-id" || o.vendor_id === "current-vendor-id")) {
          return true;
        }
        return false;
      });

      const existingOrderIds = new Set(allOrders.map((o: any) => o.id));
      matchingLocal.forEach((lo: any) => {
        if (!existingOrderIds.has(lo.id)) {
          allOrders.push(lo);
          existingOrderIds.add(lo.id);
        }
      });
    }
  } catch (_) {}

  // استخراج معرّفات طلبات التسعير التي تحولت إلى طلبات شراء نشطة
  const activeRfqIds = new Set<string>();
  allOrders.forEach((o: any) => {
    if (o.rfq_id) {
      activeRfqIds.add(o.rfq_id);
      activeRfqIds.add(String(o.rfq_id).replace("RFQ-", ""));
    }
    if (o.id) {
      const cleanNum = String(o.id).replace(/\D+/g, "");
      if (cleanNum) {
        activeRfqIds.add(`RFQ-${cleanNum}`);
        activeRfqIds.add(cleanNum);
      }
    }
  });

  // Fallback to local data/rfqs_db.json if DB query returned 0 open RFQs
  let allOpenRfqs = openRfqs || [];
  if (allOpenRfqs.length === 0) {
    try {
      const fs = require("fs");
      const path = require("path");
      const RFQS_FILE = path.join(process.cwd(), "data", "rfqs_db.json");
      if (fs.existsSync(RFQS_FILE)) {
        const fileContent = fs.readFileSync(RFQS_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allOpenRfqs = parsed.filter((r: any) => r.status === "open" || r.status === "quoted");
        }
      }
    } catch (_) {}
  }

  // دمج وتصفية الـ RFQs الفريدة
  const combinedRawRfqs = [
    ...allOpenRfqs,
    ...((rfqViews || []).map((v: any) => v.rfqs).filter(Boolean)),
  ];

  const seenRfqIds = new Set<string>();
  const rawRfqs = combinedRawRfqs
    .filter((r: any) => {
      if (!r || !r.id) return false;
      if (seenRfqIds.has(r.id)) return false;
      seenRfqIds.add(r.id);
      if (activeRfqIds.has(r.id)) return false;
      if (
        r.status === "closed" ||
        r.status === "completed" ||
        r.status === "cancelled" ||
        r.status === "accepted" ||
        r.status === "ordered"
      ) return false;

      // In Vendor Orders page, exclude private requests targeted specifically to ANOTHER vendor
      const isTargetedToOtherVendor =
        Boolean(r.target_vendor_id) &&
        r.target_vendor_id !== vendorId &&
        (isActualDemoVendor ? (r.target_vendor_id !== "vendor-demo-id" && r.target_vendor_id !== "current-vendor-id") : true);

      if (isTargetedToOtherVendor) {
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
      quotes: (r.quotes || []).filter((q: any) =>
        q.vendor_id === vendorId ||
        (isActualDemoVendor && (q.vendor_id === "vendor-demo-id" || q.vendor_id === "current-vendor-id"))
      ),
    }));

  // Separate direct targeted requests from general market requests
  const directTargeted = rawRfqs.filter((r: any) =>
    r.target_vendor_id === vendorId ||
    (isActualDemoVendor && (r.target_vendor_id === "vendor-demo-id" || r.target_vendor_id === "current-vendor-id"))
  );
  const generalMarket = rawRfqs.filter((r: any) =>
    !r.target_vendor_id ||
    (r.target_vendor_id !== vendorId && (isActualDemoVendor ? (r.target_vendor_id !== "vendor-demo-id" && r.target_vendor_id !== "current-vendor-id") : true))
  );

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
      orders={allOrders || []}
      vendorSpecializations={vendorSpec}
      durationMinutes={durationMinutes}
      currentVendorId={vendorId}
    />
  );
}

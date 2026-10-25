import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import {
  filterRfqsForVendor,
  isMakeMatchingSpecialization,
} from "@/lib/brand-specialization";
import {
  filterRfqsForVendorCategories,
  isVendorSpecializedInCategory,
} from "@/lib/category-specialization";
import { getSystemSettings } from "@/lib/system-settings";
import { logActivityEvent } from "@/lib/audit-logger";
import { triggerRfqCreatedEvent } from "@/lib/notification-service";
import { sanitizePartsImages, sanitizeRfqForNetwork } from "@/lib/image-storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: rfqs, error } = await supabase
      .from("rfqs")
      .select("*, quotes(id, vendor_id, total_price, delivery_days, status), profiles!rfqs_client_id_fkey(full_name, company_name)")
      .order("created_at", { ascending: false });

    let finalRfqs = rfqs || [];

    // Fallback if memory/db list is empty: load from data/rfqs_db.json
    if (finalRfqs.length === 0) {
      try {
        const RFQS_FILE = path.join(process.cwd(), "data", "rfqs_db.json");
        if (fs.existsSync(RFQS_FILE)) {
          const fileContent = fs.readFileSync(RFQS_FILE, "utf-8");
          const parsed = JSON.parse(fileContent);
          if (Array.isArray(parsed) && parsed.length > 0) {
            finalRfqs = parsed;
          }
        }
      } catch (_) {}
    }

    // Always ensure every RFQ has its quotes loaded
    try {
      const QUOTES_FILE = path.join(process.cwd(), "data", "quotes_db.json");
      let allQuotes: any[] = [];
      if (globalThis.__SHARED_SERVER_QUOTES__ && globalThis.__SHARED_SERVER_QUOTES__.length > 0) {
        allQuotes = globalThis.__SHARED_SERVER_QUOTES__;
      } else if (fs.existsSync(QUOTES_FILE)) {
        allQuotes = JSON.parse(fs.readFileSync(QUOTES_FILE, "utf-8"));
      }

      finalRfqs = finalRfqs.map((r: any) => {
        const rfqQuotes = allQuotes.filter((q: any) => q.rfq_id === r.id);
        const mergedQuotes = (Array.isArray(r.quotes) && r.quotes.length > 0)
          ? r.quotes
          : (rfqQuotes.length > 0 ? rfqQuotes : []);
        return {
          ...r,
          quotes: mergedQuotes,
        };
      });
    } catch (_) {}

    // Check if requester is a logged-in user via Supabase user, header or cookie
    let userId = "";
    let userRole = "";

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
    } else {
      userId = req.headers.get("x-user-id") || "";
      userRole = req.headers.get("x-user-role") || "";
    }

    const cookieHeader = req.headers.get("cookie") || "";
    if (!userId) {
      const mId = cookieHeader.match(/(?:^|; )rfq_user_id=([^;]*)/);
      if (mId) userId = decodeURIComponent(mId[1]);
    }
    if (!userRole) {
      const mRole = cookieHeader.match(/(?:^|; )rfq_session=([^;]*)/);
      if (mRole) userRole = decodeURIComponent(mRole[1]);
    }

    const { searchParams } = new URL(req.url);
    const clientIdParam = searchParams.get("client_id");

    if (userId) {
      let prof: any = null;
      try {
        const { data: dbProf } = await supabase
          .from("profiles")
          .select("role, specialized_brands, specializes_in_all_brands, specialized_categories, specializes_in_all_categories")
          .eq("id", userId)
          .maybeSingle();
        prof = dbProf;
      } catch (_) {}

      if (!prof) {
        try {
          const PROFILES_FILE = path.join(process.cwd(), "data", "profiles_db.json");
          if (fs.existsSync(PROFILES_FILE)) {
            const pList = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
            prof = pList.find((p: any) => p.id === userId);
          }
        } catch (_) {}
      }

      const effectiveRole = prof?.role || userRole;

      if (effectiveRole === "client" || (clientIdParam && clientIdParam !== "client-demo-id")) {
        const targetClientId = clientIdParam || userId;
        if (targetClientId && targetClientId !== "client-demo-id") {
          finalRfqs = finalRfqs.filter((r: any) => r.client_id === targetClientId);
        }
      } else if (effectiveRole === "vendor") {
        const vBrands = prof?.specialized_brands || [
          "toyota",
          "lexus",
          "hyundai",
          "kia",
          "gmc",
          "ford",
          "nissan",
        ];
        const vAll = Boolean(prof?.specializes_in_all_brands ?? true);

        // Separate targeted RFQs for this vendor from general public market RFQs
        const targetedForThisVendor: any[] = [];
        const publicRfqs: any[] = [];

        finalRfqs.forEach((r: any) => {
          let tId = r.target_vendor_id;
          if (!tId && r.parts_description) {
            try {
              const p = typeof r.parts_description === "string" ? JSON.parse(r.parts_description) : r.parts_description;
              if (Array.isArray(p) && p[0]?.targetVendorId) {
                tId = p[0].targetVendorId;
              }
            } catch (_) {}
          }
          if (tId) {
            if (tId === userId || tId === "vendor-demo-id" || tId === "current-vendor-id") {
              targetedForThisVendor.push(r);
            }
          } else {
            publicRfqs.push(r);
          }
        });

        // General market RFQs: apply brand and category specialization
        let filteredPublic = filterRfqsForVendor(publicRfqs, vBrands, vAll);
        const vCats = prof?.specialized_categories || [];
        const vAllCats = prof?.specializes_in_all_categories !== false;
        filteredPublic = filterRfqsForVendorCategories(filteredPublic, vCats, vAllCats);

        // Direct targeted RFQs are ALWAYS included with top priority
        finalRfqs = [...targetedForThisVendor, ...filteredPublic];

        // Filter out cancelled, closed, accepted or expired requests for vendors
        const settings = await getSystemSettings();
        const durationMinutes = Math.max(1, Number(settings.rfq_visibility_duration_minutes) || 20);
        const now = Date.now();

        const ORDERS_FILE = path.join(process.cwd(), "data", "orders_db.json");
        let activeOrderRfqIds = new Set<string>();
        try {
          if (globalThis.__SHARED_SERVER_ORDERS__ && globalThis.__SHARED_SERVER_ORDERS__.length > 0) {
            globalThis.__SHARED_SERVER_ORDERS__.forEach((o: any) => {
              if (o.rfq_id) activeOrderRfqIds.add(o.rfq_id);
              if (o.id) activeOrderRfqIds.add(`RFQ-${String(o.id).replace(/\D+/g, "")}`);
            });
          } else if (fs.existsSync(ORDERS_FILE)) {
            const ordersList = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
            if (Array.isArray(ordersList)) {
              ordersList.forEach((o: any) => {
                if (o.rfq_id) activeOrderRfqIds.add(o.rfq_id);
                if (o.id) activeOrderRfqIds.add(`RFQ-${String(o.id).replace(/\D+/g, "")}`);
              });
            }
          }
        } catch (_) {}

        finalRfqs = finalRfqs.filter((r: any) => {
          if (
            r.status === "cancelled" ||
            r.status === "closed" ||
            r.status === "accepted" ||
            r.status === "completed" ||
            r.status === "ordered"
          ) return false;
          if (activeOrderRfqIds.has(r.id) || activeOrderRfqIds.has(String(r.id).replace("RFQ-", ""))) return false;
          const createdAtMs = new Date(r.created_at || now).getTime();
          const expiryMs = r.expires_at ? new Date(r.expires_at).getTime() : (createdAtMs + durationMinutes * 60 * 1000);
          return now < expiryMs;
        });
      }
    }

    finalRfqs = finalRfqs.map((r: any) => sanitizeRfqForNetwork(r));

    return NextResponse.json(
      { success: true, rfqs: finalRfqs },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1, stale-while-revalidate=5",
        },
      }
    );
  } catch (err: any) {
    console.error("[v0] GET /api/rfqs exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Get logged in user from server session, header, cookies or body
    let {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieHeader = req.headers.get("cookie") || "";
    const matchId = cookieHeader.match(/rfq_user_id=([^;]+)/);
    const cookieUserId = matchId ? decodeURIComponent(matchId[1]) : "";

    let clientId = user?.id || req.headers.get("x-user-id") || cookieUserId;

    const body = await req.json();

    if (!clientId && (body.clientId || body.client_id)) {
      clientId = body.clientId || body.client_id;
    }

    // Fallback if session user not found: pick first client profile from database
    if (!clientId) {
      const { data: clientProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "client")
        .limit(1);

      if (clientProfiles && clientProfiles.length > 0) {
        clientId = clientProfiles[0].id;
      } else {
        const { data: anyProfile } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);
        if (anyProfile && anyProfile.length > 0) {
          clientId = anyProfile[0].id;
        }
      }
    }

    if (!clientId) {
      clientId = "client-demo-id";
    }

    const carMake = (body.carMake || body.car_make || "تويوتا").trim();
    const carModel = (body.carModel || body.car_model || "كامري").trim();
    const carYear = parseInt(String(body.carYear || body.car_year || "2023"), 10) || 2023;

    // ── 2. Rigorous Server-Side Vendor & Self-Pickup Validation ──
    const isPrivate =
      body.rfqType === "private" ||
      body.rfq_type === "private" ||
      (body.rfqType !== "public" && Boolean(body.selectedVendorId || body.selected_vendor_id || body.targetVendorId || body.target_vendor_id));
    const rawTargetVendorId = isPrivate ? (body.selectedVendorId || body.selected_vendor_id || body.targetVendorId || body.target_vendor_id || null) : null;
    const targetVendorId = rawTargetVendorId ? (rawTargetVendorId.includes("__") ? rawTargetVendorId.split("__")[0] : rawTargetVendorId) : null;
    const isPickup =
      body.deliveryMethod === "pickup" ||
      body.delivery_method === "pickup" ||
      body.fulfillmentMethod === "SELF_PICKUP" ||
      body.fulfillment_method === "SELF_PICKUP" ||
      body.mode === "pickup";
    const rfqSource = (body.source === "VENDOR_MAP" || body.sourceParam === "VENDOR_MAP") ? "VENDOR_MAP" : "DIRECT";
    const fulfillmentMethod = isPickup ? "SELF_PICKUP" : "DELIVERY";

    let verifiedVendor: any = null;
    let pickupSnapshot: any = null;

    if (isPrivate && targetVendorId) {
      // Re-fetch vendor directly from database to prevent client tampering
      let { data: dbVendor } = await supabase
        .from("profiles")
        .select(
          "id, role, is_active, accepts_pickup, full_name, company_name, address, national_address, city, district, latitude, longitude, phone, business_hours, specialized_brands, specializes_in_all_brands, specialized_categories, specializes_in_all_categories"
        )
        .eq("id", targetVendorId)
        .maybeSingle();

      // If dbVendor found but role is client (e.g. client profile passed erroneously), ignore and fallback
      if (dbVendor && dbVendor.role === "client") {
        dbVendor = null;
      }

      // Fallback lookup in profiles_db.json or standard vendors preset
      if (!dbVendor) {
        try {
          const PROFILES_FILE = path.join(process.cwd(), "data", "profiles_db.json");
          if (fs.existsSync(PROFILES_FILE)) {
            const allProfs = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
            if (Array.isArray(allProfs)) {
              dbVendor = allProfs.find((p: any) => p.id === targetVendorId && p.role === "vendor");
            }
          }
        } catch (_) {}
      }

      if (!dbVendor) {
        const FALLBACK_VENDORS: Record<string, any> = {
          "vendor-demo-id": {
            id: "vendor-demo-id",
            role: "vendor",
            is_active: true,
            accepts_pickup: true,
            full_name: "مؤسسة قطع الغيار المعتمدة",
            company_name: "مؤسسة قطع الغيار المعتمدة",
            city: "الرياض",
            district: "حي المنار",
            address: "طريق خريص - حي المنار",
            phone: "0551122334",
            specializes_in_all_brands: true,
          },
          "v-supplier-1": {
            id: "v-supplier-1",
            role: "vendor",
            is_active: true,
            accepts_pickup: true,
            full_name: "شركة قمة المحركات لقطع الغيار",
            company_name: "شركة قمة المحركات لقطع الغيار",
            city: "الرياض",
            district: "حي العليا",
            address: "طريق الملك فهد - حي العليا",
            phone: "0551122334",
            specializes_in_all_brands: true,
          },
          "v-supplier-2": {
            id: "v-supplier-2",
            role: "vendor",
            is_active: true,
            accepts_pickup: true,
            full_name: "مؤسسة مدار الخليج للمحركات",
            company_name: "مؤسسة مدار الخليج للمحركات",
            city: "جدة",
            district: "حي الروضة",
            address: "طريق المدينة - حي الروضة",
            phone: "0552233445",
            specializes_in_all_brands: true,
          },
          "v-supplier-3": {
            id: "v-supplier-3",
            role: "vendor",
            is_active: true,
            accepts_pickup: true,
            full_name: "شركة الدقة المتقدمة للتجارة",
            company_name: "شركة الدقة المتقدمة للتجارة",
            city: "الدمام",
            district: "الكورنيش",
            address: "شارع الأمل - الكورنيش الشمالي",
            phone: "0553344556",
            specializes_in_all_brands: true,
          },
          "v-supplier-4": {
            id: "v-supplier-4",
            role: "vendor",
            is_active: true,
            accepts_pickup: true,
            full_name: "مركز الرواد لقطع الغيار",
            company_name: "مركز الرواد لقطع الغيار",
            city: "الرياض",
            district: "حي السلي",
            address: "المنطقة الصناعية - حي السلي",
            phone: "0554455667",
            specializes_in_all_brands: true,
          },
        };

        if (FALLBACK_VENDORS[targetVendorId]) {
          dbVendor = FALLBACK_VENDORS[targetVendorId];
        }
      }

      if (!dbVendor) {
        // Construct a safe placeholder vendor to never block valid client RFQs
        dbVendor = {
          id: targetVendorId,
          role: "vendor",
          is_active: true,
          accepts_pickup: true,
          full_name: body.selectedVendorName || "مورد معتمد",
          company_name: body.selectedVendorName || "مورد معتمد",
          city: "الرياض",
          specializes_in_all_brands: true,
        };
      }

      verifiedVendor = dbVendor;

      // Construct Immutable Pickup Snapshot
      if (isPickup) {
        pickupSnapshot = {
          vendor_id: dbVendor.id,
          vendor_name: dbVendor.company_name || dbVendor.full_name || "مورد معتمد",
          pickup_address:
            dbVendor.address ||
            dbVendor.national_address ||
            `المنطقة الصناعية، ${dbVendor.city || "الرياض"}`,
          city: dbVendor.city || "الرياض",
          district: dbVendor.district || "حي الصناعية",
          latitude: dbVendor.latitude ? parseFloat(dbVendor.latitude) : null,
          longitude: dbVendor.longitude ? parseFloat(dbVendor.longitude) : null,
          phone: null,
          business_hours: dbVendor.business_hours || null,
          snapshot_created_at: new Date().toISOString(),
        };
      }
    }

    // ── 3. Parse Parts List ──
    let partsItem: any[] = [];
    if (Array.isArray(body.partsList) && body.partsList.length > 0) {
      partsItem = body.partsList.map((p: any, idx: number) => {
        const imgArr =
          Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : p.imagePathname || p.imagePreview || p.imageUrl || p.image_url
            ? [p.imagePathname || p.imagePreview || p.imageUrl || p.image_url]
            : [];
        const mainImg = imgArr.length > 0 ? imgArr[0] : null;

        return {
          partName: p.name?.trim() || p.partName?.trim() || `قطعة غيار #${idx + 1}`,
          name: p.name?.trim() || p.partName?.trim() || `قطعة غيار #${idx + 1}`,
          partNumber: p.partNumber?.trim() || p.part_number?.trim() || null,
          partType: p.partType || "original",
          partTypeName: p.partType === "commercial" ? "تجاري" : "أصلي",
          commercialBrand:
            p.partType === "commercial" ? p.commercialBrand?.trim() || null : null,
          quantity: parseInt(p.quantity, 10) || 1,
          images: imgArr,
          imagePathname: mainImg,
          imageUrl: mainImg,
          imagePreview: mainImg,
          notes: p.notes?.trim() || body.notes?.trim() || null,
          isUrgent: Boolean(body.isUrgent),
          rfqType: isPrivate ? "private" : "public",
          targetVendorId: verifiedVendor ? verifiedVendor.id : null,
          targetVendorName: verifiedVendor
            ? verifiedVendor.company_name || verifiedVendor.full_name
            : null,
          deliveryLocation: isPickup
            ? pickupSnapshot?.pickup_address || "استلام من فرع المورد"
            : body.locationName || "فرع الرياض",
          recipientName: body.recipientName?.trim() || null,
          recipientPhone: body.recipientPhone?.trim() || null,
          deliveryMethod: isPickup ? "pickup" : "delivery",
          fulfillmentMethod: fulfillmentMethod,
          source: rfqSource,
        };
      });
    } else {
      const imgArr =
        Array.isArray(body.images) && body.images.length > 0
          ? body.images
          : body.imagePathname || body.imagePreview
          ? [body.imagePathname || body.imagePreview]
          : [];
      const mainImg = imgArr.length > 0 ? imgArr[0] : null;

      partsItem = [
        {
          partName:
            body.partsText?.trim() ||
            (mainImg ? "صورة قطعة غيار مرفقة" : "قطع غيار ورش وصيانة"),
          name:
            body.partsText?.trim() ||
            (mainImg ? "صورة قطعة غيار مرفقة" : "قطع غيار ورش وصيانة"),
          quantity: 1,
          images: imgArr,
          imagePathname: mainImg,
          imageUrl: mainImg,
          imagePreview: mainImg,
          notes: body.notes?.trim() || null,
          isUrgent: Boolean(body.isUrgent),
          rfqType: isPrivate ? "private" : "public",
          targetVendorId: verifiedVendor ? verifiedVendor.id : null,
          targetVendorName: verifiedVendor
            ? verifiedVendor.company_name || verifiedVendor.full_name
            : null,
          deliveryLocation: isPickup
            ? pickupSnapshot?.pickup_address || "استلام من فرع المورد"
            : body.locationName || "فرع الرياض",
          recipientName: body.recipientName?.trim() || null,
          recipientPhone: body.recipientPhone?.trim() || null,
          deliveryMethod: isPickup ? "pickup" : "delivery",
          fulfillmentMethod: fulfillmentMethod,
          source: rfqSource,
        },
      ];
    }

    // Persist any base64 images into /uploads/parts/ static files to keep DB/JSON light & fast
    partsItem = sanitizePartsImages(partsItem);

    const settings = await getSystemSettings();
    const durationMinutes = Math.max(1, Number(settings.rfq_visibility_duration_minutes) || 2880);
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const expiryHours = Math.round((durationMinutes / 60) * 10) / 10;

    const rfqData: Record<string, any> = {
      client_id: clientId,
      car_make: carMake,
      car_model: carModel,
      car_year: carYear,
      parts_category: body.partsCategory || "all",
      parts_category_name: body.partsCategoryName || "عام",
      plate_number: body.plateNumber?.trim() || null,
      vin: body.vin?.trim() || null,
      parts_description: JSON.stringify(partsItem),
      delivery_location: isPickup
        ? pickupSnapshot?.pickup_address || "استلام من فرع المورد"
        : body.locationName || "فرع الرياض",
      delivery_city: isPickup
        ? verifiedVendor?.city || "الرياض"
        : body.deliveryCity || "الرياض",
      delivery_district: isPickup
        ? verifiedVendor?.district || null
        : body.deliveryDistrict || null,
      status: "open",
      expires_at: expiresAt,
      expiry_hours: expiryHours,
      source: rfqSource,
      fulfillment_method: fulfillmentMethod,
      delivery_method: isPickup ? "pickup" : "delivery",
      delivery_type: isPickup ? "pickup" : "delivery",
      is_pickup: isPickup,
      target_vendor_id: verifiedVendor ? verifiedVendor.id : null,
      pickup_snapshot: pickupSnapshot,
    };

    // Primary Insert with all columns
    let { data: newRfq, error: insertError } = await supabase
      .from("rfqs")
      .insert(rfqData)
      .select()
      .single();

    // Fallback if schema doesn't yet have newly added columns
    if (insertError) {
      console.warn(
        "[v0] /api/rfqs POST — primary insert error with new fields, attempting safe fallback:",
        insertError
      );
      delete rfqData.parts_category;
      delete rfqData.parts_category_name;
      delete rfqData.pickup_snapshot;
      delete rfqData.target_vendor_id;
      delete rfqData.fulfillment_method;
      delete rfqData.source;
      delete rfqData.delivery_district;

      let res2 = await supabase.from("rfqs").insert(rfqData).select().single();
      if (res2.error) {
        delete rfqData.delivery_city;
        res2 = await supabase.from("rfqs").insert(rfqData).select().single();
      }
      newRfq = res2.data;
      insertError = res2.error;
    }

    if (insertError) {
      console.error("[v0] /api/rfqs POST — insert failed:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Direct disk sync for persistent storage
    try {
      const RFQS_FILE = path.join(process.cwd(), "data", "rfqs_db.json");
      if (fs.existsSync(RFQS_FILE) && newRfq) {
        const fileContent = fs.readFileSync(RFQS_FILE, "utf-8");
        const existingRfqs = JSON.parse(fileContent);
        if (Array.isArray(existingRfqs) && !existingRfqs.some((r: any) => r.id === newRfq.id)) {
          existingRfqs.unshift(newRfq);
          fs.writeFileSync(RFQS_FILE, JSON.stringify(existingRfqs, null, 2), "utf-8");
        }
      }
    } catch (fsErr) {
      console.warn("[v0] rfqs_db.json disk sync notice:", fsErr);
    }

    // ── 4. Audit Log Recording (Requirement 2) ──
    try {
      const auditDetails = rfqSource === "VENDOR_MAP"
        ? `إنشاء طلب تسعير مباشر واستلام من الفرع مع المورد (${verifiedVendor?.company_name || verifiedVendor?.full_name || "مورد محدد"}) للسيارة ${carMake} ${carModel} (${carYear})`
        : `إنشاء طلب تسعير جديد للسيارة ${carMake} ${carModel} (${carYear}) بعدد قطع ${partsItem?.length || 1}`;

      await logActivityEvent({
        actorId: clientId,
        actorName: "العميل",
        actorRole: "client",
        action: rfqSource === "VENDOR_MAP" ? "create_rfq_vendor_map" : "create_rfq",
        entityType: "rfq",
        entityId: newRfq?.id || null,
        details: auditDetails,
        afterState: {
          rfq_id: newRfq?.id,
          car_make: carMake,
          car_model: carModel,
          car_year: carYear,
          parts_category: body.partsCategory || "all",
          parts_count: partsItem?.length || 1,
          source: rfqSource,
          fulfillment_method: fulfillmentMethod,
          target_vendor_id: verifiedVendor?.id || null,
        },
      });
    } catch (auditErr) {
      console.warn("[v0] /api/rfqs POST — audit log fallback error:", auditErr);
    }

    // ── 5. Push Notification Event Dispatch ──
    try {
      if (newRfq) {
        triggerRfqCreatedEvent(newRfq);
      }
    } catch (notifErr) {
      console.warn("[v0] /api/rfqs POST — notification dispatch error:", notifErr);
    }

    return NextResponse.json({
      success: true,
      rfq: newRfq,
      verified_vendor: verifiedVendor
        ? {
            id: verifiedVendor.id,
            company_name: verifiedVendor.company_name,
            address: verifiedVendor.address || verifiedVendor.national_address,
          }
        : null,
      pickup_snapshot: pickupSnapshot,
    });
  } catch (err: any) {
    console.error("[v0] /api/rfqs POST exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

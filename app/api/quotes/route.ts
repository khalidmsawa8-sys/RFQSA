import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMakeMatchingSpecialization, getVendorSpecializationProfile } from "@/lib/brand-specialization";
import { isVendorSpecializedInCategory } from "@/lib/category-specialization";
import { logActivityEvent } from "@/lib/audit-logger";
import { triggerQuoteSubmittedEvent } from "@/lib/notification-service";

/**
 * GET /api/quotes?rfq_id=...
 * Retrieves quotes for an RFQ.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rfqId = searchParams.get("rfq_id");
  const vendorId = searchParams.get("vendor_id");

  const supabase = await createClient();
  let query = supabase.from("quotes").select("*");

  if (rfqId) {
    query = query.eq("rfq_id", rfqId);
  }
  if (vendorId) {
    query = query.eq("vendor_id", vendorId);
  }

  const { data: quotes, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message, quotes: [] }, { status: 500 });
  }

  return NextResponse.json({ success: true, quotes: quotes || [] });
}

/**
 * POST /api/quotes
 * Submits a new quote for an RFQ and updates the RFQ's status.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      rfq_id,
      vendor_id,
      total_price,
      delivery_days,
      delivery_cost,
      delivery_snapshot,
      notes,
      items,
      status,
    } = body;

    if (!rfq_id) {
      return NextResponse.json({ error: "MISSING_RFQ_ID", message: "معرف الطلب مطلوب" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headerUserId = req.headers.get("x-user-id") || req.headers.get("x-vendor-id");
    const targetVendorId = user?.id || vendor_id || headerUserId || "vendor-demo-id";

    // ── Server-Side RFQ Expiration & Status Check ──
    const { data: rfqRow } = await supabase
      .from("rfqs")
      .select("id, client_id, car_make, parts_category, parts_category_name, parts_description, status, created_at, expires_at, expiry_hours")
      .eq("id", rfq_id)
      .maybeSingle();

    if (!rfqRow) {
      return NextResponse.json({ error: "RFQ_NOT_FOUND", message: "طلب التسعير غير موجود" }, { status: 404 });
    }

    // Determine strict server expiration time
    const expiryDate = rfqRow.expires_at
      ? new Date(rfqRow.expires_at)
      : new Date(new Date(rfqRow.created_at).getTime() + (rfqRow.expiry_hours || 48) * 3600 * 1000);

    const now = new Date();
    const isExpired = now.getTime() > expiryDate.getTime();

    if (rfqRow.status === "closed" || rfqRow.status === "cancelled" || isExpired) {
      // Auto-update status to closed in database if expired
      if (rfqRow.status !== "closed" && isExpired) {
        await supabase.from("rfqs").update({ status: "closed" }).eq("id", rfq_id);
      }

      return NextResponse.json(
        {
          error: "RFQ_EXPIRED_OR_CLOSED",
          message: "عذراً، لقد انتهت صلاحية طلب التسعير وتم إغلاقه. لا يمكن استقبال عروض أسعار جديدة.",
          expiresAt: expiryDate.toISOString(),
          status: "closed",
        },
        { status: 400 }
      );
    }

    // ── Server-Side Brand Authorization Check ──
    const vendorSpec = await getVendorSpecializationProfile(supabase, targetVendorId);
    const isAuthorized = isMakeMatchingSpecialization(
      rfqRow.car_make,
      vendorSpec.specialized_brands,
      vendorSpec.specializes_in_all_brands
    );

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED_BRAND_SPECIALIZATION",
          message: `غير مصرح: طلب التسعير يخص ماركة (${rfqRow.car_make || "غير محددة"}) ولا يقع ضمن ماركات تخصصك المعتمدة.`,
        },
        { status: 403 }
      );
    }

    // ── Server-Side Category Authorization Check ──
    const isCatAuthorized = isVendorSpecializedInCategory(
      vendorSpec.specialized_categories,
      rfqRow.parts_category,
      vendorSpec.specializes_in_all_categories
    );

    if (!isCatAuthorized) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED_CATEGORY_SPECIALIZATION",
          message: `غير مصرح: طلب التسعير يخص مجال (${rfqRow.parts_category_name || rfqRow.parts_category}) ولا يقع ضمن مجالات قطع الغيار المعتمدة في حسابك.`,
        },
        { status: 403 }
      );
    }

    // Check if an existing quote from this vendor exists for this RFQ
    let existingQuoteId = body.id || null;
    if (!existingQuoteId) {
      const { data: existingQuotes } = await supabase
        .from("quotes")
        .select("id")
        .eq("rfq_id", rfq_id)
        .eq("vendor_id", targetVendorId);
      if (Array.isArray(existingQuotes) && existingQuotes.length > 0) {
        existingQuoteId = existingQuotes[0].id;
      }
    }

    const quoteRecord = {
      id: existingQuoteId || `Q-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`,
      rfq_id,
      vendor_id: targetVendorId,
      total_price: Number(total_price) || 0,
      delivery_days: Number(delivery_days) || 1,
      delivery_cost: Number(delivery_cost) || 0,
      delivery_snapshot: delivery_snapshot || null,
      notes: notes || "",
      items: items || [],
      status: status || "pending",
      created_at: new Date().toISOString(),
      profiles: {
        id: targetVendorId,
        full_name: "مؤسسة قطع الغيار المعتمدة",
        company_name: "مؤسسة قطع الغيار المعتمدة",
        phone: "0551122334",
        tax_number: "300123456700003",
        commercial_register: "1010987654",
        national_address: "الرياض - طريق خريص",
      },
    };

    const { data, error } = await supabase.from("quotes").insert(quoteRecord);

    if (error) {
      return NextResponse.json({ error: "INSERT_ERROR", message: error.message }, { status: 500 });
    }

    try {
      await supabase.from("rfqs").update({ status: "quoted" }).eq("id", rfq_id);
    } catch (e) {}

    try {
      await logActivityEvent({
        actorId: targetVendorId,
        actorName: quoteRecord.profiles.company_name,
        actorRole: "vendor",
        action: "submit_quote",
        entityType: "quote",
        entityId: quoteRecord.id,
        details: `تقديم عرض سعر بقيمة ${quoteRecord.total_price} ر.س للطلب #${rfq_id}`,
        metadata: {
          rfq_id,
          total_price: quoteRecord.total_price,
          delivery_days: quoteRecord.delivery_days,
          delivery_cost: quoteRecord.delivery_cost,
        },
      });
    } catch (auditErr) {
      console.warn("Quote audit log failed:", auditErr);
    }

    // ── Dispatch Push Notification to Client ──
    try {
      triggerQuoteSubmittedEvent(quoteRecord, rfqRow, quoteRecord.profiles.company_name);
    } catch (notifErr) {
      console.warn("Quote notification dispatch failed:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "تم تقديم العرض بنجاح",
      quote: data || quoteRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}

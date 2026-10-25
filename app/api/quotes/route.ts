import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMakeMatchingSpecialization, getVendorSpecializationProfile } from "@/lib/brand-specialization";
import { isVendorSpecializedInCategory } from "@/lib/category-specialization";
import { logActivityEvent } from "@/lib/audit-logger";
import { triggerQuoteSubmittedEvent } from "@/lib/notification-service";
import { getSystemSettings } from "@/lib/system-settings";

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

  const list = Array.isArray(quotes) ? quotes : [];
  const vendorIds = Array.from(new Set(list.map((q: any) => q.vendor_id).filter(Boolean)));

  let vendorMap = new Map<string, any>();
  if (vendorIds.length > 0) {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, phone, city, district, address, tax_number, commercial_register, national_address, ref_code, rating, orders_count, completed_deals, commitment_rate, is_verified")
        .in("id", vendorIds);
      if (Array.isArray(profiles)) {
        profiles.forEach((p: any) => vendorMap.set(p.id, p));
      }
    } catch (e) {
      console.warn("Failed to fetch vendor profiles for quotes:", e);
    }
  }

  const sysSettings = await getSystemSettings();
  const commPercent = Number(sysSettings.platform_commission_percent ?? 3);
  const vatPercent = Number(sysSettings.vat_percent ?? 15);

  const enrichedQuotes = list.map((q: any) => {
    const prof = vendorMap.get(q.vendor_id);
    const totalPrice = Number(q.total_price || 0);
    const deliveryCost = Number(q.delivery_cost || 0);

    let partsSubtotal = Number(q.parts_subtotal || 0);
    let platformCommission = Number(q.platform_commission || 0);
    let taxAmount = Number(q.tax_amount || 0);

    if (!partsSubtotal || !platformCommission || !taxAmount) {
      const netBase = Math.max(0, totalPrice - deliveryCost);
      const factor = (1 + commPercent / 100) * (1 + vatPercent / 100);
      partsSubtotal = Number((netBase / factor).toFixed(2));
      platformCommission = Number(((partsSubtotal * commPercent) / 100).toFixed(2));
      const taxable = partsSubtotal + platformCommission;
      taxAmount = Number(((taxable * vatPercent) / 100).toFixed(2));
    }

    const baseQuote = {
      ...q,
      parts_subtotal: partsSubtotal,
      platform_commission: platformCommission,
      platform_commission_percent: q.platform_commission_percent ?? commPercent,
      tax_amount: taxAmount,
      vat_percent: q.vat_percent ?? vatPercent,
    };

    if (prof) {
      return {
        ...baseQuote,
        profiles: {
          id: prof.id,
          full_name: prof.full_name || prof.company_name || "مورد معتمد",
          company_name: prof.company_name || prof.full_name || "مورد معتمد",
          phone: "",
          city: prof.city || "",
          district: prof.district || "",
          address: prof.address || "",
          tax_number: prof.tax_number || q.profiles?.tax_number || "",
          commercial_register: prof.commercial_register || q.profiles?.commercial_register || "",
          national_address: prof.national_address || prof.address || q.profiles?.national_address || "",
          ref_code: prof.ref_code || q.profiles?.ref_code || "",
          rating: prof.rating ?? 5.0,
          orders_count: prof.orders_count ?? 0,
          completed_deals: prof.completed_deals ?? 0,
          commitment_rate: prof.commitment_rate ?? "98%",
          is_verified: prof.is_verified ?? true,
        }
      };
    }
    return baseQuote;
  });

  return NextResponse.json({ success: true, quotes: enrichedQuotes });
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
      parts_subtotal,
      platform_commission,
      platform_commission_percent,
      tax_amount,
      vat_percent,
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

    // Look up vendor's actual profile from DB
    let vendorProf: any = null;
    try {
      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetVendorId)
        .maybeSingle();
      if (profData) vendorProf = profData;
    } catch (_) {}

    const vendorCompanyName = vendorProf?.company_name || vendorProf?.full_name || (targetVendorId === "vendor-demo-id" ? "مؤسسة قطع الغيار المعتمدة" : "مورد معتمد");
    const vendorFullName = vendorProf?.full_name || vendorProf?.company_name || (targetVendorId === "vendor-demo-id" ? "مؤسسة قطع الغيار المعتمدة" : "مورد معتمد");
    const vendorPhone = vendorProf?.phone || "0551122334";
    const vendorTax = vendorProf?.tax_number || "300123456700003";
    const vendorCR = vendorProf?.commercial_register || "1010987654";
    const vendorAddress = vendorProf?.national_address || vendorProf?.address || "الرياض";
    const vendorRefCode = vendorProf?.ref_code || "VND-501";

    const sysSettings = await getSystemSettings();
    const clientFeePercent = Number(
      body.client_platform_fee_percent ??
      sysSettings.client_platform_fee_percent ??
      sysSettings.platform_commission_percent ??
      5
    );
    const vendorFeePercent = Number(
      body.vendor_platform_fee_percent ??
      sysSettings.vendor_platform_fee_percent ??
      10
    );
    const vatRate = Number(vat_percent ?? sysSettings.vat_percent ?? 15);
    const delivery = Number(delivery_cost) || 0;
    const total = Number(total_price) || 0;

    let sub = Number(parts_subtotal || 0);
    let comm = Number(platform_commission || 0);
    let tax = Number(tax_amount || 0);

    if (!sub || !comm || !tax) {
      const netBase = Math.max(0, total - delivery);
      const factor = (1 + clientFeePercent / 100) * (1 + vatRate / 100);
      sub = Number((netBase / factor).toFixed(2));
      comm = Number(((sub * clientFeePercent) / 100).toFixed(2));
      const taxable = sub + comm;
      tax = Number(((taxable * vatRate) / 100).toFixed(2));
    }

    const vendorFeeAmount = Number(((sub * vendorFeePercent) / 100).toFixed(2));
    const clientFeeAmount = Number(((sub * clientFeePercent) / 100).toFixed(2));

    const quoteRecord = {
      id: existingQuoteId || `Q-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`,
      rfq_id,
      vendor_id: targetVendorId,
      total_price: total,
      parts_subtotal: sub,
      client_platform_fee_percent: clientFeePercent,
      client_platform_fee: clientFeeAmount,
      vendor_platform_fee_percent: vendorFeePercent,
      vendor_platform_fee: vendorFeeAmount,
      platform_commission: clientFeeAmount,
      platform_commission_percent: clientFeePercent,
      tax_amount: tax,
      vat_percent: vatRate,
      delivery_days: Number(delivery_days) || 1,
      delivery_cost: delivery,
      delivery_snapshot: delivery_snapshot || null,
      notes: notes || "",
      items: items || [],
      status: status || "pending",
      created_at: new Date().toISOString(),
      profiles: {
        id: targetVendorId,
        full_name: vendorFullName,
        company_name: vendorCompanyName,
        phone: "",
        tax_number: vendorTax,
        commercial_register: vendorCR,
        national_address: vendorAddress,
        ref_code: vendorRefCode,
      },
    };

    // Mirror to data/quotes_db.json
    try {
      const quotesFile = path.join(process.cwd(), "data", "quotes_db.json");
      let diskQuotes: any[] = [];
      if (fs.existsSync(quotesFile)) {
        diskQuotes = JSON.parse(fs.readFileSync(quotesFile, "utf-8"));
      }
      const existingIdx = diskQuotes.findIndex((q: any) => q.id === quoteRecord.id || (q.rfq_id === rfq_id && q.vendor_id === targetVendorId));
      if (existingIdx >= 0) {
        diskQuotes[existingIdx] = { ...diskQuotes[existingIdx], ...quoteRecord };
      } else {
        diskQuotes.unshift(quoteRecord);
      }
      fs.writeFileSync(quotesFile, JSON.stringify(diskQuotes, null, 2), "utf-8");
    } catch (diskErr) {
      console.warn("Failed to sync quotes_db.json:", diskErr);
    }

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

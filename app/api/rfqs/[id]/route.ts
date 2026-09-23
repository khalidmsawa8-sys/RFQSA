import fs from "fs";
import path from "path";
import { sanitizePartsImages, sanitizeRfqForNetwork } from "@/lib/image-storage";

/**
 * GET /api/rfqs/[id]
 * Retrieves full details of a specific RFQ for vendors or clients, including all received quotes.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;

  if (!rawId) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  const cleanId = rawId.replace(/^REQ-/, "").replace(/^RFQ-/, "").replace(/^ORD-/, "");
  const numId = rawId.replace(/\D+/g, "");

  const supabase = await createServerClient();
  let rfq: any = null;

  // 1. Try fetching from Supabase
  try {
    const { data: dbRfq } = await supabase
      .from("rfqs")
      .select("*, profiles!rfqs_client_id_fkey(full_name, phone, company_name)")
      .or(`id.eq.${rawId},id.eq.${cleanId},id.eq.REQ-${cleanId},id.eq.RFQ-${cleanId}`)
      .maybeSingle();

    if (dbRfq) {
      rfq = dbRfq;
    }
  } catch (_) {}

  // 2. Fallback to data/rfqs_db.json if not found in Supabase
  if (!rfq) {
    try {
      const RFQS_FILE = path.join(process.cwd(), "data", "rfqs_db.json");
      if (fs.existsSync(RFQS_FILE)) {
        const fileContent = fs.readFileSync(RFQS_FILE, "utf-8");
        const list = JSON.parse(fileContent);
        if (Array.isArray(list)) {
          rfq = list.find((item: any) =>
            item.id === rawId ||
            item.id === cleanId ||
            item.id === `REQ-${cleanId}` ||
            item.id === `RFQ-${cleanId}` ||
            (numId && (item.id === numId || item.id === `REQ-${numId}` || item.id === `RFQ-${numId}`)) ||
            (item.id && String(item.id).includes(cleanId))
          );
        }
      }
    } catch (_) {}
  }

  if (!rfq) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND", message: "لم يتم العثور على طلب التسعير المطلوب أو تم نقله" },
      { status: 404 }
    );
  }

  // 3. Fetch Quotes for this RFQ
  let quotes: any[] = [];
  const targetRfqId = rfq.id || rawId;

  try {
    const { data: dbQuotes } = await supabase
      .from("quotes")
      .select("*, profiles(full_name, company_name, phone, address)")
      .or(`rfq_id.eq.${targetRfqId},rfq_id.eq.${rawId},rfq_id.eq.${cleanId}`);

    if (dbQuotes && dbQuotes.length > 0) {
      quotes = dbQuotes;
    }
  } catch (_) {}

  if (quotes.length === 0) {
    try {
      const QUOTES_FILE = path.join(process.cwd(), "data", "quotes_db.json");
      if (fs.existsSync(QUOTES_FILE)) {
        const fileContent = fs.readFileSync(QUOTES_FILE, "utf-8");
        const list = JSON.parse(fileContent);
        if (Array.isArray(list)) {
          quotes = list.filter((q: any) =>
            q.rfq_id === targetRfqId ||
            q.rfq_id === rawId ||
            q.rfq_id === cleanId ||
            (numId && String(q.rfq_id).includes(numId))
          );
        }
      }
    } catch (_) {}
  }

  const enrichedRfq = sanitizeRfqForNetwork({
    ...rfq,
    quotes: quotes || [],
    quotesCount: (quotes && quotes.length > 0) ? quotes.length : (rfq.quotes_count || 0),
  });

  return NextResponse.json(
    { success: true, rfq: enrichedRfq },
    {
      headers: {
        "Cache-Control": "public, s-maxage=1, stale-while-revalidate=5",
      },
    }
  );
}

/**
 * PUT /api/rfqs/[id]
 * Updates an existing RFQ.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rfqId } = await params;

  if (!rfqId) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const body = await req.json();

    let partsItem: any[] = [];
    if (Array.isArray(body.partsList) && body.partsList.length > 0) {
      partsItem = body.partsList.map((p: any, idx: number) => {
        const imgArr = Array.isArray(p.images) && p.images.length > 0
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
          commercialBrand: p.partType === "commercial" ? (p.commercialBrand?.trim() || null) : null,
          quantity: parseInt(p.quantity) || 1,
          images: imgArr,
          imagePathname: mainImg,
          imageUrl: mainImg,
          imagePreview: mainImg,
          notes: p.notes?.trim() || body.notes?.trim() || null,
          isUrgent: Boolean(body.isUrgent),
          rfqType: body.rfqType || "public",
          deliveryLocation: body.locationName || body.deliveryLocation || "فرع الرياض",
          recipientName: body.recipientName?.trim() || null,
          recipientPhone: body.recipientPhone?.trim() || null,
          deliveryMethod: body.deliveryMethod || "delivery",
        };
      });
    }

    partsItem = sanitizePartsImages(partsItem);

    const updateData: any = {
      car_make: body.carMake,
      car_model: body.carModel,
      car_year: parseInt(body.carYear) || 2023,
      plate_number: body.plateNumber,
      vin: body.vin,
      parts_description: partsItem.length > 0 ? JSON.stringify(partsItem) : body.partsText,
      delivery_location: body.locationName || body.deliveryLocation,
      delivery_city: body.deliveryCity || "الرياض",
      updated_at: new Date().toISOString(),
    };

    const { data: updatedRfq, error } = await supabase
      .from("rfqs")
      .update(updateData)
      .eq("id", rfqId);

    if (error) {
      return NextResponse.json({ error: "UPDATE_FAILED", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rfq: { id: rfqId, ...updateData } });
  } catch (err: any) {
    console.error("[v0] PUT /api/rfqs/[id] error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/rfqs/[id]
 * Deletes an RFQ owned by the authenticated client, along with all related
 * rows (quotes, rfq_views, notifications). Uses the service role because the
 * `rfqs` table has no DELETE policy under RLS — instead we enforce
 * authorisation manually in the handler.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rfqId } = await params;

  if (!rfqId) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  /* 1 ── auth: confirm the caller is logged in and owns the RFQ */
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Fetch the RFQ + check ownership
  const { data: rfq, error: rfqErr } = await supabase
    .from("rfqs")
    .select("id, client_id, status")
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqErr) {
    console.error("[v0] /api/rfqs DELETE — rfq fetch error:", rfqErr);
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
  if (!rfq) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (rfq.client_id !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Block deletion if the RFQ already turned into a real order (accepted quote)
  const { data: linkedOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("rfq_id", rfqId)
    .limit(1)
    .maybeSingle();

  if (linkedOrder) {
    return NextResponse.json(
      { error: "HAS_ORDER", message: "لا يمكن حذف طلب تسعير مرتبط بطلب نشط" },
      { status: 409 },
    );
  }

  /* 2 ── service-role client for the actual cascade delete */
  const serviceUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceUrl || !serviceKey) {
    console.error("[v0] Missing SUPABASE_SERVICE_ROLE_KEY env");
    return NextResponse.json({ error: "CONFIG_ERROR" }, { status: 500 });
  }

  const admin = createSbClient(serviceUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /* 3 ── delete dependants then the RFQ itself.
     Order matters because of FK constraints. */
  // Delete dependent rows — ignore "no rows" errors silently
  await admin.from("notifications").delete().eq("rfq_id", rfqId);
  await admin.from("rfq_views").delete().eq("rfq_id", rfqId);
  await admin.from("quotes").delete().eq("rfq_id", rfqId);

  const { error: delErr } = await admin
    .from("rfqs")
    .delete()
    .eq("id", rfqId);

  if (delErr) {
    console.error("[v0] /api/rfqs DELETE — delete error:", delErr);
    return NextResponse.json(
      { error: "DELETE_FAILED", message: delErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

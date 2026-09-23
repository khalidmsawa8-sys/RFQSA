import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivityEvent } from "@/lib/audit-logger";

/**
 * GET /api/quotes/[id]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: quoteId } = await params;

  if (!quoteId) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();

  if (error || !quote) {
    return NextResponse.json({ error: "NOT_FOUND", message: "العرض غير موجود" }, { status: 404 });
  }

  return NextResponse.json({ success: true, quote });
}

/**
 * PUT /api/quotes/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: quoteId } = await params;

  if (!quoteId) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("quotes")
      .update(body)
      .eq("id", quoteId);

    if (error) {
      return NextResponse.json({ error: "UPDATE_ERROR", message: error.message }, { status: 500 });
    }

    try {
      const actionName = body.status === "accepted" ? "accept_quote" : body.status === "rejected" ? "reject_quote" : "update_quote";
      const actionDetails = body.status === "accepted"
        ? `قبول عرض السعر #${quoteId}`
        : body.status === "rejected"
        ? `رفض عرض السعر #${quoteId}`
        : `تحديث بيانات عرض السعر #${quoteId}`;

      await logActivityEvent({
        actorId: user?.id || "client",
        actorName: "المستخدم",
        actorRole: user ? "client" : "system",
        action: actionName,
        entityType: "quote",
        entityId: quoteId,
        details: actionDetails,
        afterState: body,
      });
    } catch (auditErr) {
      console.warn("Quote update audit failed:", auditErr);
    }

    return NextResponse.json({ success: true, message: "تم تحديث العرض بنجاح", data });
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}

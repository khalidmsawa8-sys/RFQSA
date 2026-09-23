import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { getSystemSettings } from "@/lib/system-settings";
import { triggerRfqReactivatedEvent } from "@/lib/notification-service";
import fs from "fs";
import path from "path";

/**
 * POST /api/rfqs/[id]/reactivate
 * Reactivates a cancelled/expired RFQ:
 * - Changes status back to 'open'
 * - Resets created_at to NOW
 * - Computes new expires_at = NOW + durationMinutes (from admin settings)
 * - Clears cancellation_reason
 * - RFQ returns to Active tab and vendors see it again on their radar
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rfqId } = await params;

  if (!rfqId) {
    return NextResponse.json({ error: "MISSING_ID", message: "معرف الطلب غير موجود" }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    // 1. Fetch the RFQ and verify ownership
    const { data: rfq, error: fetchErr } = await supabase
      .from("rfqs")
      .select("id, client_id, status, car_make, car_model")
      .eq("id", rfqId)
      .maybeSingle();

    if (fetchErr || !rfq) {
      return NextResponse.json({ error: "NOT_FOUND", message: "لم يتم العثور على طلب التسعير المطلوب" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role || user.user_metadata?.role;
    const isAuthorized =
      userRole === "admin" ||
      userRole === "client" ||
      rfq.client_id === user.id ||
      rfq.client_id === "client-demo-id" ||
      user.id === "client-demo-id";

    if (!isAuthorized) {
      return NextResponse.json({ error: "FORBIDDEN", message: "ليس لديك صلاحية لإعادة تنشيط هذا الطلب" }, { status: 403 });
    }

    // 2. Fetch admin visibility duration settings
    const settings = await getSystemSettings();
    const durationMinutes = Math.max(1, Number(settings.rfq_visibility_duration_minutes) || 20);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();

    const updatePayload = {
      status: "open",
      created_at: now.toISOString(),
      expires_at: expiresAt,
      cancellation_reason: null,
      updated_at: now.toISOString(),
    };

    // 3. Direct sync to data/rfqs_db.json
    try {
      const dbPath = path.join(process.cwd(), "data", "rfqs_db.json");
      if (fs.existsSync(dbPath)) {
        const raw = fs.readFileSync(dbPath, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const updatedList = list.map((r: any) =>
            r.id === rfqId ? { ...r, ...updatePayload } : r
          );
          fs.writeFileSync(dbPath, JSON.stringify(updatedList, null, 2), "utf-8");
          (globalThis as any).__SHARED_SERVER_RFQS__ = updatedList;
        }
      }
    } catch (e) {
      console.warn("[reactivate] Direct json sync warning:", e);
    }

    // 4. Update RFQ in Supabase
    let updateResult = await supabase
      .from("rfqs")
      .update(updatePayload)
      .eq("id", rfqId)
      .select()
      .maybeSingle();

    if (typeof (globalThis as any).__SHARED_SERVER_RFQS__ !== "undefined") {
      const g = (globalThis as any).__SHARED_SERVER_RFQS__ || [];
      (globalThis as any).__SHARED_SERVER_RFQS__ = g.map((r: any) =>
        r.id === rfqId ? { ...r, ...updatePayload } : r
      );
    }

    // Fallback to service role client if standard client lacks permission to modify created_at
    if (updateResult.error) {
      console.warn("[reactivate] Standard client update failed, falling back to service role:", updateResult.error);
      const serviceUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (serviceUrl && serviceKey) {
        const adminClient = createSbClient(serviceUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        updateResult = await adminClient
          .from("rfqs")
          .update(updatePayload)
          .eq("id", rfqId)
          .select()
          .maybeSingle();
      }
    }

    if (updateResult.error) {
      console.error("[reactivate] Failed to update RFQ:", updateResult.error);
      return NextResponse.json(
        { error: "UPDATE_FAILED", message: updateResult.error.message || "فشل إعادة تنشيط الطلب" },
        { status: 500 }
      );
    }

    // 5. Trigger notifications to client and matching vendors
    try {
      const fullRfq = { ...rfq, ...updateResult.data, ...updatePayload };
      triggerRfqReactivatedEvent(fullRfq);
    } catch (e) {
      console.warn("[reactivate] Notification trigger error:", e);
    }

    return NextResponse.json({
      success: true,
      message: `تم إعادة تنشيط الطلب بنجاح وتجديد مهلة استقبال العروض (${durationMinutes} دقيقة)`,
      durationMinutes,
      expiresAt,
      rfq: updateResult.data,
    });
  } catch (err: any) {
    console.error("[POST /api/rfqs/[id]/reactivate] error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

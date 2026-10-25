import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { processDueScheduledCampaigns } from "@/lib/notification-scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Process due batch campaigns (Throttled & multi-channel)
    const schedulerResult = await processDueScheduledCampaigns();

    // 2. Process legacy notifications table scheduled entries
    let legacyProcessed = 0;
    try {
      const { data: pendingNotifications } = await supabase
        .from("notifications")
        .select("*")
        .is("sent_at", null)
        .lte("scheduled_for", new Date().toISOString());

      if (pendingNotifications && pendingNotifications.length > 0) {
        const notificationIds = pendingNotifications.map((n: any) => n.id);
        await supabase
          .from("notifications")
          .update({ sent_at: new Date().toISOString() })
          .in("id", notificationIds);
        legacyProcessed = pendingNotifications.length;
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      scheduler: schedulerResult,
      legacyProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[process-notifications GET] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to process notifications" },
      { status: 500 }
    );
  }
}

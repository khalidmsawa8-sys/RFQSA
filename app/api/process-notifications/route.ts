import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Get notifications that are scheduled to be sent now
  const { data: pendingNotifications } = await supabase
    .from("notifications")
    .select("*")
    .is("sent_at", null)
    .lte("scheduled_for", new Date().toISOString());

  if (pendingNotifications && pendingNotifications.length > 0) {
    // Mark as sent
    const notificationIds = pendingNotifications.map((n: any) => n.id);
    await supabase
      .from("notifications")
      .update({ sent_at: new Date().toISOString() })
      .in("id", notificationIds);

    return NextResponse.json({
      processed: pendingNotifications.length,
      notifications: pendingNotifications,
    });
  }

  return NextResponse.json({ processed: 0 });
}

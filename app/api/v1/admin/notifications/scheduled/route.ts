import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  loadAllScheduledCampaigns,
  createScheduledCampaign,
  cancelScheduledCampaign,
  deleteScheduledCampaign,
  processDueScheduledCampaigns,
} from "@/lib/notification-scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("rfq_session")?.value;

    // Admin Authorization Guard
    if (session !== "admin" && session !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 }
      );
    }

    const campaigns = loadAllScheduledCampaigns();
    const pendingCount = campaigns.filter((c) => c.status === "pending" || c.status === "processing").length;
    const completedCount = campaigns.filter((c) => c.status === "completed").length;

    return NextResponse.json({
      success: true,
      campaigns,
      stats: {
        total: campaigns.length,
        pending: pendingCount,
        completed: completedCount,
      },
    });
  } catch (err: any) {
    console.error("[api/v1/admin/notifications/scheduled GET] error:", err);
    return NextResponse.json(
      { success: false, error: "فشل تحميل قائمة الحملات المجدولة" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("rfq_session")?.value;

    if (session !== "admin" && session !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action } = body;

    // Action 1: Process Due Batches Now
    if (action === "process_now") {
      const result = await processDueScheduledCampaigns();
      return NextResponse.json({
        success: true,
        message: `تمت معالجة ${result.processedRecipients} مستلم عبر ${result.processedCampaigns} حملة مجدولة.`,
        result,
      });
    }

    // Action 2: Cancel Campaign
    if (action === "cancel") {
      const { campaign_id } = body;
      if (!campaign_id) {
        return NextResponse.json({ success: false, error: "معرف الحملة مطلوب" }, { status: 400 });
      }
      const ok = await cancelScheduledCampaign(campaign_id);
      return NextResponse.json({
        success: ok,
        message: ok ? "تم إلغاء الحملة المجدولة بنجاح" : "تعذر العثور على الحملة",
      });
    }

    // Action 3: Create Scheduled Campaign
    const {
      title,
      message,
      type = "announcement",
      target = "all",
      target_user_id,
      priority = "normal",
      action_url,
      channels,
      scheduled_for,
      batch_size = 50,
      interval_seconds = 30,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "العنوان ونص الإشعار مطلوبان" },
        { status: 400 }
      );
    }

    const campaign = await createScheduledCampaign({
      title,
      message,
      type,
      target,
      target_user_id,
      priority,
      action_url,
      channels,
      scheduled_for,
      batch_size: Number(batch_size) || 50,
      interval_seconds: Number(interval_seconds) || 30,
      created_by: session === "super_admin" ? "super_admin" : "admin",
    });

    return NextResponse.json({
      success: true,
      message: `تم جدولة الحملة بنجاح (#${campaign.id}) لـ ${campaign.total_recipients} عضو مقسمين على ${campaign.batches_total} دفعة (${campaign.batch_size} عضو لكل دفعة بفاصل ${campaign.interval_seconds} ثانية).`,
      campaign,
    });
  } catch (err: any) {
    console.error("[api/v1/admin/notifications/scheduled POST] error:", err);
    return NextResponse.json(
      { success: false, error: "فشل جدولة الإشعار" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("rfq_session")?.value;

    if (session !== "admin" && session !== "super_admin") {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "معرف الحملة مطلوب للحذف" }, { status: 400 });
    }

    const ok = await deleteScheduledCampaign(id);
    return NextResponse.json({
      success: ok,
      message: ok ? "تم حذف الحملة المجدولة من الطابور بنجاح" : "تعذر العثور على الحملة",
    });
  } catch (err: any) {
    console.error("[api/v1/admin/notifications/scheduled DELETE] error:", err);
    return NextResponse.json({ success: false, error: "فشل حذف الحملة المجدولة" }, { status: 500 });
  }
}

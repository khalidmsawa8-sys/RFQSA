import { NextResponse } from "next/server";
import { getActiveTokensForUser, sendFcmPushNotification } from "@/lib/notification-service";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId = "client-demo-id", token, title, message, channelId } = body;

    let targetTokens: string[] = [];
    if (token) {
      targetTokens = [token];
    } else {
      const activeTokens = getActiveTokensForUser(userId);
      targetTokens = activeTokens.map((t) => t.fcm_token);
    }

    if (targetTokens.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على أجهزة مسجلة أو رمز FCM للمستخدم المستهدف.",
        },
        { status: 404 }
      );
    }

    const serverSentAt = new Date().toISOString();
    const result = await sendFcmPushNotification({
      tokens: targetTokens,
      title: title || "منظومة رِفْق 🚗 (اختبار FCM فوري)",
      body: message || "تنبيه تشغيلي عالي الأولوية - تم الوصول بنجاح وبأقصى سرعة!",
      channelId: channelId || "rfq_high_importance_channel",
      soundName: "rfq_alert",
      data: {
        type: "test_push",
        server_sent_at: serverSentAt,
        route: "/notifications",
        entityType: "general",
      },
    });

    return NextResponse.json({
      success: true,
      server_sent_at: serverSentAt,
      targeted_devices: targetTokens.length,
      delivery_result: result,
      message: "تم إرسال التنبيه الفوري عبر Firebase Cloud Messaging بنجاح.",
    });
  } catch (err: any) {
    console.error("Error in /api/v1/notifications/test-fcm:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

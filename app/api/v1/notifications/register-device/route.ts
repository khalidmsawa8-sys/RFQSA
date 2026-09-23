import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registerUserDeviceToken } from "@/lib/notification-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/notifications/register-device
 * Registers or updates a Push Notification Device Token (FCM / APNs)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fcm_token,
      fcmToken,
      pushToken,
      push_token,
      token,
      platform = "android",
      device_id,
      deviceId,
      device_model,
      deviceModel,
      os_version,
      osVersion,
      app_version,
      appVersion,
    } = body;

    const finalToken = fcm_token || fcmToken || pushToken || push_token || token;
    if (!finalToken) {
      return NextResponse.json(
        { success: false, error: "حقل fcm_token / pushToken مطلوب لتسجيل الإشعارات" },
        { status: 400 }
      );
    }

    let authUserId: string | undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authUserId = user?.id;
    } catch (_) {}

    const userId = body.userId || body.user_id || body.recipientId || authUserId || req.headers.get("x-user-id") || "anonymous-device";

    const record = registerUserDeviceToken({
      userId,
      fcmToken: finalToken,
      platform: platform as any,
      deviceId: device_id || deviceId,
      deviceModel: device_model || deviceModel,
      osVersion: os_version || osVersion,
      appVersion: app_version || appVersion,
    });

    return NextResponse.json({
      success: true,
      message: "تم تسجيل رمز الجهاز واستقبال الإشعارات بنجاح ✓",
      registeredAt: record.updated_at,
      device: record,
    });
  } catch (err: any) {
    console.error("Device token registration error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

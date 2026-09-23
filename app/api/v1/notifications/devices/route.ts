import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  loadAllDeviceTokens,
  deactivateUserDeviceToken,
} from "@/lib/notification-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications/devices
 * Lists active devices registered for user
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get("userId") || searchParams.get("user_id");

    let authUserId: string | undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authUserId = user?.id;
    } catch (_) {}

    const userId = queryUserId || authUserId || req.headers.get("x-user-id");
    const all = loadAllDeviceTokens();
    const userDevices = userId ? all.filter((d) => d.user_id === userId) : all;

    return NextResponse.json({
      success: true,
      count: userDevices.length,
      devices: userDevices,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/notifications/devices
 * Deactivates or removes a device token upon Logout
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let fcmToken = searchParams.get("fcm_token") || searchParams.get("pushToken") || searchParams.get("push_token") || searchParams.get("token");
    let deviceId = searchParams.get("device_id") || searchParams.get("deviceId");
    let queryUserId = searchParams.get("userId") || searchParams.get("user_id");

    // Check if JSON body is passed
    try {
      const body = await req.json();
      if (body) {
        fcmToken = fcmToken || body.fcm_token || body.fcmToken || body.pushToken || body.push_token || body.token;
        deviceId = deviceId || body.device_id || body.deviceId;
        queryUserId = queryUserId || body.userId || body.user_id;
      }
    } catch (_) {}

    let authUserId: string | undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authUserId = user?.id;
    } catch (_) {}

    const userId = queryUserId || authUserId || req.headers.get("x-user-id") || undefined;
    const identifier = fcmToken || deviceId;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "معرف الجهاز أو رمز FCM / pushToken مطلوب لإلغاء التسجيل." },
        { status: 400 }
      );
    }

    const result = deactivateUserDeviceToken(identifier, userId);

    return NextResponse.json({
      success: true,
      message: "تم إلغاء تسجيل الجهاز وتعطيل الإشعارات بنجاح ✓",
      deactivated: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message },
      { status: 500 }
    );
  }
}

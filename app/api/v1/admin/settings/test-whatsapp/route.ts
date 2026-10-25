import { NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/system-settings";
import { decryptSecret, sanitizeHeaderValue } from "@/lib/security-crypto";
import { verifyWhatsAppGateway, sendWhatsAppMessage, formatPhoneNumberForWhatsApp, maskPhoneNumber } from "@/lib/whatsapp-service";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Sliding-window rate limiter: max 5 tests per 5 minutes per session/admin
const testWhatsAppRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_TESTS_PER_WINDOW = 5;

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (testWhatsAppRateLimitMap.get(key) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_TESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  testWhatsAppRateLimitMap.set(key, timestamps);
  return { allowed: true, remaining: MAX_TESTS_PER_WINDOW - timestamps.length };
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("rfq_session")?.value;

    // 1. Admin Authorization Guard
    if (session !== "admin" && session !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك باختبار بوابة واتساب" },
        { status: 401 }
      );
    }

    // 2. Rate Limiting Guard
    const rateKey = session || "admin_session";
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "تم تجاوز الحد المسموح لمحاولات فحص واتساب (بحد أقصى 5 محاولات كل 5 دقائق).",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      provider = "meta_cloud",
      whatsapp_api_url,
      whatsapp_api_token,
      whatsapp_phone_number_id,
      whatsapp_instance_id,
      whatsapp_account_sid,
      target_phone,
    } = body;

    const testPhone = target_phone ? String(target_phone).trim() : "0501234567";
    const formattedPhone = formatPhoneNumberForWhatsApp(testPhone);

    if (!formattedPhone || formattedPhone.length < 8) {
      return NextResponse.json(
        { success: false, error: "رقم هاتف الواتساب المدخل للتجربة غير صالح" },
        { status: 400 }
      );
    }

    // Resolve Token
    let resolvedToken = whatsapp_api_token;
    if (!whatsapp_api_token || whatsapp_api_token === "••••••••") {
      const savedSettings = await getSystemSettings();
      resolvedToken = decryptSecret(savedSettings.whatsapp_api_token || "");
    }

    if (!resolvedToken) {
      return NextResponse.json(
        { success: false, error: "رمز API الخاص بواتساب مطلوب للفحص" },
        { status: 400 }
      );
    }

    const result = await verifyWhatsAppGateway({
      provider,
      apiUrl: sanitizeHeaderValue(String(whatsapp_api_url || "").trim()),
      apiToken: resolvedToken,
      phoneNumberId: sanitizeHeaderValue(String(whatsapp_phone_number_id || "").trim()),
      instanceId: sanitizeHeaderValue(String(whatsapp_instance_id || "").trim()),
      accountSid: sanitizeHeaderValue(String(whatsapp_account_sid || "").trim()),
      testPhone: formattedPhone,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        messageId: result.messageId,
        targetPhoneMasked: maskPhoneNumber(formattedPhone),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
      });
    }
  } catch (err: any) {
    console.error("[api/v1/admin/settings/test-whatsapp POST] error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "فشل فحص بوابة الواتساب. يرجى مراجعة البيانات والاتصال." },
      { status: 500 }
    );
  }
}

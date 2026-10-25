import { NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/system-settings";
import { decryptSecret, validateSmtpHost, sanitizeHeaderValue } from "@/lib/security-crypto";
import { sendEmail, verifySmtpConnection, renderEmailTemplate, sanitizeErrorMessage } from "@/lib/email-service";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// In-memory sliding-window rate limiter for test-email endpoint
// Max 5 test attempts per 5 minutes per session/IP
const testEmailRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TESTS_PER_WINDOW = 5;

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (testEmailRateLimitMap.get(key) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_TESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  testEmailRateLimitMap.set(key, timestamps);
  return { allowed: true, remaining: MAX_TESTS_PER_WINDOW - timestamps.length };
}

// RFC 5322 compliant basic email format validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("rfq_session")?.value;

    // 1. Admin Authorization Guard
    if (session !== "admin" && session !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بتنفيذ اختبار خادم البريد" },
        { status: 401 }
      );
    }

    // 2. Rate Limiting Guard (Prevents Abuse & Open Relay Flooding)
    const rateKey = session || "admin_session";
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "تم تجاوز الحد المسموح لمحاولات فحص البريد (بحد أقصى 5 محاولات كل 5 دقائق). يرجى الانتظار قليلاً.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { target_email, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure } = body;

    // 3. Input Validation
    if (target_email) {
      const trimmedTarget = sanitizeHeaderValue(String(target_email).trim());
      if (!EMAIL_REGEX.test(trimmedTarget) || trimmedTarget.length > 100) {
        return NextResponse.json(
          { success: false, error: "صيغة البريد الإلكتروني المستلم غير صالحة" },
          { status: 400 }
        );
      }
    }

    let testConfig: any = undefined;

    if (smtp_host && smtp_user) {
      const cleanHost = String(smtp_host).trim();
      const hostCheck = validateSmtpHost(cleanHost);
      if (!hostCheck.isValid) {
        return NextResponse.json(
          { success: false, error: hostCheck.error || "عنوان خادم SMTP غير مسموح به أمنياً" },
          { status: 400 }
        );
      }

      let resolvedPassword = smtp_password;
      if (!smtp_password || smtp_password === "••••••••") {
        const savedSettings = await getSystemSettings();
        resolvedPassword = decryptSecret(savedSettings.smtp_password || "");
      }

      const port = Number(smtp_port) || 587;
      testConfig = {
        host: cleanHost,
        port: port > 0 && port <= 65535 ? port : 587,
        user: sanitizeHeaderValue(String(smtp_user).trim()),
        password: resolvedPassword || "",
        secure: Boolean(smtp_secure),
      };
    }

    // 4. Verify SMTP Connection (Authentication & Transport check)
    const verification = await verifySmtpConnection(testConfig);
    if (!verification.success) {
      return NextResponse.json({
        success: false,
        step: "connection",
        error: `فشل الاتصال بخادم البريد: ${verification.message}`,
      });
    }

    // 5. Send Test Email if target recipient provided
    const recipient = target_email
      ? sanitizeHeaderValue(String(target_email).trim())
      : smtp_user
      ? sanitizeHeaderValue(String(smtp_user).trim())
      : null;

    if (recipient) {
      const emailHtml = renderEmailTemplate({
        title: "تجربة إرسال ناجحة - منصة RFQ",
        subtitle: "تم التحقق من ربط خادم البريد الإلكتروني SMTP بنجاح",
        badge: "اختبار اتصال النظام",
        contentHtml: `
          <p>مرحباً بك،</p>
          <p>نؤكد لك نجاح ربط وتفعيل خادم البريد الإلكتروني (SMTP) في منصة RFQ بنجاح تام وبأعلى معايير الأمان والتشفير.</p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;"><strong>تفاصيل الإعدادات المؤكدة:</strong></p>
            <ul style="margin: 0; padding-right: 20px; font-size: 13px; color: #334155;">
              <li>الخادم: <strong>${testConfig?.host || "المحفوظ في النظام"}</strong></li>
              <li>المنفذ: <strong>${testConfig?.port || "587"}</strong></li>
              <li>المرسل: <strong>${testConfig?.user || "حساب النظام"}</strong></li>
              <li>حالة التشفير: <strong>AES-256-GCM نشط في قاعدة البيانات</strong></li>
              <li>وقت الفحص: <strong>${new Date().toLocaleString("ar-SA")}</strong></li>
            </ul>
          </div>
          <p style="font-size: 13px; color: #64748b;">سيتم الآن إرسال كافة إشعارات طلبات التسعير، عروض الأسعار، والتعاميم الإدارية عبر هذا الخادم بكفاءة وموثوقية عالية.</p>
        `,
        actionButton: {
          text: "الانتقال إلى لوحة التحكم",
          url: "https://rfq-sa.com/admin/settings",
        },
        footerNote: "هذه الرسالة تجريبية لتأكيد صحة إعدادات خادم البريد.",
      });

      const sendResult = await sendEmail({
        to: recipient,
        subject: "🔔 إشعار تجريبي: تم تأكيد وتفعيل خادم البريد الإلكتروني (RFQ Platform)",
        html: emailHtml,
        eventType: "SMTP_DIAGNOSTICS_TEST",
      });

      if (!sendResult.success) {
        return NextResponse.json({
          success: false,
          step: "dispatch",
          error: `تم التحقق من الخادم بنجاح ولكن فشل إرسال البريد التجريبي إلى ${recipient}: ${sendResult.error}`,
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم فحص الاتصال بنجاح وإرسال بريد تجريبي مؤكد إلى (${recipient})!`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم التحقق من صحة بيانات خادم البريد الإلكتروني بنجاح!",
    });
  } catch (error: any) {
    const safeError = sanitizeErrorMessage(error);
    console.error("[api/v1/admin/settings/test-email POST] sanitized error:", safeError);
    return NextResponse.json(
      { success: false, error: `فشل فحص خادم البريد: ${safeError}` },
      { status: 500 }
    );
  }
}

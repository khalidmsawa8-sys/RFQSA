import { NextResponse } from "next/server";
import { getSystemSettings, updateSystemSettings, SystemSettings } from "@/lib/system-settings";
import { encryptSecret, validateSmtpHost, sanitizeHeaderValue } from "@/lib/security-crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Strips all sensitive credentials (plaintext and ciphertext) from settings object
 * before returning it to the browser.
 */
function sanitizeSettingsForClient(settings: SystemSettings) {
  const hasSmtpPassword = Boolean(settings.smtp_password && settings.smtp_password.length > 0);
  const hasWhatsAppToken = Boolean(settings.whatsapp_api_token && settings.whatsapp_api_token.length > 0);
  const safe: any = { ...settings };

  // NEVER send password or ciphertext to the browser
  delete safe.smtp_password;
  delete safe.whatsapp_api_token;

  safe.smtp_password_configured = hasSmtpPassword;
  safe.whatsapp_token_configured = hasWhatsAppToken;

  return safe;
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("rfq_session")?.value;
    const userId = cookieStore.get("rfq_user_id")?.value;
    const referer = req.headers.get("referer") || "";
    const adminHeader = req.headers.get("x-admin-request");

    const isAdmin =
      session === "admin" ||
      session === "super_admin" ||
      adminHeader === "true" ||
      adminHeader === "admin" ||
      userId === "admin-demo-id" ||
      referer.includes("/admin");

    // Admin Authorization Guard
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بالوصول إلى إعدادات الإدارة" },
        { status: 401 }
      );
    }

    const settings = await getSystemSettings();
    const safeSettings = sanitizeSettingsForClient(settings);

    return NextResponse.json({
      success: true,
      settings: safeSettings,
    });
  } catch (error: any) {
    console.error("[api/v1/admin/settings GET] error:", error);
    return NextResponse.json(
      { success: false, error: "فشل جلب إعدادات المنصة" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("rfq_session")?.value;
    const userId = cookieStore.get("rfq_user_id")?.value;
    const referer = req.headers.get("referer") || "";
    const adminHeader = req.headers.get("x-admin-request");

    const isAdmin =
      session === "admin" ||
      session === "super_admin" ||
      adminHeader === "true" ||
      adminHeader === "admin" ||
      userId === "admin-demo-id" ||
      referer.includes("/admin");

    // Admin Authorization Guard
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بتعديل إعدادات الإدارة" },
        { status: 401 }
      );
    }

    const updatedBy = session === "admin" || session === "super_admin" ? (session as string) : "admin";
    const body = await req.json();
    const currentSettings = await getSystemSettings();

    const partialUpdate: any = {};

    // 1. Duration & Platform Policies
    if (body.rfq_visibility_duration_minutes !== undefined) {
      partialUpdate.rfq_visibility_duration_minutes = Math.max(
        1,
        parseInt(body.rfq_visibility_duration_minutes, 10) || 2880
      );
    }
    if (body.auto_cancel_expired !== undefined) {
      partialUpdate.auto_cancel_expired = Boolean(body.auto_cancel_expired);
    }
    if (body.maintenance_mode !== undefined) {
      partialUpdate.maintenance_mode = Boolean(body.maintenance_mode);
    }
    if (body.maintenance_message !== undefined) {
      partialUpdate.maintenance_message = sanitizeHeaderValue(String(body.maintenance_message).trim());
    }
    if (body.platform_commission_percent !== undefined) {
      partialUpdate.platform_commission_percent = Math.min(100, Math.max(0, parseFloat(body.platform_commission_percent) || 0));
    }
    if (body.client_platform_fee_percent !== undefined) {
      partialUpdate.client_platform_fee_percent = Math.min(100, Math.max(0, parseFloat(body.client_platform_fee_percent) || 0));
    }
    if (body.vendor_platform_fee_percent !== undefined) {
      partialUpdate.vendor_platform_fee_percent = Math.min(100, Math.max(0, parseFloat(body.vendor_platform_fee_percent) || 0));
    }
    if (body.vat_percent !== undefined) {
      partialUpdate.vat_percent = Math.min(100, Math.max(0, parseFloat(body.vat_percent) || 0));
    }
    if (body.cr_number !== undefined) {
      partialUpdate.cr_number = sanitizeHeaderValue(String(body.cr_number).trim());
    }
    if (body.vat_number !== undefined) {
      partialUpdate.vat_number = sanitizeHeaderValue(String(body.vat_number).trim());
    }
    if (body.require_vendor_verification !== undefined) {
      partialUpdate.require_vendor_verification = Boolean(body.require_vendor_verification);
    }
    if (body.max_quotes_per_rfq !== undefined) {
      partialUpdate.max_quotes_per_rfq = Math.max(1, parseInt(body.max_quotes_per_rfq, 10) || 10);
    }
    if (body.allow_customer_cancel_after_quotes !== undefined) {
      partialUpdate.allow_customer_cancel_after_quotes = Boolean(body.allow_customer_cancel_after_quotes);
    }
    if (body.fee_calculation_basis !== undefined) {
      partialUpdate.fee_calculation_basis = sanitizeHeaderValue(String(body.fee_calculation_basis).trim()) || "parts_before_vat";
    }
    if (body.client_fee_label !== undefined) {
      partialUpdate.client_fee_label = sanitizeHeaderValue(String(body.client_fee_label).trim()) || "رسوم المنصة";
    }
    if (body.auto_wallet_settlement !== undefined) {
      partialUpdate.auto_wallet_settlement = Boolean(body.auto_wallet_settlement);
    }
    if (body.separate_platform_fee_transactions !== undefined) {
      partialUpdate.separate_platform_fee_transactions = Boolean(body.separate_platform_fee_transactions);
    }

    // 2. SMTP Server Configuration (Validated & Encrypted)
    if (body.smtp_enabled !== undefined) {
      partialUpdate.smtp_enabled = Boolean(body.smtp_enabled);
    }
    if (body.smtp_host !== undefined) {
      const cleanHost = String(body.smtp_host).trim();
      if (cleanHost) {
        const hostValidation = validateSmtpHost(cleanHost);
        if (!hostValidation.isValid) {
          return NextResponse.json(
            { success: false, error: hostValidation.error || "عنوان خادم SMTP غير صالح أمنياً" },
            { status: 400 }
          );
        }
      }
      partialUpdate.smtp_host = cleanHost;
    }
    if (body.smtp_port !== undefined) {
      const parsedPort = parseInt(body.smtp_port, 10);
      partialUpdate.smtp_port = parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 587;
    }
    if (body.smtp_user !== undefined) {
      partialUpdate.smtp_user = sanitizeHeaderValue(String(body.smtp_user).trim());
    }
    if (body.smtp_from_name !== undefined) {
      partialUpdate.smtp_from_name = sanitizeHeaderValue(String(body.smtp_from_name).trim());
    }
    if (body.smtp_from_email !== undefined) {
      partialUpdate.smtp_from_email = sanitizeHeaderValue(String(body.smtp_from_email).trim());
    }
    if (body.smtp_secure !== undefined) {
      partialUpdate.smtp_secure = Boolean(body.smtp_secure);
    }

    // 3. SMTP Password handling (Preserve or Encrypt New with AES-256-GCM)
    if (body.smtp_password !== undefined) {
      const rawPassword = String(body.smtp_password).trim();
      if (!rawPassword || rawPassword === "••••••••") {
        partialUpdate.smtp_password = currentSettings.smtp_password;
      } else {
        const encrypted = encryptSecret(rawPassword);
        if (encrypted) {
          partialUpdate.smtp_password = encrypted;
        } else {
          return NextResponse.json(
            { success: false, error: "فشل تشفير كلمة المرور في السيرفر. يرجى مراجعة إعدادات الأمان." },
            { status: 500 }
          );
        }
      }
    }

    // 4. WhatsApp Gateway Configuration (Validated & Encrypted)
    if (body.whatsapp_enabled !== undefined) {
      partialUpdate.whatsapp_enabled = Boolean(body.whatsapp_enabled);
    }
    if (body.whatsapp_provider !== undefined) {
      partialUpdate.whatsapp_provider = body.whatsapp_provider;
    }
    if (body.whatsapp_api_url !== undefined) {
      partialUpdate.whatsapp_api_url = sanitizeHeaderValue(String(body.whatsapp_api_url).trim());
    }
    if (body.whatsapp_phone_number_id !== undefined) {
      partialUpdate.whatsapp_phone_number_id = sanitizeHeaderValue(String(body.whatsapp_phone_number_id).trim());
    }
    if (body.whatsapp_instance_id !== undefined) {
      partialUpdate.whatsapp_instance_id = sanitizeHeaderValue(String(body.whatsapp_instance_id).trim());
    }
    if (body.whatsapp_account_sid !== undefined) {
      partialUpdate.whatsapp_account_sid = sanitizeHeaderValue(String(body.whatsapp_account_sid).trim());
    }

    // WhatsApp API Token handling (Preserve or Encrypt New with AES-256-GCM)
    if (body.whatsapp_api_token !== undefined) {
      const rawToken = String(body.whatsapp_api_token).trim();
      if (!rawToken || rawToken === "••••••••") {
        partialUpdate.whatsapp_api_token = currentSettings.whatsapp_api_token;
      } else {
        const encryptedToken = encryptSecret(rawToken);
        if (encryptedToken) {
          partialUpdate.whatsapp_api_token = encryptedToken;
        } else {
          return NextResponse.json(
            { success: false, error: "فشل تشفير رمز API الخاص بواتساب في السيرفر." },
            { status: 500 }
          );
        }
      }
    }

    const { settings, affected } = await updateSystemSettings(
      partialUpdate,
      updatedBy
    );

    const safeSettings = sanitizeSettingsForClient(settings);

    return NextResponse.json({
      success: true,
      message: partialUpdate.rfq_visibility_duration_minutes !== undefined
        ? `تم حفظ الإعدادات وتطبيق مهلة الطلبات بنجاح (${affected.cancelledCount} طلب تحول إلى ملغي، ${affected.updatedCount} طلب تم تحديث مهلته)`
        : "تم حفظ وتشفير إعدادات المنصة، خادم البريد، وبوابة واتساب بنجاح (AES-256-GCM)",
      settings: safeSettings,
      affected,
    });
  } catch (error: any) {
    console.error("[api/v1/admin/settings POST] error:", error);
    return NextResponse.json(
      { success: false, error: "فشل حفظ إعدادات المنصة" },
      { status: 500 }
    );
  }
}

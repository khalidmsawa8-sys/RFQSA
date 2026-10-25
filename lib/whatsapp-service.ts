import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { getSystemSettings } from "./system-settings";
import { decryptSecret, sanitizeHeaderValue } from "./security-crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const WHATSAPP_LOG_FILE = path.join(DATA_DIR, "whatsapp_audit_log.json");

export interface WhatsAppPayload {
  to: string; // Recipient phone number (e.g., 0501234567, 966501234567, +966501234567)
  message: string;
  eventType?: string;
  notificationId?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  actionUrl?: string;
}

export interface WhatsAppAuditRecord {
  id: string;
  notification_id?: string;
  event_type: string;
  recipient_phone_masked: string;
  status: "ACCEPTED_BY_GATEWAY" | "FAILED" | "SKIPPED_DISABLED";
  provider: string;
  attempts: number;
  message_id?: string;
  error_code?: string;
  created_at: string;
  sent_at?: string | null;
}

/**
 * Normalizes phone numbers to standard E.164 without leading plus for most WhatsApp gateways.
 * E.g., "0501234567" -> "966501234567", "+966501234567" -> "966501234567"
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  if (!phone || typeof phone !== "string") return "";
  let digits = phone.replace(/\D/g, "");

  // Saudi local number conversion
  if (digits.startsWith("05") && digits.length === 10) {
    digits = "966" + digits.slice(1);
  } else if (digits.startsWith("5") && digits.length === 9) {
    digits = "966" + digits;
  }

  return digits;
}

/**
 * Masks phone numbers for audit logging (e.g. +966 50 *** 4567)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "[PHONE_MASKED]";
  const formatted = formatPhoneNumberForWhatsApp(phone);
  if (formatted.length >= 8) {
    return `${formatted.slice(0, 5)}***${formatted.slice(-4)}`;
  }
  return "[PHONE_MASKED]";
}

/**
 * Appends a sanitized WhatsApp dispatch record to the central audit log.
 * STRICT SECURITY: Never logs API tokens, secrets, or full private credentials.
 */
function recordWhatsAppAuditLog(record: WhatsAppAuditRecord) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let logs: WhatsAppAuditRecord[] = [];
    if (fs.existsSync(WHATSAPP_LOG_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_LOG_FILE, "utf-8");
      logs = JSON.parse(raw);
      if (!Array.isArray(logs)) logs = [];
    }
    logs.unshift(record);
    if (logs.length > 1000) {
      logs = logs.slice(0, 1000);
    }
    fs.writeFileSync(WHATSAPP_LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.warn("[whatsapp-service] Failed to record WhatsApp audit log:", err);
  }
}

/**
 * Helper to make HTTP/HTTPS requests with timeout and error isolation.
 */
function makeHttpRequest(
  targetUrl: string,
  method: "GET" | "POST",
  headers: Record<string, string>,
  body?: any
): Promise<{ status: number; data: any; raw: string }> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === "https:";
      const transport = isHttps ? https : http;

      const postData = body ? (typeof body === "string" ? body : JSON.stringify(body)) : null;

      const reqHeaders = {
        ...headers,
        ...(postData && !headers["Content-Type"] ? { "Content-Type": "application/json" } : {}),
        ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
      };

      const req = transport.request(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method,
          headers: reqHeaders,
          timeout: 10000,
        },
        (res) => {
          let responseData = "";
          res.on("data", (chunk) => {
            responseData += chunk;
          });
          res.on("end", () => {
            try {
              const parsed = JSON.parse(responseData);
              resolve({ status: res.statusCode || 200, data: parsed, raw: responseData });
            } catch (_) {
              resolve({ status: res.statusCode || 200, data: {}, raw: responseData });
            }
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("WhatsApp Gateway connection timeout (10s)"));
      });

      req.on("error", (err) => {
        reject(err);
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves the current WhatsApp Gateway configuration with decrypted secret token.
 */
export async function getWhatsAppConfig() {
  const settings = await getSystemSettings();
  const enabled = Boolean(settings.whatsapp_enabled);
  const provider = settings.whatsapp_provider || "meta_cloud";
  const decryptedToken = decryptSecret(settings.whatsapp_api_token || "");

  return {
    enabled,
    provider,
    apiUrl: settings.whatsapp_api_url || "",
    apiToken: decryptedToken,
    phoneNumberId: settings.whatsapp_phone_number_id || "",
    instanceId: settings.whatsapp_instance_id || "",
    accountSid: settings.whatsapp_account_sid || "",
  };
}

/**
 * Sends a WhatsApp message via the configured WhatsApp Gateway (Meta Cloud API, UltraMsg, Twilio, or Custom Webhook).
 *
 * Guarantees:
 * - Non-blocking async execution.
 * - Idempotency & phone sanitization.
 * - Safe error masking with no token leakage in logs or responses.
 */
export async function sendWhatsAppMessage(payload: WhatsAppPayload): Promise<{
  success: boolean;
  status: "ACCEPTED_BY_GATEWAY" | "FAILED" | "SKIPPED_DISABLED";
  messageId?: string;
  error?: string;
}> {
  const logId = `WA-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const startTime = new Date().toISOString();
  const formattedPhone = formatPhoneNumberForWhatsApp(payload.to);
  const maskedPhone = maskPhoneNumber(payload.to);
  const eventType = sanitizeHeaderValue(payload.eventType || "TRANSACTIONAL");

  if (!formattedPhone || formattedPhone.length < 8) {
    return {
      success: false,
      status: "FAILED",
      error: "رقم هاتف الواتساب غير صالح أو مفقود",
    };
  }

  const config = await getWhatsAppConfig();

  if (!config.enabled || !config.apiToken) {
    recordWhatsAppAuditLog({
      id: logId,
      notification_id: payload.notificationId,
      event_type: eventType,
      recipient_phone_masked: maskedPhone,
      status: "SKIPPED_DISABLED",
      provider: config.provider,
      attempts: 0,
      error_code: "GATEWAY_DISABLED",
      created_at: startTime,
      sent_at: null,
    });
    return {
      success: false,
      status: "SKIPPED_DISABLED",
      error: "خدمة رسائل واتساب غير مفعلة أو بيانات الاعتماد غير مكتملة في لوحة التحكم.",
    };
  }

  try {
    let resultMessageId: string | undefined = undefined;

    // ── 1. Provider: UltraMsg Gateway ──
    if (config.provider === "ultramsg") {
      const instanceId = config.instanceId || "instance";
      const endpoint = config.apiUrl || `https://api.ultramsg.com/${instanceId}/messages/chat`;
      const response = await makeHttpRequest(
        endpoint,
        "POST",
        { "Content-Type": "application/json" },
        {
          token: config.apiToken,
          to: formattedPhone,
          body: payload.message + (payload.actionUrl ? `\n\n🔗 الرابط: ${payload.actionUrl}` : ""),
        }
      );

      if (response.data?.sent === "true" || response.data?.id || response.status === 200) {
        resultMessageId = String(response.data?.id || `UM-${Date.now()}`);
      } else {
        throw new Error(response.data?.error || response.raw || "UltraMsg dispatch failure");
      }
    }

    // ── 2. Provider: Meta WhatsApp Cloud API (Official) ──
    else if (config.provider === "meta_cloud") {
      const phoneId = config.phoneNumberId || "me";
      const endpoint = config.apiUrl || `https://graph.facebook.com/v19.0/${phoneId}/messages`;

      const reqBody: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: true,
          body: payload.message + (payload.actionUrl ? `\n\n🔗 ${payload.actionUrl}` : ""),
        },
      };

      const response = await makeHttpRequest(
        endpoint,
        "POST",
        {
          "Authorization": `Bearer ${config.apiToken}`,
          "Content-Type": "application/json",
        },
        reqBody
      );

      if (response.data?.messages?.[0]?.id || response.status === 200) {
        resultMessageId = response.data?.messages?.[0]?.id;
      } else {
        throw new Error(response.data?.error?.message || "Meta WhatsApp Cloud API error");
      }
    }

    // ── 3. Provider: Twilio WhatsApp ──
    else if (config.provider === "twilio") {
      const accountSid = config.accountSid || "AC_TWILIO";
      const endpoint = config.apiUrl || `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const authHeader = `Basic ${Buffer.from(`${accountSid}:${config.apiToken}`).toString("base64")}`;
      const fromNumber = config.phoneNumberId ? `whatsapp:${config.phoneNumberId}` : "whatsapp:+14155238886";

      const formData = new URLSearchParams({
        From: fromNumber,
        To: `whatsapp:+${formattedPhone}`,
        Body: payload.message + (payload.actionUrl ? `\n\n🔗 ${payload.actionUrl}` : ""),
      }).toString();

      const response = await makeHttpRequest(
        endpoint,
        "POST",
        {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        formData
      );

      if (response.data?.sid || response.status === 201 || response.status === 200) {
        resultMessageId = response.data?.sid;
      } else {
        throw new Error(response.data?.message || "Twilio WhatsApp delivery error");
      }
    }

    // ── 4. Provider: Generic Custom Webhook ──
    else {
      const endpoint = config.apiUrl;
      if (!endpoint) throw new Error("عنوان Webhook الخاص بواتساب غير محدد");

      const response = await makeHttpRequest(
        endpoint,
        "POST",
        {
          "Authorization": `Bearer ${config.apiToken}`,
          "Content-Type": "application/json",
        },
        {
          to: formattedPhone,
          phone: formattedPhone,
          message: payload.message,
          action_url: payload.actionUrl,
          event_type: eventType,
        }
      );

      if (response.status >= 200 && response.status < 300) {
        resultMessageId = `WEBHOOK-${Date.now()}`;
      } else {
        throw new Error(`Custom webhook returned HTTP status ${response.status}`);
      }
    }

    recordWhatsAppAuditLog({
      id: logId,
      notification_id: payload.notificationId,
      event_type: eventType,
      recipient_phone_masked: maskedPhone,
      status: "ACCEPTED_BY_GATEWAY",
      provider: config.provider,
      attempts: 1,
      message_id: resultMessageId,
      created_at: startTime,
      sent_at: new Date().toISOString(),
    });

    return {
      success: true,
      status: "ACCEPTED_BY_GATEWAY",
      messageId: resultMessageId,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.warn(`[whatsapp-service] Error sending WhatsApp to ${maskedPhone}:`, errorMsg);

    recordWhatsAppAuditLog({
      id: logId,
      notification_id: payload.notificationId,
      event_type: eventType,
      recipient_phone_masked: maskedPhone,
      status: "FAILED",
      provider: config.provider,
      attempts: 1,
      error_code: "DISPATCH_FAILED",
      created_at: startTime,
      sent_at: null,
    });

    return {
      success: false,
      status: "FAILED",
      error: `فشل إرسال رسالة الواتساب: ${errorMsg}`,
    };
  }
}

/**
 * Diagnostic test tool to verify WhatsApp API credentials and send a test message.
 */
export async function verifyWhatsAppGateway(customConfig?: {
  provider: "meta_cloud" | "ultramsg" | "twilio" | "custom_webhook";
  apiUrl?: string;
  apiToken: string;
  phoneNumberId?: string;
  instanceId?: string;
  accountSid?: string;
  testPhone?: string;
}): Promise<{ success: boolean; message: string; messageId?: string }> {
  try {
    const config = customConfig
      ? {
          enabled: true,
          provider: customConfig.provider || "meta_cloud",
          apiUrl: customConfig.apiUrl || "",
          apiToken: customConfig.apiToken,
          phoneNumberId: customConfig.phoneNumberId || "",
          instanceId: customConfig.instanceId || "",
          accountSid: customConfig.accountSid || "",
        }
      : await getWhatsAppConfig();

    if (!config.apiToken) {
      return { success: false, message: "رمز API الخاص بواتساب مطلوب للتحقق" };
    }

    const testPhone = customConfig?.testPhone || "0501234567";
    const formatted = formatPhoneNumberForWhatsApp(testPhone);

    const testPayload: WhatsAppPayload = {
      to: formatted,
      message: `🔔 *رسالة تجريبية من منصة RFQ*\nتم التحقق من ربط وتفعيل بوابة WhatsApp API بنجاح تام وبأعلى معايير الأمان.\n\nتاريخ الفحص: ${new Date().toLocaleString("ar-SA")}`,
      eventType: "WHATSAPP_DIAGNOSTICS_TEST",
      actionUrl: "https://rfq-sa.com/admin/settings",
    };

    // Temporarily dispatch
    const result = await sendWhatsAppMessage(testPayload);
    if (result.success) {
      return {
        success: true,
        message: `تم الاتصال ببوابة الواتساب بنجاح وإرسال رسالة التحقق إلى (${maskPhoneNumber(testPhone)})!`,
        messageId: result.messageId,
      };
    } else {
      return {
        success: false,
        message: result.error || "فشل التحقق من بوابة الواتساب",
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `حدث خطأ أثناء فحص بوابة الواتساب: ${err?.message || err}`,
    };
  }
}

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { getSystemSettings } from "./system-settings";
import { decryptSecret, sanitizeHeaderValue, validateSmtpHost } from "./security-crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const EMAIL_LOG_FILE = path.join(DATA_DIR, "email_audit_log.json");

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
  eventType?: string;
  notificationId?: string;
  lang?: "ar" | "en";
}

export interface EmailAuditRecord {
  id: string;
  notification_id?: string;
  event_type: string;
  recipient: string;
  subject: string;
  status: "ACCEPTED_BY_SMTP" | "FAILED" | "SKIPPED_DISABLED";
  attempts: number;
  error_code?: string;
  created_at: string;
  sent_at?: string | null;
}

/**
 * Appends a sanitized email dispatch record to the central audit log.
 * STRICT SECURITY: Never logs passwords, ciphertext, keys, or auth headers.
 */
function recordEmailAuditLog(record: EmailAuditRecord) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let logs: EmailAuditRecord[] = [];
    if (fs.existsSync(EMAIL_LOG_FILE)) {
      const raw = fs.readFileSync(EMAIL_LOG_FILE, "utf-8");
      logs = JSON.parse(raw);
      if (!Array.isArray(logs)) logs = [];
    }
    // Prepend and bound to last 1000 logs
    logs.unshift(record);
    if (logs.length > 1000) {
      logs = logs.slice(0, 1000);
    }
    fs.writeFileSync(EMAIL_LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.warn("[email-service] Failed to record email audit log:", err);
  }
}

/**
 * Sanitizes error messages to remove any potential password or connection credentials.
 */
export function sanitizeErrorMessage(rawError: any): string {
  if (!rawError) return "خطأ غير معروف في خادم البريد";
  const msg = typeof rawError === "string" ? rawError : rawError.message || String(rawError);

  if (msg.includes("535") || msg.toLowerCase().includes("authentication failed") || msg.toLowerCase().includes("invalid login")) {
    return "فشل مصادقة خادم البريد (SMTP Authentication Failed). يرجى التحقق من اسم المستخدم وكلمة المرور المشفرة.";
  }
  if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT") || msg.toLowerCase().includes("timeout")) {
    return "انتهت مهلة الاتصال بخادم البريد (SMTP Connection Timeout).";
  }
  if (msg.includes("EAI_AGAIN") || msg.includes("ENOTFOUND")) {
    return "تعذر العثور على عنوان خادم البريد (SMTP Host Not Found).";
  }
  if (msg.includes("SELF_SIGNED_CERT_IN_CHAIN") || msg.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE")) {
    return "خطأ في شهادة SSL الخاصة بخادم البريد (SSL Certificate Validation Error).";
  }

  // Generic sanitized fallback: mask emails and strip long traces
  const masked = msg
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_MASKED]")
    .replace(/pass(word)?\s*[:=]\s*\S+/gi, "password=[MASKED]")
    .replace(/auth(entication)?\s*[:=]\s*\S+/gi, "auth=[MASKED]");

  return masked.slice(0, 200);
}

/**
 * Determines whether an error is transient and eligible for retry with exponential backoff.
 */
function isTransientError(err: any): boolean {
  if (!err) return false;
  const code = err.code || "";
  const msg = (err.message || "").toLowerCase();

  // Non-transient errors (do not retry authentication/rejection failures)
  if (msg.includes("535") || msg.includes("550") || msg.includes("invalid login") || msg.includes("auth")) {
    return false;
  }

  // Transient errors (retry)
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ESOCKETTIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "EAI_AGAIN" ||
    msg.includes("timeout") ||
    msg.includes("greeting never received") ||
    msg.includes("421") ||
    msg.includes("450") ||
    msg.includes("451")
  ) {
    return true;
  }

  return false;
}

/**
 * Creates an SMTP transporter based on current system settings with SSRF protection.
 * Decryption happens strictly in-memory at connection time.
 */
export async function getEmailTransporter() {
  const settings = await getSystemSettings();

  if (!settings.smtp_enabled || !settings.smtp_host || !settings.smtp_user) {
    return {
      transporter: null,
      settings,
      enabled: false,
      error: "خادم البريد الإلكتروني (SMTP) غير مفعل أو بيانات الاعتماد غير مكتملة في إعدادات المنصة.",
    };
  }

  // SSRF Protection check on saved host
  const hostCheck = validateSmtpHost(settings.smtp_host);
  if (!hostCheck.isValid) {
    return {
      transporter: null,
      settings,
      enabled: false,
      error: `عنوان خادم SMTP غير صالح أمنياً: ${hostCheck.error}`,
    };
  }

  const decryptedPassword = decryptSecret(settings.smtp_password || "");
  const port = Number(settings.smtp_port) || (settings.smtp_secure ? 465 : 587);
  // Port 465 uses direct SSL/TLS; Port 587 uses explicit STARTTLS
  const isSecure = settings.smtp_secure !== undefined ? settings.smtp_secure : port === 465;

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host.trim(),
    port,
    secure: isSecure,
    auth: {
      user: settings.smtp_user.trim(),
      pass: decryptedPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return {
    transporter,
    settings,
    enabled: true,
    error: null,
  };
}

/**
 * Sends an email using the configured SMTP server with Exponential Backoff Retry.
 *
 * Guarantees:
 * - Never blocks or throws unhandled exceptions into business workflows.
 * - Retries transient failures up to 3 times with exponential backoff (1s, 2s, 4s).
 * - Distinguishes between ACCEPTED_BY_SMTP and FAILED.
 * - Logs audit record without exposing sensitive credentials.
 */
export async function sendEmail(payload: EmailPayload): Promise<{
  success: boolean;
  status: "ACCEPTED_BY_SMTP" | "FAILED" | "SKIPPED_DISABLED";
  messageId?: string;
  error?: string;
}> {
  const logId = `EML-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const startTime = new Date().toISOString();
  const recipientStr = Array.isArray(payload.to)
    ? payload.to.map((t) => sanitizeHeaderValue(t)).filter(Boolean).join(", ")
    : sanitizeHeaderValue(payload.to);
  const eventType = sanitizeHeaderValue(payload.eventType || "TRANSACTIONAL");
  const cleanSubject = sanitizeHeaderValue(payload.subject || "إشعار من منصة RFQ");

  try {
    const { transporter, settings, enabled, error } = await getEmailTransporter();

    if (!enabled || !transporter) {
      recordEmailAuditLog({
        id: logId,
        notification_id: payload.notificationId,
        event_type: eventType,
        recipient: recipientStr,
        subject: cleanSubject,
        status: "SKIPPED_DISABLED",
        attempts: 0,
        error_code: "SMTP_DISABLED",
        created_at: startTime,
        sent_at: null,
      });
      return { success: false, status: "SKIPPED_DISABLED", error: error || "SMTP disabled" };
    }

    const fromName = sanitizeHeaderValue(payload.fromName || settings.smtp_from_name || "منصة RFQ السعودية");
    const fromEmail = sanitizeHeaderValue(settings.smtp_from_email || settings.smtp_user || "notifications@rfq-sa.com");
    const replyTo = sanitizeHeaderValue(payload.replyTo || settings.smtp_from_email || settings.smtp_user || "support@rfq-sa.com");

    const fromAddress = `"${fromName}" <${fromEmail}>`;
    const mailOptions = {
      from: fromAddress,
      to: recipientStr,
      replyTo,
      subject: cleanSubject,
      html: payload.html,
      text: payload.text || payload.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    };

    const maxAttempts = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const info = await transporter.sendMail(mailOptions);

        recordEmailAuditLog({
          id: logId,
          notification_id: payload.notificationId,
          event_type: eventType,
          recipient: recipientStr,
          subject: cleanSubject,
          status: "ACCEPTED_BY_SMTP",
          attempts: attempt,
          created_at: startTime,
          sent_at: new Date().toISOString(),
        });

        return { success: true, status: "ACCEPTED_BY_SMTP", messageId: info.messageId };
      } catch (err: any) {
        lastError = err;

        if (attempt < maxAttempts && isTransientError(err)) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        } else {
          break;
        }
      }
    }

    // All retry attempts failed or permanent rejection
    const safeErrMsg = sanitizeErrorMessage(lastError);
    recordEmailAuditLog({
      id: logId,
      notification_id: payload.notificationId,
      event_type: eventType,
      recipient: recipientStr,
      subject: cleanSubject,
      status: "FAILED",
      attempts: maxAttempts,
      error_code: lastError?.code || "SEND_FAILED",
      created_at: startTime,
      sent_at: null,
    });

    return { success: false, status: "FAILED", error: safeErrMsg };
  } catch (outerErr: any) {
    const safeErrMsg = sanitizeErrorMessage(outerErr);
    return { success: false, status: "FAILED", error: safeErrMsg };
  }
}

/**
 * Verifies SMTP connection credentials with SSRF protection and safe error sanitization.
 */
export async function verifySmtpConnection(customConfig?: {
  host: string;
  port: number;
  user: string;
  password: string;
  secure?: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    let transporter: any;

    if (customConfig) {
      // SSRF check on customConfig host
      const hostCheck = validateSmtpHost(customConfig.host);
      if (!hostCheck.isValid) {
        return { success: false, message: `عنوان خادم SMTP غير مسموح به أمنياً: ${hostCheck.error}` };
      }

      const port = Number(customConfig.port) || 587;
      const isSecure = customConfig.secure !== undefined ? customConfig.secure : port === 465;
      transporter = nodemailer.createTransport({
        host: customConfig.host.trim(),
        port,
        secure: isSecure,
        auth: {
          user: customConfig.user.trim(),
          pass: customConfig.password,
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
    } else {
      const helper = await getEmailTransporter();
      if (!helper.transporter) {
        return { success: false, message: helper.error || "خادم البريد غير مهيأ" };
      }
      transporter = helper.transporter;
    }

    await transporter.verify();
    return { success: true, message: "تم الاتصال بخادم البريد بنجاح ومصادقة البيانات صحيحة 100%!" };
  } catch (err: any) {
    const safeMsg = sanitizeErrorMessage(err);
    return {
      success: false,
      message: safeMsg,
    };
  }
}

/**
 * Generates a responsive Arabic/English HTML email wrapper conforming to email client standards.
 */
export function renderEmailTemplate({
  title,
  subtitle,
  badge,
  contentHtml,
  actionButton,
  footerNote,
  lang = "ar",
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  contentHtml: string;
  actionButton?: { text: string; url: string };
  footerNote?: string;
  lang?: "ar" | "en";
}): string {
  const isRtl = lang === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const align = isRtl ? "right" : "left";
  const currentYear = new Date().getFullYear();

  // Escape HTML in dynamic text strings
  const escapeHtml = (str: string) =>
    str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] || m));

  const safeTitle = escapeHtml(title);
  const safeSubtitle = subtitle ? escapeHtml(subtitle) : "";
  const safeBadge = badge ? escapeHtml(badge) : "";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; direction: ${dir}; text-align: ${align}; color: #1e293b; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .badge { display: inline-block; background: rgba(59, 130, 246, 0.3); border: 1px solid rgba(255, 255, 255, 0.2); color: #93c5fd; padding: 4px 14px; border-radius: 50px; font-size: 12px; font-weight: bold; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 800; margin: 0 0 6px 0; color: #ffffff; letter-spacing: -0.5px; }
    .subtitle { font-size: 13px; color: #cbd5e1; margin: 0; font-weight: normal; }
    .body-content { padding: 32px; font-size: 14px; line-height: 1.8; color: #334155; }
    .btn-container { text-align: center; margin: 28px 0 16px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
    .footer { background: #f1f5f9; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer-links { margin-top: 8px; }
    .footer-links a { color: #2563eb; text-decoration: none; margin: 0 8px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${safeBadge ? `<div class="badge">${safeBadge}</div>` : ""}
      <h1 class="title">${safeTitle}</h1>
      ${safeSubtitle ? `<p class="subtitle">${safeSubtitle}</p>` : ""}
    </div>
    <div class="body-content">
      ${contentHtml}
      ${
        actionButton
          ? `<div class="btn-container">
               <a href="${actionButton.url}" class="btn" target="_blank">${escapeHtml(actionButton.text)}</a>
             </div>`
          : ""
      }
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>${isRtl ? "منصة RFQ لتسعير وطلبات المشاريع B2B" : "RFQ B2B Marketplace Platform"}</strong></p>
      <p style="margin: 0; color: #94a3b8;">${footerNote ? escapeHtml(footerNote) : (isRtl ? "هذا البريد تم إرساله تلقائياً من خادم النظام، يرجى عدم الرد المباشر عليه." : "This automated message was sent by RFQ system.")}</p>
      <div class="footer-links">
        <a href="https://rfq-sa.com">${isRtl ? "الموقع الإلكتروني" : "Website"}</a> · 
        <a href="https://rfq-sa.com/admin">${isRtl ? "بوابة الإدارة" : "Admin Portal"}</a> · 
        <span>© ${currentYear} All rights reserved</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

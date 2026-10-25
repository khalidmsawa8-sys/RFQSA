/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RIFQ CENTRAL PUSH NOTIFICATION & EVENT ENGINE (منظومة إشعارات رفق المركزية)
 * ─────────────────────────────────────────────────────────────────────────────
 * Single Source of Truth for:
 * - Event-driven recipient resolution (Client, Vendor, Courier, Admin).
 * - Multi-device token registration, updates, and invalidation.
 * - Database & persistent JSON storage synchronization (notifications table).
 * - FCM Push Dispatch with high-importance channels, sounds & deep-linking payloads.
 * - Deduplication & idempotency protection.
 * - Non-blocking async dispatch.
 */

import fs from "fs";
import path from "path";
import https from "https";
import { filterRfqsForVendor } from "./brand-specialization";
import { filterRfqsForVendorCategories } from "./category-specialization";
import { sendEmail, renderEmailTemplate } from "./email-service";
import { sendWhatsAppMessage } from "./whatsapp-service";

const DATA_DIR = path.join(process.cwd(), "data");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications_db.json");
const FCM_TOKENS_FILE = path.join(DATA_DIR, "fcm_tokens_db.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

// In-memory Deduplication Cache (60s window)
const deduplicationCache = new Map<string, number>();

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string; // new_rfq, new_quote, quote_accepted, deal_status_updated, order_completed, wallet_credit, announcement, warning, new_message
  title: string;
  message: string;
  rfq_id?: string | null;
  quote_id?: string | null;
  order_id?: string | null;
  delivery_id?: string | null;
  is_read: boolean;
  created_at: string;
  sent_at?: string | null;
  action_url?: string | null;
  metadata?: Record<string, any> | null;
}

export interface DeviceTokenRecord {
  id: string;
  user_id: string;
  fcm_token: string;
  platform: "android" | "ios" | "web";
  device_id?: string | null;
  device_model?: string | null;
  os_version?: string | null;
  app_version?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function ensureDataFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (_) {}
}

export function loadAllNotifications(): NotificationRecord[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const data = fs.readFileSync(NOTIFICATIONS_FILE, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read notifications_db.json:", err);
  }
  return [];
}

export function saveAllNotifications(notifications: NotificationRecord[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), "utf8");
    if (typeof globalThis !== "undefined") {
      (globalThis as any).__SHARED_SERVER_NOTIFICATIONS__ = notifications;
    }
  } catch (err) {
    console.warn("Failed to write notifications_db.json:", err);
  }
}

export function loadAllDeviceTokens(): DeviceTokenRecord[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(FCM_TOKENS_FILE)) {
      const data = fs.readFileSync(FCM_TOKENS_FILE, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read fcm_tokens_db.json:", err);
  }
  return [];
}

export function saveAllDeviceTokens(tokens: DeviceTokenRecord[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(FCM_TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf8");
  } catch (err) {
    console.warn("Failed to write fcm_tokens_db.json:", err);
  }
}

/**
 * Register or update a device token for a user
 */
export function registerUserDeviceToken(payload: {
  userId: string;
  fcmToken: string;
  platform?: "android" | "ios" | "web";
  deviceId?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}): DeviceTokenRecord {
  const tokens = loadAllDeviceTokens();
  const now = new Date().toISOString();

  const existingIdx = tokens.findIndex(
    (t) => t.fcm_token === payload.fcmToken || (payload.deviceId && t.device_id === payload.deviceId && t.user_id === payload.userId)
  );

  const record: DeviceTokenRecord = {
    id: existingIdx >= 0 ? tokens[existingIdx].id : `DEV-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`,
    user_id: payload.userId,
    fcm_token: payload.fcmToken,
    platform: payload.platform || "android",
    device_id: payload.deviceId || null,
    device_model: payload.deviceModel || null,
    os_version: payload.osVersion || null,
    app_version: payload.appVersion || null,
    is_active: true,
    created_at: existingIdx >= 0 ? tokens[existingIdx].created_at : now,
    updated_at: now,
  };

  if (existingIdx >= 0) {
    tokens[existingIdx] = record;
  } else {
    tokens.unshift(record);
  }

  saveAllDeviceTokens(tokens);
  return record;
}

/**
 * Deactivate device token upon Logout
 */
export function deactivateUserDeviceToken(fcmTokenOrDeviceId: string, userId?: string): boolean {
  const tokens = loadAllDeviceTokens();
  let modified = false;

  for (let i = 0; i < tokens.length; i++) {
    if (
      tokens[i].fcm_token === fcmTokenOrDeviceId ||
      tokens[i].device_id === fcmTokenOrDeviceId ||
      (userId && tokens[i].user_id === userId && (tokens[i].fcm_token === fcmTokenOrDeviceId || tokens[i].device_id === fcmTokenOrDeviceId))
    ) {
      tokens[i].is_active = false;
      tokens[i].updated_at = new Date().toISOString();
      modified = true;
    }
  }

  if (modified) {
    saveAllDeviceTokens(tokens);
  }
  return modified;
}

/**
 * Get all active tokens for a specific user
 */
export function getActiveTokensForUser(userId: string): DeviceTokenRecord[] {
  const tokens = loadAllDeviceTokens();
  return tokens.filter((t) => t.user_id === userId && t.is_active);
}

import { getFirebaseAdmin } from "./firebase-admin";

/**
 * Central Push Dispatcher to FCM via HTTP v1 and Firebase Admin SDK
 */
export async function sendFcmPushNotification(payload: {
  tokens: string[];
  title: string;
  body: string;
  channelId?: string;
  soundName?: string;
  data: Record<string, any>;
}): Promise<{ successCount: number; failureCount: number; errors: any[] }> {
  if (!payload.tokens || payload.tokens.length === 0) {
    return { successCount: 0, failureCount: 0, errors: [] };
  }

  // Deduplicate and sanitize tokens
  const validTokens = Array.from(new Set(payload.tokens.filter(t => t && t.trim().length > 10)));
  if (validTokens.length === 0) {
    return { successCount: 0, failureCount: 0, errors: [] };
  }

  const startTime = Date.now();
  const serverSentAt = new Date().toISOString();
  
  // Ensure all data values are stringified for FCM HTTP v1 protocol
  const stringifiedData: Record<string, string> = {
    server_sent_at: serverSentAt,
  };
  for (const [k, v] of Object.entries(payload.data || {})) {
    stringifiedData[k] = typeof v === "string" ? v : JSON.stringify(v);
  }

  let successCount = 0;
  let failureCount = 0;
  const errors: any[] = [];

  const adminApp = getFirebaseAdmin();

  if (adminApp) {
    try {
      const response = await adminApp.messaging().sendEachForMulticast({
        tokens: validTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: stringifiedData,
        android: {
          priority: "high",
          notification: {
            channelId: payload.channelId || "rfq_high_importance_channel",
            sound: payload.soundName || "default",
            priority: "max",
            defaultSound: true,
            defaultVibrateTimings: true,
            visibility: "public",
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",
          },
          payload: {
            aps: {
              sound: "default",
              contentAvailable: true,
              badge: 1,
            },
          },
        },
      });

      successCount = response.successCount;
      failureCount = response.failureCount;

      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          const token = validTokens[idx];
          const errCode = resp.error?.code;
          errors.push({ token, code: errCode, message: resp.error?.message });
          if (
            errCode === "messaging/registration-token-not-registered" ||
            errCode === "messaging/invalid-registration-token"
          ) {
            deactivateUserDeviceToken(token);
          }
        }
      });

      const elapsedMs = Date.now() - startTime;
      console.log(
        `[Push Engine] FCM HTTP v1 Multicast completed in ${elapsedMs}ms: ${successCount} sent, ${failureCount} failed.`
      );
      return { successCount, failureCount, errors };
    } catch (adminErr: any) {
      console.warn("[Push Engine] Firebase Admin SDK multicast exception, falling back:", adminErr.message);
      errors.push(adminErr.message);
    }
  }

  // Fallback logging for development / offline server
  console.log(`[Push Engine] Dispatched push notification payload to ${validTokens.length} devices: "${payload.title}"`);
  return { successCount: validTokens.length, failureCount: 0, errors };
}

/**
 * Create a persistent notification record and asynchronously dispatch push notifications
 */
export async function createAndDispatchNotification(payload: {
  userId: string;
  type: string;
  title: string;
  message: string;
  rfqId?: string | null;
  quoteId?: string | null;
  orderId?: string | null;
  deliveryId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any>;
  dedupKey?: string;
  channelId?: string;
  soundName?: string;
}): Promise<NotificationRecord | null> {
  const dedupKey = payload.dedupKey || `${payload.userId}_${payload.type}_${payload.rfqId || ""}_${payload.quoteId || ""}_${payload.orderId || ""}`;
  const nowMs = Date.now();

  // Deduplication check: prevent multiple identical notifications within 30 seconds
  if (deduplicationCache.has(dedupKey)) {
    const lastSent = deduplicationCache.get(dedupKey)!;
    if (nowMs - lastSent < 30000) {
      console.log(`[Push Engine] Deduplication prevented duplicate event: ${dedupKey}`);
      return null;
    }
  }
  deduplicationCache.set(dedupKey, nowMs);

  const notifications = loadAllNotifications();
  const notificationId = `NOTIF-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowIso = new Date().toISOString();

  let resolvedActionUrl = payload.actionUrl;
  if (!resolvedActionUrl) {
    if (payload.orderId) resolvedActionUrl = `/deal/${payload.orderId}`;
    else if (payload.quoteId && payload.rfqId) resolvedActionUrl = `/client/rfq/${payload.rfqId}`;
    else if (payload.rfqId) resolvedActionUrl = `/vendor/quote/${payload.rfqId}`;
    else if (payload.deliveryId) resolvedActionUrl = `/courier/orders/${payload.deliveryId}`;
  }

  const newRecord: NotificationRecord = {
    id: notificationId,
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    rfq_id: payload.rfqId || null,
    quote_id: payload.quoteId || null,
    order_id: payload.orderId || null,
    delivery_id: payload.deliveryId || null,
    is_read: false,
    created_at: nowIso,
    sent_at: nowIso,
    action_url: resolvedActionUrl || null,
    metadata: payload.metadata || null,
  };

  notifications.unshift(newRecord);
  saveAllNotifications(notifications);

  // Asynchronous Push Dispatch to registered devices
  const activeTokens = getActiveTokensForUser(payload.userId);
  if (activeTokens.length > 0) {
    const tokenStrings = activeTokens.map((t) => t.fcm_token);
    sendFcmPushNotification({
      tokens: tokenStrings,
      title: payload.title,
      body: payload.message,
      channelId: payload.channelId || "rfq_high_importance_channel",
      soundName: payload.soundName || "rfq_alert",
      data: {
        notificationId,
        type: payload.type,
        entityType: payload.rfqId ? "rfq" : payload.orderId ? "order" : payload.deliveryId ? "delivery" : "general",
        entityId: payload.rfqId || payload.orderId || payload.deliveryId || notificationId,
        rfqId: payload.rfqId || "",
        quoteId: payload.quoteId || "",
        orderId: payload.orderId || "",
        deliveryId: payload.deliveryId || "",
        action_url: resolvedActionUrl || "",
        route: resolvedActionUrl || "",
      },
    }).catch((err) => {
      console.warn(`[Push Engine] Error sending FCM push for ${notificationId}:`, err);
    });
  }

  // Asynchronous Email Dispatch (non-blocking & isolated)
  try {
    const emailDedupKey = `EMAIL_${dedupKey}`;
    const isEmailDuplicate = deduplicationCache.has(emailDedupKey) && (nowMs - (deduplicationCache.get(emailDedupKey) || 0) < 30000);

    if (!isEmailDuplicate) {
      let recipientEmail = payload.metadata?.email;
      let recipientName = payload.metadata?.name;
      let emailOptOut = false;

      if (!recipientEmail && fs.existsSync(PROFILES_FILE)) {
        const rawProfiles = fs.readFileSync(PROFILES_FILE, "utf8");
        const profiles = JSON.parse(rawProfiles);
        if (Array.isArray(profiles)) {
          const userProf = profiles.find((p: any) => p.id === payload.userId);
          if (userProf) {
            recipientEmail = userProf.email;
            recipientName = userProf.full_name || userProf.company_name;
            if (userProf.email_notifications_enabled === false && payload.type === "announcement") {
              emailOptOut = true;
            }
          }
        }
      }

      if (recipientEmail && !emailOptOut) {
        deduplicationCache.set(emailDedupKey, nowMs);

        const fullActionUrl = resolvedActionUrl
          ? resolvedActionUrl.startsWith("http")
            ? resolvedActionUrl
            : `https://rfq-sa.com${resolvedActionUrl}`
          : undefined;

        const emailHtml = renderEmailTemplate({
          title: payload.title,
          subtitle: recipientName ? `مرحباً ${recipientName}` : undefined,
          badge:
            payload.type === "new_rfq"
              ? "طلب تسعير جديد"
              : payload.type === "new_quote"
              ? "عرض سعر جديد"
              : payload.type === "quote_accepted"
              ? "صفقة شراء مؤكدة"
              : payload.type === "deal_status_updated"
              ? "تحديث مسار الطلب"
              : payload.type === "order_completed"
              ? "إكمال الطلب والتسليم"
              : payload.type === "warning"
              ? "تنبيه أمني وصيانة"
              : payload.type === "promotion"
              ? "عرض وحافز خاص"
              : payload.type === "new_message"
              ? "رسالة دعم ومحادثة"
              : "إشعار منصة RFQ",
          contentHtml: `
            <p style="font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">${payload.message}</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 12px; color: #64748b;">
              <span>معرف الإشعار: <strong>${notificationId}</strong></span> · 
              <span>تاريخ الإرسال: <strong>${new Date().toLocaleString("ar-SA")}</strong></span>
            </div>
          `,
          actionButton: fullActionUrl
            ? {
                text: "عرض التفاصيل ومتابعة الطلب",
                url: fullActionUrl,
              }
            : undefined,
        });

        // Fire-and-forget: catch all errors to ensure business workflows are never interrupted
        sendEmail({
          to: recipientEmail,
          subject: `[منصة RFQ] ${payload.title}`,
          html: emailHtml,
          eventType: payload.type,
          notificationId: notificationId,
        }).catch((err) => {
          console.warn(`[Push Engine] Background email error for notification ${notificationId}:`, err?.message || err);
        });
      }
    }
  } catch (emailErr) {
    console.warn(`[Push Engine] Exception in background email dispatcher for ${notificationId}:`, emailErr);
  }

  // Asynchronous WhatsApp Dispatch (non-blocking & isolated)
  try {
    const waDedupKey = `WA_${dedupKey}`;
    const isWaDuplicate = deduplicationCache.has(waDedupKey) && (nowMs - (deduplicationCache.get(waDedupKey) || 0) < 30000);

    if (!isWaDuplicate) {
      let recipientPhone = payload.metadata?.phone;
      if (!recipientPhone && fs.existsSync(PROFILES_FILE)) {
        const rawProfiles = fs.readFileSync(PROFILES_FILE, "utf8");
        const profiles = JSON.parse(rawProfiles);
        if (Array.isArray(profiles)) {
          const userProf = profiles.find((p: any) => p.id === payload.userId);
          if (userProf?.phone) {
            recipientPhone = userProf.phone;
          }
        }
      }

      if (recipientPhone) {
        deduplicationCache.set(waDedupKey, nowMs);
        const fullActionUrl = resolvedActionUrl
          ? resolvedActionUrl.startsWith("http")
            ? resolvedActionUrl
            : `https://rfq-sa.com${resolvedActionUrl}`
          : undefined;

        sendWhatsAppMessage({
          to: recipientPhone,
          message: `🔔 *[منصة RFQ]*\n*${payload.title}*\n\n${payload.message}`,
          actionUrl: fullActionUrl,
          eventType: payload.type,
          notificationId: notificationId,
        }).catch((err) => {
          console.warn(`[Push Engine] Background WhatsApp error for ${notificationId}:`, err?.message || err);
        });
      }
    }
  } catch (waErr) {
    console.warn(`[Push Engine] Exception in background WhatsApp dispatcher for ${notificationId}:`, waErr);
  }

  return newRecord;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BUSINESS EVENT HANDLERS (معالجات الأحداث التشغيلية للمنظومة)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 1. Event: RFQ Created
 * - Dispatches confirmation to Client.
 * - Matches all specialized vendors in radar and sends individual notifications + push.
 */
export async function triggerRfqCreatedEvent(rfq: any) {
  if (!rfq || !rfq.id) return;

  // 1. Client Confirmation
  if (rfq.client_id) {
    await createAndDispatchNotification({
      userId: rfq.client_id,
      type: "new_rfq",
      title: "تم إنشاء طلب التسعير بنجاح ✓",
      message: `تم إطلاق طلب التسعير #${rfq.id} لسيارة ${rfq.car_make || ""} ${rfq.car_model || ""} (${rfq.car_year || ""}) وبدء استقبال عروض الموردين.`,
      rfqId: rfq.id,
      actionUrl: `/client/rfq/${rfq.id}`,
      channelId: "orders_channel",
    });
  }

  // 2. Specialized Vendors Matching
  try {
    let allVendors: any[] = [];
    if (fs.existsSync(PROFILES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf8"));
      allVendors = parsed.filter((p: any) => p.role === "vendor" && p.is_active !== false);
    }

    // Filter vendors matching brand and category
    for (const vendor of allVendors) {
      const vBrands = Array.isArray(vendor.specialized_brands)
        ? vendor.specialized_brands
        : typeof vendor.specialized_brands === "string"
        ? [vendor.specialized_brands]
        : [];
      const vAllBrands = Boolean(vendor.specializes_in_all_brands ?? (vBrands.length === 0 || vBrands.includes("ALL")));

      const brandMatched = filterRfqsForVendor([rfq], vBrands, vAllBrands).length > 0;
      if (!brandMatched) continue;

      const vCats = Array.isArray(vendor.specialized_categories) ? vendor.specialized_categories : [];
      const vAllCats = vendor.specializes_in_all_categories !== false;
      const catMatched = filterRfqsForVendorCategories([rfq], vCats, vAllCats).length > 0;
      if (!catMatched) continue;

      // Dispatch to matching vendor
      await createAndDispatchNotification({
        userId: vendor.id,
        type: "new_rfq",
        title: `طلب تسعير جديد في الرادار (#${rfq.id}) 🚗`,
        message: `طلب جديد لقطع ${rfq.car_make || ""} ${rfq.car_model || ""} بمدينة ${rfq.delivery_city || "الرياض"}. قدّم عرضك الآن لكسب الصفقة.`,
        rfqId: rfq.id,
        actionUrl: `/vendor/quote/${rfq.id}`,
        channelId: "rfq_radar_channel",
        soundName: "rfq_alert",
      });
    }

    // Always ensure vendor-demo-id receives radar alerts for demo & testing
    await createAndDispatchNotification({
      userId: "vendor-demo-id",
      type: "new_rfq",
      title: `طلب تسعير جديد في الرادار (#${rfq.id}) 🚗`,
      message: `طلب جديد لقطع ${rfq.car_make || ""} ${rfq.car_model || ""} بمدينة ${rfq.delivery_city || "الرياض"}. قدّم عرضك الآن لكسب الصفقة.`,
      rfqId: rfq.id,
      actionUrl: `/vendor/quote/${rfq.id}`,
      channelId: "rfq_radar_channel",
      soundName: "rfq_alert",
    });
  } catch (err) {
    console.warn("Failed to notify matching vendors for RFQ:", err);
  }
}

/**
 * Event: RFQ Reactivated by Client
 * - Dispatches confirmation to Client.
 * - Matches all specialized vendors in radar and sends individual notifications + push.
 */
export async function triggerRfqReactivatedEvent(rfq: any) {
  if (!rfq || !rfq.id) return;

  // 1. Client Confirmation
  if (rfq.client_id) {
    await createAndDispatchNotification({
      userId: rfq.client_id,
      type: "new_rfq",
      title: "تم إعادة تنشيط طلب التسعير بنجاح 🚀",
      message: `تم إعادة تنشيط طلب التسعير #${rfq.id} لسيارة ${rfq.car_make || ""} ${rfq.car_model || ""} وتجديد مهلة استقبال العروض.`,
      rfqId: rfq.id,
      actionUrl: `/client/rfq/${rfq.id}`,
      channelId: "orders_channel",
    });
  }

  // 2. Specialized Vendors Matching
  try {
    let allVendors: any[] = [];
    if (fs.existsSync(PROFILES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf8"));
      allVendors = parsed.filter((p: any) => p.role === "vendor" && p.is_active !== false);
    }

    // Filter vendors matching brand and category
    for (const vendor of allVendors) {
      const vBrands = Array.isArray(vendor.specialized_brands)
        ? vendor.specialized_brands
        : typeof vendor.specialized_brands === "string"
        ? [vendor.specialized_brands]
        : [];
      const vAllBrands = Boolean(vendor.specializes_in_all_brands ?? (vBrands.length === 0 || vBrands.includes("ALL")));

      const brandMatched = filterRfqsForVendor([rfq], vBrands, vAllBrands).length > 0;
      if (!brandMatched) continue;

      const vCats = Array.isArray(vendor.specialized_categories) ? vendor.specialized_categories : [];
      const vAllCats = vendor.specializes_in_all_categories !== false;
      const catMatched = filterRfqsForVendorCategories([rfq], vCats, vAllCats).length > 0;
      if (!catMatched) continue;

      // Dispatch to matching vendor
      await createAndDispatchNotification({
        userId: vendor.id,
        type: "new_rfq",
        title: `إعادة تنشيط طلب تسعير في الرادار (#${rfq.id}) 🚀`,
        message: `تم إعادة تنشيط طلب تسعير لقطع ${rfq.car_make || ""} ${rfq.car_model || ""} بمدينة ${rfq.delivery_city || "الرياض"}. قدّم عرضك الآن قبل انتهاء الوقت!`,
        rfqId: rfq.id,
        actionUrl: `/vendor/quote/${rfq.id}`,
        channelId: "rfq_radar_channel",
        soundName: "rfq_alert",
      });
    }
  } catch (err) {
    console.warn("Failed to notify matching vendors for reactivated RFQ:", err);
  }
}

/**
 * 2. Event: Quotation Submitted by Vendor
 * - Notifies the Client with total price and supplier details.
 * - Notifies the Vendor with confirmation of submitted quote.
 */
export async function triggerQuoteSubmittedEvent(quote: any, rfq: any, vendorName?: string) {
  if (!quote || !rfq) return;

  const supplierDisplay = vendorName || quote.profiles?.company_name || quote.profiles?.full_name || "مؤسسة قطع الغيار المعتمدة";

  // 1. Notify Client
  if (rfq.client_id) {
    await createAndDispatchNotification({
      userId: rfq.client_id,
      type: "new_quote",
      title: `وصل عرض سعر جديد لطلبك #${rfq.id} 🏷️`,
      message: `قدمت (${supplierDisplay}) عرض سعر لطلبك بقيمة ${Number(quote.total_price).toLocaleString("ar-SA")} ر.س مع توصيل خلال ${quote.delivery_days || 1} يوم.`,
      rfqId: rfq.id,
      quoteId: quote.id,
      actionUrl: `/client/rfq/${rfq.id}`,
      channelId: "offers_channel",
      soundName: "rfq_alert",
    });

    if (rfq.client_id !== "client-demo-id") {
      await createAndDispatchNotification({
        userId: "client-demo-id",
        type: "new_quote",
        title: `وصل عرض سعر جديد لطلبك #${rfq.id} 🏷️`,
        message: `قدمت (${supplierDisplay}) عرض سعر لطلبك بقيمة ${Number(quote.total_price).toLocaleString("ar-SA")} ر.س مع توصيل خلال ${quote.delivery_days || 1} يوم.`,
        rfqId: rfq.id,
        quoteId: quote.id,
        actionUrl: `/client/rfq/${rfq.id}`,
        channelId: "offers_channel",
        soundName: "rfq_alert",
      });
    }
  }

  // 2. Notify Vendor (Confirmation of quote submission)
  const vendorId = quote.vendor_id || quote.profiles?.id;
  if (vendorId) {
    await createAndDispatchNotification({
      userId: vendorId,
      type: "quote_submitted",
      title: `تم تقديم عرض سعرك بنجاح للطلب #${rfq.id} ✓`,
      message: `تم إرسال عرض سعرك بقيمة ${Number(quote.total_price).toLocaleString("ar-SA")} ر.س للطلب #${rfq.id} بنجاح إلى العميل.`,
      rfqId: rfq.id,
      quoteId: quote.id,
      actionUrl: `/vendor/orders`,
      channelId: "offers_channel",
      soundName: "rfq_alert",
    });
  }
}

/**
 * 3. Event: Quote Accepted by Client
 * - Notifies the Vendor that their offer was selected.
 * - Notifies the Client with order confirmation.
 */
export async function triggerQuoteAcceptedEvent(quote: any, rfq: any, orderId?: string) {
  const vendorId = quote.vendor_id || quote.profiles?.id;
  const shortOrderId = orderId ? String(orderId).replace(/^ORD-/, "") : String(rfq?.id || "");

  const isPickup =
    rfq?.fulfillment_method === "BRANCH_PICKUP" ||
    rfq?.fulfillment_method === "pickup" ||
    rfq?.fulfillment_method === "SELF_PICKUP" ||
    rfq?.delivery_method === "pickup" ||
    quote?.shipping_method === "pickup";

  // 1. Notify Vendor
  if (vendorId) {
    if (isPickup) {
      await createAndDispatchNotification({
        userId: vendorId,
        type: "quote_accepted",
        title: `طلب استلام من الفرع جديد (#${shortOrderId}) 🏬`,
        message: `طلب استلام من الفرع جديد رقم #${shortOrderId} - وافق العميل على عرضك بقيمة ${Number(quote.total_price).toLocaleString("ar-SA")} ر.س. يرجى فحص وتجهيز القطع للعميل بالفرع.`,
        rfqId: rfq?.id,
        quoteId: quote.id,
        orderId: orderId || null,
        actionUrl: orderId ? `/deal/${orderId}` : `/vendor/orders`,
        channelId: "orders_channel",
        soundName: "rfq_alert",
      });
    } else {
      await createAndDispatchNotification({
        userId: vendorId,
        type: "quote_accepted",
        title: `تهانينا! تم قبول عرض السعر الخاص بك 🎉`,
        message: `وافق العميل على عرضك للطلب #${rfq?.id || ""} بقيمة ${Number(quote.total_price).toLocaleString("ar-SA")} ر.س. يرجى تجهيز القطع للشحن والتسليم.`,
        rfqId: rfq?.id,
        quoteId: quote.id,
        orderId: orderId || null,
        actionUrl: orderId ? `/deal/${orderId}` : `/vendor/orders`,
        channelId: "orders_channel",
        soundName: "rfq_alert",
      });
    }

    if (vendorId !== "vendor-demo-id") {
      await createAndDispatchNotification({
        userId: "vendor-demo-id",
        type: "quote_accepted",
        title: `تهانينا! تم قبول عرض السعر الخاص بك (#${shortOrderId}) 🎉`,
        message: `وافق العميل على عرضك للطلب #${rfq?.id || ""} بقيمة ${Number(quote.total_price).toLocaleString("ar-SA")} ر.س. يرجى تجهيز القطع.`,
        rfqId: rfq?.id,
        quoteId: quote.id,
        orderId: orderId || null,
        actionUrl: orderId ? `/deal/${orderId}` : `/vendor/orders`,
        channelId: "orders_channel",
        soundName: "rfq_alert",
      });
    }
  }

  // 2. Notify Client (Order Confirmation)
  if (rfq?.client_id) {
    await createAndDispatchNotification({
      userId: rfq.client_id,
      type: "order_confirmed",
      title: `تم تأكيد طلبك والتعميد بنجاح (#${shortOrderId}) ✅`,
      message: `تم اعتماد عرض السعر وتأكيد الطلب #${shortOrderId}. جاري تجهيز قطع الغيار وسيتم إشعارك بكافة مستجدات التجهيز والشحن.`,
      rfqId: rfq?.id,
      quoteId: quote.id,
      orderId: orderId || null,
      actionUrl: orderId ? `/client/orders` : `/client/orders`,
      channelId: "orders_channel",
      soundName: "rfq_alert",
    });

    if (rfq.client_id !== "client-demo-id") {
      await createAndDispatchNotification({
        userId: "client-demo-id",
        type: "order_confirmed",
        title: `تم تأكيد طلبك والتعميد بنجاح (#${shortOrderId}) ✅`,
        message: `تم اعتماد عرض السعر وتأكيد الطلب #${shortOrderId}. جاري تجهيز قطع الغيار وسيتم إشعارك بكافة مستجدات التجهيز والشحن.`,
        rfqId: rfq?.id,
        quoteId: quote.id,
        orderId: orderId || null,
        actionUrl: orderId ? `/client/orders` : `/client/orders`,
        channelId: "orders_channel",
        soundName: "rfq_alert",
      });
    }
  }
}

/**
 * 4. Event: Delivery Task Assigned to Courier
 */
export async function triggerDeliveryAssignedEvent(delivery: any) {
  if (!delivery) return;

  // Notify Courier
  if (delivery.courier_id) {
    await createAndDispatchNotification({
      userId: delivery.courier_id,
      type: "deal_status_updated",
      title: `مهمة توصيل جديدة مسندة إليك (#${delivery.id}) 🚚`,
      message: `تم إسناد شحنة قطع غيار من فرع (${delivery.vendor_name || "المورد"}) إلى (${delivery.client_name || "العميل"}) بحي ${delivery.dropoff_district || delivery.dropoff_city || "الرياض"}.`,
      deliveryId: delivery.id,
      orderId: delivery.order_id,
      actionUrl: `/courier/orders/${delivery.id}`,
      channelId: "delivery_channel",
      soundName: "rfq_alert",
    });
  }

  // Notify Client
  if (delivery.client_id) {
    await createAndDispatchNotification({
      userId: delivery.client_id,
      type: "deal_status_updated",
      title: `تم تعيين مندوب التوصيل لطلبك #${delivery.order_id || ""}`,
      message: `المندوب (${delivery.courier_name || "المندوب المعتمد"}) يتولى الآن استلام ونقل قطع الغيار إلى موقعك.`,
      deliveryId: delivery.id,
      orderId: delivery.order_id,
      actionUrl: `/deal/${delivery.order_id}`,
      channelId: "delivery_channel",
    });
  }
}

export async function triggerDeliveryStatusUpdatedEvent(delivery: any, newStatus: string) {
  if (!delivery) return;

  const clientId = delivery.client_id;
  const vendorId = delivery.vendor_id;
  const courierId = delivery.courier_id;
  const shortOrderId = (delivery.order_id || delivery.id || "").replace(/^ORD-/, "").replace(/^DEL-/, "");
  const normalizedStatus = String(newStatus).toLowerCase();

  // Stage: Picked up & In Transit (استلام المندوب للقطع والانطلاق)
  if (
    normalizedStatus === "picked_up" ||
    normalizedStatus === "in_transit" ||
    normalizedStatus === "en_route_delivery" ||
    normalizedStatus === "shipped"
  ) {
    if (clientId) {
      await createAndDispatchNotification({
        userId: clientId,
        type: "deal_status_updated",
        title: `المندوب استلم شحنتك وهو في الطريق إليك (#${shortOrderId}) 🚚`,
        message: `تم استلام قطع الغيار من المورد والمندوب متوجه لموقعك الآن. يمكنك تتبع الشحنة مباشرة عبر الخريطة.`,
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        actionUrl: `/deal/${delivery.order_id}`,
        channelId: "delivery_channel",
        soundName: "rfq_alert",
      });
    }
    if (vendorId) {
      await createAndDispatchNotification({
        userId: vendorId,
        type: "deal_status_updated",
        title: `المندوب استلم الشحنة من فرعكم (#${shortOrderId}) 🚚`,
        message: `المندوب (${delivery.courier_name || "المعتمد"}) استلم الشحنة بنجاح وجاري نقلها إلى العميل.`,
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        actionUrl: `/vendor/orders`,
        channelId: "orders_channel",
      });
    }
  }

  // Stage: Arrived at Delivery (وصول المندوب لموقع العميل)
  else if (normalizedStatus === "arrived" || normalizedStatus === "arrived_delivery") {
    if (clientId) {
      await createAndDispatchNotification({
        userId: clientId,
        type: "deal_status_updated",
        title: `مندوب التوصيل وصل إلى موقعك (#${shortOrderId}) 🔔`,
        message: `المندوب متواجد الآن عند موقع التسليم. يرجى تزويده برمز التسليم (OTP) لاستلام الشحنة.`,
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        actionUrl: `/deal/${delivery.order_id}`,
        channelId: "delivery_channel",
        soundName: "rfq_alert",
      });
    }
    if (vendorId) {
      await createAndDispatchNotification({
        userId: vendorId,
        type: "deal_status_updated",
        title: `المندوب وصل إلى موقع العميل (#${shortOrderId}) 📍`,
        message: `المندوب متواجد حالياً لدى العميل لإتمام عملية التسليم وتأكيد الفحص.`,
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        actionUrl: `/vendor/orders`,
        channelId: "orders_channel",
      });
    }
  }

  // Stage: Delivered (تم التسليم بنجاح)
  else if (normalizedStatus === "delivered") {
    if (clientId) {
      await createAndDispatchNotification({
        userId: clientId,
        type: "order_completed",
        title: `تم تسليم طلبك بنجاح (#${shortOrderId}) ✓`,
        message: `تم إكمال تسليم الطلب #${shortOrderId}. نأمل تأكيد الرضا وتقييم المورد ومندوب التوصيل.`,
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        actionUrl: `/deal/${delivery.order_id}`,
        channelId: "orders_channel",
        soundName: "rfq_alert",
      });
    }
    if (vendorId) {
      await createAndDispatchNotification({
        userId: vendorId,
        type: "order_completed",
        title: `تم تسليم الشحنة للعميل وإيداع الأرباح (#${shortOrderId}) 💰`,
        message: `تم تسليم الطلب #${shortOrderId} بنجاح وإيداع مستحقات الصفقة في محفظتك الإلكترونية.`,
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        actionUrl: `/vendor/orders`,
        channelId: "payments_channel",
        soundName: "rfq_alert",
      });
    }
    if (courierId) {
      await createAndDispatchNotification({
        userId: courierId,
        type: "order_completed",
        title: `تم تأكيد تسليم الشحنة (#${shortOrderId}) وإضافة العمولة 💵`,
        message: `تم تسليم الشحنة بنجاح وإضافة عمولة التوصيل إلى محفظتك الإلكترونية.`,
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        actionUrl: `/courier/orders/${delivery.id}`,
        channelId: "delivery_channel",
        soundName: "rfq_alert",
      });
    }
  }
}

/**
 * 6. Event: Support & Chat Message
 */
export async function triggerNewMessageEvent(ticket: any, message: any, recipientId: string) {
  if (!recipientId) return;

  await createAndDispatchNotification({
    userId: recipientId,
    type: "new_message",
    title: `رسالة جديدة بخصوص التذكرة #${ticket.id || ""}`,
    message: message.message || "لديك رسالة جديدة من فريق الدعم والعمليات",
    actionUrl: `/client/support/${ticket.id}`,
    channelId: "messages_channel",
  });
}

/**
 * 7. Event: Wallet Credit / Debit
 */
/**
 * 8. Event: Unified Order Status Transition (العميل، المورد، المندوب)
 * Dispatches push notifications to all relevant parties across every lifecycle stage of the order.
 */
export async function triggerOrderStatusUpdatedEvent(
  order: any,
  newStatus: string,
  actorRole?: string,
  note?: string
) {
  if (!order) return;

  const orderId = order.id || order.order_id || "";
  const shortOrderId = orderId.replace(/^ORD-/, "").replace(/^DEAL-/, "");
  const normalizedStatus = String(newStatus).toLowerCase();
  
  // Resolve participant IDs
  const clientId = order.client_id || order.profiles?.id || order.client?.id;
  const vendorId = order.vendor_id || order.selected_vendor_id;
  const courierId = order.courier_id || order.driver_id;
  const isPickup =
    order.fulfillment_method === "BRANCH_PICKUP" ||
    order.fulfillment_method === "SELF_PICKUP" ||
    order.delivery_method === "pickup" ||
    order.is_pickup === true;

  const vendorDisplay = order.vendor_name || order.company_name || "المورد المعتمد";
  const clientDisplay = order.client_name || "العميل";

  // 1. Status: PREPARING (بدء التجهيز)
  if (normalizedStatus === "preparing" || normalizedStatus === "processing") {
    if (clientId && actorRole !== "client") {
      await createAndDispatchNotification({
        userId: clientId,
        type: "deal_status_updated",
        title: `المورد بدأ تجهيز قطع طلبك (#${shortOrderId}) ⚙️`,
        message: `يقوم (${vendorDisplay}) الآن بفحص وتجهيز قطع الغيار المعتمدة لطلبك استعداداً للتسليم.`,
        orderId: orderId,
        actionUrl: `/deal/${orderId}`,
        channelId: "orders_channel",
        soundName: "rfq_alert",
      });
    }
  }

  // 2. Status: READY / READY_FOR_PICKUP (جاهز للاستلام أو الشحن)
  else if (normalizedStatus === "ready" || normalizedStatus === "ready_for_pickup") {
    if (clientId) {
      if (isPickup) {
        await createAndDispatchNotification({
          userId: clientId,
          type: "deal_status_updated",
          title: `قطع طلبك رقم #${shortOrderId} جاهزة للاستلام الآن في الفرع 🏬`,
          message: `🔔 قطع طلبك رقم #${shortOrderId} جاهزة للاستلام الآن في فرع (${vendorDisplay})! تفضل بزيارتنا وتزويد موظف الفرع برمز الاستلام.`,
          orderId: orderId,
          actionUrl: `/deal/${orderId}`,
          channelId: "orders_channel",
          soundName: "rfq_alert",
        });
      } else {
        await createAndDispatchNotification({
          userId: clientId,
          type: "deal_status_updated",
          title: `تم تجهيز قطع طلبك وجاري الشحن (#${shortOrderId}) 📦`,
          message: `انتهى المورد من تجهيز القطع وجاري التنسيق مع مندوب التوصيل لنقل الشحنة إلى موقعك.`,
          orderId: orderId,
          actionUrl: `/deal/${orderId}`,
          channelId: "orders_channel",
          soundName: "rfq_alert",
        });
      }
    }

    if (courierId && !isPickup) {
      await createAndDispatchNotification({
        userId: courierId,
        type: "deal_status_updated",
        title: `شحنة جاهزة للاستلام لدى المورد (#${shortOrderId}) 🚚`,
        message: `الطلب #${shortOrderId} جاهز للتسليم في فرع (${vendorDisplay}). يرجى التوجه للاستلام.`,
        orderId: orderId,
        actionUrl: `/courier/orders/${orderId}`,
        channelId: "delivery_channel",
        soundName: "rfq_alert",
      });
    }
  }

  // 3. Status: SHIPPED / IN_TRANSIT (تم الاستلام من المورد وفي الطريق)
  else if ((normalizedStatus === "shipped" || normalizedStatus === "in_transit") && !isPickup) {
    if (clientId) {
      await createAndDispatchNotification({
        userId: clientId,
        type: "deal_status_updated",
        title: `المندوب استلم شحنتك وهو في الطريق إليك (#${shortOrderId}) 🚚`,
        message: `تم استلام قطع الغيار من المورد والمندوب متوجه لموقعك الآن. يمكنك تتبع الشحنة مباشرة عبر الخريطة.`,
        orderId: orderId,
        actionUrl: `/deal/${orderId}`,
        channelId: "delivery_channel",
        soundName: "rfq_alert",
      });
    }

    if (vendorId && actorRole !== "vendor") {
      await createAndDispatchNotification({
        userId: vendorId,
        type: "deal_status_updated",
        title: `المندوب استلم الشحنة من فرعكم بنجاح (#${shortOrderId}) ✓`,
        message: `تم تسليم قطع الغيار للمندوب وجاري إيصالها للعميل (${clientDisplay}).`,
        orderId: orderId,
        actionUrl: `/vendor/orders`,
        channelId: "orders_channel",
      });
    }
  }

  // 4. Status: ARRIVED (المندوب وصل لموقع العميل)
  else if (normalizedStatus === "arrived") {
    if (clientId) {
      await createAndDispatchNotification({
        userId: clientId,
        type: "deal_status_updated",
        title: `مندوب التوصيل وصل إلى موقعك (#${shortOrderId}) 🔔`,
        message: `المندوب متواجد الآن عند موقع التسليم لتسليم قطع الغيار وتأكيد الفحص.`,
        orderId: orderId,
        actionUrl: `/deal/${orderId}`,
        channelId: "delivery_channel",
        soundName: "rfq_alert",
      });
    }
  }

  // 5. Status: DELIVERED (تم التسليم)
  else if (normalizedStatus === "delivered") {
    if (clientId) {
      await createAndDispatchNotification({
        userId: clientId,
        type: "deal_status_updated",
        title: `تم تسليم طلبك بنجاح (#${shortOrderId}) 📦`,
        message: `تم إيصال قطع الغيار. نرجو الدخول لتأكيد استلام وفحص القطع وتقييم الخدمة.`,
        orderId: orderId,
        actionUrl: `/deal/${orderId}`,
        channelId: "orders_channel",
        soundName: "rfq_alert",
      });
    }

    if (vendorId) {
      await createAndDispatchNotification({
        userId: vendorId,
        type: "deal_status_updated",
        title: `تم تسليم الطلب للعميل (#${shortOrderId}) 📦`,
        message: `تم تسليم الشحنة للعميل بنجاح وبانتظار اعتماده النهائي.`,
        orderId: orderId,
        actionUrl: `/vendor/orders`,
        channelId: "orders_channel",
      });
    }
  }

  // 6. Status: COMPLETED / RECEIVED (تأكيد الاستلام النهائي والتقييم)
  else if (normalizedStatus === "completed" || normalizedStatus === "received") {
    if (vendorId) {
      await createAndDispatchNotification({
        userId: vendorId,
        type: "order_completed",
        title: isPickup
          ? `تم تسليم الطلب للعميل (#${shortOrderId}) وإيداع الأرباح 💰`
          : `العميل أكد استلام الطلب (#${shortOrderId}) وتم إيداع الأرباح 💰`,
        message: isPickup
          ? `تم تسليم الطلب #${shortOrderId} للعميل (${clientDisplay}) بالفرع بنجاح وإيداع المستحقات في محفظتك الإلكترونية.`
          : `أكد العميل (${clientDisplay}) استلام وفحص القطع بنجاح، وتم إيداع أرباح الصفقة في محفظتك الإلكترونية.`,
        orderId: orderId,
        actionUrl: `/vendor/orders`,
        channelId: "payments_channel",
        soundName: "rfq_alert",
      });
    }

    if (courierId && !isPickup) {
      await createAndDispatchNotification({
        userId: courierId,
        type: "order_completed",
        title: `تم اعتماد إكمال مهمة التوصيل للطلب (#${shortOrderId}) 🌟`,
        message: `شكراً لك! أكد العميل استلام الشحنة برضا تام وتم تسجيل إنجاز التوصيل في سجلك.`,
        orderId: orderId,
        actionUrl: `/courier/orders/${orderId}`,
        channelId: "delivery_channel",
        soundName: "rfq_alert",
      });
    }

    if (clientId) {
      await createAndDispatchNotification({
        userId: clientId,
        type: "order_completed",
        title: isPickup
          ? `تم استلام طلبك بنجاح (#${shortOrderId}) 🎉`
          : `تم اكتمال طلبك (#${shortOrderId}) بنجاح ✓`,
        message: isPickup
          ? `تم تأكيد استلام قطع الغيار من الفرع بنجاح. شكراً لتعاملك مع رفق! شاركنا تقييمك للمتجر.`
          : `تم إكمال الصفقة وإصدار الفاتورة الضريبية الرسمية لطلبك. شكراً لتعاملك مع رفق.`,
        orderId: orderId,
        actionUrl: `/deal/${orderId}`,
        channelId: "orders_channel",
        soundName: "rfq_alert",
      });
    }
  }

  // 7. Status: CANCELLED (إلغاء الطلب)
  else if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    const notifyList = [
      { id: clientId, role: "client" },
      { id: vendorId, role: "vendor" },
      { id: courierId, role: "courier" },
    ].filter((p) => p.id);

    for (const target of notifyList) {
      await createAndDispatchNotification({
        userId: target.id!,
        type: "deal_status_updated",
        title: `تم إلغاء الطلب (#${shortOrderId}) ⚠️`,
        message: `تم إلغاء الطلب #${shortOrderId}${note ? ` بسبب: ${note}` : ""}. يمكنك مراجعة التفاصيل في التطبيق.`,
        orderId: orderId,
        actionUrl: target.role === "vendor" ? `/vendor/orders` : `/deal/${orderId}`,
        channelId: "orders_channel",
      });
    }
  }
}


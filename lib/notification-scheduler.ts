import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { createAndDispatchNotification } from "./notification-service";
import { sendWhatsAppMessage } from "./whatsapp-service";
import { sendEmail, renderEmailTemplate } from "./email-service";

const DATA_DIR = path.join(process.cwd(), "data");
const SCHEDULED_FILE = path.join(DATA_DIR, "scheduled_broadcasts.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

export interface DeliveryChannels {
  in_app: boolean;
  push: boolean;
  email: boolean;
  whatsapp: boolean;
}

export interface ScheduledCampaignRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  target: "all" | "clients" | "vendors" | "couriers" | "user";
  target_user_id?: string;
  priority: "normal" | "important" | "urgent";
  action_url?: string;
  channels: DeliveryChannels;
  scheduled_for: string; // ISO String
  batch_size: number; // e.g. 50
  interval_seconds: number; // e.g. 30
  status: "pending" | "processing" | "completed" | "cancelled" | "failed";
  total_recipients: number;
  processed_count: number;
  batches_total: number;
  batches_completed: number;
  current_recipient_index: number;
  recipient_ids: string[];
  last_batch_at?: string | null;
  created_at: string;
  created_by?: string;
  errors?: string[];
}

function ensureDataFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (_) {}
}

export function loadAllScheduledCampaigns(): ScheduledCampaignRecord[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(SCHEDULED_FILE)) {
      const data = fs.readFileSync(SCHEDULED_FILE, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read scheduled_broadcasts.json:", err);
  }
  return [];
}

export function saveAllScheduledCampaigns(campaigns: ScheduledCampaignRecord[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(campaigns, null, 2), "utf8");
  } catch (err) {
    console.warn("Failed to write scheduled_broadcasts.json:", err);
  }
}

function loadLocalProfiles(): any[] {
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const data = fs.readFileSync(PROFILES_FILE, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

/**
 * Creates a new scheduled campaign and resolves targeted recipient IDs.
 */
export async function createScheduledCampaign(payload: {
  title: string;
  message: string;
  type?: string;
  target?: "all" | "clients" | "vendors" | "couriers" | "user";
  target_user_id?: string;
  priority?: "normal" | "important" | "urgent";
  action_url?: string;
  channels?: Partial<DeliveryChannels>;
  scheduled_for?: string;
  batch_size?: number;
  interval_seconds?: number;
  created_by?: string;
}): Promise<ScheduledCampaignRecord> {
  const campaigns = loadAllScheduledCampaigns();
  const id = `SCHED-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const channels: DeliveryChannels = {
    in_app: payload.channels?.in_app !== false,
    push: payload.channels?.push !== false,
    email: Boolean(payload.channels?.email),
    whatsapp: Boolean(payload.channels?.whatsapp),
  };

  const batchSize = Math.max(5, Math.min(500, Number(payload.batch_size) || 50));
  const intervalSeconds = Math.max(5, Math.min(3600, Number(payload.interval_seconds) || 30));
  const scheduledFor = payload.scheduled_for || now;

  // Resolve Recipient IDs
  let recipientIds: string[] = [];
  const target = payload.target || "all";

  if (target === "user" && payload.target_user_id) {
    recipientIds = [payload.target_user_id];
  } else {
    try {
      const supabase = await createClient();
      let query = supabase.from("profiles").select("id, role");
      if (target === "clients") query = query.eq("role", "client");
      else if (target === "vendors") query = query.eq("role", "vendor");
      else if (target === "couriers") query = query.eq("role", "courier");
      else query = query.in("role", ["client", "vendor", "courier"]);

      const { data } = await query;
      if (data && data.length > 0) {
        recipientIds = data.map((d: any) => d.id);
      }
    } catch (_) {}

    if (recipientIds.length === 0) {
      const local = loadLocalProfiles();
      if (target === "clients") recipientIds = local.filter((p) => p.role === "client").map((p) => p.id);
      else if (target === "vendors") recipientIds = local.filter((p) => p.role === "vendor").map((p) => p.id);
      else if (target === "couriers") recipientIds = local.filter((p) => p.role === "courier").map((p) => p.id);
      else recipientIds = local.map((p) => p.id);
    }
  }

  // Fallback demo users if empty
  if (recipientIds.length === 0) {
    recipientIds = ["client-demo-id", "vendor-demo-id", "courier-demo-id"];
  }

  // Deduplicate
  recipientIds = Array.from(new Set(recipientIds));

  const totalRecipients = recipientIds.length;
  const batchesTotal = Math.ceil(totalRecipients / batchSize);

  const campaign: ScheduledCampaignRecord = {
    id,
    title: payload.title.trim(),
    message: payload.message.trim(),
    type: payload.type || "announcement",
    target,
    target_user_id: payload.target_user_id,
    priority: payload.priority || "normal",
    action_url: payload.action_url?.trim() || undefined,
    channels,
    scheduled_for: scheduledFor,
    batch_size: batchSize,
    interval_seconds: intervalSeconds,
    status: "pending",
    total_recipients: totalRecipients,
    processed_count: 0,
    batches_total: batchesTotal,
    batches_completed: 0,
    current_recipient_index: 0,
    recipient_ids: recipientIds,
    last_batch_at: null,
    created_at: now,
    created_by: payload.created_by || "admin",
    errors: [],
  };

  campaigns.unshift(campaign);
  saveAllScheduledCampaigns(campaigns);

  return campaign;
}

/**
 * Cancels a pending or processing campaign.
 */
export async function cancelScheduledCampaign(campaignId: string): Promise<boolean> {
  const campaigns = loadAllScheduledCampaigns();
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) return false;

  campaign.status = "cancelled";
  saveAllScheduledCampaigns(campaigns);
  return true;
}

/**
 * Deletes a campaign from storage.
 */
export async function deleteScheduledCampaign(campaignId: string): Promise<boolean> {
  const campaigns = loadAllScheduledCampaigns();
  const filtered = campaigns.filter((c) => c.id !== campaignId);
  if (filtered.length === campaigns.length) return false;

  saveAllScheduledCampaigns(filtered);
  return true;
}

/**
 * Core Background Batch Processing Runner:
 * - Scans all pending/processing campaigns that are due (scheduled_for <= now).
 * - Dispatches the next batch of recipients (e.g., 50 members) per campaign.
 * - Respects interval_seconds to prevent server and gateway overload.
 */
export async function processDueScheduledCampaigns(): Promise<{
  processedCampaigns: number;
  processedRecipients: number;
  completedCampaigns: number;
  details: any[];
}> {
  const campaigns = loadAllScheduledCampaigns();
  const now = new Date();
  const nowMs = now.getTime();
  const localProfiles = loadLocalProfiles();

  let processedRecipientsCount = 0;
  let processedCampaignsCount = 0;
  let completedCampaignsCount = 0;
  const details: any[] = [];

  for (const campaign of campaigns) {
    if (campaign.status !== "pending" && campaign.status !== "processing") {
      continue;
    }

    const scheduledTimeMs = new Date(campaign.scheduled_for).getTime();
    if (nowMs < scheduledTimeMs) {
      // Not due yet
      continue;
    }

    // Interval check for throttling
    if (campaign.last_batch_at) {
      const lastBatchMs = new Date(campaign.last_batch_at).getTime();
      const waitRequiredMs = campaign.interval_seconds * 1000;
      if (nowMs - lastBatchMs < waitRequiredMs) {
        // Still in cooldown interval between batches
        continue;
      }
    }

    // Mark as processing
    campaign.status = "processing";
    processedCampaignsCount++;

    const startIndex = campaign.current_recipient_index || 0;
    const batchSlice = campaign.recipient_ids.slice(startIndex, startIndex + campaign.batch_size);

    if (batchSlice.length === 0) {
      campaign.status = "completed";
      completedCampaignsCount++;
      continue;
    }

    console.log(`[Notification Scheduler] Processing Batch ${campaign.batches_completed + 1}/${campaign.batches_total} for campaign ${campaign.id} (${batchSlice.length} recipients)...`);

    for (const userId of batchSlice) {
      try {
        const userProf = localProfiles.find((p) => p.id === userId);
        const recipientEmail = userProf?.email;
        const recipientPhone = userProf?.phone;
        const recipientName = userProf?.full_name || userProf?.company_name;

        // 1. In-App & FCM Push Dispatch
        if (campaign.channels.in_app || campaign.channels.push) {
          await createAndDispatchNotification({
            userId,
            type: campaign.type,
            title: campaign.title,
            message: campaign.message,
            actionUrl: campaign.action_url || undefined,
            channelId: campaign.priority === "urgent" ? "urgent_alerts" : "admin_broadcasts",
            soundName: campaign.priority === "urgent" ? "rfq_alert" : "default",
          });
        }

        // 2. Email Dispatch
        if (campaign.channels.email && recipientEmail) {
          const actionUrlFull = campaign.action_url
            ? campaign.action_url.startsWith("http")
              ? campaign.action_url
              : `https://rfq-sa.com${campaign.action_url}`
            : undefined;

          const emailHtml = renderEmailTemplate({
            title: campaign.title,
            subtitle: recipientName ? `مرحباً ${recipientName}` : undefined,
            badge: "إعلان إداري مجدول",
            contentHtml: `
              <p style="font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">${campaign.message}</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 12px; color: #64748b;">
                <span>حملة مجدولة: <strong>${campaign.id}</strong></span> · 
                <span>تاريخ الإرسال: <strong>${new Date().toLocaleString("ar-SA")}</strong></span>
              </div>
            `,
            actionButton: actionUrlFull ? { text: "الانتقال إلى المنصة", url: actionUrlFull } : undefined,
          });

          sendEmail({
            to: recipientEmail,
            subject: `[منصة RFQ] ${campaign.title}`,
            html: emailHtml,
            eventType: "SCHEDULED_CAMPAIGN",
            notificationId: campaign.id,
          }).catch((err) => {
            console.warn(`[Notification Scheduler] Email error for ${userId}:`, err?.message || err);
          });
        }

        // 3. WhatsApp Dispatch
        if (campaign.channels.whatsapp && recipientPhone) {
          const actionUrlFull = campaign.action_url
            ? campaign.action_url.startsWith("http")
              ? campaign.action_url
              : `https://rfq-sa.com${campaign.action_url}`
            : undefined;

          sendWhatsAppMessage({
            to: recipientPhone,
            message: `🔔 *[منصة RFQ]*\n*${campaign.title}*\n\n${campaign.message}`,
            actionUrl: actionUrlFull,
            eventType: "SCHEDULED_CAMPAIGN",
            notificationId: campaign.id,
          }).catch((err) => {
            console.warn(`[Notification Scheduler] WhatsApp error for ${userId}:`, err?.message || err);
          });
        }

        processedRecipientsCount++;
      } catch (err: any) {
        campaign.errors = campaign.errors || [];
        campaign.errors.push(`User ${userId}: ${err?.message || err}`);
      }
    }

    // Update Campaign Progress
    campaign.current_recipient_index = startIndex + batchSlice.length;
    campaign.processed_count = campaign.current_recipient_index;
    campaign.batches_completed = (campaign.batches_completed || 0) + 1;
    campaign.last_batch_at = new Date().toISOString();

    if (campaign.current_recipient_index >= campaign.total_recipients) {
      campaign.status = "completed";
      completedCampaignsCount++;
    }

    details.push({
      campaignId: campaign.id,
      batchIndex: campaign.batches_completed,
      batchSize: batchSlice.length,
      processedTotal: campaign.processed_count,
      status: campaign.status,
    });
  }

  saveAllScheduledCampaigns(campaigns);

  return {
    processedCampaigns: processedCampaignsCount,
    processedRecipients: processedRecipientsCount,
    completedCampaigns: completedCampaignsCount,
    details,
  };
}

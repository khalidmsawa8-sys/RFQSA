import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret, isEncryptedSecret } from "./security-crypto";

export interface SystemSettings {
  rfq_visibility_duration_minutes: number;
  auto_cancel_expired: boolean;
  maintenance_mode: boolean;
  maintenance_message?: string;
  platform_commission_percent: number; // Backwards-compatibility fallback
  client_platform_fee_percent: number; // Uniform Client Platform Fee (%) - Added to parts
  vendor_platform_fee_percent: number; // Uniform Vendor Platform Fee (%) - Deducted from dues
  fee_calculation_basis?: string; // "parts_before_vat"
  client_fee_label?: string; // "رسوم المنصة"
  auto_wallet_settlement?: boolean; // Automatic distribution on payment
  separate_platform_fee_transactions?: boolean; // Separate client & vendor platform fee ledger records
  vat_percent: number;
  cr_number: string;
  vat_number: string;
  require_vendor_verification: boolean;
  max_quotes_per_rfq: number;
  allow_customer_cancel_after_quotes: boolean;
  // SMTP Email Server Configuration (Encrypted)
  smtp_enabled?: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_name?: string;
  smtp_from_email?: string;
  smtp_secure?: boolean;
  // WhatsApp Gateway Configuration (Encrypted)
  whatsapp_enabled?: boolean;
  whatsapp_provider?: "meta_cloud" | "ultramsg" | "twilio" | "custom_webhook";
  whatsapp_api_url?: string;
  whatsapp_api_token?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_instance_id?: string;
  whatsapp_account_sid?: string;
  updated_at?: string;
  updated_by?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  rfq_visibility_duration_minutes: 2880, // 48 hours in minutes
  auto_cancel_expired: true,
  maintenance_mode: false,
  maintenance_message: "الموقع يخضع حالياً لبعض أعمال التحديث والترقية المجدولة لخدمتكم بشكل أفضل، وسنعود للعمل خلال دقائق.",
  platform_commission_percent: 15,
  client_platform_fee_percent: 5,
  vendor_platform_fee_percent: 15,
  fee_calculation_basis: "parts_before_vat",
  client_fee_label: "رسوم المنصة",
  auto_wallet_settlement: true,
  separate_platform_fee_transactions: true,
  vat_percent: 15,
  cr_number: "1010789456",
  vat_number: "310987654300003",
  require_vendor_verification: true,
  max_quotes_per_rfq: 10,
  allow_customer_cancel_after_quotes: true,
  // SMTP Defaults
  smtp_enabled: false,
  smtp_host: "smtp.gmail.com",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
  smtp_from_name: "منصة RFQ السعودية",
  smtp_from_email: "notifications@rfq-sa.com",
  smtp_secure: false,
  // WhatsApp Defaults
  whatsapp_enabled: false,
  whatsapp_provider: "ultramsg",
  whatsapp_api_url: "https://api.ultramsg.com/instance/messages/chat",
  whatsapp_api_token: "",
  whatsapp_phone_number_id: "",
  whatsapp_instance_id: "",
  whatsapp_account_sid: "",
  updated_at: new Date().toISOString(),
  updated_by: "system",
};

const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "system_settings.json");

/**
 * Loads system settings from file or database with safe defaults and auto-migrates legacy plaintext secrets.
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      let fileNeedsUpdate = false;

      // 1. Auto-migrate SMTP password
      if (parsed.smtp_password && typeof parsed.smtp_password === "string" && !isEncryptedSecret(parsed.smtp_password)) {
        const encrypted = encryptSecret(parsed.smtp_password);
        if (encrypted) {
          parsed.smtp_password = encrypted;
          fileNeedsUpdate = true;
        }
      }

      // 2. Auto-migrate WhatsApp API token
      if (parsed.whatsapp_api_token && typeof parsed.whatsapp_api_token === "string" && !isEncryptedSecret(parsed.whatsapp_api_token)) {
        const encrypted = encryptSecret(parsed.whatsapp_api_token);
        if (encrypted) {
          parsed.whatsapp_api_token = encrypted;
          fileNeedsUpdate = true;
        }
      }

      if (fileNeedsUpdate) {
        try {
          fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(parsed, null, 2), "utf-8");
          console.log("[system-settings] Auto-migrated legacy plaintext credentials to AES-256-GCM format.");
        } catch (migrateErr) {
          console.warn("[system-settings] Failed to write back migrated settings:", migrateErr);
        }
      }

      return {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...parsed,
        rfq_visibility_duration_minutes: Number(parsed.rfq_visibility_duration_minutes) || DEFAULT_SYSTEM_SETTINGS.rfq_visibility_duration_minutes,
        platform_commission_percent: parsed.platform_commission_percent !== undefined ? Number(parsed.platform_commission_percent) : DEFAULT_SYSTEM_SETTINGS.platform_commission_percent,
        client_platform_fee_percent: parsed.client_platform_fee_percent !== undefined
          ? Number(parsed.client_platform_fee_percent)
          : (parsed.platform_commission_percent !== undefined ? Number(parsed.platform_commission_percent) : DEFAULT_SYSTEM_SETTINGS.client_platform_fee_percent),
        vendor_platform_fee_percent: parsed.vendor_platform_fee_percent !== undefined
          ? Number(parsed.vendor_platform_fee_percent)
          : (parsed.platform_commission_percent !== undefined ? Number(parsed.platform_commission_percent) : DEFAULT_SYSTEM_SETTINGS.vendor_platform_fee_percent),
        vat_percent: parsed.vat_percent !== undefined ? Number(parsed.vat_percent) : DEFAULT_SYSTEM_SETTINGS.vat_percent,
        cr_number: parsed.cr_number ? String(parsed.cr_number).trim() : DEFAULT_SYSTEM_SETTINGS.cr_number,
        vat_number: parsed.vat_number ? String(parsed.vat_number).trim() : DEFAULT_SYSTEM_SETTINGS.vat_number,
      };
    }
  } catch (err) {
    console.warn("[system-settings] Failed to read settings file, fallback to defaults:", err);
  }

  return { ...DEFAULT_SYSTEM_SETTINGS };
}

/**
 * Saves system settings and automatically applies the duration to all existing requests
 */
export async function updateSystemSettings(
  newSettings: Partial<SystemSettings>,
  updatedBy: string = "admin"
): Promise<{
  settings: SystemSettings;
  affected: { cancelledCount: number; updatedCount: number; totalProcessed: number };
}> {
  const current = await getSystemSettings();
  const durationMinutes = Math.max(
    1,
    Number(newSettings.rfq_visibility_duration_minutes ?? current.rfq_visibility_duration_minutes)
  );

  const clientFee = newSettings.client_platform_fee_percent !== undefined
    ? Math.min(100, Math.max(0, Number(newSettings.client_platform_fee_percent)))
    : (newSettings.platform_commission_percent !== undefined
      ? Math.min(100, Math.max(0, Number(newSettings.platform_commission_percent)))
      : current.client_platform_fee_percent);

  const vendorFee = newSettings.vendor_platform_fee_percent !== undefined
    ? Math.min(100, Math.max(0, Number(newSettings.vendor_platform_fee_percent)))
    : (newSettings.platform_commission_percent !== undefined
      ? Math.min(100, Math.max(0, Number(newSettings.platform_commission_percent)))
      : current.vendor_platform_fee_percent);

  const updatedSettings: SystemSettings = {
    ...current,
    ...newSettings,
    rfq_visibility_duration_minutes: durationMinutes,
    client_platform_fee_percent: clientFee,
    vendor_platform_fee_percent: vendorFee,
    platform_commission_percent: clientFee, // Mirror client fee for compatibility
    vat_percent: newSettings.vat_percent !== undefined
      ? Math.min(100, Math.max(0, Number(newSettings.vat_percent)))
      : current.vat_percent,
    cr_number: newSettings.cr_number !== undefined
      ? String(newSettings.cr_number).trim()
      : current.cr_number,
    vat_number: newSettings.vat_number !== undefined
      ? String(newSettings.vat_number).trim()
      : current.vat_number,
    fee_calculation_basis: newSettings.fee_calculation_basis !== undefined
      ? String(newSettings.fee_calculation_basis).trim()
      : current.fee_calculation_basis,
    client_fee_label: newSettings.client_fee_label !== undefined
      ? String(newSettings.client_fee_label).trim()
      : current.client_fee_label,
    auto_wallet_settlement: newSettings.auto_wallet_settlement !== undefined
      ? Boolean(newSettings.auto_wallet_settlement)
      : current.auto_wallet_settlement,
    separate_platform_fee_transactions: newSettings.separate_platform_fee_transactions !== undefined
      ? Boolean(newSettings.separate_platform_fee_transactions)
      : current.separate_platform_fee_transactions,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  // Encrypt SMTP password if supplied plaintext
  if (updatedSettings.smtp_password && !isEncryptedSecret(updatedSettings.smtp_password)) {
    const encrypted = encryptSecret(updatedSettings.smtp_password);
    if (encrypted) updatedSettings.smtp_password = encrypted;
  }

  // Encrypt WhatsApp token if supplied plaintext
  if (updatedSettings.whatsapp_api_token && !isEncryptedSecret(updatedSettings.whatsapp_api_token)) {
    const encrypted = encryptSecret(updatedSettings.whatsapp_api_token);
    if (encrypted) updatedSettings.whatsapp_api_token = encrypted;
  }

  // 1. Persist to local JSON file
  try {
    const dataDir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(updatedSettings, null, 2), "utf-8");
  } catch (err) {
    console.error("[system-settings] Failed to write settings file:", err);
  }

  // 2. Automatically apply to all existing requests (RFQs)
  const affected = await applyDurationToAllRequests(durationMinutes);

  return {
    settings: updatedSettings,
    affected,
  };
}

/**
 * Applies the duration to all RFQs:
 * - If (now - created_at) >= durationMinutes -> status transitions to 'cancelled'
 * - If still active -> recalculates expires_at = created_at + durationMinutes
 */
export async function applyDurationToAllRequests(durationMinutes: number): Promise<{
  cancelledCount: number;
  updatedCount: number;
  totalProcessed: number;
}> {
  let cancelledCount = 0;
  let updatedCount = 0;
  let totalProcessed = 0;
  const now = Date.now();

  try {
    const supabase = await createClient();

    // Fetch all open or quoted RFQs
    const { data: activeRfqs, error } = await supabase
      .from("rfqs")
      .select("id, created_at, status, expires_at")
      .in("status", ["open", "quoted"]);

    if (!error && Array.isArray(activeRfqs)) {
      totalProcessed = activeRfqs.length;

      for (const rfq of activeRfqs) {
        const createdAtMs = new Date(rfq.created_at || now).getTime();
        const expiryMs = createdAtMs + durationMinutes * 60 * 1000;

        if (now >= expiryMs) {
          // EXPIRED: transition to 'cancelled'
          await supabase
            .from("rfqs")
            .update({
              status: "cancelled",
              expires_at: new Date(expiryMs).toISOString(),
            })
            .eq("id", rfq.id);
          cancelledCount++;
        } else {
          // ACTIVE: update remaining expires_at and expiry_hours
          const newExpiresAt = new Date(expiryMs).toISOString();
          const expiryHours = Math.round((durationMinutes / 60) * 10) / 10;
          await supabase
            .from("rfqs")
            .update({
              expires_at: newExpiresAt,
              expiry_hours: expiryHours,
            })
            .eq("id", rfq.id);
          updatedCount++;
        }
      }
    }
  } catch (supabaseErr) {
    console.warn("[system-settings] Supabase apply error (proceeding to local db):", supabaseErr);
  }

  // Also update data/rfqs_db.json if present
  try {
    const rfqsJsonPath = path.join(process.cwd(), "data", "rfqs_db.json");
    if (fs.existsSync(rfqsJsonPath)) {
      const rfqsRaw = fs.readFileSync(rfqsJsonPath, "utf-8");
      const rfqs = JSON.parse(rfqsRaw);
      let jsonModified = false;

      if (Array.isArray(rfqs)) {
        for (const rfq of rfqs) {
          if (rfq.status === "open" || rfq.status === "quoted") {
            const createdAtMs = new Date(rfq.created_at || now).getTime();
            const expiryMs = createdAtMs + durationMinutes * 60 * 1000;

            if (now >= expiryMs) {
              rfq.status = "cancelled";
              rfq.expires_at = new Date(expiryMs).toISOString();
              jsonModified = true;
              if (totalProcessed === 0) cancelledCount++;
            } else {
              rfq.expires_at = new Date(expiryMs).toISOString();
              rfq.expiry_hours = Math.round((durationMinutes / 60) * 10) / 10;
              jsonModified = true;
              if (totalProcessed === 0) updatedCount++;
            }
          }
        }

        if (totalProcessed === 0) {
          totalProcessed = cancelledCount + updatedCount;
        }

        if (jsonModified) {
          fs.writeFileSync(rfqsJsonPath, JSON.stringify(rfqs, null, 2), "utf-8");
        }
      }
    }
  } catch (jsonErr) {
    console.warn("[system-settings] Failed to update data/rfqs_db.json:", jsonErr);
  }

  return { cancelledCount, updatedCount, totalProcessed };
}

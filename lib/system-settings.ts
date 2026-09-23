import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export interface SystemSettings {
  rfq_visibility_duration_minutes: number;
  auto_cancel_expired: boolean;
  maintenance_mode: boolean;
  maintenance_message?: string;
  platform_commission_percent: number;
  vat_percent: number;
  cr_number: string;
  vat_number: string;
  require_vendor_verification: boolean;
  max_quotes_per_rfq: number;
  allow_customer_cancel_after_quotes: boolean;
  updated_at?: string;
  updated_by?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  rfq_visibility_duration_minutes: 2880, // 48 hours in minutes
  auto_cancel_expired: true,
  maintenance_mode: false,
  maintenance_message: "الموقع يخضع حالياً لبعض أعمال التحديث والترقية المجدولة لخدمتكم بشكل أفضل، وسنعود للعمل خلال دقائق.",
  platform_commission_percent: 5,
  vat_percent: 15,
  cr_number: "1010789456",
  vat_number: "310987654300003",
  require_vendor_verification: true,
  max_quotes_per_rfq: 10,
  allow_customer_cancel_after_quotes: true,
  updated_at: new Date().toISOString(),
  updated_by: "system",
};

const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "system_settings.json");

/**
 * Loads system settings from file or database with safe defaults
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...parsed,
        rfq_visibility_duration_minutes: Number(parsed.rfq_visibility_duration_minutes) || DEFAULT_SYSTEM_SETTINGS.rfq_visibility_duration_minutes,
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

  const updatedSettings: SystemSettings = {
    ...current,
    ...newSettings,
    rfq_visibility_duration_minutes: durationMinutes,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

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

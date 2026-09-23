import { createClient } from "@/lib/supabase/server";

export interface LogActivityEventParams {
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: "admin" | "vendor" | "client" | "courier" | "system" | string;
  actorRefCode?: string | null;
  action: string;
  entityType: "order" | "rfq" | "quote" | "wallet" | "user" | "invoice" | "support" | "branch" | "vehicle" | string;
  entityId?: string | null;
  details?: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, any>;
}

/**
 * Universal Single-Source-of-Truth Activity & Audit Logger
 * Records immutable system events across all critical operations:
 * - Orders & RFQs (creation, update, cancellation, state transitions)
 * - Quotes (submission, acceptance, rejection)
 * - Wallet (deposits, withdrawals, transfers, payments, adjustments)
 * - Users & Organizations (creation, modification, suspension)
 * - Invoices (issuance, status changes)
 * - Administrative interventions
 */
export async function logActivityEvent(params: LogActivityEventParams): Promise<void> {
  try {
    const supabase = await createClient();

    const timestamp = new Date().toISOString();
    const logId = crypto.randomUUID();

    const record = {
      id: logId,
      actor_id: params.actorId || "system",
      performed_by: params.actorId || null,
      actor_name: params.actorName || "النظام",
      actor_role: params.actorRole || "system",
      actor_ref_code: params.actorRefCode || null,
      action: params.action,
      entity_type: params.entityType,
      table_name: params.entityType,
      entity_id: params.entityId || null,
      record_id: params.entityId || null,
      details: params.details || params.action,
      description: params.details || params.action,
      old_values: params.beforeState || null,
      before_data: params.beforeState || null,
      new_values: params.afterState || null,
      after_data: params.afterState || null,
      metadata: params.metadata || {},
      severity: params.severity || "info",
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      created_at: timestamp,
      timestamp,
      actor: {
        id: params.actorId || null,
        full_name: params.actorName || "النظام",
        ref_code: params.actorRefCode || "SYS",
        role: params.actorRole || "system",
      },
    };

    // Insert to staff_audit_logs (which also backs audit_logs)
    await supabase.from("staff_audit_logs").insert(record);
  } catch (err) {
    console.error("[AUDIT_LOG_ERROR]: Failed to record activity event:", err);
  }
}

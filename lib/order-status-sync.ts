/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RIFQ CENTRAL ORDER STATUS SYNCHRONIZATION ENGINE & EVENT BUS
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a single, authoritative, synchronized status pipeline across:
 * 1. Supabase database (`orders` & `deals` tables)
 * 2. Real-time PostgreSQL event channels
 * 3. Client-side LocalStorage cross-tab persistence
 * 4. Window Event Bus (`rfq_data_changed` & `storage`)
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export const ORDER_LIFECYCLE_STEPS = [
  { key: "preparing", label: "تم التجهيز", stepIndex: 1 },
  { key: "shipped", label: "تم الشحن", stepIndex: 2 },
  { key: "delivered", label: "جاري التسليم", stepIndex: 3 },
  { key: "completed", label: "تأكيد واستلام", stepIndex: 4 },
];

export const STATUS_STEP_INDEX_MAP: Record<string, number> = {
  confirmed: 1,
  preparing: 1,
  pending: 1,
  en_route_pickup: 1,
  ready: 2,
  shipped: 2,
  arrived_pickup: 2,
  picked_up: 2,
  delivered: 3,
  out_for_delivery: 3,
  en_route_delivery: 3,
  arrived_delivery: 3,
  completed: 4,
  closed: 4,
  received: 4,
  cancelled: 0,
};

/**
 * Normalizes any legacy or variant status string into standard status key
 */
export function normalizeOrderStatus(status?: string | null): string {
  if (!status) return "preparing";
  const s = status.toLowerCase().trim();
  if (s === "confirmed") return "preparing";
  if (s === "processing") return "ready";
  if (s === "en_route_delivery" || s === "arrived_delivery" || s === "out_for_delivery") return "delivered";
  if (s === "picked_up") return "shipped";
  return s;
}

/**
 * Reads the most up-to-date effective status, giving authoritative priority
 * to the server DB status while supporting short-lived local optimistic updates (<12s).
 */
export function getEffectiveOrderStatus(orderId: string, fallbackStatus: string = "preparing"): string {
  if (typeof window === "undefined" || !orderId) {
    return normalizeOrderStatus(fallbackStatus);
  }

  const normFallback = normalizeOrderStatus(fallbackStatus);
  const cleanId = String(orderId).replace(/^ORD-/, "").replace(/^DEAL-/, "");
  const rawNum = String(orderId).replace(/\D+/g, "");

  try {
    // Check all possible ID formats in localStorage
    const cached =
      localStorage.getItem(`rfq_order_status_${orderId}`) ||
      localStorage.getItem(`rfq_order_status_ORD-${cleanId}`) ||
      localStorage.getItem(`rfq_order_status_${cleanId}`) ||
      (rawNum ? localStorage.getItem(`rfq_order_status_ORD-${rawNum}`) : null) ||
      (rawNum ? localStorage.getItem(`rfq_order_status_${rawNum}`) : null) ||
      localStorage.getItem(`rfq_deal_status_${orderId}`) ||
      localStorage.getItem(`rfq_deal_status_DEAL-${cleanId}`) ||
      localStorage.getItem(`rfq_deal_status_${cleanId}`) ||
      (rawNum ? localStorage.getItem(`rfq_deal_status_DEAL-${rawNum}`) : null) ||
      (rawNum ? localStorage.getItem(`rfq_deal_status_${rawNum}`) : null);

    const serverStep = STATUS_STEP_INDEX_MAP[normFallback] ?? 1;

    if (cached) {
      const cachedNorm = normalizeOrderStatus(cached);
      const cachedStep = STATUS_STEP_INDEX_MAP[cachedNorm] ?? 1;

      // Check if this was a recent local optimistic update (< 12 seconds)
      const lastUpdateRaw = localStorage.getItem("rfq_last_status_update");
      let isRecentLocalUpdate = false;
      if (lastUpdateRaw) {
        try {
          const parsed = JSON.parse(lastUpdateRaw);
          if (
            (parsed.orderId === orderId ||
              parsed.orderId === `ORD-${cleanId}` ||
              parsed.orderId === cleanId ||
              (rawNum && (parsed.orderId === `ORD-${rawNum}` || parsed.orderId === rawNum))) &&
            Date.now() - (parsed.timestamp || 0) < 12000
          ) {
            isRecentLocalUpdate = true;
          }
        } catch {}
      }

      // If server has advanced or reached the same stage, OR if cache is not a recent local click:
      // Authoritative server state WINS!
      if (serverStep >= cachedStep || !isRecentLocalUpdate) {
        localStorage.setItem(`rfq_order_status_${orderId}`, normFallback);
        localStorage.setItem(`rfq_order_status_ORD-${cleanId}`, normFallback);
        localStorage.setItem(`rfq_order_status_${cleanId}`, normFallback);
        return normFallback;
      }

      return cachedNorm;
    } else {
      localStorage.setItem(`rfq_order_status_${orderId}`, normFallback);
      localStorage.setItem(`rfq_order_status_ORD-${cleanId}`, normFallback);
      localStorage.setItem(`rfq_order_status_${cleanId}`, normFallback);
    }
  } catch (e) {
    // Ignore storage read error
  }

  return normFallback;
}

/**
 * Central atomic function to update and broadcast an order status change
 * across the entire application ecosystem.
 */
export async function syncOrderStatusUpdate(params: {
  orderId: string;
  newStatus: string;
  dealId?: string;
  actorRole?: "vendor" | "client" | "courier" | "admin";
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { orderId, newStatus, dealId, actorRole = "vendor", description } = params;
  const normalized = normalizeOrderStatus(newStatus);
  const cleanId = String(orderId).replace(/^ORD-/, "").replace(/^DEAL-/, "");
  const rawNum = String(orderId).replace(/\D+/g, "");
  const fullOrderId = `ORD-${cleanId}`;
  const fullDealId = `DEAL-${cleanId}`;

  // ── Role Authority Guard ──
  // Vendor is exclusively responsible for "preparing" & "ready" (تم التجهيز).
  // Courier is responsible for "shipped" & "delivered" (or vendor for branch pickup).
  // Client is ONLY allowed to confirm receipt ("completed" / "received") or cancel before fulfillment.
  if (actorRole === "client") {
    if (normalized === "preparing" || normalized === "ready") {
      console.warn(`[syncOrderStatusUpdate] Blocked unauthorized client status update: ${normalized}`);
      return {
        success: false,
        error: "غير مصرح: المورد فقط هو المخول بتحديث حالة الطلب إلى (تم التجهيز).",
      };
    }
    if (normalized === "shipped") {
      console.warn(`[syncOrderStatusUpdate] Blocked unauthorized client status update: ${normalized}`);
      return {
        success: false,
        error: "غير مصرح: مندوب التوصيل أو المورد فقط هو المسؤول عن شحن الطلب.",
      };
    }
    if (normalized === "delivered") {
      console.warn(`[syncOrderStatusUpdate] Blocked unauthorized client status update: ${normalized}`);
      return {
        success: false,
        error: "غير مصرح: مندوب التوصيل فقط هو المسؤول عن تسليم الطلب.",
      };
    }
  }

  // 1. Immediately cache in LocalStorage for instant UI updates & cross-tab sync
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`rfq_order_status_${orderId}`, normalized);
      localStorage.setItem(`rfq_order_status_${fullOrderId}`, normalized);
      localStorage.setItem(`rfq_order_status_${cleanId}`, normalized);
      if (rawNum) {
        localStorage.setItem(`rfq_order_status_ORD-${rawNum}`, normalized);
        localStorage.setItem(`rfq_order_status_${rawNum}`, normalized);
        localStorage.setItem(`rfq_deal_status_DEAL-${rawNum}`, normalized);
        localStorage.setItem(`rfq_deal_status_${rawNum}`, normalized);
      }
      if (dealId) {
        localStorage.setItem(`rfq_deal_status_${dealId}`, normalized);
      }
      localStorage.setItem(`rfq_deal_status_${fullDealId}`, normalized);
      localStorage.setItem(`rfq_deal_status_${cleanId}`, normalized);
      localStorage.setItem("rfq_last_status_update", JSON.stringify({ orderId, status: normalized, timestamp: Date.now() }));
    } catch (e) {
      console.warn("[syncOrderStatusUpdate] localStorage write failed:", e);
    }

    // 2. Dispatch immediate in-memory and storage events
    window.dispatchEvent(
      new CustomEvent("rfq_data_changed", {
        detail: { orderId, fullOrderId, cleanId, dealId, status: normalized },
      })
    );
    window.dispatchEvent(new Event("storage"));
  }

  // 3. Persist to Supabase Database (Promise.allSettled to never crash)
  try {
    const statusLabel =
      normalized === "preparing" || normalized === "ready"
        ? "تم التجهيز"
        : normalized === "shipped"
        ? "تم الشحن"
        : normalized === "delivered"
        ? "جاري التسليم"
        : normalized === "completed"
        ? "تأكيد واستلام"
        : normalized;

    const eventDesc = description || `تم تحديث حالة الطلب إلى: ${statusLabel}`;

    await Promise.allSettled([
      // Update orders table with exact ID
      supabase.from("orders").update({ status: normalized }).eq("id", orderId),
      // Update orders table with full ID
      supabase.from("orders").update({ status: normalized }).eq("id", fullOrderId),
      // Update orders table with clean numeric ID
      supabase.from("orders").update({ status: normalized }).eq("id", cleanId),
      // Update deals table
      dealId ? supabase.from("deals").update({ status: normalized, updated_at: new Date().toISOString() }).eq("id", dealId) : Promise.resolve(),
      supabase.from("deals").update({ status: normalized, updated_at: new Date().toISOString() }).eq("order_id", orderId),
      supabase.from("deals").update({ status: normalized, updated_at: new Date().toISOString() }).eq("order_id", cleanId),
      // Insert Timeline Event
      supabase.from("deal_events").insert({
        deal_id: dealId || orderId,
        event_type: normalized === "completed" ? "deal_completed" : "status_changed",
        description: eventDesc,
      }),
      // Insert Order Activity Log
      supabase.from("order_activity_log").insert({
        order_id: cleanId,
        event_type: "status_changed",
        description: eventDesc,
      }),
      // Synchronize server-side orders_db.json
      typeof window !== "undefined"
        ? fetch("/api/v1/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: fullOrderId, rawId: orderId, cleanId, dealId, status: normalized }),
          }).catch(() => {})
        : Promise.resolve(),
    ]);

    return { success: true };
  } catch (err: any) {
    console.warn("[syncOrderStatusUpdate] Database update warning:", err?.message);
    return { success: true }; // Local optimistic update succeeded
  }
}

/**
 * React hook that guarantees live, real-time synchronization of order status
 */
export function useSyncedOrderStatus(orderId: string, initialStatus: string = "preparing") {
  const [status, setStatus] = useState<string>(() =>
    getEffectiveOrderStatus(orderId, initialStatus)
  );

  const cleanId = String(orderId).replace(/^ORD-/, "").replace(/^DEAL-/, "");

  const refreshFromCache = useCallback(() => {
    const current = getEffectiveOrderStatus(orderId, status);
    if (current && current !== status) {
      setStatus(current);
    }
  }, [orderId, status]);

  useEffect(() => {
    // 1. Initial check
    refreshFromCache();

    // 2. Window event listeners
    const handleCustomChange = (e: any) => {
      const detail = e.detail;
      if (
        detail &&
        (detail.orderId === orderId ||
          detail.fullOrderId === orderId ||
          detail.cleanId === cleanId ||
          detail.dealId === orderId)
      ) {
        setStatus(detail.status);
      } else {
        refreshFromCache();
      }
    };

    const handleStorageChange = () => {
      refreshFromCache();
    };

    window.addEventListener("rfq_data_changed", handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    // 3. Supabase Realtime Channels for orders & deals
    const channel = supabase
      .channel(`synced-status:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload: any) => {
          if (payload?.new?.status) {
            setStatus(normalizeOrderStatus(payload.new.status));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deals", filter: `order_id=eq.${cleanId}` },
        (payload: any) => {
          if (payload?.new?.status) {
            setStatus(normalizeOrderStatus(payload.new.status));
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("rfq_data_changed", handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
      supabase.removeChannel(channel);
    };
  }, [orderId, cleanId, refreshFromCache]);

  return {
    status,
    stepIndex: STATUS_STEP_INDEX_MAP[status] || 1,
    updateStatus: (newStatus: string, options?: any) =>
      syncOrderStatusUpdate({ orderId, newStatus, ...options }),
  };
}

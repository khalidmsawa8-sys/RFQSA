"use client";

/**
 * useOrderRealtime
 *
 * Single source of truth for one order's live status and pending edit requests.
 *
 * Subscribes to:
 *   order-{id}-status        → orders UPDATE     (status changes)
 *   order-{id}-changes       → deal_item_changes INSERT | UPDATE | DELETE
 *
 * Returns:
 *   liveStatus          — current order status, initialised from `initialStatus`
 *   pendingChanges      — pending deal_item_changes for this order (excluding own requests)
 *   pendingCount        — convenience count
 *   refreshChanges()    — manually re-fetch changes (e.g. after approving one)
 *
 * The supabase singleton (globalThis) is used — never creates a second GoTrueClient.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface PendingEditChange {
  id: string;
  order_id: string;
  change_type: string;
  requested_by: string;
  created_at: string;
  status: string;
  part_name?: string;
  part_number?: string;
  quantity?: number;
  unit_price?: number;
  notes?: string;
  requester?: { full_name?: string; company_name?: string };
  orders?: { rfqs?: { car_make?: string; car_model?: string; car_year?: number } | null } | null;
}

interface UseOrderRealtimeOptions {
  orderId: string;
  initialStatus?: string;
  /** Current user id — used to exclude own requests from pendingChanges */
  currentUserId?: string;
  /** If false, skip fetching pendingChanges (e.g. in deal-page-client we handle that ourselves) */
  fetchChanges?: boolean;
  /** Legacy callbacks — still supported for deal-page-client compatibility */
  onStatusChange?: (newStatus: string) => void;
  onChangesUpdate?: () => void;
}

interface UseOrderRealtimeResult {
  liveStatus: string;
  pendingChanges: PendingEditChange[];
  pendingCount: number;
  refreshChanges: () => Promise<void>;
}

export function useOrderRealtime({
  orderId,
  initialStatus = "",
  currentUserId,
  fetchChanges = false,
  onStatusChange,
  onChangesUpdate,
}: UseOrderRealtimeOptions): UseOrderRealtimeResult {
  const [liveStatus, setLiveStatus] = useState(initialStatus);
  const [pendingChanges, setPendingChanges] = useState<PendingEditChange[]>([]);

  // Keep callbacks in a ref so the effect never re-runs when they change
  const cbStatus = useRef(onStatusChange);
  const cbChanges = useRef(onChangesUpdate);
  cbStatus.current = onStatusChange;
  cbChanges.current = onChangesUpdate;

  // Sync liveStatus whenever orderId OR initialStatus changes
  // (covers: initial load, selecting a different order from the dropdown)
  useEffect(() => {
    setLiveStatus(initialStatus || "");
  }, [orderId, initialStatus]);

  /** Re-fetch pending changes from DB (no loading spinner, granular) */
  const refreshChanges = useCallback(async () => {
    if (!orderId || !fetchChanges) return;

    const { data: { user } } = await supabase.auth.getUser();
    const uid = currentUserId || user?.id;
    if (!uid) return;

    const { data: changesData } = await supabase
      .from("deal_item_changes")
      .select(`id, order_id, change_type, requested_by, created_at, status,
               part_name, part_number, quantity, unit_price, notes,
               orders(rfqs(car_make, car_model, car_year))`)
      .eq("status", "pending")
      .neq("requested_by", uid)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    const raw = (changesData || []) as PendingEditChange[];

    if (raw.length > 0) {
      const requesterIds = [...new Set(raw.map(c => c.requested_by))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, company_name")
        .in("id", requesterIds);
      const map = new Map((profilesData || []).map((p: any) => [p.id, p]));
      setPendingChanges(raw.map(c => ({ ...c, requester: map.get(c.requested_by) })) as any);
    } else {
      setPendingChanges([]);
    }
  }, [orderId, currentUserId, fetchChanges]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Guard: never subscribe with an empty orderId — would create broken channels
    if (!orderId || orderId.trim() === "") return;

    // Use a unique channel name per orderId so re-subscribing on order change
    // cleanly removes the old subscription first.
    const statusChannel = supabase
      .channel(`rt:order-status:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload: any) => {
          const updated = payload.new as { id: string; status: string };
          if (updated?.status) {
            setLiveStatus(updated.status);
            cbStatus.current?.(updated.status);
          }
        }
      )
      .subscribe();

    const changesChannel = supabase
      .channel(`rt:order-changes:${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deal_item_changes", filter: `order_id=eq.${orderId}` },
        () => {
          if (fetchChanges) refreshChanges();
          cbChanges.current?.();
        }
      )
      .subscribe();

    // Also do an initial fetch when orderId is first set / changes
    if (fetchChanges) refreshChanges();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(changesChannel);
    };
  }, [orderId, fetchChanges, refreshChanges]); // re-run when order changes

  return {
    liveStatus,
    pendingChanges,
    pendingCount: pendingChanges.length,
    refreshChanges,
  };
}

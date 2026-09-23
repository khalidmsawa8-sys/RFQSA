"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export type DealItemForSupport = {
  id: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  source: "deal_items" | "quote_items";
};

/**
 * Fetches the parts (items) of an order for the support flow.
 *
 * Data path priority:
 *   1. `deal_items` table (newer flow, post-deal-system rebuild)
 *   2. `quotes.items` JSONB column (older flow — items live on the accepted quote)
 *
 * Both paths bypass RLS via the service role after verifying the caller
 * owns the order through `orders.client_id` (or `rfqs.client_id` fallback).
 */
export async function getDealItemsForOrder(
  orderId: string,
): Promise<DealItemForSupport[]> {
  if (!orderId) return [];

  /* ── 1. Authenticate the caller ────────────────────────────────────── */
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return [];

  /* ── 2. Build a service-role client (bypasses RLS) ─────────────────── */
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const svc = createServiceClient(url, key, {
    auth: { persistSession: false },
  });

  /* ── 3. Verify ownership ───────────────────────────────────────────── */
  const { data: order, error: orderErr } = await svc
    .from("orders")
    .select("id, client_id, rfq_id, quote_id")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return [];

  let isOwner = order.client_id === user.id;
  if (!isOwner && order.rfq_id) {
    const { data: rfq } = await svc
      .from("rfqs")
      .select("client_id")
      .eq("id", order.rfq_id)
      .single();
    isOwner = rfq?.client_id === user.id;
  }
  if (!isOwner) return [];

  /* ── 4. Try deal_items first ───────────────────────────────────────── */
  const { data: dealItems } = await svc
    .from("deal_items")
    .select("id, part_name, part_number, quantity, unit_price")
    .eq("order_id", orderId);

  if (dealItems && dealItems.length > 0) {
    return dealItems.map((it) => ({
      id: it.id,
      part_name: it.part_name,
      part_number: it.part_number ?? null,
      quantity: Number(it.quantity ?? 1),
      unit_price: Number(it.unit_price ?? 0),
      source: "deal_items",
    }));
  }

  /* ── 5. Fallback: pull from quotes.items / parts_breakdown JSONB ───── */
  if (!order.quote_id) return [];

  const { data: quote } = await svc
    .from("quotes")
    .select("id, items, parts_breakdown")
    .eq("id", order.quote_id)
    .single();

  if (!quote) return [];

  // Prefer `items`, fall back to `parts_breakdown`.
  const raw =
    (Array.isArray(quote.items) && quote.items.length > 0
      ? quote.items
      : Array.isArray(quote.parts_breakdown)
        ? quote.parts_breakdown
        : null) as Array<Record<string, unknown>> | null;

  if (!raw || raw.length === 0) return [];

  return raw.map((it, idx) => {
    const partName =
      (it.part_name as string) ??
      (it.name as string) ??
      (it.partName as string) ??
      `قطعة ${idx + 1}`;
    const partNumber =
      (it.part_number as string) ??
      (it.partNumber as string) ??
      (it.sku as string) ??
      null;
    const quantity = Number(it.quantity ?? it.qty ?? 1);
    const unitPrice = Number(
      it.unit_price ?? it.unitPrice ?? it.price ?? 0,
    );

    return {
      // Stable synthetic id — quote_id + index — survives across reloads
      id: `quote:${quote.id}:${idx}`,
      part_name: partName,
      part_number: partNumber,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
      source: "quote_items",
    };
  });
}

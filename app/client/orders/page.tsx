export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientOrdersClient } from "./orders-client";

import { getSystemSettings } from "@/lib/system-settings";

export default async function ClientOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: rfqs }, { data: orders }, settings] = await Promise.all([
    supabase
      .from("rfqs")
      .select("*, quotes(id, vendor_id, total_price, delivery_days, status, profiles(full_name, company_name, phone))")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*, rfqs(*), vendor:profiles!orders_vendor_id_fkey(full_name, company_name, phone), deals(id, status)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false }),
    getSystemSettings(),
  ]);

  const durationMinutes = Math.max(120, Number(settings?.rfq_visibility_duration_minutes) || 2880);

  // Sync any open RFQ whose visibility duration has expired to 'cancelled'
  const now = Date.now();
  const expiredIds: string[] = [];
  (rfqs || []).forEach((r: any) => {
    if (r.status === "open") {
      const createdMs = new Date(r.created_at || now).getTime();
      const expiryMs = r.expires_at ? new Date(r.expires_at).getTime() : (createdMs + durationMinutes * 60 * 1000);
      if (now >= expiryMs) {
        expiredIds.push(r.id);
        r.status = "cancelled";
      }
    }
  });

  if (expiredIds.length > 0) {
    try {
      await supabase
        .from("rfqs")
        .update({
          status: "cancelled",
          cancellation_reason: "انتهت مهلة استقبال العروض المحددة من إدارة النظام",
        })
        .in("id", expiredIds);
    } catch (e) {
      console.warn("Auto-cancel expired sync error:", e);
    }
  }

  return (
    <Suspense fallback={null}>
      <ClientOrdersClient
        rfqs={rfqs || []}
        orders={orders || []}
        durationMinutes={durationMinutes}
      />
    </Suspense>
  );
}

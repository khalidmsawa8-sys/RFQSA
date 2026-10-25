export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientOrdersClient } from "./orders-client";

import { getSystemSettings } from "@/lib/system-settings";
import fs from "fs";
import path from "path";

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
    if (r.status === "open" || r.status === "quoted") {
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

  // Merge disk orders from orders_db.json to ensure full parity with mobile app & zero missing orders
  let mergedOrders = [...(orders || [])];
  try {
    const DATA_DIR = path.join(process.cwd(), "data");
    const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
    const RFQS_FILE = path.join(DATA_DIR, "rfqs_db.json");
    const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

    if (fs.existsSync(ORDERS_FILE)) {
      const diskOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
      const diskRfqs = fs.existsSync(RFQS_FILE) ? JSON.parse(fs.readFileSync(RFQS_FILE, "utf-8")) : [];
      const diskProfiles = fs.existsSync(PROFILES_FILE) ? JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8")) : [];

      diskOrders.forEach((o: any) => {
        const isClientMatch =
          o.client_id === user.id ||
          o.client_id === "client-demo-id" ||
          (user.email && o.client?.email === user.email) ||
          (user.phone && o.client?.phone === user.phone);

        if (isClientMatch) {
          const rawNum = String(o.id).replace(/\D+/g, "");
          const already = mergedOrders.some((mo: any) =>
            mo.id === o.id ||
            (rawNum && String(mo.id).replace(/\D+/g, "") === rawNum)
          );

          if (!already) {
            const matchedRfq = o.rfqs || o.rfq || diskRfqs.find((r: any) => r.id === o.rfq_id || (rawNum && r.id.includes(rawNum)));
            const matchedVendor = o.vendor || diskProfiles.find((p: any) => p.id === o.vendor_id);
            mergedOrders.push({
              id: o.id,
              status: o.status || "confirmed",
              total_price: Number(o.total_price || o.total_amount || 0),
              created_at: o.created_at || new Date().toISOString(),
              rfq_id: o.rfq_id,
              rfqs: matchedRfq ? {
                id: matchedRfq.id,
                car_make: matchedRfq.car_make || "غير محدد",
                car_model: matchedRfq.car_model || "",
                car_year: matchedRfq.car_year || 2024,
                plate_number: matchedRfq.plate_number,
                vin: matchedRfq.vin,
                parts_description: matchedRfq.parts_description,
                delivery_location: matchedRfq.delivery_location,
                delivery_city: matchedRfq.delivery_city,
              } : undefined,
              vendor: matchedVendor ? {
                full_name: matchedVendor.full_name || matchedVendor.company_name,
                company_name: matchedVendor.company_name || matchedVendor.full_name,
                phone: matchedVendor.phone,
              } : undefined,
              deals: o.deals || [{ id: `DEAL-${String(o.id).replace("ORD-", "")}`, status: o.status || "preparing" }],
            });
          }
        }
      });
    }
  } catch (mergeErr) {
    console.warn("ClientOrdersPage disk orders merge note:", mergeErr);
  }

  // Sort merged orders newest first
  mergedOrders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  return (
    <Suspense fallback={null}>
      <ClientOrdersClient
        rfqs={rfqs || []}
        orders={mergedOrders}
        durationMinutes={durationMinutes}
      />
    </Suspense>
  );
}

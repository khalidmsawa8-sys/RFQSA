"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VendorSupportClient } from "./vendor-support-client";

export default async function VendorSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 1. Fetch vendor's support requests
  const { data: allRequests, error } = await supabase
    .from("support_requests")
    .select(`
      *,
      support_request_items (*),
      orders (
        id,
        total_price,
        rfqs (
          car_make,
          car_model,
          car_year,
          plate_number
        )
      )
    `)
    .order("created_at", { ascending: false });

  const requests = (allRequests || []).filter(
    (r: any) => r.vendor_id === user.id || r.client_id === user.id || r.requester_id === user.id
  );

  if (error) {
    console.warn("Failed to load vendor support requests:", error.message);
  }

  // 2. Fetch vendor's eligible deals/orders
  const { data: deals } = await supabase
    .from("deals")
    .select(`
      id,
      order_id,
      total_price,
      status,
      created_at,
      orders (
        id,
        status,
        created_at,
        total_price,
        rfqs (
          car_make,
          car_model,
          car_year,
          plate_number
        )
      )
    `)
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const eligibleOrders = (deals || []).map((d: any) => ({
    id: d.orders?.id || d.order_id || d.id,
    status: d.orders?.status || d.status || "active",
    created_at: d.created_at,
    total_price: Number(d.total_price || d.orders?.total_price || 0),
    rfqs: d.orders?.rfqs || null,
  }));

  return (
    <VendorSupportClient
      userId={user.id}
      initialRequests={requests ?? []}
      eligibleOrders={eligibleOrders}
    />
  );
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CourierSupportClient } from "./courier-support-client";
import { CourierService } from "@/lib/courier-service";

export default async function CourierSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/courier/login");
  }

  // 1. Fetch courier's support requests
  const { data: requests, error } = await supabase
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
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to load courier support requests:", error.message);
  }

  // 2. Fetch courier's assigned deliveries
  const deliveries = CourierService.getAssignedDeliveries(user.id);
  const eligibleDeliveries = deliveries.map((d) => ({
    id: d.id,
    order_id: d.order_id,
    delivery_status: d.delivery_status,
    vendor_name: d.vendor_name,
    client_name: d.client_name,
    parts_summary: d.parts_summary,
  }));

  return (
    <CourierSupportClient
      userId={user.id}
      initialRequests={requests ?? []}
      eligibleDeliveries={eligibleDeliveries}
    />
  );
}

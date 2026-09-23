"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SupportClient } from "./support-client";

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: allRequests } = await supabase
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
    (r: any) => r.client_id === user.id || r.requester_id === user.id
  );

  const { data: eligibleOrders } = await supabase
    .from("orders")
    .select("id, status, created_at, total_price, rfqs(car_make, car_model, car_year, plate_number), deals(id, status)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <SupportClient
      userId={user.id}
      initialRequests={requests || []}
      eligibleOrders={eligibleOrders || []}
    />
  );
}

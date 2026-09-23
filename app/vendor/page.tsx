import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SlideDashboard } from "@/components/dashboard/slide-dashboard";
import { getVerifiedAuthContext } from "@/lib/rbac/rbac-guard.server";
import { cookies } from "next/headers";

export default async function VendorDashboard() {
  const cookieStore = await cookies();
  const sessionRole = cookieStore.get("rfq_session")?.value;

  if (sessionRole === "client") {
    redirect("/client");
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !sessionRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role === "client") redirect("/client");
    }
  } catch (e) {
    // Demo mode fallback
  }

  let authContext = null;
  try {
    authContext = await getVerifiedAuthContext();
  } catch (e) {}

  const permissions = Array.from(authContext?.effectivePermissions || []);
  const isOwner = authContext?.isOwner ?? false;
  const userRole = authContext?.role || "vendor_owner";
  const roleNameAr = authContext?.roleNameAr || "";

  return (
    <SlideDashboard
      role="vendor"
      permissions={permissions}
      isOwner={isOwner}
      userRole={userRole}
      roleNameAr={roleNameAr}
    />
  );
}

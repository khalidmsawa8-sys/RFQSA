import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardHeader from "@/components/dashboard-header";
import DashboardSidebar from "@/components/dashboard-sidebar";
import MobileNav from "@/components/mobile-nav";
import { cookies } from "next/headers";
import { getVerifiedAuthContext } from "@/lib/rbac/rbac-guard.server";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("rfq_session")?.value;

  if (!session || (session !== "client" && session !== "admin")) {
    redirect("/auth/login");
  }

  let profile = { role: "client" as const, full_name: "شركة المشتريات الوطنية" };
  let authContext = null;

  try {
    authContext = await getVerifiedAuthContext();
  } catch (e) {}

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("role, full_name, company_name")
        .eq("id", user.id)
        .single();
      if (data) {
        profile = {
          role: "client" as const,
          full_name: data.company_name || data.full_name || "شركة المشتريات الوطنية",
        };
      }
    }
  } catch (e) {
    // Demo fallback for instant preview
  }

  const permissions = Array.from(authContext?.effectivePermissions || []);
  const isOwner = authContext?.isOwner ?? (session === "admin" || !authContext);
  const userRole = authContext?.role || "client_owner";
  const roleNameAr = authContext?.roleNameAr || "";
  const displayName = authContext?.fullName || profile.full_name;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#10B981] selection:text-white" dir="rtl">
      {/* Mobile Top App Bar & Floating Bottom Dock */}
      <MobileNav
        role="client"
        profileName={displayName}
        permissions={permissions}
        isOwner={isOwner}
        userRole={userRole}
        roleNameAr={roleNameAr}
      />

      {/* Desktop Dashboard Header */}
      <div className="hidden md:block sticky top-0 z-50 bg-white">
        <DashboardHeader userName={displayName} userRole="client" />
      </div>

      <div className="flex min-h-[calc(100vh-52px)]">
        {/* Dynamic Sidebar with active tab highlighting (Desktop) */}
        <DashboardSidebar
          role="client"
          profileName={displayName}
          permissions={permissions}
          isOwner={isOwner}
          userRole={userRole}
          roleNameAr={roleNameAr}
        />

        {/* Main Content Area (padded at bottom for mobile dock) */}
        <main className="flex-1 min-w-0 w-full p-3 sm:p-6 pb-24 md:pb-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

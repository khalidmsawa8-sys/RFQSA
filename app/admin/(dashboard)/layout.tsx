import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, ShoppingBag, FileText,
  Settings, Shield, Wallet, ClipboardList, ScrollText, LifeBuoy,
  Truck, Bell,
} from "lucide-react";
import { AdminSignOut } from "@/components/admin-sign-out";
import { AdminLoadingSkeleton } from "@/components/admin/admin-loading-skeleton";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";

/**
 * The admin area is authenticated and reads live data via Supabase + cookies,
 * so it should never be statically prerendered. Forcing dynamic rendering here
 * applies to every nested admin route ( /admin, /admin/orders, /admin/users,
 * /admin/rfqs, ... ) and eliminates the recurring deploy error:
 *
 *   "useSearchParams() should be wrapped in a suspense boundary.
 *    Please add a loading component to `app/admin/<segment>/loading.tsx`"
 *
 * which Next.js 16 raises during static-prerender bailout checks even when no
 * useSearchParams() call is present, because client components downstream
 * (header, sign-out, etc.) are treated as dynamic.
 */
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("rfq_session")?.value;

  if (!session || session !== "admin") {
    redirect("/admin/login");
  }

  let profile = { full_name: "المدير العام (Super Admin)", ref_code: "ADM-001", is_admin: true };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("is_admin, full_name, ref_code")
        .eq("id", user.id)
        .single();
      if (data) profile = data;
    }
  } catch (e) {
    // Demo fallback for instant dashboard preview
  }

  return (
    <AdminDashboardShell profile={profile}>
      {/* Top Header Bar with Notifications next to Logout */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span>لوحة الإدارة المركزية</span>
            <span className="text-slate-300 font-normal">/</span>
            <span className="text-slate-500 font-medium">منصة رِفق B2B</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Profile Details */}
          <div className="flex items-center gap-2.5 bg-slate-50/80 border border-slate-200/60 px-3 py-1.5 rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              م
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                {profile.full_name || "المدير العام"}
              </p>
              <p className="text-[10px] text-blue-600 font-mono font-medium">{profile.ref_code || "ADM-001"}</p>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-0.5" />

          {/* Direct Link to Notification Center with Live Indicator (Directly next to Logout) */}
          <Link
            href="/admin/notifications"
            className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center border border-slate-200/60 bg-slate-50/50 shadow-2xs"
            title="مركز الإشعارات والبث الإداري"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white animate-pulse" />
          </Link>

          {/* Top Logout Button (Directly next to Notifications) */}
          <AdminSignOut />
        </div>
      </header>

      {/* Page Content */}
      <div className="flex-1 min-w-0 w-full">
        <Suspense fallback={<AdminLoadingSkeleton />}>
          {children}
        </Suspense>
      </div>
    </AdminDashboardShell>
  );
}

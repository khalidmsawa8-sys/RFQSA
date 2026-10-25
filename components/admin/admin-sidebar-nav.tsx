"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Truck,
  ClipboardList,
  Wallet,
  ScrollText,
  LifeBuoy,
  Settings,
  Ticket,
  ShieldCheck,
  Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/admin/notifications", label: "مركز الإشعارات", icon: Bell },
  { href: "/admin/roles", label: "الأدوار والصلاحيات", icon: ShieldCheck },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/coupons", label: "أكواد الخصم", icon: Ticket },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/admin/delivery", label: "أسطول التوصيل", icon: Truck },
  { href: "/admin/invoices", label: "الفواتير", icon: ClipboardList },
  { href: "/admin/wallet", label: "محفظة الأدمن (العمولات)", icon: Wallet },
  { href: "/admin/audit", label: "سجل النشاط", icon: ScrollText },
  { href: "/admin/support", label: "المساعدة", icon: LifeBuoy },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

interface AdminSidebarNavProps {
  isCollapsed?: boolean;
}

export function AdminSidebarNav({ isCollapsed = false }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1.5 px-3 py-3 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <div key={item.href} className="relative group">
            <Link
              href={item.href}
              className={`flex items-center ${
                isCollapsed
                  ? "w-11 h-11 mx-auto justify-center rounded-xl"
                  : "justify-between px-4 py-3 rounded-2xl text-sm"
              } transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white font-black shadow-lg shadow-blue-600/30 scale-[1.02]"
                  : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 font-bold"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3.5"} min-w-0`}>
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                    isActive
                      ? "text-white scale-110"
                      : "text-slate-400 group-hover:text-slate-700 group-hover:scale-105"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && isActive && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0 mr-2 shadow-xs" />
              )}
            </Link>

            {/* Floating Tooltip in Collapsed Mode */}
            {isCollapsed && (
              <div className="hidden group-hover:flex items-center absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 pointer-events-none whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150">
                <span>{item.label}</span>
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900" />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

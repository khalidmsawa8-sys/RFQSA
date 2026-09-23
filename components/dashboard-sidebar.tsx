"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Plus, User, Receipt, Wallet, LifeBuoy, Store,
  ShieldCheck, ChevronLeft, ChevronRight, Sparkles, Activity, Car, Zap, Settings
} from "lucide-react";
import { featureFlagEngine } from "@/lib/bounded-contexts/feature-flags/feature-flags.service";
import { isNavItemAllowed } from "@/lib/rbac/navigation-guard";

interface DashboardSidebarProps {
  role: "client" | "vendor";
  profileName: string;
  permissions?: string[];
  isOwner?: boolean;
  userRole?: string;
  roleNameAr?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  isCta?: boolean;
}

export default function DashboardSidebar({
  role,
  profileName,
  permissions = [],
  isOwner = true,
  userRole,
  roleNameAr,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  // ── 1. COLLAPSED STATE PERSISTENCE (SINGLE SOURCE OF TRUTH) ──
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("rfq-sidebar-collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch (e) {
      // Ignore localStorage errors (e.g. incognito restrictions)
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("rfq-sidebar-collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

  const isFleetEnabled = useMemo(() => featureFlagEngine.isFeatureEnabled("fleet_management", { role }), [role]);
  const isRadarEnabled = useMemo(() => featureFlagEngine.isFeatureEnabled("rfq_radar", { role }), [role]);

  const clientNavItems: NavItem[] = [
    { href: "/client",           label: "نظرة عامة",          icon: LayoutDashboard, badge: undefined },
    { href: "/client/new-rfq",   label: "طلب عرض سعر جديد",  icon: Plus,            isCta: true },
    { href: "/client/vendors-map", label: "خريطة الموردين والفروع", icon: Store,   badge: "🗺️" },
    ...(isFleetEnabled ? [{ href: "/client/garage", label: "إدارة المركبات", icon: Car, badge: "🚘" }] : []),
    { href: "/client/orders",    label: "إدارة الطلبات",  icon: ShoppingBag,     badge: "مباشر" },
    { href: "/client/invoices",  label: "الفواتير الضريبية", icon: Receipt,        badge: undefined },
    { href: "/client/wallet",    label: "المحفظة والرصيد",   icon: Wallet,         badge: undefined },
    { href: "/client/profile",   label: "الملف المؤسسي",     icon: User,           badge: undefined },
    { href: "/client/roles",     label: "الأدوار وفريق العمل", icon: ShieldCheck,   badge: undefined },
    { href: "/client/support",   label: "الدعم والمساعدة",   icon: LifeBuoy,       badge: undefined },
    { href: "/client/settings",  label: "إعدادات العضوية",   icon: Settings,       badge: "⚙️" },
  ];

  const vendorNavItems: NavItem[] = [
    { href: "/vendor",          label: "نظرة عامة",          icon: LayoutDashboard, badge: undefined },
    ...(isRadarEnabled ? [{ href: "/vendor/radar", label: "رادار الطلبات الذكي", icon: Zap, badge: "ذكي ⚡" }] : []),
    { href: "/vendor/settings?tab=pickup_location", label: "موقع الفرع والاستلام", icon: Store, badge: "خريطة 📍" },
    { href: "/vendor/orders",   label: "الطلبات والمبيعات", icon: ShoppingBag,     badge: "نشط" },
    { href: "/vendor/invoices", label: "الفواتير الضريبية", icon: Receipt,        badge: undefined },
    { href: "/vendor/wallet",   label: "المحفظة والأرباح", icon: Wallet,         badge: undefined },
    { href: "/vendor/profile",  label: "الملف التجاري",      icon: User,           badge: undefined },
    { href: "/vendor/roles",    label: "الأدوار وفريق العمل", icon: ShieldCheck,   badge: undefined },
    { href: "/vendor/support",  label: "الدعم والمساعدة",   icon: LifeBuoy,       badge: undefined },
    { href: "/vendor/settings", label: "إعدادات العضوية",   icon: Settings,       badge: "⚙️" },
  ];

  const allNavItems: NavItem[] = role === "client" ? clientNavItems : vendorNavItems;

  // Filter items strictly based on Granular Permissions matrix
  const navItems = useMemo(() => {
    return allNavItems.filter((item) => {
      return isNavItemAllowed(item.href, permissions, isOwner);
    });
  }, [allNavItems, permissions, isOwner]);

  return (
    <aside
      className={`hidden md:flex ${
        isCollapsed ? "w-20" : "w-72"
      } shrink-0 border-l border-slate-800/80 bg-[#0A1224] text-slate-200 flex-col sticky top-[52px] h-[calc(100vh-52px)] shadow-2xl z-30 select-none transition-[width] duration-300 ease-in-out relative`}
      aria-label="القائمة الجانبية"
    >
      {/* ── 0. FLOATING CIRCULAR TOGGLE BUTTON ── */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="absolute top-6 -left-3.5 z-40 w-7 h-7 rounded-full bg-[#0F1C36] border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-emerald-500/50 shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        aria-label={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
        title={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        )}
      </button>

      {/* ── 1. PROFILE HEADER PILL ── */}
      <div className="p-3.5 border-b border-slate-800/80 bg-gradient-to-b from-[#0F1C36] to-[#0A1224] overflow-hidden">
        <Link
          href={role === "vendor" ? "/vendor/profile" : "/client/profile"}
          className={`flex items-center ${
            isCollapsed ? "justify-center p-1.5" : "gap-3 p-2.5"
          } rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner group hover:bg-slate-800/90 hover:border-slate-700 transition-all cursor-pointer block relative`}
          title={profileName}
        >
          <div className="relative shrink-0">
            <div
              className={`w-10 h-10 rounded-xl ${
                role === "vendor"
                  ? "bg-gradient-to-tr from-emerald-600 to-teal-500"
                  : "bg-gradient-to-tr from-blue-600 to-indigo-600"
              } text-white flex items-center justify-center font-black text-base shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform`}
            >
              {role === "vendor" ? <Store className="w-5 h-5 text-white" /> : profileName.charAt(0) || "ش"}
            </div>
            {/* Online indicator dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0A1224] animate-pulse" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-sm text-white truncate leading-snug group-hover:text-emerald-400 transition-colors">
                  {profileName}
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                <span className="truncate">{roleNameAr || (role === "vendor" ? "مورد معتمد B2B" : "عميل موثق B2B")}</span>
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* ── 2. NAVIGATION LIST (DYNAMIC FEATURE FLAGS ENFORCED) ── */}
      <nav className="flex flex-col gap-1.5 p-3 w-full flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {!isCollapsed && (
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1 truncate">
            القائمة الرئيسية
          </p>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isCta = item.isCta;
          const isActive = pathname === item.href;

          // CTA Item (e.g. New RFQ or Radar)
          if (isCta) {
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  className={`relative my-1 flex items-center ${
                    isCollapsed
                      ? "w-11 h-11 mx-auto justify-center rounded-xl"
                      : "justify-between gap-3 px-4 py-3 rounded-2xl"
                  } text-sm font-black text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs shrink-0">
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </div>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <Sparkles className="w-4 h-4 text-emerald-200 group-hover:rotate-12 transition-transform shrink-0" />
                  )}
                </Link>

                {/* Floating Tooltip in Collapsed Mode */}
                {isCollapsed && (
                  <div className="hidden group-hover:flex items-center absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-emerald-400 text-xs font-black shadow-2xl border border-emerald-500/30 pointer-events-none whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150">
                    <span>{item.label}</span>
                    <span className="absolute -right-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900" />
                  </div>
                )}
              </div>
            );
          }

          // Standard Nav Item
          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={`flex items-center ${
                  isCollapsed
                    ? "w-11 h-11 mx-auto justify-center rounded-xl"
                    : "justify-between px-3.5 py-2.5 rounded-2xl text-xs"
                } font-bold transition-all duration-200 ${
                  isActive
                    ? isCollapsed
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-105"
                      : "bg-gradient-to-l from-emerald-500/20 via-[#10B981]/10 to-transparent text-emerald-400 font-extrabold border-r-4 border-emerald-500 shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5"} min-w-0`}>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? isCollapsed
                          ? "text-slate-950"
                          : "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400 group-hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  {!isCollapsed && <span className="tracking-tight whitespace-nowrap text-xs truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 whitespace-nowrap ${
                      isActive
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed dot badge */}
                {isCollapsed && item.badge && !isActive && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0A1224]" />
                )}
              </Link>

              {/* Floating Tooltip in Collapsed Mode */}
              {isCollapsed && (
                <div className="hidden group-hover:flex items-center absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 pointer-events-none whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="mr-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                  <span className="absolute -right-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900" />
                </div>
              )}
            </div>
          );
        })}

        <div className="flex-1" />

        {/* ── 3. BOTTOM SUPPORT & STATUS FOOTER ── */}
        <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5 mt-2">
          {role === "client" && (
            <div className="relative group">
              <Link
                href="/client/support"
                className={`flex items-center ${
                  isCollapsed ? "w-11 h-11 mx-auto justify-center rounded-xl" : "justify-between px-3.5 py-2 rounded-2xl text-xs"
                } font-bold transition-all ${
                  pathname === "/client/support"
                    ? isCollapsed
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 text-emerald-400 border-r-4 border-emerald-500"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
                title={isCollapsed ? "المساعدة والنزاعات" : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <LifeBuoy className="w-4 h-4 text-slate-400 shrink-0" />
                  {!isCollapsed && <span className="truncate">المساعدة والنزاعات</span>}
                </div>
                {!isCollapsed && <ChevronLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
              </Link>

              {/* Tooltip */}
              {isCollapsed && (
                <div className="hidden group-hover:flex items-center absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 pointer-events-none whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150">
                  <span>المساعدة والنزاعات</span>
                  <span className="absolute -right-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900" />
                </div>
              )}
            </div>
          )}

          {/* System Status Pill */}
          <div
            className={`rounded-2xl bg-[#070E1B] border border-slate-800/60 flex items-center ${
              isCollapsed ? "w-11 h-11 mx-auto justify-center p-0" : "p-2.5 justify-between"
            } text-[11px]`}
            title={isCollapsed ? "حالة المنصة: متصل 100%" : undefined}
          >
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
              {!isCollapsed && <span className="truncate">حالة المنصة:</span>}
            </div>
            {!isCollapsed && (
              <span className="text-emerald-400 font-extrabold flex items-center gap-1 shrink-0">
                متصل 100%
              </span>
            )}
          </div>
        </div>
      </nav>
    </aside>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Plus, Car, Zap, Settings, Menu, X, ShieldCheck, Receipt, Wallet, User, LifeBuoy, Store, Activity, LogOut
} from "lucide-react";
import { featureFlagEngine } from "@/lib/bounded-contexts/feature-flags/feature-flags.service";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { isNavItemAllowed } from "@/lib/rbac/navigation-guard";

interface MobileNavProps {
  role: "client" | "vendor";
  profileName: string;
  permissions?: string[];
  isOwner?: boolean;
  userRole?: string;
  roleNameAr?: string;
}

export default function MobileNav({
  role,
  profileName,
  permissions = [],
  isOwner = true,
  userRole,
  roleNameAr,
}: MobileNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isFleetEnabled = featureFlagEngine.isFeatureEnabled("fleet_management", { role });
  const isRadarEnabled = featureFlagEngine.isFeatureEnabled("rfq_radar", { role });

  // Bottom dock items (5 key actions)
  const rawBottomItems = role === "client"
    ? [
        { href: "/client",         label: "الرئيسية",   icon: LayoutDashboard },
        { href: "/client/garage",  label: "المركبات",   icon: Car },
        { href: "/client/new-rfq", label: "طلب جديد",  icon: Plus, isCta: true },
        { href: "/client/orders",  label: "الطلبات",    icon: ShoppingBag },
        { href: "/client/settings",label: "الإعدادات",  icon: Settings },
      ]
    : [
        { href: "/vendor",         label: "الرئيسية",   icon: LayoutDashboard },
        { href: "/vendor/radar",   label: "الرادار",    icon: Zap },
        { href: "/vendor/orders",  label: "الطلبات",    icon: ShoppingBag },
        { href: "/vendor/wallet",  label: "الأرباح",    icon: Wallet },
        { href: "/vendor/settings",label: "الإعدادات",  icon: Settings },
      ];

  // Drawer menu items
  const rawDrawerItems = role === "client"
    ? [
        { href: "/client",           label: "نظرة عامة",          icon: LayoutDashboard },
        { href: "/client/new-rfq",   label: "طلب عرض سعر جديد",  icon: Plus, isCta: true },
        { href: "/client/vendors-map", label: "خريطة الموردين",  icon: Store, badge: "خريطة 🗺️" },
        { href: "/client/garage",    label: "إدارة المركبات",     icon: Car, badge: "جديد 🚘" },
        { href: "/client/orders",    label: "إدارة الطلبات",  icon: ShoppingBag },
        { href: "/client/invoices",  label: "الفواتير الضريبية", icon: Receipt },
        { href: "/client/wallet",    label: "المحفظة والرصيد",   icon: Wallet },
        { href: "/client/profile",   label: "الملف المؤسسي",     icon: User },
        { href: "/client/roles",     label: "الأدوار وفريق العمل", icon: ShieldCheck },
        { href: "/client/settings",  label: "إعدادات العضوية",   icon: Settings, badge: "⚙️" },
      ]
    : [
        { href: "/vendor",          label: "نظرة عامة",          icon: LayoutDashboard },
        { href: "/vendor/radar",    label: "رادار الطلبات الذكي", icon: Zap, badge: "ذكي ⚡" },
        { href: "/vendor/settings?tab=pickup_location", label: "موقع الفرع والاستلام", icon: Store, badge: "خريطة 📍" },
        { href: "/vendor/orders",   label: "الطلبات والمبيعات", icon: ShoppingBag },
        { href: "/vendor/invoices", label: "الفواتير الضريبية", icon: Receipt },
        { href: "/vendor/wallet",   label: "المحفظة والأرباح", icon: Wallet },
        { href: "/vendor/profile",  label: "الملف التجاري",      icon: User },
        { href: "/vendor/roles",    label: "الأدوار وفريق العمل", icon: ShieldCheck },
        { href: "/vendor/settings", label: "إعدادات العضوية",   icon: Settings, badge: "⚙️" },
      ];

  const bottomItems = rawBottomItems.filter((item) => isNavItemAllowed(item.href, permissions, isOwner));
  const drawerItems = rawDrawerItems.filter((item) => isNavItemAllowed(item.href, permissions, isOwner));

  const canShowTopCta = role === "client"
    ? isNavItemAllowed("/client/new-rfq", permissions, isOwner)
    : isNavItemAllowed("/vendor/radar", permissions, isOwner);

  return (
    <>
      {/* ── 1. MOBILE TOP APP BAR (Hidden on MD+) ── */}
      <header className="md:hidden sticky top-0 z-40 bg-[#0A1224]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 text-white flex items-center justify-between shadow-lg" dir="rtl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 active:scale-95 transition-all shadow-xs"
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5 text-emerald-400" />
          </button>

          <Link
            href={role === "vendor" ? "/vendor/profile" : "/client/profile"}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <div className={`w-8 h-8 rounded-xl ${role === "vendor" ? "bg-gradient-to-tr from-emerald-600 to-teal-500" : "bg-gradient-to-tr from-blue-600 to-indigo-600"} text-white flex items-center justify-center font-black text-xs shadow-xs`}>
              {role === "vendor" ? <Store className="w-4 h-4 text-white" /> : profileName.charAt(0) || "ش"}
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-white truncate max-w-[150px]">{profileName}</span>
              <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[150px]">
                {roleNameAr || (role === "vendor" ? "مورد معتمد" : "عميل موثق")}
              </span>
            </div>
          </Link>
        </div>

        {canShowTopCta && (
          <Link
            href={role === "client" ? "/client/new-rfq" : "/vendor/radar"}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-sm"
          >
            {role === "client" ? <Plus className="w-3.5 h-3.5 stroke-[3]" /> : <Zap className="w-3.5 h-3.5 fill-slate-950" />}
            <span>{role === "client" ? "طلب" : "رادار"}</span>
          </Link>
        )}
      </header>

      {/* ── 2. MOBILE FLOATING BOTTOM DOCK ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A1224]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2 flex items-center justify-around text-slate-400 shadow-2xl" dir="rtl">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isCta) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-5 flex flex-col items-center group shrink-0"
              >
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 border-4 ring-4 ring-[#0A1224] active:scale-90 transition-all">
                  <Plus className="w-6 h-6 stroke-[3]" />
                </div>
                <span className="text-[10px] font-black text-emerald-400 mt-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all ${
                isActive ? "text-emerald-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? "bg-emerald-500/15" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── 3. SLIDE-OVER MOBILE DRAWER MENU ── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" dir="rtl">
          {/* Overlay backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Drawer content panel */}
          <div className="relative w-4/5 max-w-xs bg-[#0A1224] text-white flex flex-col h-full z-10 border-l border-slate-800 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-b from-[#0F1C36] to-[#0A1224]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-black text-sm text-white">{profileName}</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">القائمة الكاملة</p>
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    onClick={() => setDrawerOpen(false)}
                    href={item.href}
                    className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                      isActive ? "bg-emerald-500/20 text-emerald-400 border-r-4 border-emerald-500" : "text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold shrink-0 whitespace-nowrap">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Drawer Logout Button */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>

            <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> متصل 100%
              </span>
              <span>رِفْق B2B v4</span>
            </div>
          </div>
        </div>
      )}

      {/* Professional Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        userName={profileName}
        userRole={role}
      />
    </>
  );
}

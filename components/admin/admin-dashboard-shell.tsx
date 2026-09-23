"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, ChevronLeft, ChevronRight, Home, LogOut
} from "lucide-react";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { AdminSignOut } from "@/components/admin-sign-out";

interface AdminDashboardShellProps {
  profile: {
    full_name?: string;
    ref_code?: string;
    is_admin?: boolean;
  };
  children: React.ReactNode;
}

export function AdminDashboardShell({ profile, children }: AdminDashboardShellProps) {
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
      // Ignore localStorage read errors
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

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900" dir="rtl">
      {/* ── Fixed Desktop Sidebar with Fluid Width ── */}
      <aside
        className={`hidden md:flex ${
          isCollapsed ? "w-20" : "w-72"
        } shrink-0 border-l border-slate-200/80 bg-white flex-col fixed inset-y-0 right-0 z-30 shadow-sm transition-[width] duration-300 ease-in-out select-none`}
        aria-label="القائمة الجانبية للإدارة"
      >
        {/* Floating Circular Toggle Button on the inner border */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="absolute top-7 -left-3.5 z-40 w-7 h-7 rounded-full bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-blue-500 shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
          title={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          )}
        </button>

        {/* Brand Header */}
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center px-2 py-5" : "gap-3.5 px-6 py-6"
          } border-b border-slate-100 overflow-hidden`}
        >
          <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md shrink-0">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="font-extrabold text-slate-900 text-base leading-tight truncate">لوحة الإدارة العامة</p>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 truncate">Super Admin Portal</p>
            </div>
          )}
        </div>

        {/* Admin profile badge */}
        <div
          className={`mx-3 mt-4 mb-2 ${
            isCollapsed ? "p-2 justify-center" : "px-4 py-3 gap-3"
          } rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center shadow-xs overflow-hidden group relative`}
          title={isCollapsed ? profile.full_name || "المشرف الرئيسي" : undefined}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
            م
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{profile.full_name || "المشرف الرئيسي"}</p>
              <p className="text-xs text-slate-500 font-mono font-medium truncate">{profile.ref_code || "ADM-001"}</p>
            </div>
          )}

          {/* Tooltip in Collapsed Mode */}
          {isCollapsed && (
            <div className="hidden group-hover:flex items-center absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 pointer-events-none whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150">
              <span>{profile.full_name || "المشرف الرئيسي"}</span>
              <span className="absolute -right-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900" />
            </div>
          )}
        </div>

        {/* Nav with Active State & Collapsible Support */}
        <AdminSidebarNav isCollapsed={isCollapsed} />

        {/* Bottom actions */}
        <div className={`px-4 pb-4 space-y-2 border-t border-slate-100 pt-3 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
          <div className="relative group w-full">
            <Link
              href="/"
              className={`flex items-center ${
                isCollapsed ? "w-11 h-11 mx-auto justify-center" : "gap-2 px-3 py-2"
              } rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors`}
              title={isCollapsed ? "العودة للمنصة الرئيسيّة" : undefined}
            >
              <Home className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">العودة للمنصة الرئيسيّة</span>}
            </Link>

            {isCollapsed && (
              <div className="hidden group-hover:flex items-center absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 pointer-events-none whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150">
                <span>العودة للمنصة الرئيسيّة</span>
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900" />
              </div>
            )}
          </div>

          <div className={isCollapsed ? "w-11 h-11 flex items-center justify-center" : "w-full"}>
            <AdminSignOut />
          </div>
        </div>
      </aside>

      {/* ── Main Container with Dynamic Fluid Margin ── */}
      <main
        className={`flex-1 ${
          isCollapsed ? "md:mr-20" : "md:mr-72"
        } min-h-screen min-w-0 w-full bg-slate-50 flex flex-col transition-[margin-right] duration-300 ease-in-out overflow-x-hidden`}
      >
        {children}
      </main>
    </div>
  );
}

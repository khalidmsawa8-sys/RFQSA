"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Store, Shield, Bell, Menu, X } from "lucide-react";
import { RfqLogo } from "@/components/rfq-logo";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { NotificationsPanel } from "@/components/notifications-panel";

interface DashboardHeaderProps {
  userName: string;
  userRole: "client" | "vendor" | "admin";
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export default function DashboardHeader({
  userName,
  userRole,
  onMobileMenuToggle,
  isMobileMenuOpen = false,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const roleLabel =
    userRole === "admin"
      ? "مدير المنصة"
      : userRole === "vendor"
      ? "مورد معتمد"
      : "عميل (مشتريات)";

  const roleBadgeBg =
    userRole === "admin"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : userRole === "vendor"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-sky-50 text-sky-700 border-sky-200";

  return (
    <>
      <header className="w-full h-[52px] bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50 shadow-xs shrink-0">
        {/* Right side: Logo & Mobile Toggle (RTL) */}
        <div className="flex items-center gap-3">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="القائمة"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5 text-slate-900" />}
            </button>
          )}

          <Link href="/" className="flex items-center gap-2 group">
            <RfqLogo size="sm" />
          </Link>
        </div>

        {/* Center: Context Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100/80 border border-slate-200/60 text-xs font-bold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {userRole === "vendor"
              ? "لوحة تحكم الموردين والموزعين"
              : userRole === "admin"
              ? "لوحة الإدارة العامة"
              : "لوحة تحكم العميل والشركات"}
          </span>
        </div>

        {/* Left side: User profile info & Logout */}
        <div className="flex items-center gap-3">
          {/* User Info Capsule */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-[#073966] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {userRole === "vendor" ? (
                <Store className="w-3.5 h-3.5 text-emerald-400" />
              ) : userRole === "admin" ? (
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-sky-400" />
              )}
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 max-w-[140px] sm:max-w-[200px] truncate leading-tight">
                {userName}
              </span>
              <span className={`text-[10px] font-semibold ${roleBadgeBg} rounded-full px-1.5 py-0.2 mt-0.5 inline-block w-fit`}>
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Notifications Icon (Next to Logout) */}
          <NotificationsPanel />

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogoutConfirm(true)}
            title="تسجيل الخروج"
            className="rounded-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 p-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
          </Button>
        </div>
      </header>

      {/* Professional Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        userName={userName}
        userRole={userRole}
      />
    </>
  );
}

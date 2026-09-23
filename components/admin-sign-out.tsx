"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";

export function AdminSignOut() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium cursor-pointer"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        تسجيل الخروج
      </button>

      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        userName="المدير العام للمنصة"
        userRole="admin"
      />
    </>
  );
}

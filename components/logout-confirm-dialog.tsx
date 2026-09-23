"use client";

import React, { useState } from "react";
import { LogOut, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const supabase = createClient();

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  userRole?: string;
}

export function performGlobalLogout() {
  document.cookie = "rfq_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "rfq_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "rfq_user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "rfq_user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "rfq_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "rfq_org_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "rfq_member_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  try {
    supabase.auth.signOut();
  } catch (e) {}
  try {
    localStorage.removeItem("sb-auth-token");
    localStorage.removeItem("supabase.auth.token");
    sessionStorage.clear();
  } catch (e) {}
  window.location.href = "/auth/login";
}

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  userName,
  userRole,
}: LogoutConfirmDialogProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      performGlobalLogout();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[340px] sm:max-w-[360px] w-[90vw] p-5 rounded-3xl border border-slate-100 shadow-2xl bg-white text-slate-900 flex flex-col items-center justify-center text-center"
        dir="rtl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3.5 left-3.5 w-7 h-7 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Glowing Compact Icon */}
        <div className="relative mx-auto mt-1 mb-3">
          <div className="w-13 h-13 rounded-2xl bg-rose-500/10 border border-rose-200/80 text-rose-600 flex items-center justify-center shadow-md shadow-rose-500/10 ring-6 ring-rose-50">
            <LogOut className="w-6 h-6 text-rose-600 stroke-[2.2]" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-white animate-ping" />
          </span>
        </div>

        {/* Dialog Header - All Centered */}
        <DialogHeader className="w-full flex flex-col items-center justify-center text-center space-y-1.5 p-0">
          <DialogTitle className="text-lg font-black text-slate-900 text-center tracking-tight w-full">
            تأكيد تسجيل الخروج
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500 leading-relaxed text-center max-w-[270px] mx-auto">
            هل أنت متأكد من رغبتك في تسجيل الخروج من منصة رِفْق؟
          </DialogDescription>
        </DialogHeader>

        {/* User Account Info Chip if available */}
        {userName && (
          <div className="mt-2.5 mb-1 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-600 shadow-2xs mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-900 font-extrabold max-w-[190px] truncate">{userName}</span>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="w-full mt-4 flex items-center justify-center gap-2">
          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-[0.98] text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الخروج...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>تسجيل الخروج</span>
              </>
            )}
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoggingOut}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold text-xs transition-all cursor-pointer border border-slate-200/60"
          >
            إلغاء
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

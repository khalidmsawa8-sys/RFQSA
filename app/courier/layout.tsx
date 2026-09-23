"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Truck,
  Package,
  Wallet,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
  Power,
  ShieldCheck,
  ChevronLeft,
  Receipt,
  LifeBuoy,
} from "lucide-react";
import {
  subscribeToCourierSync,
  flushCourierOfflineQueue,
} from "@/lib/courier-offline-queue";

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [onDuty, setOnDuty] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCourierSync((pendingCount, online) => {
      setPendingSyncCount(pendingCount);
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      await flushCourierOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { label: "المهام", href: "/courier", icon: Package },
    { label: "البوالص", href: "/courier/invoices", icon: Receipt },
    { label: "المحفظة", href: "/courier/wallet", icon: Wallet },
    { label: "الملف", href: "/courier/profile", icon: User },
    { label: "الدعم", href: "/courier/support", icon: LifeBuoy },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 flex flex-col font-sans select-none" dir="rtl">
      {/* ── Top Mobile Header (Sticky) ── */}
      <header className="sticky top-0 z-40 bg-[#0F172A] text-white shadow-md border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-white tracking-wide">أسطول رفق</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  بوابة المندوب
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">سعيد المطيري (دراجة د هـ 2214)</p>
            </div>
          </div>

          {/* Duty Status Toggle */}
          <button
            type="button"
            onClick={() => setOnDuty(!onDuty)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              onDuty
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${onDuty ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
            <span>{onDuty ? "متاح للطلب" : "غير متاح"}</span>
          </button>
        </div>

        {/* ── Offline / Sync Status Strip ── */}
        {!isOnline && (
          <div className="bg-amber-600 text-amber-50 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              <span>أنت غير متصل بالإنترنت (العمليات تحفظ محلياً)</span>
            </div>
            {pendingSyncCount > 0 && (
              <span className="bg-amber-950/50 px-2 py-0.5 rounded text-[10px] font-mono">
                {pendingSyncCount} معلقة
              </span>
            )}
          </div>
        )}

        {isOnline && pendingSyncCount > 0 && (
          <div className="bg-blue-600 text-blue-50 px-4 py-1 text-xs font-bold flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>يوجد {pendingSyncCount} عمليات محفوظة بانتظار المزامنة</span>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="bg-blue-950/60 hover:bg-blue-950 px-2 py-0.5 rounded text-[10px] font-black cursor-pointer"
            >
              {isSyncing ? "جاري المزامنة..." : "مزامنة الآن ⚡"}
            </button>
          </div>
        )}
      </header>

      {/* ── Main Content Area (Max width phone/tablet centered) ── */}
      <main className="flex-1 max-w-md w-full mx-auto pb-24 px-3 pt-3">
        {children}
      </main>

      {/* ── Bottom Mobile Tab Navigation (Fixed) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5 py-1.5 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/courier" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                  isActive
                    ? "text-[#1B4D3E] font-black"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? "bg-emerald-100/80 text-[#1B4D3E] scale-105" : ""
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

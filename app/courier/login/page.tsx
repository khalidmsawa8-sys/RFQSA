"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Phone,
  Lock,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

export default function CourierLoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("0559876543");
  const [password, setPassword] = useState("••••••");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Set session cookie for courier role
      document.cookie = `rfq_session=courier; path=/; max-age=86400; SameSite=Lax`;

      // Redirect immediately to courier dashboard
      setTimeout(() => {
        window.location.href = "/courier";
      }, 500);
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تسجيل الدخول.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col justify-between p-4 selection:bg-emerald-500" dir="rtl">
      {/* ── Top Header ── */}
      <div className="max-w-md w-full mx-auto pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-black text-white tracking-wide block">أسطول رفق</span>
            <span className="text-[10px] text-emerald-400 font-bold block">بوابة المندوب الميداني</span>
          </div>
        </div>

        <Link
          href="/auth/login"
          className="text-xs text-slate-400 hover:text-white font-medium flex items-center gap-1 p-2"
        >
          <span>دخول المنشآت</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Central Login Card ── */}
      <div className="max-w-md w-full mx-auto py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-black text-white">تسجيل دخول المندوب</h1>
            <p className="text-xs text-slate-400">
              أدخل رقم الجوال المسجل وكلمة المرور لمتابعة مهام التوصيل
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Phone input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">رقم الجوال المسجل</label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-500 absolute right-3.5" />
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pr-10 pl-4 text-sm font-mono font-bold text-white text-left [direction:ltr] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">كلمة المرور / الرمز السري</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5" />
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pr-10 pl-4 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>دخول إلى لوحة المهام</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Pilot Helper Box */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center space-y-1">
            <span className="text-[11px] font-bold text-emerald-400 block">⚡ الحساب التجريبي المعتمد:</span>
            <p className="text-[10px] text-slate-400 font-mono">
              الجوال: 0559876543 | كلمة المرور: 123456
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="max-w-md w-full mx-auto pb-4 text-center text-xs text-slate-500">
        <p>© 2026 منصة رفق — أسطول التوصيل المعتمد</p>
      </div>
    </div>
  );
}

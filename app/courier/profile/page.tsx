"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Truck,
  ShieldCheck,
  Star,
  Award,
  Phone,
  CreditCard,
  CheckCircle2,
  Power,
  Loader2,
  FileCheck2,
  Copy,
  Check,
  Car,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function CourierProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/v1/courier/profile");
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error("Failed to load courier profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const toggleDuty = async () => {
    if (!profile || isUpdating) return;
    setIsUpdating(true);
    try {
      const newStatus = !profile.on_duty;
      const res = await fetch("/api/v1/courier/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on_duty: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Derive standardized COU-xxxxx code
  const courierRefCode = profile?.ref_code || (profile?.id ? `COU-${profile.id.replace(/-/g, "").slice(0, 5).toUpperCase()}` : "COU-84920");

  const handleCopyRefCode = () => {
    navigator.clipboard.writeText(courierRefCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
        <span className="text-xs font-bold text-slate-500">جاري تحميل الملف الشخصي...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12" dir="rtl">
      {/* ── Driver Header Card ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs text-center space-y-3">
        <div className="relative w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-black mx-auto shadow-md">
          {profile?.full_name?.charAt(0) || "س"}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900">{profile?.full_name || "سعيد المطيري"}</h2>
          <p className="text-xs text-slate-500 mt-0.5">مندوب توصيل معتمد - أسطول رفق اللوجستي</p>
        </div>

        {/* Reference Code Badge (1-Click Copy) */}
        <div className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-2xl transition-all">
          <span className="text-xs text-slate-400 font-bold">الرقم المرجعي:</span>
          <span className="font-mono font-black text-slate-900 text-sm tracking-wider">{courierRefCode}</span>
          <button
            type="button"
            onClick={handleCopyRefCode}
            className="text-slate-400 hover:text-slate-900 p-1 rounded-lg transition-colors cursor-pointer"
            title="نسخ الرقم المرجعي"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2 text-xs">
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 px-3 py-1 rounded-xl font-bold">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{profile?.rating || 4.95} / 5.0</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200/80 px-3 py-1 rounded-xl font-bold">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>{profile?.completed_deliveries_count || 218} رحلة مكتملة</span>
          </div>
        </div>
      </div>

      {/* ── Duty Switcher ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-slate-900">حالة التوفر واستقبال المهام (Online / Offline)</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {profile?.on_duty ? "أنت الآن متاح على الخريطة ومستعد لاستقبال الشحنات الجديدة." : "أنت الآن غير متاح ولن يتم إسناد مهام جديدة لحسابك."}
          </p>
        </div>

        <button
          type="button"
          onClick={toggleDuty}
          disabled={isUpdating}
          className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            profile?.on_duty
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700"
          }`}
        >
          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          <span>{profile?.on_duty ? "متاح للطلب (Online)" : "غير متاح (Offline)"}</span>
        </button>
      </div>

      {/* ── Vehicle & Driver License Info ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
          <Truck className="w-4 h-4 text-slate-500" />
          <span>بيانات المركبة ورخصة القيادة</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 font-bold block text-[10px]">نوع مركبة التوصيل</span>
            <p className="font-black text-slate-800">{profile?.vehicle_info || "دراجة نارية مجهزة - صندوق توصيل معتمد"}</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 font-bold block text-[10px]">رقم اللوحة المرورية</span>
            <p className="font-mono font-black text-slate-800">{profile?.plate_number || "د هـ 2214 (لوحة سعودية)"}</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 font-bold block text-[10px]">رقم رخصة القيادة</span>
            <p className="font-mono font-black text-slate-800">DL-SA-982341 (سارية المفعول)</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 font-bold block text-[10px]">منطقة ونطاق التغطية</span>
            <p className="font-black text-slate-800">الرياض (كافة الأحياء والنطاقات)</p>
          </div>
        </div>
      </div>

      {/* ── Ratings & Customer Reviews ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>أحدث تقييمات العملاء والموردين</span>
        </h3>

        <div className="space-y-2.5">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">شركة المشتريات الوطنية</span>
              <div className="flex items-center gap-0.5 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              "تسليم سريع جداً وحرص على فحص وتغليف القطع قبل الاستلام والتسليم. ممتاز!"
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">مؤسسة قطع الغيار المعتمدة</span>
              <div className="flex items-center gap-0.5 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              "مندوب خلوق والتزام بالموعد المحدد عند استلام الشحنة من المستودع."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

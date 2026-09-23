"use client";

import { RotateCcw, Sparkles, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReactivateSuccessModal({
  isOpen,
  displayId,
  durationMinutes,
  carName,
  onClose,
  onViewActive,
}: {
  isOpen: boolean;
  displayId: string;
  durationMinutes: number;
  carName?: string;
  onClose: () => void;
  onViewActive: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        dir="rtl"
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 border border-emerald-100 shadow-2xl text-right relative overflow-hidden transform animate-in zoom-in-95 duration-200"
      >
        {/* Top vibrant decorative gradient banner */}
        <div className="absolute top-0 right-0 left-0 h-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* Dismiss 'X' Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4.5 left-4.5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon with glowing rings */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-emerald-400/20 blur-md animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30">
              <RotateCcw className="w-8 h-8 animate-spin-reverse [animation-duration:8s]" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-emerald-300/50">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              تمت إعادة تنشيط الطلب بنجاح! 🚀
            </h3>
            <p className="text-xs text-slate-500 max-w-[320px] mx-auto leading-relaxed">
              تم تجديد مهلة استقبال العروض وإعادة الطلب فوراً إلى رادار الموردين والطلبات النشطة.
            </p>
          </div>
        </div>

        {/* Request Details Box */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50/70 via-slate-50/90 to-teal-50/50 border border-emerald-200/80 p-4 space-y-3 text-xs shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100/90">
            <span className="text-slate-500 font-medium">رقم طلب التسعير:</span>
            <span dir="ltr" className="font-mono font-black text-emerald-950 bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs shadow-2xs">
              {displayId}
            </span>
          </div>

          {carName && (
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100/90">
              <span className="text-slate-500 font-medium">المركبة والموديل:</span>
              <span className="font-bold text-slate-800">{carName}</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100/90">
            <span className="text-slate-500 font-medium">المهلة المجددة:</span>
            <div className="inline-flex items-center gap-1.5 font-black text-slate-900 bg-white border border-emerald-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{durationMinutes} دقيقة</span>
              <span className="text-[10px] text-emerald-700 font-semibold">(بدأ العداد الآن)</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">حالة الظهور للموردين:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span>نشط في رادار الموردين للتسعير</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <Button
            type="button"
            onClick={onViewActive}
            className="w-full sm:flex-1 h-11 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-lg shadow-emerald-600/25 cursor-pointer gap-2 transition-all active:scale-[0.98]"
          >
            <span>الانتقال للطلبات النشطة ✨</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-5 rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}

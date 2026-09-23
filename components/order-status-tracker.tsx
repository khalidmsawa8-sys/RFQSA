"use client";

import { CheckCircle2, Package, Truck, Home, XCircle, Sparkles } from "lucide-react";
import { normalizeOrderStatus } from "@/lib/order-status-sync";

const STEPS = [
  { key: "preparing", label: "تم التجهيز", icon: Package },
  { key: "shipped", label: "تم الشحن", icon: Truck },
  { key: "delivered", label: "جاري التسليم", icon: Home },
  { key: "completed", label: "تأكيد واستلام", icon: CheckCircle2 },
] as const;

interface OrderStatusTrackerProps {
  status: string;
}

export default function OrderStatusTracker({ status }: OrderStatusTrackerProps) {
  const norm = normalizeOrderStatus(status);

  if (norm === "cancelled") {
    return (
      <div className="flex items-center justify-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-200">
        <XCircle className="w-5 h-5 text-rose-600" />
        <span className="text-rose-700 font-bold text-sm">تم إلغاء الطلب</span>
      </div>
    );
  }

  let currentIndex = 0;
  if (norm === "preparing") currentIndex = 0;
  else if (norm === "ready" || norm === "shipped") currentIndex = 1;
  else if (norm === "delivered") currentIndex = 2;
  else if (norm === "completed") currentIndex = 3;

  return (
    <div className="w-full dir-rtl">
      <div className="flex items-center justify-between relative">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isDone = index <= currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative z-10">
              {index > 0 && (
                <div
                  className={`absolute top-4 -right-1/2 w-full h-1 -z-10 transition-all ${
                    index <= currentIndex ? "bg-emerald-600" : "bg-slate-100"
                  }`}
                />
              )}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? "bg-[#1B4D3E] text-white shadow-xs"
                    : "bg-slate-100 text-slate-400"
                } ${isCurrent ? "ring-4 ring-emerald-500/25 scale-105" : ""}`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={`mt-1.5 text-[11px] font-bold text-center ${
                  isDone ? "text-slate-900 font-black" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Wallet,
  Clock,
  FileQuestion,
  Car,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";

export type VendorSupportCategoryType = "payout_withdrawal" | "pickup_delay" | "other";

interface EligibleVendorOrder {
  id: string;
  status: string;
  created_at: string;
  total_price: number;
  rfqs?: { car_make: string; car_model: string; car_year: number; plate_number?: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  eligibleOrders: EligibleVendorOrder[];
  onSuccess: () => void;
}

const VENDOR_SUPPORT_CATEGORIES = [
  {
    value: "payout_withdrawal" as VendorSupportCategoryType,
    label: "سحب الرصيد",
    desc: "طلب تحويل المستحقات المالية أو الاستفسار عن التسويات",
    icon: Wallet,
    color: "border-emerald-300 bg-emerald-50 text-emerald-800",
    requiresOrder: false,
  },
  {
    value: "pickup_delay" as VendorSupportCategoryType,
    label: "التأخر في استلام الطلب",
    desc: "تأخر مندوب التوصيل في استلام الشحنة الجاهزة",
    icon: Clock,
    color: "border-amber-300 bg-amber-50 text-amber-800",
    requiresOrder: true,
  },
  {
    value: "other" as VendorSupportCategoryType,
    label: "أخرى",
    desc: "استفسارات عامة ودعم فني للمتجر",
    icon: FileQuestion,
    color: "border-slate-300 bg-slate-50 text-slate-700",
    requiresOrder: false,
  },
];

const POLICIES = [
  "يتم تحويل مبالغ سحب الرصيد إلى الحساب البنكي المعتمد في الملف التعريفي خلال 24 ساعة عمل",
  "يرجى التأكد من تجهيز الشحنة وفحص القطع قبل تقديم بلاغ تأخر الاستلام",
  "فريق الدعم الفني متواجد على مدار الساعة لمتابعة الطلبات وتسهيل عمليات التسليم",
];

function shortId(id: string) {
  return id.replace(/^ORD-/, "").slice(0, 8).toUpperCase();
}

export function NewVendorSupportModal({
  open,
  onOpenChange,
  userId,
  eligibleOrders,
  onSuccess,
}: Props) {
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [requestType, setRequestType] = useState<VendorSupportCategoryType | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<EligibleVendorOrder | null>(null);
  const [reason, setReason] = useState("");
  const [policies, setPolicies] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentCategory = VENDOR_SUPPORT_CATEGORIES.find((c) => c.value === requestType);
  const requiresOrder = currentCategory?.requiresOrder ?? false;
  const allPoliciesAccepted = POLICIES.every((_, i) => policies[i]);

  function reset() {
    setStep(1);
    setRequestType(null);
    setSelectedOrder(null);
    setReason("");
    setPolicies({});
    setError("");
  }

  async function handleSubmit() {
    if (!requestType || !reason.trim() || !allPoliciesAccepted) return;
    if (requiresOrder && !selectedOrder) return;

    setSubmitting(true);
    setError("");

    try {
      const ticketPayload = {
        vendor_id: userId,
        order_id: selectedOrder ? selectedOrder.id : null,
        request_type: requestType,
        status: "open",
        reason: reason.trim(),
      };

      // 1. Post directly to server API
      const res = await fetch("/api/v1/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(ticketPayload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "فشل في حفظ تذكرة الدعم على السيرفر");
      }

      // 2. Synchronize with localStorage for instant local reactivity
      if (typeof window !== "undefined" && resData.ticket) {
        try {
          const raw = localStorage.getItem("rfq_demo_support_requests");
          const existing = raw ? JSON.parse(raw) : [];
          localStorage.setItem("rfq_demo_support_requests", JSON.stringify([resData.ticket, ...existing]));
          window.dispatchEvent(new Event("rfq_data_changed"));
        } catch (e) {}
      }

      onSuccess();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "حدث خطأ أثناء حفظ التذكرة");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent dir="rtl" className="max-w-xl max-h-[90vh] overflow-y-auto p-0 bg-white">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-base font-black text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <LifeBuoy className="w-4 h-4" />
            </div>
            إنشاء تذكرة دعم فني جديدة للمورد
          </DialogTitle>
          <div className="mt-4">
            <div className="flex items-center gap-2 justify-center">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < step
                        ? "bg-emerald-600 text-white"
                        : i === step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i}
                  </div>
                  {i < 3 && (
                    <div
                      className={`h-0.5 w-8 rounded-full ${
                        i < step ? "bg-emerald-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2 font-semibold">
              {step === 1 ? "تصنيف التذكرة" : step === 2 ? (requiresOrder ? "اختيار الطلب وتفاصيل المشكلة" : "تفاصيل التذكرة") : "الشروط والتأكيد"}
            </p>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Step 1: 3 Vendor Categories */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-700">اختر تصنيف الطلب أو الاستفسار:</p>
              <div className="grid grid-cols-1 gap-2.5">
                {VENDOR_SUPPORT_CATEGORIES.map((opt) => {
                  const Icon = opt.icon;
                  const selected = requestType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setRequestType(opt.value)}
                      className={`group flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-right ${
                        selected
                          ? opt.color + " shadow-sm border-current"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          selected ? "bg-white/70" : "bg-gray-100 group-hover:bg-gray-200"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${selected ? "" : "text-gray-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xs text-slate-900">{opt.label}</p>
                        <p className="text-[11px] mt-0.5 opacity-70 leading-snug">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Order linkage & details */}
          {step === 2 && (
            <div className="space-y-4">
              {requiresOrder && (
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">اختر الطلب المرتبط بالبلاغ:</p>
                  {eligibleOrders.length === 0 ? (
                    <div className="py-6 text-center bg-gray-50 rounded-2xl border border-gray-100 text-xs text-slate-500">
                      لا توجد طلبات بيع نشطة مسجلة حالياً
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {eligibleOrders.map((ord) => (
                        <button
                          key={ord.id}
                          onClick={() => setSelectedOrder(ord)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-all ${
                            selectedOrder?.id === ord.id
                              ? "border-blue-600 bg-blue-50/50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <Car className="w-4 h-4 text-slate-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              #ORD-{shortId(ord.id)}
                            </span>
                            {ord.rfqs && (
                              <p className="text-[11px] text-slate-500 truncate">
                                {ord.rfqs.car_make} {ord.rfqs.car_model} {ord.rfqs.car_year}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-800">
                            {ord.total_price} ر.س
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700">شرح وتفاصيل التذكرة:</p>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اكتب شرحاً مفصلاً لتتمكن خدمة العملاء والمشرفين من متابعة ومعالجة طلبك فوراً..."
                  rows={4}
                  className="text-xs rounded-xl bg-gray-50 border-gray-200 p-3"
                />
              </div>
            </div>
          )}

          {/* Step 3: Terms & Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 text-xs text-blue-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>ملخص التذكرة:</span>
                </p>
                <p className="text-[11px]">التصنيف: {currentCategory?.label}</p>
                {selectedOrder && (
                  <p className="text-[11px]">الطلب المرتبط: #ORD-{shortId(selectedOrder.id)}</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700">الشروط والأحكام:</p>
                {POLICIES.map((policy, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={Boolean(policies[idx])}
                      onCheckedChange={(c) =>
                        setPolicies((prev) => ({ ...prev, [idx]: Boolean(c) }))
                      }
                      className="mt-0.5"
                    />
                    <span className="leading-snug">{policy}</span>
                  </label>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step > 1) setStep((s) => s - 1);
              else onOpenChange(false);
            }}
            disabled={submitting}
            className="text-xs font-semibold text-gray-600"
          >
            {step === 1 ? "إلغاء" : "السابق"}
          </Button>

          {step < 3 ? (
            <Button
              size="sm"
              disabled={
                (step === 1 && !requestType) ||
                (step === 2 && requiresOrder && !selectedOrder) ||
                (step === 2 && !reason.trim())
              }
              onClick={() => setStep((s) => s + 1)}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl gap-1"
            >
              <span>التالي</span>
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!allPoliciesAccepted || !reason.trim() || submitting}
              onClick={handleSubmit}
              className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-6 rounded-xl gap-1.5 shadow-sm"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>تأكيد وإرسال التذكرة</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

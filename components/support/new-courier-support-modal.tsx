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
  MapPin,
  Package,
  Wallet,
  FileQuestion,
  Car,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  LifeBuoy,
  Truck,
  Clock,
} from "lucide-react";

export type CourierSupportCategoryType =
  | "client_location_issue"
  | "vendor_pickup_issue"
  | "courier_payout"
  | "other";

interface EligibleCourierOrder {
  id: string;
  order_id: string;
  delivery_status: string;
  vendor_name: string;
  client_name: string;
  parts_summary: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  eligibleDeliveries: EligibleCourierOrder[];
  onSuccess: () => void;
}

const COURIER_SUPPORT_CATEGORIES = [
  {
    value: "client_location_issue" as CourierSupportCategoryType,
    label: "مشكلة في موقع أو تواصل العميل",
    desc: "عدم تجاوب العميل أو الموقع الجغرافي للتسليم غير دقيق",
    icon: MapPin,
    color: "border-rose-300 bg-rose-50 text-rose-800",
    requiresDelivery: true,
  },
  {
    value: "vendor_pickup_issue" as CourierSupportCategoryType,
    label: "مشكلة في استلام القطعة من المورد",
    desc: "القطعة غير جاهزة لدى المورد أو وجود تلف في التغليف",
    icon: Package,
    color: "border-amber-300 bg-amber-50 text-amber-800",
    requiresDelivery: true,
  },
  {
    value: "courier_payout" as CourierSupportCategoryType,
    label: "سحب أرباح وعمولات التوصيل",
    desc: "طلب تحويل مستحقات وعمولات التوصيل إلى الحساب البنكي",
    icon: Wallet,
    color: "border-emerald-300 bg-emerald-50 text-emerald-800",
    requiresDelivery: false,
  },
  {
    value: "other" as CourierSupportCategoryType,
    label: "أخرى",
    desc: "استفسارات عامة ومشاكل فنية في التطبيق",
    icon: FileQuestion,
    color: "border-slate-300 bg-slate-50 text-slate-700",
    requiresDelivery: false,
  },
];

const POLICIES = [
  "يتم فحص بلاغات الميدان فورياً من قبل فريق العمليات للتنسيق مع العميل أو المورد",
  "طلبات سحب العمولات يتم تحويلها للحساب البنكي المعتمد خلال 24 ساعة عمل",
  "يرجى توثيق أي ملاحظات ميدانية بالصور أو تفاصيل واضحة لسرعة حل البلاغ",
];

function shortId(id: string) {
  return id.replace(/^DEL-/, "").replace(/^ORD-/, "").slice(0, 8).toUpperCase();
}

export function NewCourierSupportModal({
  open,
  onOpenChange,
  userId,
  eligibleDeliveries,
  onSuccess,
}: Props) {
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [requestType, setRequestType] = useState<CourierSupportCategoryType | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<EligibleCourierOrder | null>(null);
  const [reason, setReason] = useState("");
  const [policies, setPolicies] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentCategory = COURIER_SUPPORT_CATEGORIES.find((c) => c.value === requestType);
  const requiresDelivery = currentCategory?.requiresDelivery ?? false;
  const allPoliciesAccepted = POLICIES.every((_, i) => policies[i]);

  function reset() {
    setStep(1);
    setRequestType(null);
    setSelectedDelivery(null);
    setReason("");
    setPolicies({});
    setError("");
  }

  async function handleSubmit() {
    if (!requestType || !reason.trim() || !allPoliciesAccepted) return;
    if (requiresDelivery && !selectedDelivery) return;

    setSubmitting(true);
    setError("");

    try {
      const ticketPayload = {
        client_id: userId,
        order_id: selectedDelivery ? selectedDelivery.order_id : null,
        request_type: requestType,
        status: "pending",
        reason: reason.trim(),
      };

      const { data: req, error: reqErr } = await supabase
        .from("support_requests")
        .insert(ticketPayload)
        .select()
        .single();

      if (reqErr || !req) throw reqErr ?? new Error("فشل في إنشاء التذكرة");

      // Save initial message to start conversation thread
      try {
        await supabase.from("support_messages").insert({
          request_id: req.id,
          sender_id: userId,
          sender_role: "courier",
          sender_name: "المندوب",
          message_text: reason.trim(),
        });
      } catch (e) {}

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
      <DialogContent dir="rtl" className="max-w-xl max-h-[90vh] overflow-y-auto p-0 bg-white font-sans">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <LifeBuoy className="w-4 h-4 text-emerald-400" />
            </div>
            إنشاء تذكرة دعم وبلاغ عمليات جديد للمندوب
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
                        ? "bg-slate-900 text-white"
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
              {step === 1 ? "تصنيف البلاغ" : step === 2 ? (requiresDelivery ? "اختيار الشحنة وتفاصيل المشكلة" : "تفاصيل التذكرة") : "التأكيد والإرسال"}
            </p>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Step 1: 4 Courier Categories */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-700">اختر نوع البلاغ أو المشكلة الميدانية:</p>
              <div className="grid grid-cols-1 gap-2.5">
                {COURIER_SUPPORT_CATEGORIES.map((opt) => {
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

          {/* Step 2: Delivery linkage & details */}
          {step === 2 && (
            <div className="space-y-4">
              {requiresDelivery && (
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">اختر الشحنة المرتبطة بالبلاغ:</p>
                  {eligibleDeliveries.length === 0 ? (
                    <div className="py-6 text-center bg-gray-50 rounded-2xl border border-gray-100 text-xs text-slate-500">
                      لا توجد شحنات جارية مسجلة حالياً
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {eligibleDeliveries.map((del) => (
                        <button
                          key={del.id}
                          onClick={() => setSelectedDelivery(del)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-all ${
                            selectedDelivery?.id === del.id
                              ? "border-slate-900 bg-slate-50 shadow-2xs"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <Truck className="w-4 h-4 text-slate-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                #ORD-{shortId(del.order_id)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({del.id})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {del.parts_summary}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {del.delivery_status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700">شرح وتفاصيل المشكلة الميدانية:</p>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اكتب شرحاً دقيقاً لتتمكن غرفة العمليات والدعم الفني من معالجة المشكلة فوراً..."
                  rows={4}
                  className="text-xs rounded-xl bg-gray-50 border-gray-200 p-3"
                />
              </div>
            </div>
          )}

          {/* Step 3: Terms & Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ملخص التذكرة:</span>
                </p>
                <p className="text-[11px]">التصنيف: {currentCategory?.label}</p>
                {selectedDelivery && (
                  <p className="text-[11px]">الشحنة المرتبطة: #ORD-{shortId(selectedDelivery.order_id)}</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700">الإقرار والضوابط:</p>
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
                (step === 2 && requiresDelivery && !selectedDelivery) ||
                (step === 2 && !reason.trim())
              }
              onClick={() => setStep((s) => s + 1)}
              className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-xl gap-1"
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
              <span>تأكيد وإرسال البلاغ</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

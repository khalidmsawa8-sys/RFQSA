"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDealItemsForOrder } from "@/app/actions/get-deal-items";
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
  RotateCcw,
  RefreshCw,
  Car,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Minus,
  Plus,
  ShieldCheck,
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
  FileQuestion,
} from "lucide-react";

/* ─── Types ─── */
interface EligibleOrder {
  id: string;
  status: string;
  created_at: string;
  total_price: number;
  rfqs?: { car_make: string; car_model: string; car_year: number; plate_number?: string } | null;
  deals?: Array<{ id: string; status: string }> | null;
}

interface DealItem {
  id: string;
  part_name: string;
  part_number?: string | null;
  quantity: number;
  unit_price: number;
  source: "deal_items" | "quote_items";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  eligibleOrders: EligibleOrder[];
  onSuccess: () => void;
}

export type SupportCategoryType =
  | "return_replacement"
  | "item_mismatch"
  | "delivery_delay"
  | "suggestion"
  | "other";

const SUPPORT_CATEGORIES = [
  {
    value: "return_replacement" as SupportCategoryType,
    label: "الاستبدال والاسترجاع",
    desc: "طلب إرجاع أو استبدال قطع غيار معتمدة",
    icon: RotateCcw,
    color: "border-purple-300 bg-purple-50 text-purple-700",
    requiresOrder: true,
  },
  {
    value: "item_mismatch" as SupportCategoryType,
    label: "الطلب غير مطابق",
    desc: "القطع المستلمة تختلف عن مواصفات الطلب",
    icon: AlertCircle,
    color: "border-amber-300 bg-amber-50 text-amber-700",
    requiresOrder: true,
  },
  {
    value: "delivery_delay" as SupportCategoryType,
    label: "التأخر في استلام الطلب",
    desc: "متابعة شحنة متأخرة عن الموعد المحدد",
    icon: Clock,
    color: "border-blue-300 bg-blue-50 text-blue-700",
    requiresOrder: true,
  },
  {
    value: "suggestion" as SupportCategoryType,
    label: "اقتراح للتطوير",
    desc: "أفكار ومقترحات لتحسين المنصة والخدمة",
    icon: Sparkles,
    color: "border-emerald-300 bg-emerald-50 text-emerald-700",
    requiresOrder: false,
  },
  {
    value: "other" as SupportCategoryType,
    label: "أخرى",
    desc: "استفسارات عامة ومواضيع أخرى",
    icon: FileQuestion,
    color: "border-slate-300 bg-slate-50 text-slate-700",
    requiresOrder: false,
  },
];

const POLICIES = [
  "يتحمل العميل رسوم التوصيل والرسوم البنكية في حال كان سبب الإرجاع غير ناتج عن خطأ المورد",
  "لا يتم استبدال أو استرجاع القطع الكهربائية بعد فك تغليفها الأصلي",
  "مدة معالجة التذكرة والرد من قِبل الفريق: خلال 24 ساعة عمل",
  "يجب أن تكون القطع بحالتها الأصلية مع ملصقات التغليف",
];

function shortId(id: string) { return id.slice(0, 8).toUpperCase(); }

export function NewSupportRequestModal({ open, onOpenChange, userId, eligibleOrders, onSuccess }: Props) {
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [requestType, setRequestType] = useState<SupportCategoryType | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<EligibleOrder | null>(null);
  const [dealItems, setDealItems] = useState<DealItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [policies, setPolicies] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentCategory = useMemo(() => {
    return SUPPORT_CATEGORIES.find((c) => c.value === requestType);
  }, [requestType]);

  const requiresOrder = currentCategory ? currentCategory.requiresOrder : false;

  /* ─── Load deal items for selected order ─── */
  async function loadItems(order: EligibleOrder) {
    setSelectedOrder(order);
    setLoadingItems(true);
    setSelectedItems({});
    setQuantities({});
    setStep(3);

    try {
      const items = await getDealItemsForOrder(order.id);
      setDealItems(items);
      const qty: Record<string, number> = {};
      items.forEach((i) => {
        qty[i.id] = 1;
      });
      setQuantities(qty);
    } catch (e) {
      console.warn("Failed to load deal items:", e);
    } finally {
      setLoadingItems(false);
    }
  }

  function toggleItem(id: string) {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function adjustQty(id: string, delta: number, max: number) {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.min(max, (prev[id] ?? 1) + delta)),
    }));
  }

  const allPoliciesAccepted = POLICIES.every((_, i) => policies[i]);

  function reset() {
    setStep(1);
    setRequestType(null);
    setSelectedOrder(null);
    setDealItems([]);
    setSelectedItems({});
    setQuantities({});
    setReason("");
    setPolicies({});
    setError("");
  }

  /* ─── Submit ─── */
  async function handleSubmit() {
    if (!requestType || !reason.trim() || !allPoliciesAccepted) return;
    if (requiresOrder && !selectedOrder) return;

    setSubmitting(true);
    setError("");

    try {
      const chosenItems = dealItems.filter((i) => selectedItems[i.id]);
      const totalAmount = chosenItems.reduce(
        (s, i) => s + (quantities[i.id] ?? 1) * i.unit_price,
        0
      );

      const ticketPayload = {
        client_id: userId,
        order_id: selectedOrder ? selectedOrder.id : null,
        request_type: requestType,
        status: "open",
        reason: reason.trim(),
        refund_amount: totalAmount > 0 ? totalAmount : null,
        items: chosenItems.map((i) => ({
          part_name: i.part_name,
          part_number: i.part_number || null,
          quantity: quantities[i.id] ?? 1,
          unit_price: i.unit_price,
        })),
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

  const STEP_LABELS = [
    "تصنيف التذكرة",
    requiresOrder ? "اختيار الطلب" : "تفاصيل التذكرة",
    requiresOrder ? "القطع (اختياري)" : "الشروط والتأكيد",
    "الشروط والتأكيد",
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent dir="rtl" className="max-w-xl max-h-[90vh] overflow-y-auto p-0 bg-white">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-base font-black text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-[#1B4D3E] flex items-center justify-center text-white">
              <RotateCcw className="w-4 h-4" />
            </div>
            إنشاء تذكرة دعم فني جديدة
          </DialogTitle>
          <div className="mt-4">
            <div className="flex items-center gap-2 justify-center">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < step
                        ? "bg-emerald-600 text-white"
                        : i === step
                        ? "bg-[#1B4D3E] text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i}
                  </div>
                  {i < 4 && (
                    <div
                      className={`h-0.5 w-6 rounded-full ${
                        i < step ? "bg-emerald-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2 font-semibold">
              {STEP_LABELS[step - 1] || "تفاصيل التذكرة"}
            </p>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* ── Step 1: Choose category (5 mandatory types) ── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-700">اختر تصنيف المشكلة أو الاستفسار:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUPPORT_CATEGORIES.map((opt) => {
                  const Icon = opt.icon;
                  const selected = requestType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setRequestType(opt.value)}
                      className={`group flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all text-right ${
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
                        <p className="font-bold text-xs">{opt.label}</p>
                        <p className="text-[11px] mt-0.5 opacity-70 leading-snug">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 2: Choose order or general reason ── */}
          {step === 2 && (
            <div className="space-y-3">
              {requiresOrder ? (
                <>
                  <p className="text-xs font-bold text-gray-700">
                    اختر الطلب المرتبط بالمشكلة:
                  </p>
                  {eligibleOrders.length === 0 ? (
                    <div className="py-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                      <Car className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-600">لا توجد طلبات سابقة مسجلة</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">يمكنك المتابعة بتقديم استفسار عام</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(null);
                          setStep(3);
                        }}
                        className="mt-3 text-xs bg-gray-800 text-white"
                      >
                        المتابعة بدون تحديد طلب
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {eligibleOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => loadItems(order)}
                          disabled={loadingItems}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${
                            selectedOrder?.id === order.id
                              ? "border-emerald-600 bg-emerald-50/40"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Car className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-900">
                                #{shortId(order.id)}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(order.created_at).toLocaleDateString("ar-SA")}
                              </span>
                            </div>
                            {order.rfqs && (
                              <p className="text-[11px] text-gray-500 truncate">
                                {order.rfqs.car_make} {order.rfqs.car_model} {order.rfqs.car_year}
                              </p>
                            )}
                          </div>
                          <div className="text-left shrink-0">
                            <p className="text-xs font-bold text-emerald-800">
                              {order.total_price} ر.س
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-700">شرح وتفاصيل التذكرة:</p>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="اكتب شرحاً مفصلاً للاقتراح أو الاستفسار المطلوب..."
                    rows={5}
                    className="text-xs rounded-xl bg-gray-50 border-gray-200 p-3"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Items selection (for return/replacement/mismatch) ── */}
          {step === 3 && (
            <div className="space-y-3">
              {dealItems.length > 0 ? (
                <>
                  <p className="text-xs font-bold text-gray-700">
                    حدد القطع المتأثرة (اختياري):
                  </p>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {dealItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={Boolean(selectedItems[item.id])}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <div>
                            <p className="text-xs font-bold text-gray-800">{item.part_name}</p>
                            {item.part_number && (
                              <p className="text-[10px] font-mono text-gray-400">{item.part_number}</p>
                            )}
                          </div>
                        </div>

                        {selectedItems[item.id] && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustQty(item.id, -1, item.quantity)}
                              className="h-6 w-6 p-0 rounded-md"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-xs font-bold font-mono">
                              {quantities[item.id] ?? 1}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustQty(item.id, 1, item.quantity)}
                              className="h-6 w-6 p-0 rounded-md"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-gray-700">وصف المشكلة / التفاصيل:</p>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اشرح المشكلة بدقة لمساعدة فريق الدعم الفني في معالجة طلبك بأسرع وقت..."
                  rows={4}
                  className="text-xs rounded-xl bg-gray-50 border-gray-200 p-3"
                />
              </div>
            </div>
          )}

          {/* ── Step 4: Terms & Submission ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>ملخص التذكرة:</span>
                </p>
                <p className="text-[11px]">التصنيف: {currentCategory?.label}</p>
                {selectedOrder && (
                  <p className="text-[11px]">الطلب المرتبط: #{shortId(selectedOrder.id)}</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700">شروط وأحكام الخدمة:</p>
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

        {/* Footer Navigation */}
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

          {step < 4 ? (
            <Button
              size="sm"
              disabled={
                (step === 1 && !requestType) ||
                (step === 2 && requiresOrder && !selectedOrder) ||
                (step === 2 && !requiresOrder && !reason.trim())
              }
              onClick={() => {
                if (step === 2 && !requiresOrder) {
                  setStep(4);
                } else {
                  setStep((s) => s + 1);
                }
              }}
              className="text-xs font-bold bg-[#1B4D3E] hover:bg-[#14392E] text-white px-5 rounded-xl"
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

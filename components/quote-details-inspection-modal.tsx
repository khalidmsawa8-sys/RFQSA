"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Check,
  Truck,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  Sparkles,
  FileText,
  Star,
  CheckCircle2,
  AlertCircle,
  Eye,
  Images,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Percent,
  Receipt,
  RotateCcw,
  Ban,
  Tag,
  Ticket,
  Shield,
  Clock,
  Phone,
  Building2,
  User,
} from "lucide-react";
import { QuotePDFExport } from "@/components/quote-pdf-export";
import { VendorDetailsModal, VendorModalData } from "@/components/vendor-details-modal";
import { PromoCode, CouponTarget } from "@/lib/coupons";

interface QuoteItem {
  part_name: string;
  part_number?: string;
  part_type?: "original" | "commercial" | "both" | "unavailable";
  original_price?: number;
  commercial_price?: number;
  commercial_brand?: string | null;
  quantity?: number;
  unit_price?: number;
  price?: string | number;
  line_total?: number;
  availability?: string;
  image_url?: string;
  images?: string[];
}

interface Quote {
  id: string;
  vendor_id: string;
  items?: QuoteItem[] | any;
  total_price: number;
  delivery_days: number | null;
  delivery_cost?: number;
  delivery_snapshot?: any;
  notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    company_name: string;
    tax_number?: string;
    commercial_register?: string;
    national_address?: string;
    phone?: string;
  };
  avgRating?: number;
}

interface RFQItem {
  partName: string;
  quantity: number;
  partNumber?: string;
  partType?: "original" | "commercial";
  commercialBrand?: string;
  imageUrl?: string;
  images?: string[];
  notes?: string;
}

interface RFQ {
  id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  plate_number?: string;
  vin: string;
  parts_description: string;
  delivery_location?: string;
  delivery_city?: string;
  status: string;
  created_at: string;
}

interface QuoteDetailsInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  rfq: RFQ | null;
  clientProfile?: any;
  onAccept: (quote: Quote, selectedItems: QuoteItem[], acceptedGrandTotal: number, couponCode?: string) => void;
}

export function QuoteDetailsInspectionModal({
  isOpen,
  onClose,
  quote,
  rfq,
  clientProfile,
  onAccept,
}: QuoteDetailsInspectionModalProps) {
  if (!isOpen || !quote || !rfq) return null;

  // Parse original RFQ items to merge images/details
  const rfqItems: RFQItem[] = useMemo(() => {
    try {
      const parsed = JSON.parse(rfq.parts_description || "[]");
      if (Array.isArray(parsed)) {
        return parsed.map((p: any) => ({
          partName: p.partName || p.part_name || p.name || "",
          quantity: Number(p.quantity || 1),
          partNumber: p.partNumber || p.part_number || "",
          images:
            Array.isArray(p.images) && p.images.length > 0
              ? p.images
              : p.imagePathname || p.imagePreview || p.imageUrl || p.image_url
              ? [String(p.imagePathname || p.imagePreview || p.imageUrl || p.image_url)]
              : [],
        }));
      }
    } catch {}
    return [];
  }, [rfq.parts_description]);

  // Safely extract items list from quote
  const safeQuoteItems: QuoteItem[] = useMemo(() => {
    if (!quote) return [];
    if (Array.isArray(quote.items)) return quote.items;
    if (typeof quote.items === "string") {
      try {
        const parsed = JSON.parse(quote.items);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    // Fallback: if quote has no items, but rfq has items, synthesize items from rfq
    if (rfqItems && rfqItems.length > 0) {
      const unit = (Number(quote.total_price || 0) / rfqItems.length) || 0;
      return rfqItems.map((r) => ({
        part_name: r.partName,
        part_number: r.partNumber,
        quantity: r.quantity || 1,
        unit_price: unit,
        line_total: unit * (r.quantity || 1),
        availability: "available",
        images: r.images,
      }));
    }
    return [];
  }, [quote, rfqItems]);

  // Track selection state for each item (accepted: boolean, chosenType: "original" | "commercial")
  const [itemSelections, setItemSelections] = useState<
    Record<
      number,
      {
        accepted: boolean;
        chosenType: "original" | "commercial";
      }
    >
  >({});

  // Initialize selection state on open/quote change
  useEffect(() => {
    if (!safeQuoteItems || safeQuoteItems.length === 0) return;
    const initial: Record<number, { accepted: boolean; chosenType: "original" | "commercial" }> = {};

    safeQuoteItems.forEach((item, index) => {
      const isUnavailable =
        item.availability === "unavailable" || item.part_type === "unavailable";
      const hasOrig = Number(item.original_price || (item.part_type === "original" ? item.unit_price : 0)) > 0;
      const hasComm = Number(item.commercial_price || (item.part_type === "commercial" ? item.unit_price : 0)) > 0;

      let defaultType: "original" | "commercial" = "original";
      if (!hasOrig && hasComm) defaultType = "commercial";
      else if (item.part_type === "commercial") defaultType = "commercial";

      initial[index] = {
        accepted: !isUnavailable,
        chosenType: defaultType,
      };
    });

    setItemSelections(initial);
  }, [safeQuoteItems]);

  // Gallery Lightbox State
  const [activeGallery, setActiveGallery] = useState<{
    partName: string;
    images: string[];
    index: number;
    zoom: number;
  } | null>(null);

  // Vendor Details Modal State
  const [showVendorModal, setShowVendorModal] = useState<VendorModalData | null>(null);

  // Promo / Coupon Code State
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<PromoCode | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Toggle acceptance of a single part
  const toggleItemAcceptance = (index: number) => {
    setItemSelections((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        accepted: !prev[index]?.accepted,
      },
    }));
  };

  // Switch chosen type for a dual-priced part (Original vs Commercial)
  const setItemChosenType = (index: number, chosenType: "original" | "commercial") => {
    setItemSelections((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        chosenType,
      },
    }));
  };

  // Toggle Select All / Deselect All
  const areAllAccepted = useMemo(() => {
    return (
      safeQuoteItems.length > 0 &&
      safeQuoteItems.every((it, idx) => {
        if (it.availability === "unavailable" || it.part_type === "unavailable") return true;
        return itemSelections[idx]?.accepted;
      })
    );
  }, [safeQuoteItems, itemSelections]);

  const handleToggleSelectAll = () => {
    const nextState = !areAllAccepted;
    const updated: typeof itemSelections = {};
    safeQuoteItems.forEach((it, idx) => {
      const isUnavailable =
        it.availability === "unavailable" || it.part_type === "unavailable";
      updated[idx] = {
        chosenType: itemSelections[idx]?.chosenType || "original",
        accepted: isUnavailable ? false : nextState,
      };
    });
    setItemSelections(updated);
  };

  // Calculate price for each item based on client selection
  const getItemEffectivePrice = (item: QuoteItem, index: number) => {
    const sel = itemSelections[index];
    if (!sel || !sel.accepted) return 0;
    if (item.availability === "unavailable" || item.part_type === "unavailable") return 0;

    const origPrice = Number(item.original_price || (item.part_type === "original" ? item.unit_price : 0)) || 0;
    const commPrice = Number(item.commercial_price || (item.part_type === "commercial" ? item.unit_price : 0)) || 0;

    if (sel.chosenType === "commercial" && commPrice > 0) {
      return commPrice;
    }
    if (origPrice > 0) {
      return origPrice;
    }
    return Number(item.unit_price || item.price || 0);
  };

  // Recalculated Financial Totals
  const { partsSubtotal, acceptedItemsCount } = useMemo(() => {
    let sub = 0;
    let count = 0;

    safeQuoteItems.forEach((it, idx) => {
      const sel = itemSelections[idx];
      if (sel?.accepted && it.availability !== "unavailable" && it.part_type !== "unavailable") {
        const qty = Number(it.quantity || 1);
        const price = getItemEffectivePrice(it, idx);
        sub += price * qty;
        count++;
      }
    });

    return { partsSubtotal: sub, acceptedItemsCount: count };
  }, [safeQuoteItems, itemSelections]);

  // Delivery cost from quote
  const deliveryCostNum = Number(quote.delivery_cost || 0);

  // Target-aware Discount Calculation (Scope: Delivery vs Subtotal)
  const {
    subtotalDiscount,
    deliveryDiscount,
    totalDiscount,
    effectiveDelivery,
    subtotalAfterDiscount,
    taxAmount,
    grandTotal,
  } = useMemo(() => {
    let subDisc = 0;
    let delivDisc = 0;

    if (appliedCoupon) {
      if (appliedCoupon.target === "delivery") {
        if (appliedCoupon.type === "percent") {
          delivDisc = (deliveryCostNum * appliedCoupon.value) / 100;
        } else {
          delivDisc = Math.min(deliveryCostNum, appliedCoupon.value);
        }
      } else {
        // subtotal / invoice total
        if (appliedCoupon.type === "percent") {
          subDisc = (partsSubtotal * appliedCoupon.value) / 100;
        } else {
          subDisc = Math.min(partsSubtotal, appliedCoupon.value);
        }
        if (appliedCoupon.max_discount_cap && subDisc > appliedCoupon.max_discount_cap) {
          subDisc = appliedCoupon.max_discount_cap;
        }
      }
    }

    const subAfter = Math.max(0, partsSubtotal - subDisc);
    const tax = (subAfter * 15) / 100;
    const effDeliv = Math.max(0, deliveryCostNum - delivDisc);
    const total = subAfter + tax + effDeliv;

    return {
      subtotalDiscount: subDisc,
      deliveryDiscount: delivDisc,
      totalDiscount: subDisc + delivDisc,
      effectiveDelivery: effDeliv,
      subtotalAfterDiscount: subAfter,
      taxAmount: tax,
      grandTotal: total,
    };
  }, [appliedCoupon, partsSubtotal, deliveryCostNum]);

  // Coupon Apply Handler (Checks live API + local fallback)
  const handleApplyCoupon = async () => {
    const raw = couponInput.trim().toUpperCase();
    if (!raw) {
      setCouponError("يرجى إدخال رمز كود الخصم أولاً.");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: raw,
          partsSubtotal,
          deliveryCost: deliveryCostNum,
        }),
      });

      const data = await res.json();
      if (data.valid && data.coupon) {
        setAppliedCoupon(data.coupon);
        setCouponError(null);
      } else {
        setCouponError(data.error || "كود الخصم المدخل غير صالح أو منتهي الصلاحية.");
      }
    } catch (e: any) {
      setCouponError("حدث خطأ أثناء فحص كود الخصم.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const vendorName = quote.profiles?.company_name || quote.profiles?.full_name || "مؤسسة قطع الغيار المعتمدة";
  const rating = quote.avgRating ?? 5.0;
  const quoteDate = new Date(quote.created_at).toLocaleDateString("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prepTimeText = useMemo(() => {
    if (quote.delivery_snapshot?.preparation_time?.text) {
      return quote.delivery_snapshot.preparation_time.text;
    }
    if (quote.notes) {
      const match = quote.notes.match(/مدة التجهيز:\s*([^|]+)/i);
      if (match && match[1]) return match[1].trim();
    }
    return "يومان";
  }, [quote]);

  const deliveryTimeText = useMemo(() => {
    if (quote.delivery_days != null) {
      const d = Number(quote.delivery_days);
      if (d === 1) return "يوم واحد";
      if (d === 2) return "يومان (48 ساعة)";
      if (d > 2 && d <= 10) return `${d} أيام`;
      return `${d} يوم`;
    }
    return "خلال 24 ساعة";
  }, [quote]);

  const handleConfirmAcceptance = () => {
    const selectedItemsList: QuoteItem[] = [];

    safeQuoteItems.forEach((it, idx) => {
      const sel = itemSelections[idx];
      if (sel?.accepted && it.availability !== "unavailable" && it.part_type !== "unavailable") {
        const unitPrice = getItemEffectivePrice(it, idx);
        const qty = Number(it.quantity || 1);
        selectedItemsList.push({
          ...it,
          unit_price: unitPrice,
          line_total: unitPrice * qty,
          part_type: sel.chosenType,
        });
      }
    });

    onAccept(quote, selectedItemsList, grandTotal, appliedCoupon?.code);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ────────────────── 1. MODAL TOP HEADER ────────────────── */}
        <div className="bg-[#1E293B] text-white px-6 py-4.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowVendorModal({
                vendorId: quote.vendor_id || "vendor-demo-id",
                refCode: (quote.profiles as any)?.ref_code || "VND-501",
                name: vendorName,
                rating: rating || 5.0,
                ordersCount: 512,
                completedDeals: 2,
                commitmentRate: "96%",
                memberSince: "2024",
                isVerified: true,
              });
            }}
            className="flex items-center gap-3.5 min-w-0 p-1.5 -m-1.5 rounded-2xl hover:bg-slate-800/80 transition-all cursor-pointer group/vendor"
            title="انقر لعرض تفاصيل وتقييمات المورد"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600 group-hover/vendor:bg-emerald-600 transition-colors flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
              {vendorName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white truncate group-hover/vendor:text-emerald-300 transition-colors">{vendorName}</h2>
                <span className="text-[10px] font-extrabold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  <span>مورد معتمد وموثق</span>
                </span>
                <span className="opacity-0 group-hover/vendor:opacity-100 transition-opacity text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  الملف 🔍
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300 font-bold mt-0.5">
                <span className="text-emerald-400 font-mono font-bold">رقم العرض: #{quote.id}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">{quoteDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <QuotePDFExport
              rfq={{
                id: rfq.id,
                car_make: rfq.car_make,
                car_model: rfq.car_model,
                car_year: rfq.car_year,
                plate_number: rfq.plate_number,
                created_at: rfq.created_at,
              }}
              vendor={{
                full_name: quote.profiles?.full_name,
                company_name: quote.profiles?.company_name,
                tax_number: quote.profiles?.tax_number,
                commercial_register: quote.profiles?.commercial_register,
                national_address: quote.profiles?.national_address,
              }}
              client={clientProfile}
              quote={{
                id: quote.id,
                items: safeQuoteItems.map((p, idx) => ({
                  part_name: p.part_name,
                  part_number: p.part_number,
                  quantity: Number(p.quantity || 1),
                  unit_price: getItemEffectivePrice(p, idx),
                  line_total: getItemEffectivePrice(p, idx) * Number(p.quantity || 1),
                  availability: p.availability,
                })),
                total_price: grandTotal,
                delivery_days: Number(quote.delivery_days || 1),
                delivery_price: deliveryCostNum,
                notes: quote.notes ?? undefined,
                created_at: quote.created_at,
              }}
              triggerButton={
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>تصدير PDF</span>
                </button>
              }
            />

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ────────────────── 2. SCROLLABLE BODY ────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Logistics & Timings Dashboard: Preparation vs Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. مدة التجهيز */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-black text-amber-950 text-sm block">مدة تجهيز وفحص الطلب</span>
                  <p className="text-amber-800 font-medium mt-0.5">
                    المدة المحددة من المورد: <strong className="font-black text-amber-950">{prepTimeText}</strong>
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-white border border-amber-200 px-2.5 py-1 rounded-xl shadow-2xs shrink-0">
                ⏱️ تجهيز فوري
              </span>
            </div>

            {/* 2. مدة الشحن والتوصيل */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-950 text-sm block">شحن أسطول رفق المعتمد</span>
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">مؤمّن ✓</span>
                  </div>
                  <p className="text-emerald-800 font-medium mt-0.5">
                    مدة التوصيل المعتمدة: <strong className="font-black text-emerald-950">{deliveryTimeText}</strong>
                  </p>
                </div>
              </div>
              <div className="text-left bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs shrink-0">
                <span className="text-[10px] text-slate-400 font-bold block">رسوم التوصيل</span>
                <span className="font-mono font-black text-emerald-700 text-xs">
                  {deliveryCostNum > 0 ? `${deliveryCostNum.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س` : "مجاني"}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle summary chip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">المركبة المطلوبة:</span>
              <strong className="text-slate-900 font-black">
                {rfq.car_make} {rfq.car_model} ({rfq.car_year})
              </strong>
              {rfq.plate_number && (
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-slate-800">
                  لوحة: {rfq.plate_number}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">رقم الهيكل (VIN):</span>
              <span className="font-mono font-bold text-slate-800">{rfq.vin || "غير متوفر"}</span>
            </div>
          </div>

          {/* Header Action Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50/60 p-4 rounded-2xl border border-blue-100/80 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">تفاصيل القطع المسعرة وخيارات القبول</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.2">
                  يمكنك استبعاد أي قطعة لا ترغب بشرائها، أو اختيار النوع المفضل (أصلي / تجاري)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-blue-900 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                تم تحديد {acceptedItemsCount} من {safeQuoteItems.length} قطعة
              </span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-xs font-black text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 cursor-pointer"
              >
                {areAllAccepted ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </button>
            </div>
          </div>

          {/* ────────────────── 3. QUOTE ITEMS TABLE ────────────────── */}
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-12">قبول</th>
                    <th className="py-3 px-4">القطعة ومواصفاتها</th>
                    <th className="py-3 px-3 text-center">معرض الصور</th>
                    <th className="py-3 px-4 text-center">خيارات التسعير والنوع المعروض من المورد</th>
                    <th className="py-3 px-3 text-center">الكمية</th>
                    <th className="py-3 px-4 text-left">المجموع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {safeQuoteItems.map((item, index) => {
                    const sel = itemSelections[index] || { accepted: true, chosenType: "original" };
                    const origPrice = Number(item.original_price || (item.part_type === "original" ? item.unit_price : 0)) || 0;
                    const commPrice = Number(item.commercial_price || (item.part_type === "commercial" ? item.unit_price : 0)) || 0;
                    const isDualPriced = origPrice > 0 && commPrice > 0;
                    const isUnavailable =
                      item.availability === "unavailable" || item.part_type === "unavailable";
                    const effectiveUnit = getItemEffectivePrice(item, index);
                    const qty = Number(item.quantity || 1);
                    const lineTotal = effectiveUnit * qty;

                    const images = item.images && item.images.length > 0 ? item.images : item.image_url ? [item.image_url] : [];

                    return (
                      <tr
                        key={index}
                        className={`transition-colors ${
                          !sel.accepted || isUnavailable
                            ? "bg-slate-50/50 opacity-60"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            disabled={isUnavailable}
                            checked={sel.accepted && !isUnavailable}
                            onChange={() => toggleItemAcceptance(index)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-black text-slate-900 text-xs">{item.part_name}</div>
                          {item.part_number && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">رقم القطعة: {item.part_number}</div>
                          )}
                          {item.commercial_brand && (
                            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                              <Tag className="w-2.5 h-2.5 text-amber-600" />
                              <span>الماركة: {item.commercial_brand}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-center">
                          {images.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setActiveGallery({ partName: item.part_name, images, index: 0, zoom: 1 })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <Images className="w-3.5 h-3.5 text-blue-600" />
                              <span>{images.length} صور</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">لا توجد صور</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {isUnavailable ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 text-red-700 text-[11px] font-bold border border-red-100">
                              <Ban className="w-3 h-3" /> غير متوفرة لدى المورد
                            </span>
                          ) : isDualPriced ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-bold">وفر المورد نوعين (اختر النوع المفضل):</span>
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={!sel.accepted}
                                  onClick={() => setItemChosenType(index, "original")}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${sel.chosenType === "original" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                                >
                                  <Shield className="w-3 h-3" />
                                  <span>أصلي: {origPrice.toFixed(2)}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={!sel.accepted}
                                  onClick={() => setItemChosenType(index, "commercial")}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${sel.chosenType === "commercial" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                                >
                                  <Tag className="w-3 h-3" />
                                  <span>
                                    تجاري{item.commercial_brand ? ` (${item.commercial_brand})` : ""}: {commPrice.toFixed(2)}
                                  </span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="font-mono font-bold text-slate-900">{effectiveUnit.toFixed(2)} ر.س</span>
                              {item.commercial_brand && (
                                <span className="text-[9.5px] text-amber-700 font-bold">تجاري ({item.commercial_brand})</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-center font-mono font-black text-slate-800">{qty}</td>
                        <td className="py-4 px-4 text-left font-mono font-black text-slate-900">
                          {sel.accepted && !isUnavailable ? `${lineTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ────────────────── 4. FINANCIAL SUMMARY & VENDOR NOTES & PROMO CODE ────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                    <Ticket className="w-4 h-4 text-emerald-600" />
                    <span>كود الخصم وقسائم الشراء</span>
                  </div>
                  {appliedCoupon && (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">تم تفعيل الخصم ✓</span>
                  )}
                </div>

                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                          placeholder="أدخل كود الخصم (مثال: FREESHIP, RIFQ10)..."
                          className="w-full h-10 pr-9 pl-3 text-xs uppercase font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponInput.trim() || isApplyingCoupon}
                        className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isApplyingCoupon ? "جاري..." : "تطبيق"}
                      </button>
                    </div>
                    {couponError && <p className="text-[11px] font-bold text-red-600">{couponError}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-black text-emerald-900 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>{appliedCoupon.code}</span>
                          <span className={`text-[10px] font-sans font-bold px-2 py-0.2 rounded-md ${
                            appliedCoupon.target === "delivery"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {appliedCoupon.target === "delivery" ? "خصم رسوم التوصيل 🚚" : "خصم من الفاتورة 🧾"}
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-700 block mt-0.5">
                          تم توفير {totalDiscount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س ({appliedCoupon.label})
                        </span>
                      </div>
                    </div>
                    <button type="button" onClick={handleRemoveCoupon} className="text-[11px] font-bold text-red-600 hover:underline shrink-0">إلغاء الخصم ✕</button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>ملاحظات وضمان المورد المعتمد</span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {quote.notes || "القطع تخضع لضمان الجودة والمطابقة المعتمد من المورد عبر منصة رفق."}
                </p>
              </div>
            </div>

            {/* Left Column: Financial Totals Card */}
            <div className="bg-[#0B1528] text-white rounded-2xl p-5 border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2.5">
                <span className="font-black text-slate-200">الملخص المالي النهائي المعتمد</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {acceptedItemsCount} قطع مقبولة
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>مجموع القطع المقبولة:</span>
                  <span className="font-mono font-bold text-white">{partsSubtotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                </div>

                {/* Subtotal Discount line if applied */}
                {subtotalDiscount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400 bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30">
                    <span className="flex items-center gap-1 font-bold">
                      <Tag className="w-3.5 h-3.5" />
                      <span>خصم الفاتورة ({appliedCoupon?.code}):</span>
                    </span>
                    <span className="font-mono font-black">- {subtotalDiscount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-blue-300">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono font-bold">{taxAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                </div>

                <div className="flex items-center justify-between text-emerald-300">
                  <span>رسوم التوصيل (أسطول رفق):</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    {deliveryDiscount > 0 && (
                      <span className="text-slate-400 line-through text-[11px]">
                        {deliveryCostNum.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                      </span>
                    )}
                    <span className={deliveryDiscount > 0 ? "text-emerald-400 font-black font-sans text-xs" : ""}>
                      {effectiveDelivery === 0 && deliveryDiscount > 0
                        ? "مجاني بالكامل 🚚"
                        : `${effectiveDelivery.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`}
                    </span>
                  </div>
                </div>

                {/* Delivery Discount line if applied */}
                {deliveryDiscount > 0 && (
                  <div className="flex items-center justify-between text-blue-400 bg-blue-950/60 p-2 rounded-xl border border-blue-500/30">
                    <span className="flex items-center gap-1 font-bold">
                      <Truck className="w-3.5 h-3.5" />
                      <span>خصم كود الشحن والتوصيل ({appliedCoupon?.code}):</span>
                    </span>
                    <span className="font-mono font-black">- {deliveryDiscount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">الإجمالي الكلي النهائي:</span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {totalDiscount > 0 ? "شامل الخصم والضريبة والشحن" : "شامل الضريبة والشحن"}
                  </span>
                </div>
                <div className="text-2xl font-mono font-black text-emerald-400">
                  {grandTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-sans font-bold text-white">ر.س</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ────────────────── 5. MODAL STICKY FOOTER ACTIONS ────────────────── */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-black transition-colors border border-slate-200 cursor-pointer shadow-2xs"
            >
              إغلاق
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-bold hidden sm:inline">
              المبلغ الإجمالي المطلوب:{" "}
              <strong className="text-slate-900 font-mono font-black">
                {grandTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
              </strong>
            </span>

            <button
              type="button"
              disabled={acceptedItemsCount === 0}
              onClick={handleConfirmAcceptance}
              className="px-6 py-2.5 rounded-xl bg-[#1a5c4a] hover:bg-[#154d3e] text-white text-xs font-black transition-all shadow-md shadow-emerald-900/20 hover:scale-102 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>قبول واعتماد هذا العرض ({acceptedItemsCount} قطع) ✓</span>
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────── LIGHTBOX PHOTO GALLERY MODAL ────────────────── */}
      {activeGallery && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveGallery(null)}
        >
          {/* Header */}
          <div
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Images className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-black">{activeGallery.partName}</span>
              <span className="text-xs text-slate-400 font-mono">
                ({activeGallery.index + 1} من {activeGallery.images.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveGallery((prev) => (prev ? { ...prev, zoom: prev.zoom === 1 ? 1.75 : 1 } : null))
                }
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
              >
                {activeGallery.zoom === 1 ? "تكبير 🔍" : "إعادة الضبط ↩"}
              </button>

              <button
                type="button"
                onClick={() => setActiveGallery(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Image Stage */}
          <div
            className="relative w-full max-w-4xl h-[65vh] flex items-center justify-center my-3 overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeGallery.images[activeGallery.index]}
              alt={activeGallery.partName}
              style={{ transform: `scale(${activeGallery.zoom})` }}
              className="max-h-full max-w-full object-contain rounded-2xl transition-transform duration-200 shadow-2xl"
            />

            {/* Navigation Arrows */}
            {activeGallery.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveGallery((prev) =>
                      prev
                        ? {
                            ...prev,
                            index: (prev.index - 1 + prev.images.length) % prev.images.length,
                          }
                        : null
                    )
                  }
                  className="absolute right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveGallery((prev) =>
                      prev
                        ? {
                            ...prev,
                            index: (prev.index + 1) % prev.images.length,
                          }
                        : null
                    )
                  }
                  className="absolute left-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Filmstrip */}
          {activeGallery.images.length > 1 && (
            <div
              className="flex items-center gap-2 overflow-x-auto max-w-2xl py-2 px-3 bg-white/5 rounded-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {activeGallery.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveGallery((prev) => (prev ? { ...prev, index: i } : null))}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeGallery.index === i
                      ? "border-blue-500 scale-105 shadow-md"
                      : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vendor Profile & Reviews Modal */}
      <VendorDetailsModal
        isOpen={!!showVendorModal}
        onClose={() => setShowVendorModal(null)}
        vendor={showVendorModal}
      />
    </div>
  );
}

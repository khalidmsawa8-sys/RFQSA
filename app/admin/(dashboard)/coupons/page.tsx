"use client";

import React, { useState, useEffect } from "react";
import {
  Ticket,
  Plus,
  Truck,
  Receipt,
  Percent,
  Tag,
  CheckCircle2,
  Check,
  AlertCircle,
  Trash2,
  Pencil,
  Search,
  Calendar,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  Layers,
  X,
} from "lucide-react";
import { PromoCode, CouponTarget, CouponType } from "@/lib/coupons";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTarget, setFilterTarget] = useState<"all" | CouponTarget>("all");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [target, setTarget] = useState<CouponTarget>("subtotal");
  const [type, setType] = useState<CouponType>("percent");
  const [value, setValue] = useState<number | "">("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [minOrder, setMinOrder] = useState<number | "">("");
  const [maxCap, setMaxCap] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/coupons");
      const data = await res.json();
      if (data.success && Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
      }
    } catch (e) {
      console.warn("Failed to fetch coupons:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCode("");
    setTarget("subtotal");
    setType("percent");
    setValue("");
    setLabel("");
    setDescription("");
    setMinOrder("");
    setMaxCap("");
    setIsActive(true);
    setExpiresAt("");
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (c: PromoCode) => {
    setEditingCoupon(c);
    setCode(c.code);
    setTarget(c.target);
    setType(c.type);
    setValue(c.value);
    setLabel(c.label || "");
    setDescription(c.description || "");
    setMinOrder(c.min_order_value != null && c.min_order_value > 0 ? c.min_order_value : "");
    setMaxCap(c.max_discount_cap != null ? c.max_discount_cap : "");
    setIsActive(c.is_active);
    setExpiresAt(c.expires_at ? c.expires_at.split("T")[0] : "");
    setFormError(null);
    setShowAddModal(true);
  };

  const handleToggleActive = async (c: PromoCode) => {
    const nextState = !c.is_active;
    setCoupons((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, is_active: nextState } : item))
    );

    try {
      await fetch("/api/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, is_active: nextState }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف كود الخصم هذا؟")) return;

    setCoupons((prev) => prev.filter((item) => item.id !== id));

    try {
      await fetch(`/api/coupons?id=${id}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || value === "" || Number(value) <= 0) {
      setFormError("يرجى إدخال رمز الكود وقيمة الخصم بشكل صحيح.");
      return;
    }

    // ── Requirement 3: Mandatory Max Discount Cap for Percentage (%) ──
    if (type === "percent" && (maxCap === "" || Number(maxCap) <= 0)) {
      setFormError("عند اختيار الخصم كنسبة مئوية (%)، يجب إدخال الحد الأعلى لقيمة الخصم بالريال (إلزامي).");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      code: code.trim().toUpperCase(),
      target,
      type,
      value: Number(value),
      label: label.trim() || (target === "delivery" ? `خصم ${value}${type === "percent" ? "%" : " ر.س"} على التوصيل` : `خصم ${value}${type === "percent" ? "%" : " ر.س"} من الفاتورة`),
      description: description.trim() || undefined,
      min_order_value: minOrder !== "" ? Number(minOrder) : 0,
      max_discount_cap: maxCap !== "" ? Number(maxCap) : undefined,
      is_active: isActive,
      expires_at: expiresAt || null,
    };

    try {
      if (editingCoupon) {
        // Edit existing coupon
        const res = await fetch("/api/coupons", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCoupon.id, ...payload }),
        });
        const data = await res.json();

        if (data.success) {
          setCoupons((prev) =>
            prev.map((item) =>
              item.id === editingCoupon.id ? { ...item, ...payload } : item
            )
          );
          setShowAddModal(false);
          setEditingCoupon(null);
        } else {
          setFormError(data.error || "فشل تحديث كود الخصم.");
        }
      } else {
        // Create new coupon
        const res = await fetch("/api/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success && data.coupon) {
          setCoupons((prev) => [data.coupon, ...prev.filter((c) => c.code !== data.coupon.code)]);
          setShowAddModal(false);
        } else {
          setFormError(data.error || "فشل حفظ كود الخصم.");
        }
      }
    } catch (err: any) {
      setFormError(err.message || "حدث خطأ غير متوقع.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered list
  const filteredCoupons = coupons.filter((c) => {
    if (filterTarget !== "all" && c.target !== filterTarget) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        c.code.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const deliveryCouponsCount = coupons.filter((c) => c.target === "delivery").length;
  const subtotalCouponsCount = coupons.filter((c) => c.target === "subtotal").length;
  const activeCount = coupons.filter((c) => c.is_active).length;
  const totalUses = coupons.reduce((acc, c) => acc + (c.usage_count || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-7 w-full" dir="rtl">
      
      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">إدارة أكواد وقسائم الخصم</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                تحديد جهة الخصم (خصم رسوم التوصيل أو خصم إجمالي الفاتورة) وتعديل نسب وقيم الخصم
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all shadow-md hover:scale-102 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء كود خصم جديد</span>
        </button>
      </div>

      {/* ── 2. KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">الأكواد النشطة</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">
              {activeCount} <span className="text-xs text-slate-400 font-sans">/ {coupons.length}</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Delivery Coupons */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">خصم رسوم التوصيل</p>
            <p className="text-2xl font-black text-blue-600 font-mono mt-1">
              {deliveryCouponsCount} <span className="text-xs text-slate-400 font-sans">أكواد</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Subtotal / Invoice Coupons */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">خصم إجمالي الفاتورة</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
              {subtotalCouponsCount} <span className="text-xs text-slate-400 font-sans">أكواد</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Total Uses */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">مرات الاستخدام</p>
            <p className="text-2xl font-black text-purple-600 font-mono mt-1">
              {totalUses} <span className="text-xs text-slate-400 font-sans">عملية</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH TOOLBAR ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برمز الكود أو الوصف (مثال: FREESHIP, RIFQ10)..."
            className="w-full h-10 pr-10 pl-3 border border-slate-200 rounded-2xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-800"
          />
        </div>

        {/* Target Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0 text-xs">
          <button
            onClick={() => setFilterTarget("all")}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTarget === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            كافة الأكواد ({coupons.length})
          </button>
          <button
            onClick={() => setFilterTarget("delivery")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTarget === "delivery" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>خصم التوصيل ({deliveryCouponsCount})</span>
          </button>
          <button
            onClick={() => setFilterTarget("subtotal")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTarget === "subtotal" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>خصم الفاتورة ({subtotalCouponsCount})</span>
          </button>
        </div>
      </div>

      {/* ── 4. COUPONS TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                <th className="py-4 px-5">رمز الكود والحملة</th>
                <th className="py-4 px-4 text-center">جهة تطبيق الخصم</th>
                <th className="py-4 px-4 text-center">نوع وقيمة الخصم</th>
                <th className="py-4 px-4 text-center">الحد الأدنى</th>
                <th className="py-4 px-4 text-center">الاستخدام</th>
                <th className="py-4 px-4 text-center">الحالة</th>
                <th className="py-4 px-5 text-center w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    جاري تحميل أكواد الخصم...
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    لا توجد أكواد خصم مطابقة للبحث أو التصفية الحالية.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const isDelivery = c.target === "delivery";
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Code and Label */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs shrink-0 ${
                              isDelivery ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            }`}
                          >
                            {isDelivery ? <Truck className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-black text-sm font-mono text-slate-900 flex items-center gap-2">
                              <span>{c.code}</span>
                              {!c.is_active && (
                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.2 rounded-full font-sans font-bold">
                                  معطل
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                              {c.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Target Scope */}
                      <td className="py-4 px-4 text-center">
                        {isDelivery ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-[11px] font-black border border-blue-200">
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                            <span>خصم رسوم التوصيل</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            <span>خصم إجمالي الفاتورة</span>
                          </span>
                        )}
                      </td>

                      {/* Value and Type */}
                      <td className="py-4 px-4 text-center font-mono font-black text-sm text-slate-900">
                        {c.type === "percent" ? (
                          <span className="text-emerald-700">
                            {c.value}% {c.value === 100 && isDelivery ? "(مجاني بالكامل)" : "خصم"}
                          </span>
                        ) : (
                          <span className="text-slate-900">{c.value} ر.س</span>
                        )}
                      </td>

                      {/* Min Order */}
                      <td className="py-4 px-4 text-center font-mono text-slate-600">
                        {c.min_order_value ? `${c.min_order_value} ر.س` : "بدون حد أدنى"}
                      </td>

                      {/* Usage Count */}
                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-700">
                        {c.usage_count || 0} استخدام
                      </td>

                      {/* Status Toggle */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          className="cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                        >
                          {c.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> نشط
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> معطل
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="p-2 rounded-xl text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                            title="تعديل كود الخصم"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border border-transparent hover:border-red-200"
                            title="حذف الكود"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. CREATE / EDIT PROMO CODE MODAL ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => {
            setShowAddModal(false);
            setEditingCoupon(null);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 my-auto animate-in zoom-in-95 duration-200 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs ${
                  editingCoupon ? "bg-blue-600" : "bg-emerald-600"
                }`}>
                  {editingCoupon ? <Pencil className="w-4 h-4" /> : <Ticket className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingCoupon ? `تعديل كود الخصم (${editingCoupon.code})` : "إنشاء كود خصم جديد"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.2">
                    {editingCoupon
                      ? "تعديل إعدادات الكود وجهة الخصم ونسبته والحدود المالية"
                      : "حدد جهة الخصم ونوعه وقيمته"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCoupon(null);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              {/* Code input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  رمز كود الخصم (Promo Code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="مثال: FREESHIP, RIFQ20, SAVE50"
                  className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 font-mono font-bold text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all uppercase"
                />
              </div>

              {/* TARGET SCOPE SELECTOR (CRITICAL REQUIREMENT) */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  جهة تطبيق الخصم (ماذا سيخصم هذا الكود؟) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Delivery Fee Discount */}
                  <div
                    onClick={() => setTarget("delivery")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 select-none ${
                      target === "delivery"
                        ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          target === "delivery" ? "bg-blue-600 text-white" : "bg-white text-slate-500 border border-slate-200"
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="font-black text-slate-900 text-xs">خصم من رسوم التوصيل</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      يتم تطبيق الخصم مباشرة على أجور الشحن والتوصيل لأسطول رفق (مثل: شحن مجاني 100%).
                    </p>
                  </div>

                  {/* Option 2: Subtotal / Invoice Discount */}
                  <div
                    onClick={() => setTarget("subtotal")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 select-none ${
                      target === "subtotal"
                        ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          target === "subtotal" ? "bg-emerald-600 text-white" : "bg-white text-slate-500 border border-slate-200"
                        }`}
                      >
                        <Receipt className="w-4 h-4" />
                      </div>
                      <span className="font-black text-slate-900 text-xs">خصم من إجمالي الفاتورة</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      يتم تطبيق الخصم على مجموع قيمة قطع الغيار المقبولة في الفاتورة.
                    </p>
                  </div>
                </div>
              </div>

              {/* Type and Value */}
              <div className="grid grid-cols-2 gap-3">
                {/* Discount Calculation Type */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">نوع الخصم</label>
                  <div className="flex rounded-2xl border border-slate-200 p-1 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setType("percent")}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                        type === "percent" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      نسبة مئوية (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("fixed")}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                        type === "fixed" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      مبلغ ثابت (ر.س)
                    </button>
                  </div>
                </div>

                {/* Value Input */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    قيمة الخصم ({type === "percent" ? "%" : "ر.س"}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={type === "percent" ? "100" : undefined}
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value ? Number(e.target.value) : "")}
                    placeholder={type === "percent" ? "مثال: 10 أو 100 للشحن المجاني" : "مثال: 50"}
                    className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 font-mono font-bold text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Campaign Label & Min Order & Max Cap */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">اسم الحملة / وصف الكود</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="مثال: خصم اليوم الوطني 10%"
                    className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">الحد الأدنى للطلب (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0 = بدون حد أدنى"
                    className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 font-mono font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    الحد الأعلى للخصم (ر.س) {type === "percent" && <span className="text-red-500 font-black">* (إلزامي)</span>}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required={type === "percent"}
                    value={maxCap}
                    onChange={(e) => setMaxCap(e.target.value ? Number(e.target.value) : "")}
                    placeholder={type === "percent" ? "مثال: 50 أو 100 ر.س" : "اختياري"}
                    className={`w-full h-11 px-3.5 rounded-2xl border font-mono font-bold transition-all ${
                      type === "percent"
                        ? "border-amber-300 bg-amber-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        : "border-slate-200 bg-slate-50 focus:bg-white"
                    }`}
                  />
                </div>
              </div>

              {/* Status and Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">تاريخ انتهاء الصلاحية (اختياري)</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 font-bold bg-slate-50 focus:bg-white focus:outline-none text-slate-700"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 mt-5">
                  <span className="font-bold text-slate-800">حالة الكود</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isActive ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isActive ? "نشط ومتاح للعملاء" : "معطل"}
                  </button>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCoupon(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-6 py-2.5 rounded-xl text-white font-black transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2 ${
                    editingCoupon ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : editingCoupon ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{editingCoupon ? "حفظ وتحديث الكود ✓" : "حفظ واعتماد الكود"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

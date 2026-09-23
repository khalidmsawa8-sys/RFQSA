"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Percent,
  Search,
  RotateCcw,
  ShieldCheck,
  Calculator,
  History,
  ArrowRight,
  Layers,
  ChevronDown,
  Info,
  Check,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  DeliveryPricingRule,
  DeliveryAuditLog,
  calculateDeliveryCost,
  createDeliverySnapshot,
  DeliveryCalculationResult,
} from "@/lib/delivery-engine";

export default function AdminDeliveryPage() {
  const [rules, setRules] = useState<DeliveryPricingRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<DeliveryAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rules" | "simulator" | "audit">("rules");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DeliveryPricingRule | null>(null);
  const [formState, setFormState] = useState({
    city: "",
    base_fee: "25",
    base_distance_km: "15",
    extra_fee_per_km: "1.5",
    intercity_fee: "45",
    min_fee: "25",
    estimated_delivery_hours: "24",
    is_active: true,
    is_default: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Simulator State
  const [simSourceCity, setSimSourceCity] = useState("الرياض");
  const [simDestCity, setSimDestCity] = useState("الرياض");
  const [simSrcLat, setSimSrcLat] = useState("24.7136");
  const [simSrcLon, setSimSrcLon] = useState("46.6753");
  const [simDestLat, setSimDestLat] = useState("24.8500");
  const [simDestLon, setSimDestLon] = useState("46.7200");
  const [useCoords, setUseCoords] = useState(true);

  // Fetch Rules & Audit Logs
  const fetchRules = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/delivery/rules?include_audit=true");
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
        setAuditLogs(data.audit_logs || []);
      }
    } catch (err: any) {
      showToast("error", "فشل في تحميل قواعد تسعير التوصيل");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered rules
  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return rules;
    return rules.filter((r) => r.city.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  }, [rules, searchQuery]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormState({
      city: "",
      base_fee: "25",
      base_distance_km: "15",
      extra_fee_per_km: "1.5",
      intercity_fee: "45",
      min_fee: "25",
      estimated_delivery_hours: "24",
      is_active: true,
      is_default: false,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (rule: DeliveryPricingRule) => {
    setEditingRule(rule);
    setFormState({
      city: rule.city,
      base_fee: String(rule.base_fee),
      base_distance_km: String(rule.base_distance_km),
      extra_fee_per_km: String(rule.extra_fee_per_km),
      intercity_fee: String(rule.intercity_fee),
      min_fee: String(rule.min_fee),
      estimated_delivery_hours: String(rule.estimated_delivery_hours),
      is_active: rule.is_active,
      is_default: rule.is_default,
    });
    setIsModalOpen(true);
  };

  // Save Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.city.trim()) {
      showToast("error", "يرجى كتابة اسم المدينة");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        action: editingRule ? "update" : "create",
        rule: {
          id: editingRule?.id,
          city: formState.city.trim(),
          base_fee: parseFloat(formState.base_fee) || 0,
          base_distance_km: parseFloat(formState.base_distance_km) || 15,
          extra_fee_per_km: parseFloat(formState.extra_fee_per_km) || 1.5,
          intercity_fee: parseFloat(formState.intercity_fee) || 45,
          min_fee: parseFloat(formState.min_fee) || parseFloat(formState.base_fee) || 25,
          estimated_delivery_hours: parseInt(formState.estimated_delivery_hours) || 24,
          is_active: formState.is_active,
          is_default: formState.is_default,
        },
      };

      const res = await fetch("/api/v1/delivery/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.error || "حدث خطأ أثناء حفظ قاعدة التسعير");
        return;
      }

      showToast("success", editingRule ? "تم تحديث تسعيرة المدينة بنجاح ✓" : "تمت إضافة تسعيرة المدينة بنجاح ✓");
      setIsModalOpen(false);
      fetchRules();
    } catch (err: any) {
      showToast("error", err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (rule: DeliveryPricingRule) => {
    try {
      const payload = {
        action: "update",
        rule: {
          ...rule,
          is_active: !rule.is_active,
        },
      };

      const res = await fetch("/api/v1/delivery/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)));
        showToast("success", `تم ${rule.is_active ? "تعطيل" : "تفعيل"} تسعيرة مدينة ${rule.city}`);
      }
    } catch (err) {
      showToast("error", "فشل في تحديث حالة التفعيل");
    }
  };

  // Delete Rule
  const handleDeleteRule = async (rule: DeliveryPricingRule) => {
    if (rule.is_default) {
      showToast("error", "لا يمكن حذف القاعدة الافتراضية العامة");
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف تسعيرة مدينة (${rule.city})؟`)) return;

    try {
      const res = await fetch("/api/v1/delivery/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", rule_id: rule.id }),
      });
      const data = await res.json();
      if (data.success) {
        setRules((prev) => prev.filter((r) => r.id !== rule.id));
        showToast("success", `تم حذف تسعيرة ${rule.city} بنجاح`);
      } else {
        showToast("error", data.error || "فشل في الحذف");
      }
    } catch (err) {
      showToast("error", "حدث خطأ أثناء الحذف");
    }
  };

  // Reset to system defaults
  const handleResetDefaults = async () => {
    if (!confirm("هل أنت متأكد من إعادة تعيين كافة أسعار التوصيل للقواعد الافتراضية للنظام؟")) return;
    try {
      const res = await fetch("/api/v1/delivery/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_defaults" }),
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
        showToast("success", "تمت استعادة القواعد الافتراضية بنجاح ✓");
      }
    } catch (err) {
      showToast("error", "فشل في استعادة القواعد");
    }
  };

  // Live Simulator Calculation
  const simResult = useMemo<DeliveryCalculationResult>(() => {
    const srcCoords =
      useCoords && simSrcLat && simSrcLon
        ? { latitude: parseFloat(simSrcLat), longitude: parseFloat(simSrcLon) }
        : null;
    const destCoords =
      useCoords && simDestLat && simDestLon
        ? { latitude: parseFloat(simDestLat), longitude: parseFloat(simDestLon) }
        : null;

    return calculateDeliveryCost(
      {
        source_city: simSourceCity,
        destination_city: simDestCity,
        source_coords: srcCoords,
        destination_coords: destCoords,
      },
      rules
    );
  }, [simSourceCity, simDestCity, simSrcLat, simSrcLon, simDestLat, simDestLon, useCoords, rules]);

  // KPI Calculations
  const activeCount = rules.filter((r) => r.is_active).length;
  const avgBaseFee =
    rules.length > 0
      ? (rules.reduce((acc, r) => acc + (r.base_fee || 0), 0) / rules.length).toFixed(1)
      : "25.0";

  return (
    <div className="p-6 sm:p-8 space-y-7 w-full" dir="rtl">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl shadow-xl border text-sm font-black flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-950 text-emerald-200 border-emerald-700"
              : "bg-red-950 text-red-200 border-red-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ────────────────── HEADER BAR ────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              إدارة أسطول وتسعير التوصيل (RIFQ Fleet Logistics)
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              التحكم المركزي في قواعد ورسوم التوصيل لكافة مدن المملكة وتطبيقها آلياً على عروض الموردين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="إعادة ضبط القواعد الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-md shadow-blue-600/25 hover:scale-102 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة تسعيرة مدينة جديدة</span>
          </button>
        </div>
      </div>

      {/* ────────────────── KPI SUMMARY CARDS ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cities */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">إجمالي المدن المسجلة</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">{rules.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
        </div>

        {/* Active Rules */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">القواعد النشطة</span>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{activeCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Average Base Fee */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">متوسط السعر الأساسي داخل المدن</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">
              {avgBaseFee} <span className="text-xs font-sans font-bold text-slate-400">ر.س</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Standard Intercity Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">الشحن بين المدن (القياسي)</span>
            <p className="text-2xl font-black text-amber-600 font-mono mt-1">
              45.00 <span className="text-xs font-sans font-bold text-slate-400">ر.س</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ────────────────── TABS NAVIGATION ────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("rules")}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "rules"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>قواعد تسعير المدن ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("simulator")}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "simulator"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Calculator className="w-4 h-4 text-emerald-500" />
          <span>حاسبة ومحاكي الأسعار الحية (Live Simulator)</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "audit"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4 text-purple-500" />
          <span>سجل تدقيق التغييرات (Audit Trail)</span>
        </button>
      </div>

      {/* ────────────────── TAB 1: RULES TABLE ────────────────── */}
      {activeTab === "rules" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المدينة..."
                className="w-full h-10 pr-10 pl-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>
            <span className="text-xs text-slate-400 font-bold">
              يعرض {filteredRules.length} من {rules.length} مدينة
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-black text-slate-700 select-none">
                  <th className="py-3.5 px-4">المدينة</th>
                  <th className="py-3.5 px-3 text-center">السعر الأساسي (ر.س)</th>
                  <th className="py-3.5 px-3 text-center">المسافة الأساسية (كم)</th>
                  <th className="py-3.5 px-3 text-center">الكيلومتر الإضافي (ر.س/كم)</th>
                  <th className="py-3.5 px-3 text-center">الشحن بين المدن (ر.س)</th>
                  <th className="py-3.5 px-3 text-center">الحد الأدنى (ر.س)</th>
                  <th className="py-3.5 px-3 text-center">مدة التوصيل</th>
                  <th className="py-3.5 px-3 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-center w-28">الإجراءات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                      جاري تحميل قواعد التسعير...
                    </td>
                  </tr>
                ) : filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                      لا توجد مدن مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* City */}
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{r.city}</span>
                          {r.is_default && (
                            <span className="text-[9px] font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                              افتراضي عام
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Base fee */}
                      <td className="py-3.5 px-3 text-center font-mono font-black text-slate-800 text-xs">
                        {Number(r.base_fee).toFixed(2)} ر.س
                      </td>

                      {/* Base distance */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-600">
                        أول {r.base_distance_km} كم
                      </td>

                      {/* Extra KM fee */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-amber-700">
                        +{Number(r.extra_fee_per_km).toFixed(2)} ر.س
                      </td>

                      {/* Intercity */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-purple-700">
                        {Number(r.intercity_fee).toFixed(2)} ر.س
                      </td>

                      {/* Min fee */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700">
                        {Number(r.min_fee).toFixed(2)} ر.س
                      </td>

                      {/* Estimated time */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-600">
                        {r.estimated_delivery_hours} ساعة
                      </td>

                      {/* Status toggle */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(r)}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer border ${
                            r.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {r.is_active ? "✓ نشطة" : "معطلة"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="تعديل التسعيرة"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!r.is_default && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(r)}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="حذف المدينة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 2: LIVE SIMULATOR ────────────────── */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Simulator Controls Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">محاكي اختبار أسعار التوصيل</h3>
                <p className="text-xs text-slate-400 font-bold">
                  يستخدم نفس محرك الاحتساب المعتمد في المنصة للتأكد من دقة الأسعار
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Cities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">مدينة المصدر (المورد):</label>
                  <select
                    value={simSourceCity}
                    onChange={(e) => setSimSourceCity(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {rules.map((r) => (
                      <option key={r.id} value={r.city}>
                        {r.city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">مدينة الوجهة (العميل):</label>
                  <select
                    value={simDestCity}
                    onChange={(e) => setSimDestCity(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {rules.map((r) => (
                      <option key={r.id} value={r.city}>
                        {r.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggle GPS Coordinates */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">اختبار الإحداثيات الجغرافية GPS (Haversine):</span>
                <button
                  type="button"
                  onClick={() => setUseCoords(!useCoords)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    useCoords
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-400 border-slate-200"
                  }`}
                >
                  {useCoords ? "✓ مفعّل" : "معطل (السعر الأساسي فقط)"}
                </button>
              </div>

              {useCoords && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="space-y-2">
                    <span className="text-[11px] font-black text-slate-600 block">إحداثيات المورد (Lat / Lon):</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={simSrcLat}
                        onChange={(e) => setSimSrcLat(e.target.value)}
                        placeholder="Latitude"
                        className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={simSrcLon}
                        onChange={(e) => setSimSrcLon(e.target.value)}
                        placeholder="Longitude"
                        className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-black text-slate-600 block">إحداثيات العميل (Lat / Lon):</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={simDestLat}
                        onChange={(e) => setSimDestLat(e.target.value)}
                        placeholder="Latitude"
                        className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={simDestLon}
                        onChange={(e) => setSimDestLon(e.target.value)}
                        placeholder="Longitude"
                        className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Simulator Live Output Card */}
          <div className="bg-[#0B1528] text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">النتيجة المحسوبة فوراً</h3>
              </div>
              <span className="text-[10px] font-mono font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {simResult.calculation_type}
              </span>
            </div>

            {/* Description badge */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 font-medium">
              <span className="text-emerald-400 font-bold block mb-1">وصف آلية الاحتساب:</span>
              <p>{simResult.calculation_description}</p>
            </div>

            {/* Breakdown Grid */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>المسافة الجوية المحسوبة:</span>
                <span className="font-mono font-bold text-white">
                  {simResult.distance_km !== null ? `${simResult.distance_km} كم` : "غير متوفرة"}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>السعر الأساسي المعتمد:</span>
                <span className="font-mono font-bold text-white">
                  {simResult.base_fee.toFixed(2)} ر.س
                </span>
              </div>

              {simResult.extra_km_fee > 0 && (
                <div className="flex items-center justify-between text-amber-300">
                  <span>رسوم المسافة الإضافية ({simResult.extra_distance_km} كم):</span>
                  <span className="font-mono font-bold">
                    +{simResult.extra_km_fee.toFixed(2)} ر.س
                  </span>
                </div>
              )}

              {simResult.intercity_fee > 0 && (
                <div className="flex items-center justify-between text-purple-300">
                  <span>رسوم الشحن بين المدن:</span>
                  <span className="font-mono font-bold">
                    {simResult.intercity_fee.toFixed(2)} ر.س
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-300 pt-2 border-t border-slate-800">
                <span>المبلغ قبل الضريبة:</span>
                <span className="font-mono font-bold text-white">
                  {simResult.delivery_fee_net.toFixed(2)} ر.س
                </span>
              </div>

              <div className="flex items-center justify-between text-blue-300">
                <span>ضريبة القيمة المضافة ({simResult.vat_rate}%):</span>
                <span className="font-mono font-bold">
                  {simResult.delivery_vat.toFixed(2)} ر.س
                </span>
              </div>

              <div className="flex items-center justify-between text-cyan-300">
                <span>مدة التوصيل المقدرة:</span>
                <span className="font-mono font-bold">
                  {simResult.estimated_hours} ساعة ({simResult.estimated_days} يوم)
                </span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-1">
              <div className="flex items-center justify-between text-emerald-100 text-[11px] font-bold">
                <span>إجمالي رسوم التوصيل النهائية:</span>
                <span>شامل الضريبة 15%</span>
              </div>
              <div className="text-3xl font-mono font-black tracking-tight text-white">
                {simResult.delivery_fee_total.toFixed(2)}{" "}
                <span className="text-sm font-sans font-bold">ر.س</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ────────────────── TAB 3: AUDIT TRAIL LOGS ────────────────── */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">سجل تدقيق وتاريخ تعديل أسعار التوصيل</h3>
            <span className="text-xs text-slate-400 font-bold">{auditLogs.length} عملية مسجلة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-black text-slate-700 select-none">
                  <th className="py-3.5 px-4">التاريخ والوقت</th>
                  <th className="py-3.5 px-3">المدينة</th>
                  <th className="py-3.5 px-3 text-center">نوع الإجراء</th>
                  <th className="py-3.5 px-3">المستخدم المشرف</th>
                  <th className="py-3.5 px-4">تفاصيل التغيير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 font-bold">
                      لا توجد سجلات تعديل سابقة
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(log.created_at).toLocaleString("ar-SA")}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{log.city}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            log.action_type === "create"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : log.action_type === "update"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {log.action_type === "create"
                            ? "إضافة"
                            : log.action_type === "update"
                            ? "تعديل"
                            : "حذف"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-bold">{log.user_name || "مشرف المنصة"}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {log.new_values ? (
                          <span>
                            السعر الأساسي: <strong>{log.new_values.base_fee} ر.س</strong> | الإضافي:{" "}
                            <strong>{log.new_values.extra_fee_per_km} ر.س/كم</strong>
                          </span>
                        ) : (
                          "تم حذف القاعدة"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── ADD / EDIT MODAL ────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {editingRule ? `تعديل تسعيرة مدينة (${editingRule.city})` : "إضافة تسعيرة مدينة جديدة"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRule} className="p-6 space-y-4 text-xs font-bold">
              {/* City Name */}
              <div>
                <label className="text-slate-700 block mb-1">اسم المدينة:</label>
                <input
                  type="text"
                  required
                  value={formState.city}
                  onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                  placeholder="مثال: الرياض، جدة، حائل..."
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Base Fee & Base Distance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1">السعر الأساسي داخل المدينة (ر.س):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formState.base_fee}
                    onChange={(e) => setFormState({ ...formState, base_fee: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-black"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">المسافة الأساسية المغطاة (كم):</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={formState.base_distance_km}
                    onChange={(e) => setFormState({ ...formState, base_distance_km: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-black"
                  />
                </div>
              </div>

              {/* Extra fee per km & Intercity Fee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1">سعر الكيلومتر الإضافي (ر.س/كم):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formState.extra_fee_per_km}
                    onChange={(e) => setFormState({ ...formState, extra_fee_per_km: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-black"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">الشحن بين المدن (ر.س):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formState.intercity_fee}
                    onChange={(e) => setFormState({ ...formState, intercity_fee: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-black"
                  />
                </div>
              </div>

              {/* Min Fee & Estimated Delivery Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1">الحد الأدنى للتوصيل (ر.س):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formState.min_fee}
                    onChange={(e) => setFormState({ ...formState, min_fee: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-black"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">مدة التوصيل المتوقعة (ساعات):</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={formState.estimated_delivery_hours}
                    onChange={(e) => setFormState({ ...formState, estimated_delivery_hours: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-black"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.is_active}
                    onChange={(e) => setFormState({ ...formState, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>تفعيل القاعدة للمدينة</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.is_default}
                    onChange={(e) => setFormState({ ...formState, is_default: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>تعيين كافتراضي عام لباقي المدن</span>
                </label>
              </div>

              {/* Footer CTA */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black transition-colors cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-all shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingRule ? "حفظ التعديلات" : "إضافة المدينة"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

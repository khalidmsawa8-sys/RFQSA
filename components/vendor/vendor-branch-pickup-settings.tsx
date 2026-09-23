"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Store,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  Navigation,
  Phone,
  Building2,
  Calendar,
  Sparkles,
  Info,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Star,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Layers,
  User,
  Compass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LocationPickerDialog } from "@/components/location-picker-dialog";
import {
  NormalizedBusinessHours,
  DayOfWeekKey,
  getDefaultBusinessHours,
  normalizeBusinessHours,
  calculateVendorOpenStatus,
  formatTimeAr,
  ARABIC_DAYS_MAP,
} from "@/lib/business-hours";

export interface VendorBranch {
  id: string;
  vendor_id?: string;
  name: string;
  city: string;
  district?: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_name?: string;
  contact_phone?: string;
  is_main: boolean;
  is_active: boolean;
  accepts_pickup?: boolean;
  business_hours?: any;
  created_at?: string;
}

const SAUDI_CITIES_OPTIONS = [
  "الرياض",
  "جدة",
  "الدمام",
  "مكة المكرمة",
  "المدينة المنورة",
  "الخبر",
  "الأحساء",
  "القصيم",
  "تبوك",
  "أبها",
  "خميس مشيط",
  "جازان",
  "نجران",
  "حائل",
  "الجبيل",
  "ينبع",
  "الطائف",
  "الخرج",
  "عرعر",
  "سكاكا",
];

const ORDERED_DAYS: DayOfWeekKey[] = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

export default function VendorBranchPickupSettings() {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Vendor Profile
  const [userId, setUserId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("مؤسسة قطع الغيار المعتمدة");
  const [rating, setRating] = useState<number>(4.9);
  const [specializedBrands, setSpecializedBrands] = useState<string[]>([]);

  // Branches State
  const [branches, setBranches] = useState<VendorBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // Modal State for Add / Edit Branch
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<VendorBranch | null>(null);
  const [modalFormData, setModalFormData] = useState<{
    id?: string;
    name: string;
    city: string;
    district: string;
    address: string;
    latitude: number;
    longitude: number;
    contact_name: string;
    contact_phone: string;
    accepts_pickup: boolean;
    is_main: boolean;
  }>({
    name: "",
    city: "الرياض",
    district: "",
    address: "",
    latitude: 24.7136,
    longitude: 46.6753,
    contact_name: "",
    contact_phone: "",
    accepts_pickup: true,
    is_main: false,
  });

  // Delete Confirmation Modal
  const [deletingBranch, setDeletingBranch] = useState<VendorBranch | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Business Hours Schedule for active branch
  const [businessHours, setBusinessHours] = useState<NormalizedBusinessHours>(getDefaultBusinessHours());

  // Location Picker Modal
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isBranchModalOpen || deletingBranch) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isBranchModalOpen, deletingBranch]);

  // ── 1. Fetch Branches & Vendor Profile ──
  const loadBranchesAndProfile = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let currentUserId = "vendor-demo-id";
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        currentUserId = authData.user.id;
        setUserId(currentUserId);
      }

      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .maybeSingle();

      if (profile) {
        setCompanyName(profile.company_name || profile.full_name || "مؤسسة قطع الغيار المعتمدة");
        setRating(profile.rating ? Number(profile.rating) : 4.9);
        setSpecializedBrands(
          Array.isArray(profile.specialized_brands)
            ? profile.specialized_brands
            : ["toyota", "hyundai", "ford"]
        );
        if (profile.business_hours) {
          setBusinessHours(normalizeBusinessHours(profile.business_hours));
        }
      }

      // 2. Fetch Branches from API
      const res = await fetch(`/api/v1/vendor/branches?vendor_id=${currentUserId}`, { cache: "no-store" });
      const data = await res.json();

      if (data.success && Array.isArray(data.branches) && data.branches.length > 0) {
        setBranches(data.branches);
        // Select main branch or keep existing selection
        setSelectedBranchId((prev) => {
          if (prev && data.branches.some((b: VendorBranch) => b.id === prev)) return prev;
          const main = data.branches.find((b: VendorBranch) => b.is_main);
          return main ? main.id : data.branches[0].id;
        });
      } else if (profile?.branches && Array.isArray(profile.branches) && profile.branches.length > 0) {
        setBranches(profile.branches);
        setSelectedBranchId(profile.branches[0].id);
      } else {
        // Create initial default branch from profile
        const initialBranch: VendorBranch = {
          id: `br-${currentUserId}-main`,
          vendor_id: currentUserId,
          name: "الفرع الرئيسي - المعرض والمبيعات",
          city: profile?.city || "الرياض",
          district: profile?.district || "حي المنار",
          address: profile?.address || profile?.national_address || "طريق خريص - بجوار كوبري الخليج",
          latitude: profile?.latitude ? Number(profile.latitude) : 24.7136,
          longitude: profile?.longitude ? Number(profile.longitude) : 46.6753,
          contact_name: profile?.full_name || "مسؤول المعرض",
          contact_phone: profile?.phone || "",
          is_main: true,
          is_active: true,
          accepts_pickup: profile?.accepts_pickup !== false,
          created_at: new Date().toISOString(),
        };
        setBranches([initialBranch]);
        setSelectedBranchId(initialBranch.id);
      }
    } catch (err) {
      console.warn("Failed to load branches:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadBranchesAndProfile();
  }, [loadBranchesAndProfile]);

  // Selected Active Branch
  const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0] || null;

  // ── 2. Open Modal for Add or Edit ──
  const openAddBranchModal = () => {
    setEditingBranch(null);
    setModalFormData({
      name: "",
      city: activeBranch?.city || "الرياض",
      district: "",
      address: "",
      latitude: activeBranch?.latitude ? Number((activeBranch.latitude + 0.015).toFixed(4)) : 24.7136,
      longitude: activeBranch?.longitude ? Number((activeBranch.longitude + 0.015).toFixed(4)) : 46.6753,
      contact_name: "",
      contact_phone: "",
      accepts_pickup: true,
      is_main: branches.length === 0,
    });
    setIsBranchModalOpen(true);
    setMsg(null);
  };

  const openEditBranchModal = (branch: VendorBranch) => {
    setEditingBranch(branch);
    setModalFormData({
      id: branch.id,
      name: branch.name,
      city: branch.city || "الرياض",
      district: branch.district || "",
      address: branch.address || "",
      latitude: Number(branch.latitude) || 24.7136,
      longitude: Number(branch.longitude) || 46.6753,
      contact_name: branch.contact_name || "",
      contact_phone: branch.contact_phone || "",
      accepts_pickup: branch.accepts_pickup !== false,
      is_main: !!branch.is_main,
    });
    setIsBranchModalOpen(true);
    setMsg(null);
  };

  // ── 3. Save Branch (Add or Update) ──
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalFormData.name.trim() || !modalFormData.city.trim() || !modalFormData.address.trim()) {
      alert("يرجى ملء جميع الحقول الإلزامية: اسم الفرع، المدينة، والعنوان التفصيلي.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...modalFormData,
        business_hours: businessHours,
      };

      const res = await fetch("/api/v1/vendor/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setIsBranchModalOpen(false);
        setMsg({
          type: "success",
          text: editingBranch ? "تم تحديث بيانات الفرع بنجاح ✓" : "تمت إضافة الفرع الجديد بنجاح واعتماده على الخريطة 📍",
        });
        await loadBranchesAndProfile(true);
        if (data.branch?.id) {
          setSelectedBranchId(data.branch.id);
        }
      } else {
        alert(data.error || "فشل حفظ بيانات الفرع");
      }
    } catch (err: any) {
      console.error("Save branch error:", err);
      alert("حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً.");
    } finally {
      setSaving(false);
    }
  };

  // ── 4. Set Branch as Main (Headquarters) ──
  const handleSetMainBranch = async (branchId: string) => {
    try {
      const res = await fetch("/api/v1/vendor/branches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: branchId, action: "set_main" }),
      });
      const data = await res.json();
      if (data.success) {
        setBranches((prev) =>
          prev.map((b) => ({
            ...b,
            is_main: b.id === branchId,
          }))
        );
        setMsg({ type: "success", text: "تم تعيين هذا الفرع كفرع رئيسي للمنشأة ⭐" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ── 5. Delete Branch ──
  const confirmDeleteBranch = async () => {
    if (!deletingBranch) return;
    if (branches.length <= 1) {
      alert("لا يمكن حذف الفرع الوحيد للمنشأة، يجب وجود فرع واحد على الأقل.");
      setDeletingBranch(null);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/vendor/branches?id=${deletingBranch.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: `تم حذف (${deletingBranch.name}) بنجاح.` });
        setDeletingBranch(null);
        await loadBranchesAndProfile(true);
      } else {
        alert(data.error || "فشل حذف الفرع");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  // ── 6. GPS Location for Modal ──
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert("متصفحك لا يدعم خاصية تحديد الموقع الجغرافي");
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setModalFormData((prev) => ({
          ...prev,
          latitude: Number(lat.toFixed(5)),
          longitude: Number(lng.toFixed(5)),
        }));
        setIsLocatingGps(false);
      },
      () => {
        setIsLocatingGps(false);
        alert("تعذر التقاط الموقع تلقائياً، يمكنك النقر على الخريطة التفاعلية لاختياره بدقة.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleLocationPicked = (loc: {
    latitude: number;
    longitude: number;
    address: string;
    district?: string;
    city?: string;
  }) => {
    setModalFormData((prev) => ({
      ...prev,
      latitude: Number(loc.latitude.toFixed(5)),
      longitude: Number(loc.longitude.toFixed(5)),
      address: loc.address || prev.address,
      district: loc.district || prev.district,
      city: loc.city || prev.city,
    }));
    setIsLocationPickerOpen(false);
  };

  // ── 7. Business Hours Helpers ──
  const handleToggleDay = (dayKey: DayOfWeekKey) => {
    setBusinessHours((prev) => {
      const cur = prev.schedule[dayKey] || { isOpen: true, openTime: "08:00", closeTime: "22:00" };
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [dayKey]: { ...cur, isOpen: !cur.isOpen },
        },
      };
    });
  };

  const handleTimeChange = (dayKey: DayOfWeekKey, field: "openTime" | "closeTime", val: string) => {
    setBusinessHours((prev) => {
      const cur = prev.schedule[dayKey] || { isOpen: true, openTime: "08:00", closeTime: "22:00" };
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [dayKey]: { ...cur, [field]: val },
        },
      };
    });
  };

  const applyPreset = (presetType: "standard" | "extended" | "24h") => {
    const updated: any = {};
    ORDERED_DAYS.forEach((d) => {
      if (presetType === "standard") {
        updated[d] = { isOpen: d !== "friday", openTime: "08:00", closeTime: "22:00" };
      } else if (presetType === "extended") {
        updated[d] = { isOpen: true, openTime: d === "friday" ? "16:00" : "07:30", closeTime: "23:00" };
      } else {
        updated[d] = { isOpen: true, openTime: "00:00", closeTime: "23:59" };
      }
    });

    setBusinessHours({ timezone: "Asia/Riyadh", schedule: updated });
    setMsg({ type: "success", text: "تم تطبيق قالب ساعات العمل على الفرع النشط!" });
  };

  const handleSaveHours = async () => {
    setSaving(true);
    try {
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            business_hours: businessHours,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
      setMsg({ type: "success", text: "تم حفظ واعتماد جدول ساعات العمل بنجاح ✓" });
    } catch (e: any) {
      console.error(e);
      setMsg({ type: "error", text: "فشل حفظ ساعات العمل" });
    } finally {
      setSaving(false);
    }
  };

  const opStatus = calculateVendorOpenStatus(businessHours);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-200/90 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-bold">جاري تحميل فروع المنشأة ومراكز الاستلام...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-[#0B1528] via-[#0F1C36] to-[#0B1528] text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                إدارة الفروع ومراكز الاستلام الذاتي من المعرض
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                فروع متعددة B2B 🏢
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed max-w-2xl">
              أضف فروعك ومستودعاتك في مختلف المدن، وحدد مواقعها الجغرافية ومواعيد العمل لتظهر مباشرة على خريطة الموردين للعملاء.
            </p>
          </div>
        </div>

        {/* Primary Action Button: Add New Branch */}
        <button
          type="button"
          onClick={openAddBranchModal}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>إضافة فرع جديد للمنشأة</span>
        </button>
      </div>

      {/* ── METRICS SUMMARY BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي الفروع المسجلة</span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-0.5 block">{branches.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">الفروع النشطة</span>
            <span className="text-2xl font-black font-mono text-emerald-700 mt-0.5 block">
              {branches.filter((b) => b.is_active !== false).length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">فروع الاستلام الذاتي</span>
            <span className="text-2xl font-black font-mono text-purple-700 mt-0.5 block">
              {branches.filter((b) => b.accepts_pickup !== false).length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">الفرع الرئيسي المعتمد</span>
            <span className="text-xs font-black text-slate-800 mt-1 block truncate max-w-36">
              {branches.find((b) => b.is_main)?.city || "الرياض"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
        </div>
      </div>

      {/* ── FEEDBACK ALERTS ── */}
      {msg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MAIN 2-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ────────────────── RIGHT: BRANCHES LIST & HOURS ────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: REGISTERED BRANCHES LIST */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">فروع المنشأة المعتمدة ({branches.length})</h3>
                  <p className="text-[11px] text-slate-400">
                    اضغط على أي فرع لتحديده كفرع نشط ومعاينة بطاقته وتعديل بياناته
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openAddBranchModal}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة فرع</span>
              </button>
            </div>

            {/* Branches Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {branches.map((b) => {
                const isSelected = b.id === (activeBranch?.id || "");
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBranchId(b.id)}
                    className={`rounded-2xl border p-4.5 transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
                    }`}
                  >
                    {/* Top Row: Name & Badges */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-slate-900">{b.name}</h4>
                          {b.is_main && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold">
                              <Star className="w-2.5 h-2.5 fill-amber-500" />
                              <span>الفرع الرئيسي</span>
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0">
                            الفرع المعروض ✓
                          </span>
                        )}
                      </div>

                      {/* City & District */}
                      <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{b.city} {b.district ? `· ${b.district}` : ""}</span>
                      </p>

                      {/* Detailed Address */}
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 leading-relaxed">
                        {b.address}
                      </p>

                      {/* Phone & Contact Person */}
                      {(b.contact_phone || b.contact_name) && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          {b.contact_phone && (
                            <span className="font-mono font-bold text-slate-700 flex items-center gap-1" dir="ltr">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>{b.contact_phone}</span>
                            </span>
                          )}
                          {b.contact_name && (
                            <span className="truncate text-slate-600 font-medium">المسؤول: {b.contact_name}</span>
                          )}
                        </div>
                      )}

                      {/* Pickup Badge */}
                      <div className="mt-2 flex items-center gap-2">
                        {b.accepts_pickup !== false ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                            يقبل الاستلام الذاتي ✓
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            توصيل فقط
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditBranchModal(b)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-blue-600" />
                          <span>تعديل</span>
                        </button>

                        {!b.is_main && (
                          <button
                            type="button"
                            onClick={() => handleSetMainBranch(b.id)}
                            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="تعيين هذا الفرع كفرع رئيسي"
                          >
                            <Star className="w-2.5 h-2.5" />
                            <span>تعيين كرئيسي</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {b.latitude && b.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="معاينة على خرائط Google"
                          >
                            <Compass className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {branches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDeletingBranch(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف الفرع"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: STRUCTURED WEEKLY BUSINESS HOURS SCHEDULE */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    ساعات وأوقات العمل الأسبوعية ({activeBranch?.name || "الفرع المعتمد"})
                  </h3>
                  <p className="text-[11px] text-slate-400">بتوقيت المملكة العربية السعودية (Asia/Riyadh UTC+3)</p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 ml-1">قوالب سريعة:</span>
                <button
                  type="button"
                  onClick={() => applyPreset("standard")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                >
                  الدوام المعتاد (الجمعة عطلة)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("extended")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                >
                  دوام كامل 7 أيام
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("24h")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                >
                  24 ساعة
                </button>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="space-y-2">
              {ORDERED_DAYS.map((dayKey) => {
                const dayMeta = ARABIC_DAYS_MAP[dayKey];
                const sched = businessHours.schedule[dayKey] || {
                  isOpen: true,
                  openTime: "08:00",
                  closeTime: "22:00",
                };

                return (
                  <div
                    key={dayKey}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      sched.isOpen
                        ? "bg-slate-50/80 border-slate-200/80"
                        : "bg-rose-50/30 border-rose-200/60 opacity-80"
                    }`}
                  >
                    {/* Day Name & Toggle */}
                    <div className="flex items-center gap-3 w-36 shrink-0">
                      <input
                        type="checkbox"
                        checked={sched.isOpen}
                        onChange={() => handleToggleDay(dayKey)}
                        id={`check-${dayKey}`}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label
                        htmlFor={`check-${dayKey}`}
                        className={`text-xs font-black cursor-pointer ${
                          sched.isOpen ? "text-slate-900" : "text-rose-700"
                        }`}
                      >
                        {dayMeta.nameAr}
                      </label>
                    </div>

                    {/* Hours Pickers (Enabled if Open) */}
                    {sched.isOpen ? (
                      <div className="flex items-center gap-2 text-xs flex-1 justify-start sm:justify-end">
                        <span className="text-[11px] font-bold text-slate-400">من:</span>
                        <input
                          type="time"
                          value={sched.openTime}
                          onChange={(e) => handleTimeChange(dayKey, "openTime", e.target.value)}
                          className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800"
                        />
                        <span className="text-[11px] font-bold text-slate-400 mr-1">إلى:</span>
                        <input
                          type="time"
                          value={sched.closeTime}
                          onChange={(e) => handleTimeChange(dayKey, "closeTime", e.target.value)}
                          className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800"
                        />
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shrink-0">
                          {formatTimeAr(sched.openTime)} - {formatTimeAr(sched.closeTime)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold justify-start sm:justify-end">
                        <X className="w-3.5 h-3.5" />
                        <span>عطلة أسبوعية مغلق</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save Hours Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveHours}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>حفظ واعتماد ساعات العمل</span>
              </button>
            </div>
          </div>
        </div>

        {/* ────────────────── LEFT: LIVE CLIENT CARD PREVIEW ────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0B1528] rounded-3xl border border-slate-800 p-5 text-white shadow-xl space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black text-white">معاينة بطاقتك على خريطة العملاء</h3>
              </div>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                مباشر
              </span>
            </div>

            {/* Vendor Card Mockup for Selected Branch */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-700/80 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    {companyName.charAt(0) || "م"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-white truncate">{companyName}</h4>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-emerald-400 font-bold truncate mt-0.5">
                      {activeBranch?.name || "الفرع الرئيسي"}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {activeBranch?.city} {activeBranch?.district ? `· ${activeBranch.district}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px]">
                <span className={`px-2 py-0.5 rounded-md border font-bold ${opStatus.badgeClass}`}>
                  {opStatus.labelAr}
                </span>

                {activeBranch?.accepts_pickup !== false && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold">
                    استلام ذاتي ✓
                  </span>
                )}
              </div>

              {/* Address Preview */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{activeBranch?.address || "طريق الملك فهد، الرياض"}</span>
              </div>

              {/* Contact Phone */}
              {activeBranch?.contact_phone && (
                <div className="text-[11px] text-slate-300 flex items-center gap-1.5 font-mono" dir="ltr">
                  <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{activeBranch.contact_phone}</span>
                </div>
              )}

              {/* Specialized Brands Preview */}
              {specializedBrands && specializedBrands.length > 0 && (
                <div className="pt-1 flex items-center gap-1 flex-wrap">
                  {specializedBrands.slice(0, 4).map((b) => (
                    <span key={b} className="px-1.5 py-0.2 bg-slate-800 text-slate-300 text-[9px] font-bold rounded">
                      {b}
                    </span>
                  ))}
                  {specializedBrands.length > 4 && (
                    <span className="text-[9px] text-slate-500">+{specializedBrands.length - 4} ماركات</span>
                  )}
                </div>
              )}

              {/* Action Button Mock */}
              <button
                type="button"
                className="w-full h-8 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 pointer-events-none"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>طلب واستلام من هذا الفرع</span>
              </button>
            </div>

            {/* Help Note */}
            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Info className="w-3.5 h-3.5" />
                <span>ميزة تعدد الفروع على الخريطة:</span>
              </div>
              <p>
                كل فرع تضيفه يظهر كنقطة استلام مستقلة على خريطة العملاء. يستطيع العميل في أي مدينة اختيار أقرب فرع له للشراء والاستلام الفوري دون انتظار الشحن.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ADD / EDIT BRANCH MODAL DIALOG ── */}
      {mounted && isBranchModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBranchModalOpen(false);
          }}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingBranch ? `تعديل بيانات الفرع: ${editingBranch.name}` : "إضافة فرع جديد للمنشأة"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    أدخل بيانات الموقع الجغرافي ومعلومات التواصل للفرع لتسهيل استلام الطلبات
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBranch} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs custom-scrollbar">
              {/* Branch Name */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                  <span>اسم الفرع والمعرض *</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalFormData.name}
                  onChange={(e) => setModalFormData({ ...modalFormData, name: e.target.value })}
                  placeholder="مثال: فرع شمال الرياض - حي الصحافة، معرض طريق خريص..."
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/60 focus:bg-white text-xs transition-all"
                />
              </div>

              {/* City & District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>المدينة *</span>
                  </label>
                  <select
                    value={modalFormData.city}
                    onChange={(e) => setModalFormData({ ...modalFormData, city: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/60 focus:bg-white text-xs transition-all cursor-pointer"
                  >
                    {SAUDI_CITIES_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>الحي والمنطقة</span>
                  </label>
                  <input
                    type="text"
                    value={modalFormData.district}
                    onChange={(e) => setModalFormData({ ...modalFormData, district: e.target.value })}
                    placeholder="مثال: حي الصناعية، المنار، السلي..."
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/60 focus:bg-white text-xs transition-all"
                  />
                </div>
              </div>

              {/* Detailed Address */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>العنوان التفصيلي واسم الشارع *</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalFormData.address}
                  onChange={(e) => setModalFormData({ ...modalFormData, address: e.target.value })}
                  placeholder="مثال: طريق الملك فهد - بجوار محطة الدريس، مخرج 15"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/60 focus:bg-white text-xs transition-all"
                />
              </div>

              {/* Geographic Coordinates & Location Pickers */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                    <Compass className="w-4 h-4 text-blue-600" />
                    <span>الإحداثيات الجغرافية للفرع</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGetGpsLocation}
                      disabled={isLocatingGps}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100/80 transition-colors cursor-pointer shadow-2xs"
                    >
                      {isLocatingGps ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Navigation className="w-3.5 h-3.5 text-blue-600" />}
                      <span>تحديد موقعي GPS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsLocationPickerOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>اختيار من الخريطة 🗺️</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1 font-bold">خط العرض (Latitude)</span>
                    <input
                      type="number"
                      step="any"
                      value={modalFormData.latitude}
                      onChange={(e) => setModalFormData({ ...modalFormData, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono text-xs bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1 font-bold">خط الطول (Longitude)</span>
                    <input
                      type="number"
                      step="any"
                      value={modalFormData.longitude}
                      onChange={(e) => setModalFormData({ ...modalFormData, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono text-xs bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Phone & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>هاتف التواصل بالفرع *</span>
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={modalFormData.contact_phone}
                    onChange={(e) => setModalFormData({ ...modalFormData, contact_phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 font-mono font-bold text-left text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/60 focus:bg-white text-xs transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>اسم مسؤول الفرع / التسليم</span>
                  </label>
                  <input
                    type="text"
                    value={modalFormData.contact_name}
                    onChange={(e) => setModalFormData({ ...modalFormData, contact_name: e.target.value })}
                    placeholder="مثال: م. أحمد القحطاني"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/60 focus:bg-white text-xs transition-all"
                  />
                </div>
              </div>

              {/* Toggles: Self-Pickup & Main Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div
                  onClick={() => setModalFormData({ ...modalFormData, accepts_pickup: !modalFormData.accepts_pickup })}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    modalFormData.accepts_pickup
                      ? "bg-purple-50/90 border-purple-300 ring-2 ring-purple-500/20 text-purple-900"
                      : "bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-600"
                  }`}
                >
                  <div>
                    <span className="font-black block text-xs">قبول الاستلام الذاتي</span>
                    <span className="text-[11px] text-slate-500 font-medium">يتيح للعملاء استلام القطع من الفرع</span>
                  </div>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${modalFormData.accepts_pickup ? "bg-purple-600" : "bg-slate-300"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${modalFormData.accepts_pickup ? "left-4.5" : "left-0.5"}`} />
                  </div>
                </div>

                <div
                  onClick={() => setModalFormData({ ...modalFormData, is_main: !modalFormData.is_main })}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    modalFormData.is_main
                      ? "bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 text-amber-900"
                      : "bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-600"
                  }`}
                >
                  <div>
                    <span className="font-black block text-xs">الفرع الرئيسي للمنشأة</span>
                    <span className="text-[11px] text-slate-500 font-medium">يعتمد كواجهة أساسية للشركة</span>
                  </div>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${modalFormData.is_main ? "bg-amber-500" : "bg-slate-300"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${modalFormData.is_main ? "left-4.5" : "left-0.5"}`} />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold transition-colors cursor-pointer text-xs"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1B4D3E] to-[#14392E] hover:from-[#163e32] hover:to-[#0f2c23] text-white font-black flex items-center gap-2 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer disabled:opacity-50 text-xs"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingBranch ? "حفظ التعديلات" : "إضافة الفرع واعتماده"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      {mounted && deletingBranch && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeletingBranch(null);
          }}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">تأكيد حذف الفرع</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف فرع <strong className="text-slate-900">({deletingBranch.name})</strong>؟ لن يظهر هذا الفرع بعد ذلك على خريطة الموردين للعملاء.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBranch(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                تراجع
              </button>

              <button
                type="button"
                onClick={confirmDeleteBranch}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>نعم، احذف الفرع</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── LOCATION PICKER MODAL (MAP) ── */}
      {isLocationPickerOpen && (
        <LocationPickerDialog
          open={isLocationPickerOpen}
          onClose={() => setIsLocationPickerOpen(false)}
          onLocationSelect={handleLocationPicked}
        />
      )}
    </div>
  );
}

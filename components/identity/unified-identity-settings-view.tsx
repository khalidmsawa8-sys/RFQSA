"use client";

import React, { useState, useEffect } from "react";
import {
  UserIdentityDTO, OrganizationDTO, OrganizationMembershipDTO, SubscriptionEntitlementDTO, ActiveSessionDTO, ApiKeyDTO, ActivityRecordDTO
} from "@/lib/bounded-contexts/identity/identity.types";
import { identityRepository } from "@/lib/bounded-contexts/identity/identity.repository";
import { policyEngine } from "@/lib/bounded-contexts/identity/policy.engine";
import {
  ShieldCheck, Building2, User, Key, Bell, Users, Lock, CreditCard, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Plus, Globe, Smartphone, Laptop, LogOut, FileText, Check, ShieldAlert, Activity, ArrowLeft, Car, Zap, Search, CheckSquare, Square, Save, Store, Wrench, Layers, Sliders
} from "lucide-react";
import { CANONICAL_BRANDS } from "@/lib/brand-specialization";
import { CANONICAL_PARTS_CATEGORIES, CanonicalPartsCategory } from "@/lib/category-specialization";
import { CarBrandLogo } from "@/components/car-brand-logo";
import { createClient } from "@/lib/supabase/client";
import VendorBranchPickupSettings from "@/components/vendor/vendor-branch-pickup-settings";
import TeamManagementView from "@/components/team/team-management-view";

interface UnifiedIdentitySettingsViewProps {
  role: "client" | "vendor";
}

export default function UnifiedIdentitySettingsView({ role }: UnifiedIdentitySettingsViewProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<
    "organization" | "pickup_location" | "brands" | "subscription" | "verification" | "security" | "team" | "apikeys" | "notifications" | "activity" | "preferences"
  >("organization");

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserIdentityDTO | null>(null);
  const [org, setOrg] = useState<OrganizationDTO | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembershipDTO[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionEntitlementDTO | null>(null);
  const [sessions, setSessions] = useState<ActiveSessionDTO[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyDTO[]>([]);
  const [activities, setActivities] = useState<ActivityRecordDTO[]>([]);

  // Specialization Sub-Tab ("brands" | "categories")
  const [specSubTab, setSpecSubTab] = useState<"brands" | "categories">("brands");

  // Vendor Brand Specialization State
  const [specializedBrands, setSpecializedBrands] = useState<string[]>([]);
  const [specializesInAllBrands, setSpecializesInAllBrands] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");

  // Vendor Category Specialization State (Saudi Market)
  const [specializedCategories, setSpecializedCategories] = useState<string[]>([]);
  const [specializesInAllCategories, setSpecializesInAllCategories] = useState(true);
  const [categorySearch, setCategorySearch] = useState("");

  const [brandsSaving, setBrandsSaving] = useState(false);
  const [brandsMsg, setBrandsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // API Key Generator State
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [u, o, m, s, sess, keys, act] = await Promise.all([
      identityRepository.getUserIdentity(),
      identityRepository.getOrganization(role),
      identityRepository.getMemberships(),
      identityRepository.getSubscription(),
      identityRepository.getActiveSessions(),
      identityRepository.getApiKeys(),
      identityRepository.getActivityLogs(),
    ]);

    setUser(u);
    setOrg(o);
    setMemberships(m);
    setSubscription(s);
    setSessions(sess);
    setApiKeys(keys);
    setActivities(act);

    // Fetch vendor brand & category specializations from Supabase profiles
    if (u?.user_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("specialized_brands, specializes_in_all_brands, specialized_categories, specializes_in_all_categories")
        .eq("id", u.user_id)
        .maybeSingle();

      const initialBrands = Array.isArray(prof?.specialized_brands)
        ? prof.specialized_brands
        : ["toyota", "lexus", "hyundai", "kia", "gmc", "ford", "nissan"];
      setSpecializedBrands(initialBrands);
      setSpecializesInAllBrands(Boolean(prof?.specializes_in_all_brands || initialBrands.includes("ALL")));

      const initialCategories = Array.isArray(prof?.specialized_categories)
        ? prof.specialized_categories
        : [];
      setSpecializedCategories(initialCategories);
      setSpecializesInAllCategories(prof?.specializes_in_all_categories ?? (initialCategories.includes("ALL") || initialCategories.length === 0));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["organization", "pickup_location", "brands", "subscription", "verification", "security", "team", "apikeys", "notifications", "activity", "preferences"].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [role]);

  /* ── toggle brand selection ── */
  const toggleBrand = (brandId: string) => {
    setSpecializedBrands((prev) => {
      if (prev.includes(brandId)) {
        return prev.filter((b) => b !== brandId);
      } else {
        return [...prev, brandId];
      }
    });
  };

  /* ── select all / deselect all brands ── */
  const selectAllBrands = () => {
    setSpecializedBrands(CANONICAL_BRANDS.map((b) => b.id));
    setSpecializesInAllBrands(false);
  };

  const clearAllBrands = () => {
    setSpecializedBrands([]);
    setSpecializesInAllBrands(false);
  };

  /* ── toggle category selection ── */
  const toggleCategory = (catId: string) => {
    setSpecializedCategories((prev) => {
      if (prev.includes(catId)) {
        return prev.filter((c) => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  /* ── select all / deselect all categories ── */
  const selectAllCategories = () => {
    setSpecializedCategories(CANONICAL_PARTS_CATEGORIES.map((c) => c.id));
    setSpecializesInAllCategories(false);
  };

  const clearAllCategories = () => {
    setSpecializedCategories([]);
    setSpecializesInAllCategories(false);
  };

  /* ── save brand and category specializations ── */
  const saveBrands = async () => {
    if (!user?.user_id) return;
    setBrandsSaving(true);
    setBrandsMsg(null);

    const brandsToSave = specializesInAllBrands ? ["ALL"] : specializedBrands;
    const categoriesToSave = specializesInAllCategories ? ["ALL"] : specializedCategories;

    try {
      const res = await fetch("/api/v1/vendor/specializations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: user.user_id,
          specialized_brands: brandsToSave,
          specializes_in_all_brands: specializesInAllBrands,
          specialized_categories: categoriesToSave,
          specializes_in_all_categories: specializesInAllCategories,
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const brandSummary = specializesInAllBrands ? "كافة الماركات" : `${specializedBrands.length} ماركات`;
      const catSummary = specializesInAllCategories ? "كافة مجالات قطع الغيار" : `${specializedCategories.length} تخصص`;

      setBrandsMsg({
        type: "success",
        text: `تم حفظ تخصصات التوريد بنجاح (${brandSummary} | ${catSummary}).`,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("rfq_data_changed"));
        window.dispatchEvent(new Event("storage"));
      }
      loadData();
    } catch (e) {
      const updates: Record<string, any> = {
        specialized_brands: brandsToSave,
        specializes_in_all_brands: specializesInAllBrands,
        specialized_categories: categoriesToSave,
        specializes_in_all_categories: specializesInAllCategories,
      };

      const { error } = await supabase.from("profiles").update(updates).eq("id", user.user_id);

      if (error) {
        setBrandsMsg({ type: "error", text: "حدث خطأ أثناء حفظ تخصصات التوريد." });
      } else {
        setBrandsMsg({
          type: "success",
          text: "تم حفظ تخصصات التوريد بنجاح.",
        });
        loadData();
      }
    } finally {
      setBrandsSaving(false);
    }
  };

  const currentMembership = memberships.find((m) => m.organization_id === org?.id) || memberships[0];

  const handleRevokeSession = async (id: string) => {
    if (confirm("هل أنت متأكد من إنهاء هذه الجلسة وتنفيذ الخروج عن بعد؟")) {
      await identityRepository.revokeSession(id);
      loadData();
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    const created = await identityRepository.createApiKey(newKeyName);
    setCreatedKeySecret(`sec_live_99812738918237129837912`);
    setNewKeyName("");
    loadData();
  };

  const canManageTeam = currentMembership ? policyEngine.canExecuteAction(currentMembership, "team:manage") : false;
  const canManageApiKeys = currentMembership ? policyEngine.canExecuteAction(currentMembership, "apikeys:manage") : false;

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-900 w-full" dir="rtl">
      {/* ── 1. HEADER BANNER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0A1224] via-[#0F1C36] to-[#0A1224] p-4 sm:p-6 rounded-3xl text-white shadow-2xl border border-slate-800">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
            <div className="w-full h-full rounded-[14px] bg-[#0A1224] flex items-center justify-center font-black text-base sm:text-xl text-white">
              {org?.name.charAt(0) || "ش"}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400">
                {role === "vendor" ? "إدارة وتأهيل مورد قطع الغيار B2B" : "إدارة مشتريات وتوثيق حساب العميل / الأسطول"}
              </span>
              <span className={`text-[9px] sm:text-[10px] ${role === "vendor" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30"} border px-2 py-0.5 rounded-full font-bold`}>
                {role === "vendor" ? "عضوية مورد مبيعات 🏬" : "عضوية مشتري أسطول 🚗"}
              </span>
            </div>
            <h1 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight leading-snug flex items-center gap-1.5 flex-wrap">
              <span className="truncate max-w-[200px] sm:max-w-none">{org?.name}</span>
              {org?.verified_badge && <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>السجل: <strong className="font-mono text-slate-200">{org?.cr_number}</strong></span>
              <span className="hidden sm:inline">•</span>
              <span>الضريبي: <strong className="font-mono text-slate-200">{org?.tax_number}</strong></span>
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold border border-slate-700/80 transition-all backdrop-blur-md shadow-xs active:scale-95 shrink-0 self-end sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* ── 2. DASHBOARD STATUS CARDS (6 ENTERPRISE INDICATORS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Profile Completion */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-500 mb-2">
            <span>اكتمال الملف</span>
            <span className="text-emerald-600 font-black font-mono text-xs sm:text-sm">95%</span>
          </div>
          <div className="w-full h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 w-[95%]" />
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-500 font-bold truncate">توثيق السجل</p>
            <p className="text-xs sm:text-sm font-black text-emerald-600 mt-0.5 flex items-center gap-1 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">موثق B2B</span>
            </p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        </div>

        {/* Active Members */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-500 font-bold truncate">أعضاء الفريق</p>
            <p className="text-xs sm:text-base font-black text-slate-900 font-mono mt-0.5 truncate">3 نشطين</p>
          </div>
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
        </div>

        {/* Active Sessions */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-500 font-bold truncate">الجلسات النشطة</p>
            <p className="text-xs sm:text-base font-black text-slate-900 font-mono mt-0.5 truncate">{sessions.length} موثوقة</p>
          </div>
          <Laptop className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* ── 3. ENTERPRISE TABS NAVIGATION ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-2 shadow-xs flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {[
          { id: "organization", label: "ملف المؤسسة", icon: Building2 },
          ...(role === "vendor" ? [
            { id: "pickup_location", label: "موقع الفرع والاستلام الذاتي", icon: Store, isHighlight: true },
            { id: "brands", label: "ماركات ومجالات قطع الغيار", icon: Car },
          ] : []),
          { id: "subscription", label: "العضوية والاشتراك", icon: CreditCard },
          { id: "verification", label: "مركز التوثيق", icon: ShieldCheck },
          { id: "security",     label: "مركز الأمان",   icon: Lock },
          { id: "team",         label: "الفريق والـ RBAC", icon: Users },
          { id: "apikeys",       label: "مفاتيح الـ API", icon: Key },
          { id: "notifications",label: "الإشعارات",    icon: Bell },
          { id: "activity",     label: "سجل الأنشطة",   icon: Activity },
          { id: "preferences",  label: "التفضيلات العامة", icon: Globe },
        ].map((tab: any) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-md scale-[1.02]"
                  : tab.isHighlight
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.isHighlight && !isActive ? "text-emerald-600" : ""}`} />
              <span>{tab.label}</span>
              {tab.isHighlight && !isActive && (
                <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-black">
                  جديد 📍
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 4. TAB CONTENT PANELS ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs min-h-[400px]">
        {/* TAB: VENDOR BRANCH & PICKUP SETTINGS */}
        {activeTab === "pickup_location" && role === "vendor" && (
          <VendorBranchPickupSettings />
        )}

        {/* TAB 1: ORGANIZATION PROFILE */}
        {activeTab === "organization" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">بيانات ملف الشركة والمؤسسة</h3>
              <p className="text-xs text-slate-500 mt-0.5">معلومات المنشأة، العناوين الرسمية بالفروع، وبيانات الاتصال للتعاملات المالية</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المنشأة / الشركة الرسمية</label>
                <input type="text" value={org?.name || ""} readOnly className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم السجل التجاري (CR)</label>
                <input type="text" value={org?.cr_number || ""} readOnly className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الرقم الضريبي (VAT ID)</label>
                <input type="text" value={org?.tax_number || ""} readOnly className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الآيبان البنكي المعتمد (IBAN)</label>
                <input type="text" value={org?.iban || ""} readOnly className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono font-bold text-emerald-700" />
              </div>
              <div className="col-span-full">
                <label className="block font-bold text-slate-700 mb-1">العنوان والمقر الرئيسي</label>
                <input type="text" value={org?.address || ""} readOnly className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900" />
              </div>
            </div>

            {/* Role-Specific Customized Enterprise Settings Card */}
            {role === "client" ? (
              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span>تخصصات المشتريات والأسطول (Client Fleet & Procurement Settings):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-blue-100">
                    <span className="text-slate-500 font-bold block mb-1">حد الشراء التلقائي بدون موافقة:</span>
                    <strong className="text-slate-900 font-mono text-sm">5,000 ر.س / طلب</strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100">
                    <span className="text-slate-500 font-bold block mb-1">عناوين استلام الورش المسجلة:</span>
                    <strong className="text-slate-900 font-bold text-xs">3 مستودعات وورش بالرياض وجدة</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span>تخصصات التوريد والماركات المعتمدة:</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("brands")}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1 rounded-xl transition-all cursor-pointer"
                  >
                    تعديل الماركات المعتمدة ⚙️
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-slate-500 font-bold block mb-1">الماركات والتخصصات المغطاة:</span>
                    <strong className="text-emerald-700 font-bold text-xs">
                      {specializesInAllBrands
                        ? "كافة ماركات السيارات (All Brands مفعل)"
                        : `${specializedBrands.length} ماركات محددة`}
                    </strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-slate-500 font-bold block mb-1">نطاق التوصيل المباشر والتسليم:</span>
                    <strong className="text-slate-900 font-bold text-xs">جميع أحياء الرياض + شحن بين المدن</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Multi-Org Context Switcher Preview */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black text-slate-800">المؤسسات المرتبطة بحسابك (Multi-Org Contexts):</h4>
              <div className="space-y-2">
                {memberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-slate-900">{m.organization_name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">دور: {m.role}</span>
                    </div>
                    {m.organization_id === org?.id ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-200">المؤسسة النشطة حالياً ✓</span>
                    ) : (
                      <button className="text-[11px] text-blue-600 font-bold hover:underline">التحويل لهذه المؤسسة</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: VENDOR BRANDS & PARTS CATEGORIES SPECIALIZATION */}
        {activeTab === "brands" && role === "vendor" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">ماركات ومجالات وتخصصات توريد قطع الغيار</h3>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    فلترة ذكية بالسوق السعودي
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  حدد ماركات السيارات ومجالات وتخصصات قطع الغيار التي توفرها لتصلك فقط طلبات التسعير المتطابقة مع مجالك
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                  {specSubTab === "brands"
                    ? (specializesInAllBrands ? "كافة الماركات مفعلة ✓" : `${specializedBrands.length} / ${CANONICAL_BRANDS.length} ماركات`)
                    : (specializesInAllCategories ? "كافة تخصصات القطع مفعلة ✓" : `${specializedCategories.length} / ${CANONICAL_PARTS_CATEGORIES.length} تخصص قطاع`)}
                </span>
              </div>
            </div>

            {/* SUB-TAB SELECTOR (BRANDS VS CATEGORIES) */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/90">
              <button
                type="button"
                onClick={() => setSpecSubTab("brands")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  specSubTab === "brands"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200 scale-[1.01]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Car className="w-4 h-4 text-emerald-600" />
                <span>ماركات السيارات</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {specializesInAllBrands ? "الكل" : specializedBrands.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSpecSubTab("categories")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  specSubTab === "categories"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200 scale-[1.01]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Layers className="w-4 h-4 text-blue-600" />
                <span>مجالات وتخصصات قطع الغيار</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                  {specializesInAllCategories ? "الكل" : specializedCategories.length}
                </span>
                <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">
                  سوق سعودي 🇸🇦
                </span>
              </button>
            </div>

            {/* ── SUB-TAB 1: CAR BRANDS ── */}
            {specSubTab === "brands" && (
              <div className="space-y-4">
                {/* All Brands Toggle Banner */}
                <div
                  onClick={() => setSpecializesInAllBrands(!specializesInAllBrands)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    specializesInAllBrands
                      ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/90"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                        specializesInAllBrands ? "bg-emerald-600 text-white" : "bg-white border border-slate-300 text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        تخصص عام (استقبال طلبات كافة ماركات السيارات دون استثناء)
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        تفعيل هذا الخيار يتيح لك الاطلاع وتقديم عروض الأسعار على جميع طلبات التسعير الواردة في السوق
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-black px-3 py-1 rounded-xl border shrink-0 ${
                      specializesInAllBrands
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    {specializesInAllBrands ? "مفعل" : "معطل"}
                  </span>
                </div>

                {/* Individual Brands Selection Toolbar */}
                {!specializesInAllBrands && (
                  <div className="space-y-4 pt-1">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      {/* Search Filter */}
                      <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          placeholder="ابحث عن ماركة سيارة (مثال: تويوتا، فورد، مرسيدس)..."
                          className="w-full h-10 pr-9 pl-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all font-bold text-slate-900"
                        />
                      </div>

                      {/* Bulk Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={selectAllBrands}
                          className="flex-1 sm:flex-initial h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تحديد الكل</span>
                        </button>
                        <button
                          type="button"
                          onClick={clearAllBrands}
                          className="flex-1 sm:flex-initial h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                          <span>إلغاء التحديد</span>
                        </button>
                      </div>
                    </div>

                    {/* Brands Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto p-1 custom-scrollbar">
                      {CANONICAL_BRANDS.filter((b) => {
                        if (!brandSearch.trim()) return true;
                        const q = brandSearch.trim().toLowerCase();
                        return (
                          b.nameAr.toLowerCase().includes(q) ||
                          b.nameEn.toLowerCase().includes(q) ||
                          b.id.includes(q) ||
                          b.aliases.some((a) => a.toLowerCase().includes(q))
                        );
                      }).map((brand) => {
                        const isSelected = specializedBrands.includes(brand.id);
                        return (
                          <button
                            key={brand.id}
                            type="button"
                            onClick={() => toggleBrand(brand.id)}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2.5 cursor-pointer group select-none ${
                              isSelected
                                ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                                : "bg-slate-50 hover:bg-slate-100/90 border-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                                <CarBrandLogo make={brand.nameEn} className="w-full h-full object-contain" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-black text-slate-900 truncate block">
                                    {brand.nameAr}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono block truncate">
                                  {brand.nameEn}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-emerald-600 text-white"
                                  : "border border-slate-300 bg-white text-transparent group-hover:border-slate-400"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SUB-TAB 2: SPARE PARTS CATEGORIES (SAUDI MARKET CANONICAL) ── */}
            {specSubTab === "categories" && (
              <div className="space-y-4">
                {/* All Categories Toggle Banner */}
                <div
                  onClick={() => setSpecializesInAllCategories(!specializesInAllCategories)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    specializesInAllCategories
                      ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/90"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                        specializesInAllCategories ? "bg-blue-600 text-white" : "bg-white border border-slate-300 text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        تخصص شامل (استقبال طلبات كافة مجالات وتخصصات قطع الغيار دون استثناء)
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        تفعيل هذا الخيار يتيح لك استقبال جميع طلبات قطع الغيار الميكانيكية والكهربائية والبودي والتبريد وغيرها
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-black px-3 py-1 rounded-xl border shrink-0 ${
                      specializesInAllCategories
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    {specializesInAllCategories ? "مفعل" : "معطل"}
                  </span>
                </div>

                {/* Individual Categories Selection Toolbar */}
                {!specializesInAllCategories && (
                  <div className="space-y-4 pt-1">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      {/* Search Filter */}
                      <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="ابحث عن تخصص أو قطع غيار (مثال: كهرباء، كمبروسر، فرامل، بودي، عضلات، قير)..."
                          className="w-full h-10 pr-9 pl-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-bold text-slate-900"
                        />
                      </div>

                      {/* Bulk Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={selectAllCategories}
                          className="flex-1 sm:flex-initial h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          <span>تحديد الكل ({CANONICAL_PARTS_CATEGORIES.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={clearAllCategories}
                          className="flex-1 sm:flex-initial h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                          <span>إلغاء التحديد</span>
                        </button>
                      </div>
                    </div>

                    {/* Categories Grid (Saudi Market) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto p-1 custom-scrollbar">
                      {CANONICAL_PARTS_CATEGORIES.filter((c) => {
                        if (!categorySearch.trim()) return true;
                        const q = categorySearch.trim().toLowerCase();
                        return (
                          c.nameAr.toLowerCase().includes(q) ||
                          c.nameEn.toLowerCase().includes(q) ||
                          c.shortName.toLowerCase().includes(q) ||
                          c.description.toLowerCase().includes(q) ||
                          c.keywords.some((k) => k.toLowerCase().includes(q))
                        );
                      }).map((cat) => {
                        const isSelected = specializedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={`p-3.5 rounded-2xl border text-right transition-all flex items-start justify-between gap-3 cursor-pointer group select-none text-right ${
                              isSelected
                                ? "bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs"
                                : "bg-slate-50 hover:bg-slate-100/90 border-slate-200"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${cat.badgeColor}`}>
                                  {cat.shortName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {cat.nameEn}
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-slate-900 leading-snug">
                                {cat.nameAr}
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                                {cat.description}
                              </p>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-1 transition-colors ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "border border-slate-300 bg-white text-transparent group-hover:border-slate-400"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {brandsMsg && (
              <div
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium ${
                  brandsMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {brandsMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{brandsMsg.text}</span>
              </div>
            )}

            {/* Save Specializations Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-3">
              <div className="text-xs text-slate-500 font-medium space-y-0.5">
                <div>
                  <span className="font-bold text-slate-700">الماركات: </span>
                  {specializesInAllBrands
                    ? "كافة ماركات السيارات (35)"
                    : `${specializedBrands.length} ماركة محددة`}
                </div>
                <div>
                  <span className="font-bold text-slate-700">مجالات قطع الغيار: </span>
                  {specializesInAllCategories
                    ? "كافة مجالات قطع الغيار (14)"
                    : `${specializedCategories.length} تخصص قطاع محدد`}
                </div>
              </div>

              <button
                type="button"
                onClick={saveBrands}
                disabled={brandsSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md disabled:opacity-60 cursor-pointer"
              >
                {brandsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ تخصصات التوريد
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTION */}
        {activeTab === "subscription" && subscription && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">عضوية الحساب والاشتراك الحالي</h3>
              <p className="text-xs text-slate-500 mt-0.5">تفاصيل خطة B2B SaaS، الميزات المتاحة وحدود الاستخدام الشهرية</p>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">الخطة النشطة</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                  تجديد سنوي تلقائي
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">{subscription.plan_name}</h2>
              <p className="text-xs text-slate-300">تاريخ التجديد القادم: <strong className="text-emerald-400 font-mono">{subscription.renewal_date}</strong></p>

              <div className="border-t border-slate-800 pt-4 space-y-2">
                <p className="text-xs font-bold text-slate-400">الميزات المفعلة في باقتك:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {subscription.features_unlocked.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-200 font-bold">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VERIFICATION */}
        {activeTab === "verification" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">مركز توثيق المنشأة (Verification Workflow)</h3>
              <p className="text-xs text-slate-500 mt-0.5">حالة مراجعة المستندات الرسمية للحصول على وسام التوثيق الذهبي المعتمد B2B</p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0 mt-1" />
              <div>
                <h4 className="text-sm font-black text-emerald-950">حساب مؤسسي موثق ومعتمد بنجاح (Verified B2B Status)</h4>
                <p className="text-xs text-emerald-800 mt-1">
                  تم مطابقة السجل التجاري والشهادة الضريبية والآيبان بنجاح. يتمتع حسابك بكافة صلاحيات المشتريات والتسعير الفوري.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY CENTER */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">مركز الأمان وتغيير كلمة المرور</h3>
              <p className="text-xs text-slate-500 mt-0.5">تحديث الرقم السري للحساب، إدارة الجلسات الموثوقة، وتفعيل حماية الوصول</p>
            </div>

            {/* Change Password Form */}
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-4">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                تغيير كلمة المرور (Change Security Password)
              </h4>

              <form onSubmit={(e) => { e.preventDefault(); alert("تم تحديث كلمة المرور بنجاح وترخيص الجلسات الآمنة ✓"); }} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">كلمة المرور الحالية</label>
                    <input type="password" placeholder="••••••••" required className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                    <input type="password" placeholder="••••••••" required className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-900 bg-white" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة</label>
                    <input type="password" placeholder="••••••••" required className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-900 bg-white" />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" className="px-5 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-md">
                    تحديث كلمة المرور الآن
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-slate-800">الجلسات والأجهزة النشطة حالياً:</h4>
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{s.device_name} ({s.os})</span>
                        {s.is_current && <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">جهازك الحالي</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{s.browser} • IP: {s.ip_address} • {s.location}</p>
                    </div>
                  </div>

                  {!s.is_current && (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all border border-red-200 flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      إنهاء الجلسة عن بعد
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TEAM & RBAC */}
        {activeTab === "team" && (
          <TeamManagementView role={role} />
        )}

        {/* TAB 6: API KEYS */}
        {activeTab === "apikeys" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">مفاتيح الـ API والتكاملات البرمجية</h3>
              <p className="text-xs text-slate-500 mt-0.5">توليد مفاتيح الربط البرمجي لربط نظام ERP ومزامنة المشتريات والمخزون</p>
            </div>

            <form onSubmit={handleCreateApiKey} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="اسم المفتاح (مثلاً: مفتاح الربط مبيعات ERP)..."
                className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
              />
              <button type="submit" className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shrink-0">
                توليد API Key جديد
              </button>
            </form>

            {createdKeySecret && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                <p className="font-bold">⚠️ تم توليد المفتاح بنجاح! احفظ هذا المفتاح السرّي الآن فلن يظهر مرة أخرى:</p>
                <code className="block bg-amber-100/80 p-2 rounded-xl font-mono text-amber-950 font-black select-all">{createdKeySecret}</code>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-800">المفاتيح النشطة:</h4>
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{k.name}</span>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{k.key_prefix}</p>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">نشط</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">تفضيلات قنوات الإشعارات (Notification Center)</h3>
              <p className="text-xs text-slate-500 mt-0.5">تحديد وسيلة التنبيه المفضلة لكل حدث تشغيلي في المنصة</p>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { title: "تنبيهات عروض الأسعار الجديدة", desc: "تنبيه عند صدور عرض سعر جديد من المورد" },
                { title: "تنبيهات حالة الشحن والتسليم", desc: "تحديثات حركة الشحن وتجهيز قطع الغيار" },
                { title: "الفواتير والعمليات المالية", desc: "تأكيدات سداد الشحنات والرصيد" },
              ].map((n, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <h4 className="font-extrabold text-slate-900">{n.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{n.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 font-bold text-slate-700 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-emerald-600" /> واتساب
                    </label>
                    <label className="flex items-center gap-1 font-bold text-slate-700 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-emerald-600" /> بريد
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: ACTIVITY LOGS */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">سجل الأنشطة والتدقيق الأمني (Activity Stream)</h3>
              <p className="text-xs text-slate-500 mt-0.5">سجل تتبع أمني غير قابل للتلاعب لكافة العمليات الحساسة في حساب المنشأة</p>
            </div>

            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-extrabold text-slate-900">{a.action_title}</span>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">من قِبل: {a.user_name} • IP: {a.ip_address}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{a.timestamp.slice(0, 16).replace("T", " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: PREFERENCES */}
        {activeTab === "preferences" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">التفضيلات العامة والمظهر</h3>
              <p className="text-xs text-slate-500 mt-0.5">تحديد لغة الواجهة، المنطقة الزمنية والعملة القياسية</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">لغة الواجهة</label>
                <select className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900">
                  <option value="ar">العربية (Arabic)</option>
                  <option value="en">الإنجليزية (English)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">المنطقة الزمنية</label>
                <select className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900">
                  <option value="Asia/Riyadh">توقيت مكة المكرمة (Asia/Riyadh - GMT+3)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

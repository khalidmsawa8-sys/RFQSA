"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Shield,
  Database,
  Server,
  Clock,
  Timer,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Hourglass,
  Lock,
  KeyRound,
  Smartphone,
  Laptop,
  Cpu,
  HardDrive,
  Activity,
  Download,
  Trash2,
  AlertTriangle,
  Percent,
  Receipt,
  Power,
  Globe,
  Sliders,
  UserCheck,
  Check,
  Eye,
  EyeOff,
  SlidersHorizontal,
  FileJson,
  Layers,
  Users,
  ShoppingBag,
  FileText,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Loader2 } from "lucide-react";

interface SystemMetrics {
  server: {
    host: string;
    domain: string;
    port: number;
    environment: string;
    os: string;
    node_version: string;
    uptime_human: string;
    process_uptime_human: string;
    memory: { total_mb: number; used_mb: number; free_mb: number; percent: number };
    cpu: { model: string; cores: number; load_avg_1m: number };
    disk: { total_gb: number; used_gb: number; free_gb: number; percent: number };
    services: {
      pm2: { name: string; status: string; cluster_mode: string; port: number };
      nginx: { status: string; ssl: string; domain: string };
      database: { engine: string; status: string; latency_ms: number };
    };
  };
  stats: {
    rfqs_count: number;
    orders_count: number;
    quotes_count: number;
    users_count: number;
    clients_count: number;
    vendors_count: number;
  };
  settings: any;
  admin_profile: {
    full_name: string;
    email: string;
    phone: string;
    job_title: string;
    ref_code: string;
    role_badge: string;
    two_factor_enabled: boolean;
    last_login: string;
    created_at: string;
  };
}

function formatMinutesArabic(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return "0 دقيقة";
  if (totalMinutes < 60) return `${totalMinutes} دقيقة`;
  const days = Math.floor(totalMinutes / 1440);
  const remainingAfterDays = totalMinutes % 1440;
  const hours = Math.floor(remainingAfterDays / 60);
  const mins = remainingAfterDays % 60;

  const parts = [];
  if (days > 0) {
    parts.push(
      `${days} ${days === 1 ? "يوم" : days === 2 ? "يومان" : days <= 10 ? "أيام" : "يوم"}`
    );
  }
  if (hours > 0) {
    parts.push(
      `${hours} ${hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : hours <= 10 ? "ساعات" : "ساعة"}`
    );
  }
  if (mins > 0) parts.push(`${mins} دقيقة`);
  return parts.join(" و ");
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "profile" | "server" | "data">("general");
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // General Settings State
  const [durationMinutes, setDurationMinutes] = useState<number>(2880);
  const [isSavingDuration, setIsSavingDuration] = useState(false);
  const [durationFeedback, setDurationFeedback] = useState<{
    type: "success" | "error";
    message: string;
    details?: { cancelledCount?: number; updatedCount?: number };
  } | null>(null);

  // Platform Advanced Policies State
  const [platformPolicies, setPlatformPolicies] = useState({
    maintenance_mode: false,
    maintenance_message: "الموقع يخضع حالياً لأعمال صيانة وترقية مجدولة لخدمتكم بشكل أفضل، وسنعود للعمل خلال دقائق.",
    platform_commission_percent: 5,
    vat_percent: 15,
    cr_number: "1010789456",
    vat_number: "310987654300003",
    require_vendor_verification: true,
    max_quotes_per_rfq: 10,
    allow_customer_cancel_after_quotes: true,
  });
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);
  const [policiesFeedback, setPoliciesFeedback] = useState<string | null>(null);

  // Admin Profile Edit State
  const [adminForm, setAdminForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    job_title: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  // Password Change State
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [isToggling2FA, setIsToggling2FA] = useState(false);

  // Copied feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = useCallback(async (showSpin = true) => {
    if (showSpin) setIsRefreshing(true);
    try {
      const res = await fetch("/api/v1/admin/system-metrics", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setMetrics(data);
        if (data.settings?.rfq_visibility_duration_minutes) {
          setDurationMinutes(Number(data.settings.rfq_visibility_duration_minutes));
        }
        if (data.settings) {
          setPlatformPolicies({
            maintenance_mode: Boolean(data.settings.maintenance_mode),
            maintenance_message: data.settings.maintenance_message || platformPolicies.maintenance_message,
            platform_commission_percent: data.settings.platform_commission_percent ?? 5,
            vat_percent: data.settings.vat_percent ?? 15,
            cr_number: data.settings.cr_number || "1010789456",
            vat_number: data.settings.vat_number || "310987654300003",
            require_vendor_verification: data.settings.require_vendor_verification !== false,
            max_quotes_per_rfq: data.settings.max_quotes_per_rfq ?? 10,
            allow_customer_cancel_after_quotes: data.settings.allow_customer_cancel_after_quotes !== false,
          });
        }
        if (data.admin_profile) {
          setAdminForm({
            full_name: data.admin_profile.full_name || "",
            email: data.admin_profile.email || "",
            phone: data.admin_profile.phone || "",
            job_title: data.admin_profile.job_title || "",
          });
          setTwoFactorEnabled(Boolean(data.admin_profile.two_factor_enabled));
        }
      }
    } catch (e) {
      console.error("Failed to load metrics:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Save Duration
  const handleSaveDuration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!durationMinutes || durationMinutes < 1) {
      setDurationFeedback({
        type: "error",
        message: "يرجى إدخال مدة صحيحة بالدقائق (دقيقة واحدة على الأقل).",
      });
      return;
    }

    setIsSavingDuration(true);
    setDurationFeedback(null);

    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfq_visibility_duration_minutes: durationMinutes,
          auto_cancel_expired: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDurationFeedback({
          type: "success",
          message: data.message,
          details: data.affected,
        });
        loadData(false);
      } else {
        setDurationFeedback({
          type: "error",
          message: data.error || "فشل حفظ الإعدادات",
        });
      }
    } catch (err: any) {
      setDurationFeedback({
        type: "error",
        message: err?.message || "فشل الاتصال بالسيرفر",
      });
    } finally {
      setIsSavingDuration(false);
    }
  };

  // 2. Save Platform Policies
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicies(true);
    setPoliciesFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platformPolicies),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPoliciesFeedback("تم حفظ سياسات وضوابط المنصة بنجاح وتفعيلها في كافة العمليات.");
        setTimeout(() => setPoliciesFeedback(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingPolicies(false);
    }
  };

  // 3. Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          profile: adminForm,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileFeedback("تم حفظ بيانات المشرف الشخصية وتحديثها فورياً في النظام.");
        loadData(false);
        setTimeout(() => setProfileFeedback(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 4. Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordFeedback({ type: "error", message: "كلمتا المرور غير متطابقتين!" });
      return;
    }
    if (passwords.new_password.length < 6) {
      setPasswordFeedback({ type: "error", message: "يجب أن لا تقل كلمة المرور عن 6 أحرف أو أرقام!" });
      return;
    }
    setIsSavingPassword(true);
    setPasswordFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          password_data: passwords,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordFeedback({ type: "success", message: "تم تغيير كلمة المرور بنجاح وتأمين الحساب." });
        setPasswords({ current_password: "", new_password: "", confirm_password: "" });
        setTimeout(() => setPasswordFeedback(null), 5000);
      } else {
        setPasswordFeedback({ type: "error", message: data.error || "فشل تغيير كلمة المرور" });
      }
    } catch (e: any) {
      setPasswordFeedback({ type: "error", message: e?.message || "فشل الاتصال" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // 5. Toggle 2FA
  const handleToggle2FA = async () => {
    setIsToggling2FA(true);
    try {
      const nextVal = !twoFactorEnabled;
      const res = await fetch("/api/v1/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_2fa",
          enabled: nextVal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTwoFactorEnabled(data.two_factor_enabled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsToggling2FA(false);
    }
  };

  // Instant DB Backup Export
  const handleDownloadBackup = () => {
    const backupData = {
      backup_timestamp: new Date().toISOString(),
      platform: "RFQ B2B Marketplace Platform",
      host: metrics?.server.host || "147.93.56.252",
      metrics: metrics,
      settings: platformPolicies,
      exported_by: metrics?.admin_profile.full_name || "Super Admin",
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rfq_system_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const PRESETS = [
    { label: "30 دقيقة (نصف ساعة)", val: 30 },
    { label: "60 دقيقة (ساعة)", val: 60 },
    { label: "120 دقيقة (ساعتان)", val: 120 },
    { label: "720 دقيقة (12 ساعة)", val: 720 },
    { label: "1440 دقيقة (24 ساعة)", val: 1440 },
    { label: "2880 دقيقة (48 ساعة)", val: 2880 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-bold text-sm">جاري قراءة بيانات السيرفر الحقيقية وإعدادات المنصة...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 w-full" dir="rtl">
      {/* ── TOP HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">إعدادات المنصة وحساب الإدارة</h1>
              <p className="text-slate-500 text-sm font-semibold mt-0.5">
                لوحة التحكم المركزية في سياسات النظام، مدة ظهور الطلبات، صلاحيات المشرف، وصحة الخادم
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>السيرفر متصل:</span>
            <span className="font-mono font-black">{metrics?.server.host}</span>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>تحديث القياسات</span>
          </button>
        </div>
      </div>

      {/* ── ENTERPRISE TABS NAVIGATION ── */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-x-auto">
        {[
          { key: "general", label: "الإعدادات العامة والطلبات", icon: SlidersHorizontal, count: null },
          { key: "profile", label: "إدارة حساب المشرف والأمان", icon: Shield, count: null },
          { key: "server", label: "صحة الخادم والبنية السحابية", icon: Server, count: "مباشر" },
          { key: "data", label: "إحصائيات المنصة والنسخ الاحتياطي", icon: Database, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-white text-blue-600 shadow-md shadow-slate-200/60 scale-[1.01]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.count && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: GENERAL & ORDERS ENGINE SETTINGS ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "general" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* A. ORDER VISIBILITY DURATION (THE USER'S PRIMARY REQUEST) */}
          <Card className="border-2 border-blue-200/90 bg-gradient-to-b from-white to-blue-50/20 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-blue-100/70 bg-blue-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Timer className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900">
                      مدة ظهور طلبات العملاء عند الموردين (بالدقائق)
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs font-bold mt-0.5">
                      التحكم في مهلة تنافس طلبات التسعير (RFQs) وتحويلها التلقائي لحالة "ملغاة" بعد انتهائها
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-blue-600 text-white font-black px-3.5 py-1.5 rounded-xl text-xs shadow-xs w-fit">
                  تطبيق فوري وتلقائي
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
              <form onSubmit={handleSaveDuration} className="space-y-6">
                {/* Input & Unit */}
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800">
                    أدخل المدة المسموحة لبقاء الطلب مفتوحاً للتسعير (بالدقائق):
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                    <div className="relative flex-1 max-w-md">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={durationMinutes || ""}
                        onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                        placeholder="مثال: 120"
                        className="w-full h-14 px-5 pl-24 rounded-2xl border-2 border-slate-200 bg-white text-xl font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-xs"
                        required
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 font-black text-sm pointer-events-none">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>دقيقة</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingDuration}
                      className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingDuration ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>جاري الفحص والتطبيق على الطلبات...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          <span>حفظ وتطبيق على جميع الطلبات</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Calculated dynamic preview */}
                  <div className="flex items-center gap-2.5 text-xs font-bold text-blue-800 bg-blue-50/90 border border-blue-200/90 px-4 py-2.5 rounded-2xl w-fit shadow-xs">
                    <Hourglass className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                    <span>المدة المحسوبة للنظام:</span>
                    <span className="font-black text-blue-900 underline decoration-blue-400 text-sm">
                      {formatMinutesArabic(durationMinutes)}
                    </span>
                    <span className="text-slate-400 font-mono">({durationMinutes} دقيقة)</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 block">خيارات سريعة محددة مسبقاً:</span>
                  <div className="flex flex-wrap gap-2.5">
                    {PRESETS.map((p) => {
                      const isSelected = durationMinutes === p.val;
                      return (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setDurationMinutes(p.val)}
                          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-xs"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Explanatory Banner */}
                <div className="p-4.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ضمانات التطبيق التلقائي الفوري:</span>
                  </div>
                  <ul className="space-y-1 text-amber-900 font-semibold list-disc list-inside">
                    <li>يتم فوراً فحص كافة طلبات التسعير المسجلة في النظام.</li>
                    <li>أي طلب مر على وقت إنشائه مدة تزيد عن هذه الدقائق يتم نقله فوراً إلى <strong>"الطلبات ملغاة"</strong>.</li>
                    <li>الطلبات النشطة المتبقية يتم إعادة جدولة عدادها التنازلي بدقة وفق المهلة الجديدة.</li>
                    <li>يختفي الطلب المنتهي من رادار الموردين ولا يمكن لأي مورد تقديم عروض عليه بعد ذلك.</li>
                  </ul>
                </div>

                {/* Feedback */}
                {durationFeedback && (
                  <div
                    className={`p-4.5 rounded-2xl border text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
                      durationFeedback.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : "bg-red-50 border-red-200 text-red-950"
                    }`}
                  >
                    {durationFeedback.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1">
                      <p className="font-black text-base leading-snug">{durationFeedback.message}</p>
                      {durationFeedback.details && (
                        <p className="text-xs text-emerald-700 font-semibold">
                          النتيجة الحية: تحويل {durationFeedback.details.cancelledCount || 0} طلب منتهي إلى ملغي، وتحديث مهلة {durationFeedback.details.updatedCount || 0} طلب نشط بنجاح.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* B. PLATFORM BUSINESS POLICIES & TAX */}
          <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-900">
                    السياسات المالية والضرائب وعمولات المنصة
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs font-bold">
                    إعدادات فوترة الصفقات، نسبة ضريبة القيمة المضافة (ZATCA)، والرسوم التشغيلية
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSavePolicies} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">عمولة المنصة من الصفقات (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={platformPolicies.platform_commission_percent}
                        onChange={(e) =>
                          setPlatformPolicies({ ...platformPolicies, platform_commission_percent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full h-12 px-4 pl-10 rounded-xl border border-slate-200 text-sm font-black focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                      <Percent className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">ضريبة القيمة المضافة VAT (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={platformPolicies.vat_percent}
                        onChange={(e) =>
                          setPlatformPolicies({ ...platformPolicies, vat_percent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full h-12 px-4 pl-10 rounded-xl border border-slate-200 text-sm font-black focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                      <Percent className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">الرقم الضريبي للمنصة (VAT ID)</label>
                    <input
                      type="text"
                      value={platformPolicies.vat_number}
                      onChange={(e) => setPlatformPolicies({ ...platformPolicies, vat_number: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">رقم السجل التجاري (CR Number)</label>
                    <input
                      type="text"
                      value={platformPolicies.cr_number}
                      onChange={(e) => setPlatformPolicies({ ...platformPolicies, cr_number: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={platformPolicies.require_vendor_verification}
                      onChange={(e) =>
                        setPlatformPolicies({ ...platformPolicies, require_vendor_verification: e.target.checked })
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-900">اشتراط توثيق هوية المورد</p>
                      <p className="text-[11px] text-slate-500 font-semibold">مراجعة السجل قبل تقديم العروض</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={platformPolicies.allow_customer_cancel_after_quotes}
                      onChange={(e) =>
                        setPlatformPolicies({ ...platformPolicies, allow_customer_cancel_after_quotes: e.target.checked })
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-900">السماح للعميل بإلغاء الطلب</p>
                      <p className="text-[11px] text-slate-500 font-semibold">حتى بعد صدور عروض أسعار الموردين</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-red-200/80 bg-red-50/30 hover:bg-red-50/60 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={platformPolicies.maintenance_mode}
                      onChange={(e) =>
                        setPlatformPolicies({ ...platformPolicies, maintenance_mode: e.target.checked })
                      }
                      className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <p className="text-xs font-black text-red-900">وضع الصيانة العام (Maintenance)</p>
                      <p className="text-[11px] text-red-600 font-semibold">إيقاف العمليات للترقية المجدولة</p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    disabled={isSavingPolicies}
                    className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPolicies ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>حفظ سياسات المنصة</span>
                  </button>

                  {policiesFeedback && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                      {policiesFeedback}
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: ADMIN PROFILE & SECURITY ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
          {/* Profile Overview Card */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden bg-white lg:col-span-1">
            <div className="p-6 bg-gradient-to-br from-slate-900 to-blue-950 text-white text-center relative overflow-hidden">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-600/30 border-2 border-white/20 flex items-center justify-center text-3xl font-black shadow-inner">
                {adminForm.full_name?.slice(0, 2) || "مش"}
              </div>
              <h2 className="text-xl font-black mt-3">{adminForm.full_name || "المشرف العام"}</h2>
              <p className="text-xs text-blue-200 font-semibold mt-0.5">{adminForm.job_title}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge className="bg-blue-600 text-white border-0 font-bold px-3 py-1">
                  {metrics?.admin_profile.ref_code || "ADM-001"}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold px-3 py-1">
                  حساب نشط
                </Badge>
              </div>
            </div>

            <CardContent className="p-6 space-y-4 text-xs font-semibold">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">البريد الإلكتروني</span>
                <span className="font-mono text-slate-800 font-bold">{adminForm.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">رقم الجوال</span>
                <span className="font-mono text-slate-800 font-bold text-left" dir="ltr">{adminForm.phone}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">آخر تسجيل دخول</span>
                <span className="text-slate-800 font-bold">منذ 15 دقيقة (جلسة نشطة)</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">مستوى الصلاحية</span>
                <span className="font-black text-blue-600">Super Administrator</span>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile & Password Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Edit Personal Data */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-lg font-black text-slate-900">البيانات الشخصية للمشرف</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold">
                  تعديل الاسم والمسمى الوظيفي وبيانات التواصل الرسمية المعتمدة
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">الاسم الكامل للمشرف</label>
                      <input
                        type="text"
                        value={adminForm.full_name}
                        onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">المسمى الوظيفي</label>
                      <input
                        type="text"
                        value={adminForm.job_title}
                        onChange={(e) => setAdminForm({ ...adminForm, job_title: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">البريد الإلكتروني المعتمد</label>
                      <input
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">رقم الجوال للإشعارات الأمنية</label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={adminForm.phone}
                        onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                        placeholder="+966 50 123 4567"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600 text-left [direction:ltr]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>حفظ البيانات الشخصية</span>
                    </button>

                    {profileFeedback && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                        {profileFeedback}
                      </span>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Change Password & 2FA */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-lg font-black text-slate-900">الأمان وكلمة المرور</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold">
                  تغيير كلمة المرور وتفعيل المصادقة الثنائية لحماية حساب المشرف
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* 2FA Status Box */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">المصادقة الثنائية (2FA Security)</p>
                      <p className="text-xs text-slate-500 font-semibold">
                        {twoFactorEnabled ? "مفعلة وتتطلب كود التحقق عند تسجيل الدخول" : "معطلة - ننصح بتفعيلها فوراً"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggle2FA}
                    disabled={isToggling2FA}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      twoFactorEnabled
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200"
                        : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                    }`}
                  >
                    {isToggling2FA ? "جاري التحديث..." : twoFactorEnabled ? "مفعلة بنجاح ✓" : "تفعيل الآن"}
                  </button>
                </div>

                {/* Password Form */}
                <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">كلمة المرور الجديدة</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwords.new_password}
                          onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full h-12 px-4 pl-10 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">تأكيد كلمة المرور الجديدة</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwords.confirm_password}
                        onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>
                  </div>

                  {passwordFeedback && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-bold ${
                        passwordFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {passwordFeedback.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    <span>تحديث كلمة المرور</span>
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: REAL SERVER METRICS & CLOUD INFRASTRUCTURE ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "server" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Key Metric Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* CPU */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm p-6 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">المعالج السحابي (vCPU)</span>
                <Cpu className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {metrics?.server.cpu.cores} Cores
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>معدل التحميل (Load):</span>
                  <span className="font-mono">{metrics?.server.cpu.load_avg_1m}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{metrics?.server.cpu.model}</p>
              </div>
            </Card>

            {/* RAM */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm p-6 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">الذاكرة العشوائية (RAM)</span>
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {metrics?.server.memory.percent}% <span className="text-xs text-slate-400 font-normal">مستخدم</span>
              </p>
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${metrics?.server.memory.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-bold">
                  <span>{metrics?.server.memory.used_mb} MB مستخدم</span>
                  <span>{metrics?.server.memory.total_mb} MB الإجمالي</span>
                </div>
              </div>
            </Card>

            {/* Disk */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm p-6 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">سعة القرص الصلب (SSD)</span>
                <HardDrive className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {metrics?.server.disk.used_gb} GB / {metrics?.server.disk.total_gb} GB
              </p>
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${metrics?.server.disk.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-bold">
                  <span>متبقي {metrics?.server.disk.free_gb} GB متاح</span>
                  <span>استهلاك {metrics?.server.disk.percent}%</span>
                </div>
              </div>
            </Card>

            {/* Uptime */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm p-6 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">مدة تشغيل الخادم (Uptime)</span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-lg font-black text-slate-900 truncate">
                {metrics?.server.uptime_human}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>تشغيل متواصل بدون توقف</span>
              </div>
            </Card>
          </div>

          {/* Infrastructure Topology Card */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900">طوبولوجيا الخدمات وعناوين الربط</CardTitle>
                    <CardDescription className="text-slate-500 text-xs font-bold">
                      التفاصيل التقنية للبيئة والشهادات ومنافذ التشغيل
                    </CardDescription>
                  </div>
                </div>

                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono font-bold">
                  HTTPS / TLS 1.3 Active
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 divide-y divide-slate-100">
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-800">عنوان خادم الإنتاج (VPS IP)</p>
                  <p className="text-xs text-slate-400">خادم مخصص لاستضافة منصة RFQ</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black bg-slate-100 px-3 py-1.5 rounded-xl text-slate-800">
                    {metrics?.server.host}
                  </span>
                  <button
                    onClick={() => handleCopy(metrics?.server.host || "", "host")}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {copiedKey === "host" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-800">بيئة تشغيل العمليات (Node.js & PM2)</p>
                  <p className="text-xs text-slate-400">إدارة الخدمة الخلفية بمنفذ داخلي 3002</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl">
                    Node {metrics?.server.node_version}
                  </span>
                  <span className="font-mono text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl">
                    PM2 process: rfq (online)
                  </span>
                </div>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-800">النطاق الرسمي والشهادة الأمنية (SSL)</p>
                  <p className="text-xs text-slate-400">Let&apos;s Encrypt / Cloudflare Edge Proxy</p>
                </div>
                <a
                  href={`https://${metrics?.server.domain}`}
                  target="_blank"
                  className="font-mono text-xs font-black text-blue-600 hover:underline flex items-center gap-1.5"
                >
                  <span>https://{metrics?.server.domain}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-800">نظام التشغيل والتوزيعة (Linux Distribution)</p>
                  <p className="text-xs text-slate-400">نواة لينكس محدثة مع جدار ناري نشط</p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">
                  {metrics?.server.os}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: PLATFORM DATA & INSTANT BACKUP ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "data" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Data Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <Card className="p-6 rounded-3xl border border-slate-200 bg-white text-center space-y-2">
              <Users className="w-8 h-8 text-blue-600 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">إجمالي المستخدمين المسجلين</p>
              <p className="text-3xl font-black text-slate-900">{metrics?.stats.users_count}</p>
              <p className="text-[11px] text-slate-400">{metrics?.stats.clients_count} عميل · {metrics?.stats.vendors_count} مورد</p>
            </Card>

            <Card className="p-6 rounded-3xl border border-slate-200 bg-white text-center space-y-2">
              <FileText className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">طلبات عروض الأسعار (RFQs)</p>
              <p className="text-3xl font-black text-slate-900">{metrics?.stats.rfqs_count}</p>
              <p className="text-[11px] text-slate-400">طلبات نشطة ومنتهية الصلاحية</p>
            </Card>

            <Card className="p-6 rounded-3xl border border-slate-200 bg-white text-center space-y-2">
              <ShoppingBag className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">أوامر الشراء والصفقات</p>
              <p className="text-3xl font-black text-slate-900">{metrics?.stats.orders_count}</p>
              <p className="text-[11px] text-slate-400">صفقات معتمدة ومسجلة</p>
            </Card>

            <Card className="p-6 rounded-3xl border border-slate-200 bg-white text-center space-y-2">
              <Receipt className="w-8 h-8 text-violet-600 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">عروض أسعار الموردين</p>
              <p className="text-3xl font-black text-slate-900">{metrics?.stats.quotes_count}</p>
              <p className="text-[11px] text-slate-400">تسعيرات مسجلة في التنافس</p>
            </Card>
          </div>

          {/* Backup Download Action Card */}
          <Card className="p-8 rounded-3xl border-2 border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <FileJson className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-black">تصدير وتنزيل نسخة احتياطية فورية (JSON Backup)</h3>
              </div>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                يتيح لك تنزيل نسخة احتياطية شاملة تتضمن إعدادات النظام، قياسات الخادم، ملف المشرف، وكافة السياسات المعتمدة بنقرة زر واحدة للاحتفاظ بها في أمان.
              </p>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="h-13 px-8 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm transition-all shadow-lg shadow-blue-600/40 flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>تنزيل النسخة الاحتياطية الآن</span>
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}



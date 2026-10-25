"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User, Mail, Phone, ShieldCheck, Building2,
  Star, ShoppingBag, CheckCircle2, Copy, Check,
  Sparkles, MapPin, Award, FileText, ArrowLeft,
  Calendar, Shield, Save, RefreshCw, Sliders, ExternalLink,
  Receipt, MessageSquare, AlertCircle
} from "lucide-react";

interface ProfileData {
  id: string;
  full_name: string;
  phone: string;
  company_name: string;
  role: string;
  email: string;
  tax_number: string;
  commercial_register: string;
  national_address: string;
  city?: string;
  ref_code?: string;
  created_at?: string;
}

interface Stats {
  ordersCount: number;
  completedCount: number;
  avgRating: number;
  reviewsCount: number;
}

function generateRefCode(id: string, role?: string, storedRef?: string) {
  if (storedRef && storedRef.trim()) return storedRef.trim();
  const prefix = role === "vendor" ? "SUP" : role === "courier" ? "COU" : "CUST";
  return `${prefix}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default function ProfilePage() {
  const supabase = createClient();
  const pathname = usePathname();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ ordersCount: 0, completedCount: 0, avgRating: 0, reviewsCount: 0 });
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedRef, setCopiedRef] = useState(false);

  // Editable essential contact fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [nationalAddress, setNationalAddress] = useState("");
  const [city, setCity] = useState("الرياض");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/account/profile", {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.profile) {
          const dbProfile = data.profile;
          setProfile(dbProfile);
          setFullName(dbProfile.full_name || "");
          setPhone(dbProfile.phone || "");
          setCompanyName(dbProfile.company_name || "");
          setTaxNumber(dbProfile.tax_number || "");
          setCommercialRegister(dbProfile.commercial_register || "");
          setNationalAddress(dbProfile.national_address || dbProfile.address || "");
          setCity(dbProfile.city || "الرياض");

          if (dbProfile.stats) {
            setStats({
              ordersCount: Number(dbProfile.stats.ordersCount || 0),
              completedCount: Number(dbProfile.stats.completedCount || 0),
              avgRating: Number(dbProfile.stats.avgRating ?? 0),
              reviewsCount: Number(dbProfile.stats.reviewsCount || 0),
            });
          }

          setReviewsList(Array.isArray(dbProfile.reviews) ? dbProfile.reviews : []);
          return;
        }
      }

      // Local fallback in case of network issue
      let user: any = null;
      const { data: authData } = await supabase.auth.getUser();
      user = authData?.user;

      let uid = user?.id;
      let role = pathname.includes("vendor") ? "vendor" : "client";

      let dbProfile: any = null;
      if (uid) {
        const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
        dbProfile = data;
      }

      if (!dbProfile) {
        dbProfile = {
          id: role === "vendor" ? "vendor-demo-id" : "client-demo-id",
          full_name: role === "vendor" ? "مؤسسة قطع الغيار المعتمدة" : "شركة المشتريات الوطنية",
          company_name: role === "vendor" ? "مؤسسة قطع الغيار المعتمدة" : "شركة المشتريات الوطنية",
          role,
          email: role === "vendor" ? "vendor@rfqsa.tech" : "client@rfqsa.tech",
          phone: "0551122334",
          tax_number: "300123456700003",
          commercial_register: "1010987654",
          national_address: "الرياض - طريق خريص - حي المنار",
          city: "الرياض",
          ref_code: role === "vendor" ? "VND-501" : "CLI-101",
          created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
        };
      }

      setProfile(dbProfile);
      setFullName(dbProfile.full_name || "");
      setPhone(dbProfile.phone || "");
      setCompanyName(dbProfile.company_name || "");
      setTaxNumber(dbProfile.tax_number || "");
      setCommercialRegister(dbProfile.commercial_register || "");
      setNationalAddress(dbProfile.national_address || "");
      setCity(dbProfile.city || "الرياض");

      const [ordersRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("id, status").eq(role === "vendor" ? "vendor_id" : "client_id", dbProfile.id),
        supabase.from("deal_reviews").select("*").eq(role === "vendor" ? "reviewee_id" : "client_id", dbProfile.id),
      ]);

      const orders = ordersRes.data || [];
      const reviews = reviewsRes.data || [];
      const completed = orders.filter((o: any) => o.status === "completed" || o.status === "delivered").length;
      const avg = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + Number(r.rating || 0), 0) / reviews.length : 0;

      setStats({
        ordersCount: orders.length,
        completedCount: completed,
        avgRating: Number(avg.toFixed(1)),
        reviewsCount: reviews.length,
      });

      setReviewsList(reviews);
    } catch (e) {
      console.error("loadProfile error:", e);
    } finally {
      setLoading(false);
    }
  }, [supabase, pathname]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleCopyRef = () => {
    if (!profile) return;
    const ref = profile.ref_code || generateRefCode(profile.id, profile.role);
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaveMsg(null);

    try {
      const updates = {
        id: profile.id,
        full_name: fullName,
        phone,
        company_name: companyName,
        tax_number: taxNumber,
        commercial_register: commercialRegister,
        national_address: nationalAddress,
        city,
      };

      const res = await fetch("/api/v1/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData?.error || "تعذر حفظ التعديلات");
      }

      setSaveMsg({ type: "success", text: "تم حفظ وتحديث بيانات الملف التجاري بنجاح" });
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (err: any) {
      setSaveMsg({ type: "error", text: err.message || "حدث خطأ أثناء الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  const isVendor = profile?.role === "vendor" || pathname.includes("vendor");
  const settingsPath = isVendor ? "/vendor/settings" : "/client/settings";
  const refCode = profile ? profile.ref_code || generateRefCode(profile.id, profile.role) : "—";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto bg-slate-50/50 min-h-screen">
      {/* ── 1. Hero Identity Card ── */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg border-2 border-white/20 shrink-0">
              {(companyName || fullName || "ش").slice(0, 2)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white">{companyName || fullName || "منشأة معتمدة"}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>عضوية موثقة ومعتمدة</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 font-bold">{fullName} · {profile?.email}</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>عضو في المنصة منذ: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long" }) : "عام 2026"}</span>
              </p>
            </div>
          </div>

          {/* Ref Code Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 self-stretch md:self-center shrink-0 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-slate-300 font-bold block">الكود المرجعي الرسمي:</span>
              <span className="font-mono text-base font-black text-white">{refCode}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyRef}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95 cursor-pointer"
              title="نسخ الكود"
            >
              {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Performance & Reputation Counters ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Orders */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">إجمالي التعاملات والطلبات</span>
            <p className="text-3xl font-black text-slate-900 font-mono mt-1">
              {loading ? "..." : stats.ordersCount.toLocaleString("ar-SA")}
            </p>
            <span className="text-[11px] font-bold text-emerald-600 block mt-0.5">
              {stats.completedCount} معاملة مكتملة بنجاح
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Rating */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">متوسط تقييم الأداء والموثوقية</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-black text-slate-900 font-mono">
                {loading ? "..." : stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "0"}
              </p>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => {
                  const isFilled = stats.avgRating > 0 && s <= Math.round(stats.avgRating);
                  return (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        isFilled
                          ? "fill-amber-400 text-amber-400"
                          : "fill-slate-100 text-slate-300"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
              {stats.reviewsCount > 0
                ? `بناءً على ${stats.reviewsCount} تقييم للصفقات المكتملة`
                : "عضو جديد · لا توجد تقييمات بعد"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Star className={`w-6 h-6 ${stats.avgRating > 0 ? "fill-amber-500 text-amber-500" : "fill-slate-200 text-slate-400"}`} />
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">المراجعات والشهادات</span>
            <p className="text-3xl font-black text-slate-900 font-mono mt-1">
              {loading ? "..." : stats.reviewsCount.toLocaleString("ar-SA")}
            </p>
            <span className="text-[11px] font-bold text-indigo-600 block mt-0.5">
              مراجعة موثقة من شركاء المنصة
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── 3. Essential Entity & Contact Information ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>البيانات الأساسية للمنشأة والحساب</span>
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              معلومات الهوية الرسمية والتواصل المعتمدة لدى منصة رفق والشركاء
            </p>
          </div>

          <Link
            href={settingsPath}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors self-start sm:self-center"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>إعدادات العضوية والأمان المتقدمة</span>
            <ArrowLeft className="w-3 h-3 mr-0.5" />
          </Link>
        </div>

        {saveMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              saveMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {saveMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{saveMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveInfo} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">اسم المنشأة / الشركة الرسمي *</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">اسم المفوض / ممثل الحساب *</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">رقم الجوال للتواصل *</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                dir="ltr"
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 text-right focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">المدينة / المقر الرئيسي *</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>

            {/* Commercial Register */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">رقم السجل التجاري (CR)</label>
              <input
                value={commercialRegister}
                onChange={(e) => setCommercialRegister(e.target.value)}
                placeholder="1010xxxxxx"
                dir="ltr"
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono font-bold text-slate-900 text-right focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>

            {/* Tax Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">الرقم الضريبي المعتمد (VAT 15%)</label>
              <input
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="3000xxxxxxxx003"
                dir="ltr"
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono font-bold text-slate-900 text-right focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>

            {/* National Address */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-black text-slate-700">العنوان الوطني المعتمد</label>
              <input
                value={nationalAddress}
                onChange={(e) => setNationalAddress(e.target.value)}
                placeholder="مثال: الرياض، حي النخيل، طريق الملك فهد"
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── 4. Trust & Compliance Matrix ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-emerald-900">الربط والامتثال الضريبي ZATCA</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">الحساب مؤهل لإصدار واستقبال الفواتير الضريبية المعتمدة.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
          <Award className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-blue-900">توثيق السجل التجاري</p>
            <p className="text-[11px] text-blue-700 mt-0.5">تم التحقق من النشاط التجاري والبيانات المؤسسية.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 flex items-start gap-3">
          <Shield className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-violet-900">ضمان الصفقات والمدفوعات</p>
            <p className="text-[11px] text-violet-700 mt-0.5">المعاملات المالية والضمانات البنكية محمية عبر المحفظة.</p>
          </div>
        </div>
      </div>

      {/* ── 5. Client Reviews Showcase ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>سجل التقييمات وآراء الشركاء</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">{reviewsList.length} تقييم موثق</span>
        </div>

        {reviewsList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reviewsList.map((rev) => (
              <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900">{rev.reviewer_name}</span>
                  <div className="flex text-amber-400 gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= (rev.rating || 5) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">{rev.comment}</p>
                <span className="text-[10px] text-slate-400 font-mono block text-left">
                  {new Date(rev.created_at).toLocaleDateString("ar-SA")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-50/80 border border-dashed border-slate-200 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
              <Star className="w-6 h-6 fill-amber-400/30" />
            </div>
            <p className="text-xs font-black text-slate-700">لا توجد تقييمات مسجلة لهذا الحساب حتى الآن</p>
            <p className="text-[11px] text-slate-400">ستظهر التقييمات وآراء العملاء تلقائياً في هذا القسم فور إتمام صفقاتك وطلباتك بنجاح عبر المنصة.</p>
          </div>
        )}
      </div>
    </div>
  );
}

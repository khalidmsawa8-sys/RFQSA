"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, User, ShoppingBag, FileText, Wallet,
  Star, Phone, Building2, MapPin, Save, RefreshCw,
  AlertCircle, CheckCircle2, Key, Lock, Sparkles, ShieldCheck, Check,
  UserCheck, UserX, Plus, Minus, ArrowUpCircle, ArrowDownCircle,
  Clock, Download, Eye, ExternalLink, Calendar, Hash, Receipt, X
} from "lucide-react";
import { RoleId } from "@/lib/rbac/permissions";
import { InvoicePDFExport } from "@/components/invoice-pdf-export";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  ref_code: string;
  phone: string;
  company_name: string;
  email?: string;
  tax_number: string;
  commercial_register: string;
  national_address: string;
  created_at: string;
  is_admin: boolean;
  admin_role?: string;
  is_active?: boolean;
}

type TabKey = "profile" | "orders" | "invoices" | "wallet";
type Msg = { type: "success" | "error"; text: string };

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed: { label: "تأكيد واستلام", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  active: { label: "نشط", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "تم التجهيز", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  preparing: { label: "تم التجهيز", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  processing: { label: "تم التجهيز", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ready: { label: "تم التجهيز", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  shipped: { label: "تم الشحن", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  delivered: { label: "جاري التسليم", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "ملغي", cls: "bg-red-50 text-red-700 border-red-200" },
  paid: { label: "مدفوعة", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "معلقة", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  issued: { label: "صادرة", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  open: { label: "مفتوح", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  quoted: { label: "تم التسعير", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  closed: { label: "مغلق", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Main Data States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [balance, setBalance] = useState<number>(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Save State
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg | null>(null);

  // Password Management State
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<Msg | null>(null);

  // RBAC Role State
  const [selectedRole, setSelectedRole] = useState<RoleId>("client_owner");
  const [savingRole, setSavingRole] = useState(false);
  const [roleMsg, setRoleMsg] = useState<Msg | null>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  // Wallet Credit / Debit Modal State
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletActionType, setWalletActionType] = useState<"credit" | "debit">("credit");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletDesc, setWalletDesc] = useState("");
  const [walletRef, setWalletRef] = useState("");
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletError, setWalletError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setForm(data.profile);
        setBalance(data.balance || 0);
        setSelectedRole(data.role || (data.profile.role === "vendor" ? "vendor_owner" : "client_owner"));
        setOrders(data.orders || []);
        setRfqs(data.rfqs || []);
        setInvoices(data.invoices || []);
        setWalletTransactions(data.walletTransactions || []);
      }
    } catch (e) {
      console.error("Failed to load user details:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (typeof document !== "undefined" && !document.cookie.includes("rfq_session=admin")) {
      document.cookie = "rfq_session=admin; path=/; max-age=86400; SameSite=Lax";
    }
    loadData();

    // Fetch dynamic roles
    fetch("/api/v1/admin/roles")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.roles)) {
          setAvailableRoles(d.roles);
        }
      })
      .catch(() => {});
  }, [loadData]);

  // ── 1. Save Profile Data ──
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل حفظ البيانات");
      setProfileMsg({ type: "success", text: "تم حفظ وتحديث بيانات الملف بنجاح" });
      loadData();
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── 2. Update Password ──
  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "كلمة المرور يجب أن تكون 6 خانات على الأقل" });
      return;
    }
    setUpdatingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل تغيير كلمة المرور");
      setPasswordMsg({ type: "success", text: "تم تحديث كلمة المرور للمستخدم بنجاح!" });
      setNewPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  // ── 3. Save Role Assignment ──
  const handleSaveRole = async () => {
    setSavingRole(true);
    setRoleMsg(null);
    try {
      const res = await fetch("/api/v1/admin/assign-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          roleId: selectedRole,
          organizationId: (profile as any)?.organization_id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل إسناد الدور");

      // Sync browser localStorage if present
      if (typeof window !== "undefined") {
        try {
          const storedProf = localStorage.getItem("rfq_demo_profiles");
          if (storedProf) {
            const list = JSON.parse(storedProf);
            const idx = list.findIndex((p: any) => p.id === userId);
            if (idx !== -1) {
              list[idx].role_id = selectedRole;
              list[idx].custom_role = selectedRole;
              localStorage.setItem("rfq_demo_profiles", JSON.stringify(list));
            }
          }
        } catch (e) {}
      }

      setRoleMsg({ type: "success", text: `تم تحديث الدور والصلاحيات بنجاح إلى: [${selectedRole}]` });
      await loadData();
    } catch (err: any) {
      setRoleMsg({ type: "error", text: err.message });
    } finally {
      setSavingRole(false);
    }
  };

  // ── 4. Wallet Adjustment (Credit / Debit) ──
  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(walletAmount);
    if (!amt || amt <= 0) {
      setWalletError("المبلغ يجب أن يكون رقماً موجباً أكبر من الصفر");
      return;
    }
    if (!walletDesc.trim()) {
      setWalletError("يرجى كتابة بيان وسبب العملية المالية");
      return;
    }

    setWalletSubmitting(true);
    setWalletError("");

    try {
      if (typeof document !== "undefined" && !document.cookie.includes("rfq_session=admin")) {
        document.cookie = "rfq_session=admin; path=/; max-age=86400; SameSite=Lax";
      }

      const res = await fetch("/api/v1/admin/wallet/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        credentials: "include",
        body: JSON.stringify({
          userId,
          type: walletActionType,
          amount: amt,
          description: walletDesc.trim(),
          reference: walletRef.trim() || undefined,
          idempotencyKey: `ADJ-${userId.slice(0, 4)}-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل تنفيذ العملية المالية");

      setWalletModalOpen(false);
      setWalletAmount("");
      setWalletDesc("");
      setWalletRef("");
      loadData();
    } catch (err: any) {
      setWalletError(err.message);
    } finally {
      setWalletSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-bold">جاري تحميل بيانات المستخدم والتبويبات المرتبطة...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold">لم يُعثر على المستخدم المطلوب</div>
    );
  }

  const isClient = profile.role === "client";
  const isActive = profile.is_active !== false;

  return (
    <div className="p-6 md:p-8 space-y-6 w-full" dir="rtl">
      
      {/* ── 1. Top Navigation & User Header ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link href="/admin/users" className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
            {(profile.full_name || "م").slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">{profile.full_name || "مستخدم"}</h1>
              <span className="font-mono text-xs font-black bg-slate-100 px-2.5 py-0.5 rounded-xl text-slate-700 border border-slate-200">
                {profile.ref_code || "—"}
              </span>
              {(profile.is_admin || profile.role === "admin") && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-black border border-purple-200 shadow-xs">
                  إدارة المنصة (Staff) 🛡️
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span>{profile.company_name || (isClient ? "حساب عميل B2B" : "حساب متجر مورد")}</span>
              <span>·</span>
              <span>جوال: <span dir="ltr" className="font-mono text-slate-700 font-bold">{profile.phone || "—"}</span></span>
              {profile.email && (
                <>
                  <span>·</span>
                  <span>بريد: <span dir="ltr" className="font-mono text-blue-600 font-bold">{profile.email}</span></span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Account Status Badge */}
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black border ${
              isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {isActive ? "حساب نشط ومفعل" : "حساب معطل وموقوف"}
          </span>

          <button onClick={loadData} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. Top Tabs Switcher ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-black">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "profile"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <User className="w-4 h-4" />
          <span>البيانات الشخصية والمنشأة</span>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "orders"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>الطلبات وRFQs</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
            {orders.length + rfqs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "invoices"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>الفواتير الضريبية</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("wallet")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "wallet"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>المحفظة والحركات المالية</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono">
            {balance.toLocaleString()} ر.س
          </span>
        </button>
      </div>

      {/* ── 3. Tab Contents ── */}

      {/* ── TAB 1: Personal Profile & Security ── */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Info Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h2 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>معلومات الملف والمؤسسة</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-600 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    value={form.full_name || ""}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    value={form.phone || ""}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 text-left font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">البريد الإلكتروني للعضو</label>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 text-left font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">نوع الحساب الأساسي</label>
                  <select
                    value={form.role || "client"}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setForm((f) => ({
                        ...f,
                        role: newRole,
                        is_admin: newRole === "admin",
                      }));
                    }}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900"
                  >
                    <option value="admin">فريق المنصة (Staff)</option>
                    <option value="client">عميل B2B (مشتريات)</option>
                    <option value="vendor">مورد B2B (قطع غيار)</option>
                    <option value="courier">مندوب توصيل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">اسم المنشأة / الورشة / المتجر</label>
                  <input
                    type="text"
                    value={form.company_name || ""}
                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">الرقم الضريبي (VAT)</label>
                  <input
                    type="text"
                    value={form.tax_number || ""}
                    onChange={(e) => setForm((f) => ({ ...f, tax_number: e.target.value }))}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">السجل التجاري (CR)</label>
                  <input
                    type="text"
                    value={form.commercial_register || ""}
                    onChange={(e) => setForm((f) => ({ ...f, commercial_register: e.target.value }))}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-left"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 mb-1">العنوان الوطني والتفصيلي</label>
                  <input
                    type="text"
                    value={form.national_address || ""}
                    onChange={(e) => setForm((f) => ({ ...f, national_address: e.target.value }))}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
              </div>

              {profileMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${profileMsg.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                  {profileMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ التعديلات على البيانات</span>
              </button>
            </div>
          </div>

          {/* Security & RBAC Side Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Password Reset */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h2 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>تعيين كلمة المرور (Password Reset)</span>
              </h2>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة..."
                    className="flex-1 h-10 px-3.5 border border-slate-200 rounded-xl font-mono text-left bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>توليد 🎲</span>
                  </button>
                </div>

                {passwordMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${passwordMsg.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={updatingPassword || !newPassword}
                  className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {updatingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>تعيين وحفظ كلمة المرور الجديدة 🔐</span>
                </button>
              </div>
            </div>

            {/* Role & Permissions (RBAC) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h2 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>الدور الوظيفي والصلاحيات (RBAC)</span>
              </h2>
              <div className="space-y-3 text-xs font-bold">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as RoleId)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                >
                  <optgroup label="── فريق المنصة (Staff) ──">
                    {availableRoles.filter((r) => r.scope === "platform").length > 0 ? (
                      availableRoles.filter((r) => r.scope === "platform").map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name_ar} {!r.is_system ? "✨ (مخصص)" : ""}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="platform_super_admin">المدير العام (Super Admin)</option>
                        <option value="platform_rfq_monitor">مراقب طلبات التسعير والعمليات</option>
                        <option value="platform_accountant">المحاسب المالي العام</option>
                        <option value="platform_compliance">مسؤول التوثيق والامتثال</option>
                        <option value="platform_support">خدمة العملاء والنزاعات</option>
                      </>
                    )}
                  </optgroup>
                  <optgroup label="── منشآت العملاء ──">
                    {availableRoles.filter((r) => r.scope === "client").length > 0 ? (
                      availableRoles.filter((r) => r.scope === "client").map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name_ar} {!r.is_system ? "✨ (مخصص)" : ""}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="client_owner">مالك المنشأة / المدير العام</option>
                        <option value="client_procurement_manager">مدير المشتريات</option>
                        <option value="client_rfq_supervisor">مراقب طلبات التسعير والنشاط</option>
                        <option value="client_accountant">محاسب المنشأة</option>
                        <option value="client_technician">فني الورشة / طالب القطع</option>
                      </>
                    )}
                  </optgroup>
                  <optgroup label="── متاجر الموردين ──">
                    {availableRoles.filter((r) => r.scope === "vendor").length > 0 ? (
                      availableRoles.filter((r) => r.scope === "vendor").map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name_ar} {!r.is_system ? "✨ (مخصص)" : ""}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="vendor_owner">مالك المتجر / المعرض</option>
                        <option value="vendor_sales_agent">مسؤول التسعير والمبيعات</option>
                        <option value="vendor_warehouse_clerk">أمين المستودع والتجهيز</option>
                        <option value="vendor_accountant">محاسب مبيعات المتجر</option>
                      </>
                    )}
                  </optgroup>
                </select>

                {roleMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{roleMsg.text}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveRole}
                  disabled={savingRole}
                  className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingRole ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>تحديث واعتماد الدور الوظيفي</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Orders & RFQs ── */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span>سجل الطلبات المرتبطة بالمستخدم ({orders.length} طلب)</span>
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold">لا توجد طلبات مسجلة لهذا المستخدم</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 text-[11px]">
                    <th className="py-3 px-4">رقم الطلب</th>
                    <th className="py-3 px-4">الطرف المقابل</th>
                    <th className="py-3 px-4">المركبة</th>
                    <th className="py-3 px-4 text-center">المبلغ</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-center">التاريخ</th>
                    <th className="py-3 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const st = STATUS_MAP[o.status] || { label: o.status, cls: "bg-slate-100 text-slate-600" };
                    const otherParty = isClient ? o.vendor : o.client;
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {otherParty?.company_name || otherParty?.full_name || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {o.rfq ? `${o.rfq.car_make} ${o.rfq.car_model} ${o.rfq.car_year}` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono">
                          {Number(o.total_price || 0).toLocaleString("ar-SA")} ر.س
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          {new Date(o.created_at).toLocaleDateString("ar-SA")}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Link
                            href={`/deal/${o.id}`}
                            target="_blank"
                            className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <span>فتح الصفقة</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Invoices ── */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>الفواتير الضريبية ({invoices.length} فاتورة)</span>
            </h2>
          </div>

          {invoices.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold">لا توجد فواتير مسجلة لهذا المستخدم</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 text-[11px]">
                    <th className="py-3 px-4">رقم الفاتورة</th>
                    <th className="py-3 px-4 text-center">المبلغ قبل الضريبة</th>
                    <th className="py-3 px-4 text-center">الضريبة 15%</th>
                    <th className="py-3 px-4 text-center">الإجمالي الكلي</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-center">تاريخ الإصدار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const st = STATUS_MAP[inv.status] || { label: inv.status, cls: "bg-slate-100 text-slate-600" };
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {inv.invoice_number || `#${inv.id.slice(0, 8)}`}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                          {Number(inv.subtotal || 0).toLocaleString("ar-SA")} ر.س
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                          {Number(inv.tax_amount || 0).toLocaleString("ar-SA")} ر.س
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-700">
                          {Number(inv.total_amount || 0).toLocaleString("ar-SA")} ر.س
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          {new Date(inv.issued_at).toLocaleDateString("ar-SA")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Wallet & Transactions ── */}
      {activeTab === "wallet" && (
        <div className="space-y-6">
          {/* Balance & Quick Adjust Actions Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shadow-md">
              <div>
                <p className="text-xs text-slate-400 font-bold">الرصيد المالي الحالي للمستخدم</p>
                <p className="text-3xl sm:text-4xl font-black font-mono mt-1 text-emerald-400">
                  {balance.toLocaleString("ar-SA")} <span className="text-sm font-sans text-white">ر.س</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">كافة الحركات المالية مقيدة بنظام القيد المزدوج الآمن</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
                <Wallet className="w-7 h-7" />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col justify-center gap-2.5 shadow-xs">
              <p className="text-xs font-bold text-slate-600 mb-1">العمليات اليدوية للمشرف</p>
              <button
                type="button"
                onClick={() => {
                  setWalletActionType("credit");
                  setWalletModalOpen(true);
                  setWalletError("");
                }}
                className="w-full h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center gap-2 border border-emerald-200 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إيداع رصيد (+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWalletActionType("debit");
                  setWalletModalOpen(true);
                  setWalletError("");
                }}
                className="w-full h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 text-xs font-black flex items-center justify-center gap-2 border border-red-200 transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
                <span>خصم رصيد (-)</span>
              </button>
            </div>
          </div>

          {/* Wallet Ledger Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>كشف حركات المحفظة ({walletTransactions.length} حركة)</span>
            </h2>

            {walletTransactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-bold">لا توجد حركات مالية مسجلة في المحفظة</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 text-[11px]">
                      <th className="py-3 px-4">نوع الحركة</th>
                      <th className="py-3 px-4">البيان وسبب العملية</th>
                      <th className="py-3 px-4 text-center">الرقم المرجعي / الفاتورة</th>
                      <th className="py-3 px-4 text-center">المبلغ</th>
                      <th className="py-3 px-4 text-center">الرصيد بعد الحركة</th>
                      <th className="py-3 px-4 text-center">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {walletTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black border ${
                              tx.type === "credit"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {tx.type === "credit" ? <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDownCircle className="w-3.5 h-3.5 text-red-600" />}
                            <span>{tx.type === "credit" ? "دائن (+)" : "مدين (-)"}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{tx.description || "حركة رصيد"}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-500">{tx.reference || "—"}</td>
                        <td className={`py-3.5 px-4 text-center font-mono font-black ${tx.type === "credit" ? "text-emerald-700" : "text-red-700"}`}>
                          {tx.type === "credit" ? "+" : "-"}{Number(tx.amount || 0).toLocaleString("ar-SA")} ر.س
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                          {Number(tx.balance_after || 0).toLocaleString("ar-SA")} ر.س
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          {new Date(tx.created_at).toLocaleString("ar-SA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Wallet Adjustment Modal ── */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-right animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {walletActionType === "credit" ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowUpCircle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <ArrowDownCircle className="w-5 h-5" />
                  </div>
                )}
                <h3 className="font-black text-sm text-slate-900">
                  {walletActionType === "credit" ? "إيداع رصيد مالي (+)" : "سحب / خصم رصيد مالي (-)"}
                </h3>
              </div>
              <button onClick={() => setWalletModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWalletSubmit} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">المبلغ بالريال السعودي (SAR) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-sm font-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">البيان وسبب العملية *</label>
                <input
                  type="text"
                  required
                  value={walletDesc}
                  onChange={(e) => setWalletDesc(e.target.value)}
                  placeholder="مثال: تسوية رصيد بنكي أو شحن محفظة..."
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">رقم الفاتورة / الرقم المرجعي (اختياري)</label>
                <input
                  type="text"
                  value={walletRef}
                  onChange={(e) => setWalletRef(e.target.value)}
                  placeholder="مثال: INV-10023 أو REF-889"
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-slate-50 font-mono"
                />
              </div>

              {walletError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs">
                  {walletError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={walletSubmitting}
                  className={`px-5 py-2 rounded-xl text-white font-black shadow-sm disabled:opacity-50 ${
                    walletActionType === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {walletSubmitting ? "جاري المعالجة..." : walletActionType === "credit" ? "تأكيد الإيداع" : "تأكيد الخصم"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

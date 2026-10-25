"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, RefreshCw, Users, Download, ChevronRight,
  Plus, UserPlus, Shield, Phone, Mail, Building2,
  Trash2, AlertTriangle, CheckCircle2, AlertCircle, X,
  UserCheck, UserX, Bike, Store, ShoppingBag, SlidersHorizontal, Check
} from "lucide-react";

import { ROLE_DISPLAY_NAMES_AR } from "@/lib/rbac/navigation-guard";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  role_id?: string;
  custom_role?: any;
  ref_code: string;
  phone: string;
  email?: string;
  company_name: string;
  tax_number: string;
  commercial_register: string;
  national_address: string;
  created_at: string;
  is_admin: boolean;
  admin_role?: string;
  is_active?: boolean;
}

export const AVAILABLE_COLUMNS = [
  { id: "ref_code", label: "الرقم المرجعي", desc: "ADM-xxx / CUST-xxx / SUP-xxx" },
  { id: "name_company", label: "الاسم / المنشأة", desc: "اسم العضو والمنشأة التابعة" },
  { id: "role", label: "نوع الحساب", desc: "فريق المنصة / عميل / مورد / مندوب" },
  { id: "email", label: "البريد الإلكتروني", desc: "البريد الرسمي للتواصل والدخول" },
  { id: "phone", label: "رقم الجوال", desc: "رقم الاتصال المعتمد" },
  { id: "tax_cr", label: "الرقم الضريبي / السجل", desc: "الرقم الضريبي المضاف والسجل التجاري" },
  { id: "status", label: "الحالة", desc: "حالة الحساب نشط أو معطل" },
  { id: "created_at", label: "تاريخ التسجيل", desc: "تاريخ تسجيل العضوية" },
  { id: "actions", label: "الإجراءات", desc: "أزرار التفاصيل والتعطيل والحذف" },
] as const;

export type ColumnKey = typeof AVAILABLE_COLUMNS[number]["id"];

export const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  ref_code: true,
  name_company: true,
  role: true,
  email: true,
  phone: true,
  tax_cr: true,
  status: true,
  created_at: true,
  actions: true,
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "client" | "vendor" | "courier">("all");

  // Create User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [createForm, setCreateForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    role: "client",
    company_name: "",
    tax_number: "",
    commercial_register: "",
    national_address: "",
  });

  // Deactivate Modal State
  const [suspendModalUser, setSuspendModalUser] = useState<Profile | null>(null);
  const [suspending, setSuspending] = useState(false);

  // Delete Member Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Column Customization State with LocalStorage Persistence
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rfq_admin_users_columns_v2");
      if (saved) {
        setVisibleColumns({ ...DEFAULT_COLUMNS, ...JSON.parse(saved) });
      }
    } catch (e) {}
  }, []);

  const toggleColumn = (colId: ColumnKey) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [colId]: !prev[colId] };
      try {
        localStorage.setItem("rfq_admin_users_columns_v2", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const selectAllColumns = () => {
    const allTrue = AVAILABLE_COLUMNS.reduce(
      (acc, col) => ({ ...acc, [col.id]: true }),
      {} as Record<ColumnKey, boolean>
    );
    setVisibleColumns(allTrue);
    try {
      localStorage.setItem("rfq_admin_users_columns_v2", JSON.stringify(allTrue));
    } catch (e) {}
  };

  const resetColumnsDefault = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
    try {
      localStorage.setItem("rfq_admin_users_columns_v2", JSON.stringify(DEFAULT_COLUMNS));
    } catch (e) {}
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setProfiles(data.users);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = profiles.filter((p) => {
    const matchRole =
      roleFilter === "all" ||
      (roleFilter === "admin" ? (p.is_admin || p.role === "admin") : (!p.is_admin && p.role === roleFilter));
    if (!matchRole) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [
      p.full_name,
      p.email,
      p.company_name,
      p.phone,
      p.ref_code,
      p.tax_number,
      p.commercial_register,
      p.role_id,
      p.custom_role?.name_ar,
    ].some((v) => v?.toLowerCase().includes(q));
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.full_name.trim()) {
      setCreateMsg({ type: "error", text: "يرجى إدخال الاسم الكامل" });
      return;
    }
    if (!createForm.phone.trim() && !createForm.email.trim()) {
      setCreateMsg({ type: "error", text: "يرجى إدخال رقم الجوال أو البريد الإلكتروني" });
      return;
    }

    setCreating(true);
    setCreateMsg(null);

    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل إنشاء المستخدم");
      }

      setCreateMsg({ type: "success", text: `تم إنشاء المستخدم بنجاح بالرقم المرجعي: [${data.user?.ref_code}]` });
      setTimeout(() => {
        setCreateModalOpen(false);
        setCreateForm({
          full_name: "",
          phone: "",
          email: "",
          password: "",
          role: "client",
          company_name: "",
          tax_number: "",
          commercial_register: "",
          national_address: "",
        });
        setCreateMsg(null);
        load();
      }, 1200);
    } catch (err: any) {
      setCreateMsg({ type: "error", text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!suspendModalUser) return;
    setSuspending(true);
    try {
      const isCurrentlyActive = suspendModalUser.is_active !== false;
      const res = await fetch(`/api/v1/admin/users/${suspendModalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isCurrentlyActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تحديث حالة الحساب");
      }
      setSuspendModalUser(null);
      load();
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء تغيير حالة الحساب");
    } finally {
      setSuspending(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteModalUser) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/users/${deleteModalUser.id}?permanent=true`, {
        method: "DELETE",
        headers: { "x-admin-request": "true" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل حذف المستخدم");
      }
      setProfiles((prev) => prev.filter((p) => p.id !== deleteModalUser.id));
      setDeleteModalUser(null);
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء حذف المستخدم");
    } finally {
      setDeleting(false);
    }
  };

  const formatArabicDate = (dateStr?: string) => {
    if (!dateStr) return "2026/08/01";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "2026/08/01" : d.toLocaleDateString("ar-SA");
  };

  const exportExcel = () => {
    const header = [
      "الرقم المرجعي",
      "الاسم الكامل",
      "البريد الإلكتروني",
      "اسم المنشأة",
      "الدور",
      "رقم الجوال",
      "الرقم الضريبي",
      "السجل التجاري",
      "العنوان الوطني",
      "حالة الحساب",
      "تاريخ التسجيل",
    ];
    const rows = filtered.map((p) => [
      p.ref_code || (p.is_admin || p.role === "admin" ? "ADM-001" : "—"),
      p.full_name || "",
      p.email || "",
      p.company_name || "",
      p.is_admin || p.role === "admin"
        ? "إدارة المنصة (Staff)"
        : p.role === "client"
        ? "عميل مشتريات B2B"
        : p.role === "vendor"
        ? "مورد قطع غيار"
        : "مندوب توصيل",
      p.phone || "",
      p.tax_number || "",
      p.commercial_register || "",
      p.national_address || "",
      p.is_active === false ? "معطل / معلق" : "نشط",
      formatArabicDate(p.created_at),
    ]);

    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })),
      download: `users_export_${Date.now()}.csv`,
    });
    a.click();
  };

  const staffCount = profiles.filter((p) => p.is_admin || p.role === "admin").length;
  const clientsCount = profiles.filter((p) => !p.is_admin && p.role === "client").length;
  const vendorsCount = profiles.filter((p) => !p.is_admin && p.role === "vendor").length;
  const couriersCount = profiles.filter((p) => !p.is_admin && p.role === "courier").length;
  const hiddenColumnsCount = AVAILABLE_COLUMNS.length - Object.values(visibleColumns).filter(Boolean).length;

  return (
    <div className="p-6 md:p-8 space-y-6 w-full" dir="rtl">
      
      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">إدارة المستخدمين</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            إضافة وتعديل بيانات العملاء والموردين والمناديب وإدارة الأدوار والصلاحيات
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:scale-102"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-emerald-200 bg-white text-emerald-700 text-xs font-black hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {[
          { label: "إجمالي الحسابات", value: profiles.length, icon: Users, color: "bg-slate-50 border-slate-200 text-slate-900" },
          { label: "فريق المنصة", value: staffCount, icon: Shield, color: "bg-purple-50/70 border-purple-200 text-purple-700" },
          { label: "عملاء B2B", value: clientsCount, icon: ShoppingBag, color: "bg-blue-50/70 border-blue-200 text-blue-700" },
          { label: "موردو قطع الغيار", value: vendorsCount, icon: Store, color: "bg-emerald-50/70 border-emerald-200 text-emerald-700" },
          { label: "مناديب التوصيل", value: couriersCount, icon: Bike, color: "bg-amber-50/70 border-amber-200 text-amber-700" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`rounded-3xl border p-4 sm:p-5 shadow-xs ${c.color} bg-white flex items-center justify-between`}>
              <div>
                <p className="text-xs text-slate-500 font-bold">{c.label}</p>
                <p className="text-2xl font-black font-mono mt-1 text-slate-900">{c.value}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. Filters, Role Tabs & Column Customization ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، الرقم المرجعي (ADM-xxx / CUST-xxxxx / SUP-xxxxx)، رقم الجوال، أو السجل التجاري..."
            className="w-full h-10 pr-10 pl-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex gap-1 bg-slate-100/90 rounded-xl p-1 text-xs font-bold overflow-x-auto">
            {(["all", "admin", "client", "vendor", "courier"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                  roleFilter === r ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r === "all" ? "كافة المستخدمين" : r === "admin" ? "فريق المنصة" : r === "client" ? "العملاء" : r === "vendor" ? "الموردون" : "المناديب"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setColumnModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black transition-all shadow-xs shrink-0 cursor-pointer"
            title="تخصيص وإظهار/إخفاء أعمدة الجدول"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
            <span>تخصيص الأعمدة</span>
            {hiddenColumnsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-mono flex items-center justify-center font-bold">
                {hiddenColumnsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── 4. Users Table (Zero Horizontal Scrollbar & Ultra-Clean Compact Layout) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full text-right border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                {visibleColumns.ref_code && <th className="py-2.5 px-2 w-[80px]">الرقم المرجعي</th>}
                {visibleColumns.name_company && <th className="py-2.5 px-2">الاسم / المنشأة</th>}
                {visibleColumns.role && <th className="py-2.5 px-1.5 text-center w-[100px]">نوع الحساب</th>}
                {visibleColumns.email && <th className="py-2.5 px-1.5 text-center w-[135px]">البريد الإلكتروني</th>}
                {visibleColumns.phone && <th className="py-2.5 px-1.5 text-center w-[85px]">رقم الجوال</th>}
                {visibleColumns.tax_cr && <th className="py-2.5 px-1.5 text-center w-[120px]">الرقم الضريبي / السجل</th>}
                {visibleColumns.status && <th className="py-2.5 px-1 text-center w-[55px]">الحالة</th>}
                {visibleColumns.created_at && <th className="py-2.5 px-1.5 text-center w-[75px]">التاريخ</th>}
                {visibleColumns.actions && <th className="py-2.5 px-1.5 text-center w-[85px]">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length || 1} className="py-3 px-3">
                      <div className="h-3.5 bg-slate-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length || 1} className="py-14 text-center text-slate-400 font-bold">
                    <Users className="w-9 h-9 mb-2 text-slate-200 mx-auto" />
                    <span className="text-xs">لا توجد حسابات مطابقة للبحث</span>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isActive = p.is_active !== false;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Ref Code */}
                      {visibleColumns.ref_code && (
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span className="font-mono text-[10px] font-black bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-700 border border-slate-200">
                            {p.ref_code || (p.is_admin || p.role === "admin" ? "ADM-001" : "—")}
                          </span>
                        </td>
                      )}

                      {/* Name & Company */}
                      {visibleColumns.name_company && (
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-black text-slate-900 text-[11px] truncate max-w-[130px] sm:max-w-[170px]" title={p.full_name}>
                              {p.full_name || "—"}
                            </p>
                            {p.role === "vendor" && p.role_id && p.role_id !== "vendor_owner" && (
                              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                عضو فريق
                              </span>
                            )}
                          </div>
                          {p.company_name ? (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-600 font-medium truncate max-w-[140px] sm:max-w-[180px]" title={`المنشأة: ${p.company_name}`}>
                              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate font-bold text-slate-700">{p.company_name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 block">—</span>
                          )}
                        </td>
                      )}

                      {/* Role Badge */}
                      {visibleColumns.role && (
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          {p.is_admin || p.role === "admin" ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md font-black border bg-purple-50 text-purple-700 border-purple-200 shadow-2xs">
                                <Shield className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                <span>إدارة المنصة</span>
                              </span>
                              {p.custom_role?.name_ar ? (
                                <span className="text-[9px] text-purple-700 font-bold">
                                  {p.custom_role.name_ar}
                                </span>
                              ) : p.role_id ? (
                                <span className="text-[9px] text-slate-400 font-medium">
                                  {ROLE_DISPLAY_NAMES_AR[p.role_id] || p.role_id}
                                </span>
                              ) : (
                                <span className="text-[9px] text-purple-600 font-bold">
                                  المدير العام
                                </span>
                              )}
                            </div>
                          ) : p.role === "client" ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md font-black border bg-blue-50 text-blue-700 border-blue-200">
                                عميل B2B
                              </span>
                              {p.custom_role?.name_ar ? (
                                <span className="text-[9px] text-blue-700 font-bold">
                                  {p.custom_role.name_ar}
                                </span>
                              ) : p.role_id ? (
                                <span className="text-[9px] text-slate-400 font-medium">
                                  {ROLE_DISPLAY_NAMES_AR[p.role_id] || p.role_id}
                                </span>
                              ) : null}
                            </div>
                          ) : p.role === "vendor" ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md font-black border bg-emerald-50 text-emerald-700 border-emerald-200">
                                {p.role_id && p.role_id !== "vendor_owner" ? "مورد (فريق عمل)" : "مورد قطع"}
                              </span>
                              {p.custom_role?.name_ar ? (
                                <span className="text-[9px] text-emerald-700 font-bold">
                                  {p.custom_role.name_ar}
                                </span>
                              ) : p.role_id ? (
                                <span className="text-[9px] text-slate-500 font-bold">
                                  {ROLE_DISPLAY_NAMES_AR[p.role_id] || p.role_id}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md font-black border bg-amber-50 text-amber-700 border-amber-200">
                              مندوب
                            </span>
                          )}
                        </td>
                      )}

                      {/* Email */}
                      {visibleColumns.email && (
                        <td className="py-2.5 px-2 text-center" dir="ltr">
                          {p.email ? (
                            <span className="font-mono text-[10px] text-blue-600 hover:text-blue-800 font-medium truncate max-w-[140px] block mx-auto selection:bg-blue-100" title={p.email}>
                              {p.email}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>
                      )}

                      {/* Phone */}
                      {visibleColumns.phone && (
                        <td className="py-2.5 px-2 text-center font-mono text-[10px] font-bold text-slate-700 whitespace-nowrap" dir="ltr">
                          {p.phone || "—"}
                        </td>
                      )}

                      {/* Tax / CR (FIXED & COMPACT) */}
                      {visibleColumns.tax_cr && (
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            {p.tax_number && (
                              <div className="inline-flex items-center gap-1 font-mono text-[9px] text-slate-800 font-semibold bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/80 whitespace-nowrap" title="الرقم الضريبي (VAT)">
                                <span className="text-[8px] font-sans px-1 rounded bg-amber-200/80 text-amber-900 font-black">ضريبي</span>
                                <span dir="ltr">{p.tax_number}</span>
                              </div>
                            )}
                            {p.commercial_register && (
                              <div className="inline-flex items-center gap-1 font-mono text-slate-800 font-semibold bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200/80 whitespace-nowrap" title="السجل التجاري (CR)">
                                <span className="text-[8px] font-sans px-1 rounded bg-blue-200/80 text-blue-900 font-black">سجل</span>
                                <span dir="ltr">{p.commercial_register}</span>
                              </div>
                            )}
                            {!p.tax_number && !p.commercial_register && (
                              <span className="text-slate-300 font-mono text-[10px]">—</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Account Status */}
                      {visibleColumns.status && (
                        <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> نشط
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[9px] font-bold border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> معطل
                            </span>
                          )}
                        </td>
                      )}

                      {/* Created Date */}
                      {visibleColumns.created_at && (
                        <td className="py-2.5 px-2 text-center text-slate-500 font-mono text-[10px] font-medium whitespace-nowrap">
                          {formatArabicDate(p.created_at)}
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/admin/users/${p.id}`}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-bold text-[10px] flex items-center gap-0.5"
                              title="عرض التفاصيل والتبويبات المرتبطة"
                            >
                              <span>تفاصيل</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => setSuspendModalUser(p)}
                              className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                                isActive
                                  ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50 border-slate-200"
                                  : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                              }`}
                              title={isActive ? "تعطيل الحساب بأمان" : "إعادة تنشيط الحساب"}
                            >
                              {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteModalUser(p)}
                              className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                              title="حذف العضو نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Create User Modal ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-auto text-right animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">إضافة مستخدم جديد</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    توليد رقم مرجعي فريد تلقائياً وتحديد نوع الحساب والصلاحيات
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-bold">
              {/* Role Selection */}
              <div>
                <label className="block text-slate-700 mb-1.5">نوع الحساب والصلاحية الأساسية *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "admin", label: "فريق المنصة", desc: "مشرف وإدارة عامة" },
                    { key: "client", label: "عميل B2B", desc: "مشتريات وطلب تسعير" },
                    { key: "vendor", label: "مورد قطع", desc: "متجر وتسعير الطلبات" },
                    { key: "courier", label: "مندوب توصيل", desc: "أسطول وشحن القطع" },
                  ].map((r) => (
                    <div
                      key={r.key}
                      onClick={() => setCreateForm((f) => ({ ...f, role: r.key }))}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer text-center select-none ${
                        createForm.role === r.key
                          ? "bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 text-blue-900 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-600"
                      }`}
                    >
                      <p className="font-black text-xs">{r.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1.5">الاسم الكامل للمستخدم *</label>
                  <input
                    type="text"
                    required
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="مثال: أحمد عبد الله الشمري"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1.5">رقم الجوال *</label>
                  <input
                    type="tel"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="05xxxxxxxx"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Company & Email & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1.5">اسم المنشأة / الورشة / المتجر</label>
                  <input
                    type="text"
                    value={createForm.company_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, company_name: e.target.value }))}
                    placeholder="مثال: شركة المحركات المتقدمة"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1.5">البريد الإلكتروني (اختياري)</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-700 mb-1.5">
                  كلمة المرور للحساب <span className="text-slate-400 font-normal">(اختياري - في حال تركها فارغة ستكون 123456)</span>
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="•••••• (الافتراضي 123456)"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 text-left"
                  dir="ltr"
                />
              </div>

              {/* Tax & CR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1.5">الرقم الضريبي (VAT)</label>
                  <input
                    type="text"
                    value={createForm.tax_number}
                    onChange={(e) => setCreateForm((f) => ({ ...f, tax_number: e.target.value }))}
                    placeholder="300xxxxxxxxx003"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 text-left"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1.5">السجل التجاري (CR)</label>
                  <input
                    type="text"
                    value={createForm.commercial_register}
                    onChange={(e) => setCreateForm((f) => ({ ...f, commercial_register: e.target.value }))}
                    placeholder="1010xxxxxx"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 text-left"
                  />
                </div>
              </div>

              {/* National Address */}
              <div>
                <label className="block text-slate-700 mb-1.5">العنوان الوطني والتفصيلي</label>
                <input
                  type="text"
                  value={createForm.national_address}
                  onChange={(e) => setCreateForm((f) => ({ ...f, national_address: e.target.value }))}
                  placeholder="الرياض - حي الصناعية القديمة - مبنى 24"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {createMsg && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold ${
                    createMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {createMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span>{createMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>تأكيد وإنشاء المستخدم</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. Safe Suspend / Deactivate Confirmation Modal ── */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-right animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {suspendModalUser.is_active !== false ? "تعطيل حساب المستخدم بأمان" : "إعادة تنشيط الحساب"}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">{suspendModalUser.full_name} ({suspendModalUser.ref_code})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {suspendModalUser.is_active !== false
                ? "سيتم إيقاف صلاحية الدخول للمستخدم فوراً، مع الحفاظ الكامل والتام على كافة السجلات التاريخية للطلبات والفواتير والحركات المالية في قاعدة البيانات (Soft Deactivation)."
                : "سيتم إعادة تفعيل الحساب فوراً وتمكين المستخدم من الدخول واستئناف معاملاته."}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleToggleSuspend}
                disabled={suspending}
                className={`px-5 py-2 rounded-xl text-white text-xs font-black transition-all shadow-sm cursor-pointer ${
                  suspendModalUser.is_active !== false ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {suspending ? "جاري المعالجة..." : suspendModalUser.is_active !== false ? "تأكيد التعطيل الآمن" : "تأكيد إعادة التنشيط"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Permanent Delete Confirmation Modal ── */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-right animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">تأكيد حذف المستخدم نهائياً</h3>
                <p className="text-xs text-slate-500 font-semibold">{deleteModalUser.full_name} ({deleteModalUser.ref_code})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100">
              تحذير: سيتم حذف حساب المستخدم وملفه التعريفي وكافة السجلات التابعة له نهائياً من قاعدة البيانات. لن يتمكن المستخدم من تسجيل الدخول مرة أخرى ولا يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleting ? "جاري الحذف..." : "تأكيد الحذف النهائي"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Column Customization Modal ── */}
      {columnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-right animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">تخصيص أعمدة الجدول</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">تحكم في إظهار أو إخفاء أي عمود حسب رغبتك</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setColumnModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              يتم حفظ تفضيلاتك وتخصيص الأعمدة تلقائياً على هذا المتصفح لتبقى معتمدة دائماً عند تصفحك.
            </p>

            <div className="space-y-2 py-1 max-h-[50vh] overflow-y-auto pr-1">
              {AVAILABLE_COLUMNS.map((col) => {
                const isChecked = visibleColumns[col.id];
                return (
                  <label
                    key={col.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? "bg-blue-50/40 border-blue-200 text-slate-900"
                        : "bg-slate-50/50 border-slate-200/70 text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleColumn(col.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-black">{col.label}</p>
                        <p className="text-[10px] text-slate-500 font-normal">{col.desc}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                        isChecked
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {isChecked ? "ظاهر" : "مخفي"}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <button
                  type="button"
                  onClick={selectAllColumns}
                  className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                >
                  إظهار كافة الأعمدة
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={resetColumnsDefault}
                  className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  إعادة ضبط للافتراضي
                </button>
              </div>

              <button
                type="button"
                onClick={() => setColumnModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                تم، تطبيق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

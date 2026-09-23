"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Shield,
  ShieldAlert,
  Users,
  Key,
  Lock,
  CheckCircle2,
  FileText,
  CreditCard,
  Store,
  RefreshCw,
  Search,
  Sliders,
  ChevronDown,
  Sparkles,
  UserPlus,
  UserCheck,
  Edit,
  Save,
  Check,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  Building2,
  Filter,
  Loader2,
  Plus,
  Copy,
  Trash2,
  Eye,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SystemPermission,
  RoleId,
  RoleScope,
  CustomRoleDefinition,
  ROLE_DEFAULT_PERMISSIONS,
  SENSITIVE_PERMISSIONS,
} from "@/lib/rbac/permissions";
import { RoleBuilderModal } from "@/components/admin/roles/role-builder-modal";
import { RoleMatrixView } from "@/components/admin/roles/role-matrix-view";
import { DeleteRoleDialog } from "@/components/admin/roles/delete-role-dialog";
import { RolePermissionMatrixModal } from "@/components/team/role-permission-matrix-modal";

const supabase = createClient();

interface UserWithRole {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  company_name?: string;
  ref_code?: string;
  is_admin?: boolean;
  admin_role?: string;
  current_role_id: string;
  custom_permissions?: string[];
  explicit_denies?: string[];
  organization_id?: string;
  created_at: string;
}

export default function AdminRolesStudioPage() {
  const [activeTab, setActiveTab] = useState<"studio" | "assignment" | "matrix">("studio");
  const [selectedScope, setSelectedScope] = useState<"all" | "platform" | "client" | "vendor" | "custom">("all");
  const [search, setSearch] = useState("");

  // Data States
  const [roles, setRoles] = useState<CustomRoleDefinition[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick Role Edit State (User ID -> selected Role ID)
  const [selectedRolesMap, setSelectedRolesMap] = useState<Record<string, string>>({});

  // Modal States
  const [builderModal, setBuilderModal] = useState<{
    open: boolean;
    mode: "create" | "edit" | "clone" | "preview";
    role: CustomRoleDefinition | null;
  }>({
    open: false,
    mode: "create",
    role: null,
  });

  const [deleteRole, setDeleteRole] = useState<CustomRoleDefinition | null>(null);
  const [matrixMember, setMatrixMember] = useState<UserWithRole | null>(null);

  // ── Load All Roles from API ──
  const loadRoles = async () => {
    try {
      const res = await fetch("/api/v1/admin/roles");
      const data = await res.json();
      if (data.success && Array.isArray(data.roles)) {
        setRoles(data.roles);
      }
    } catch (err) {
      console.warn("Failed to load roles from API:", err);
    }
  };

  // ── Load Users & Roles from Server API (Fallback to DB) ──
  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/roles?includeMembers=true");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        const map: Record<string, string> = {};
        data.users.forEach((u: any) => {
          map[u.id] = u.current_role_id;
        });
        setSelectedRolesMap(map);
        return;
      }

      // Fallback: Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, company_name, ref_code, is_admin, admin_role, role_id, created_at")
        .order("created_at", { ascending: false });

      // Fallback: Fetch memberships
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id, role_id, organization_id, custom_permissions, explicit_denies");

      const memberMap = new Map<string, any>();
      (members || []).forEach((m: any) => {
        if (m.user_id) memberMap.set(m.user_id, m);
      });

      const initialRolesMap: Record<string, string> = {};

      const mappedUsers: UserWithRole[] = (profiles || []).map((p: any) => {
        const mem = memberMap.get(p.id);
        let resolvedRole: string = p.role_id || mem?.role_id;

        if (!resolvedRole) {
          if (p.is_admin) {
            if (p.admin_role === "super_admin" || !p.admin_role) {
              resolvedRole = "platform_super_admin";
            } else {
              resolvedRole = `platform_${p.admin_role}`;
            }
          } else {
            resolvedRole = p.role === "vendor" ? "vendor_owner" : "client_owner";
          }
        }

        initialRolesMap[p.id] = resolvedRole;

        return {
          id: p.id,
          full_name: p.full_name || "مستخدم",
          phone: p.phone || "—",
          role: p.role,
          company_name: p.company_name,
          ref_code: p.ref_code,
          is_admin: p.is_admin,
          admin_role: p.admin_role,
          current_role_id: resolvedRole,
          custom_permissions: mem?.custom_permissions || [],
          explicit_denies: mem?.explicit_denies || [],
          organization_id: mem?.organization_id,
          created_at: p.created_at,
        };
      });

      setUsers(mappedUsers);
      setSelectedRolesMap(initialRolesMap);
    } catch (err: any) {
      console.warn("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadRoles(), loadUsers()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // ── Handle Assign Role ──
  const handleAssignRole = async (user: UserWithRole) => {
    const targetRoleId = selectedRolesMap[user.id] || user.current_role_id;
    setUpdatingUserId(user.id);
    setMsg(null);

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, current_role_id: targetRoleId } : u))
    );
    setSelectedRolesMap((prev) => ({
      ...prev,
      [user.id]: targetRoleId,
    }));

    try {
      const res = await fetch("/api/v1/admin/assign-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          roleId: targetRoleId,
          organizationId: user.organization_id,
          customPermissions: user.custom_permissions || [],
          explicitDenies: user.explicit_denies || [],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل إسناد الدور");
      }

      // Sync browser localStorage if present
      if (typeof window !== "undefined") {
        try {
          const storedProf = localStorage.getItem("rfq_demo_profiles");
          if (storedProf) {
            const list = JSON.parse(storedProf);
            const idx = list.findIndex((p: any) => p.id === user.id);
            if (idx !== -1) {
              list[idx].role_id = targetRoleId;
              list[idx].custom_role = targetRoleId;
              localStorage.setItem("rfq_demo_profiles", JSON.stringify(list));
            }
          }
        } catch (e) {}
      }

      setMsg({ type: "success", text: `تم إسناد الدور [${targetRoleId}] للمستخدم (${user.full_name}) بنجاح!` });
      await refreshAll();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
      // Revert on failure
      await refreshAll();
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ── Filtered Roles ──
  const filteredRoles = useMemo(() => {
    const q = search.toLowerCase().trim();
    return roles.filter((r) => {
      const matchScope =
        selectedScope === "all" ||
        (selectedScope === "custom" && !r.is_system) ||
        r.scope === selectedScope;

      const matchSearch =
        !q ||
        r.name_ar.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.description_ar.toLowerCase().includes(q);

      return matchScope && matchSearch;
    });
  }, [roles, selectedScope, search]);

  // ── Filtered Users ──
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      const roleId = u.current_role_id;
      const matchScope =
        selectedScope === "all" ||
        (selectedScope === "platform" && roleId.startsWith("platform_")) ||
        (selectedScope === "client" && (roleId.startsWith("client_") || roleId.includes("client"))) ||
        (selectedScope === "vendor" && (roleId.startsWith("vendor_") || roleId.includes("vendor")));

      const matchSearch =
        !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.company_name?.toLowerCase().includes(q) ||
        u.ref_code?.toLowerCase().includes(q);

      return matchScope && matchSearch;
    });
  }, [users, selectedScope, search]);

  // KPIs Counts
  const customRolesCount = roles.filter((r) => !r.is_system).length;
  const platformStaffCount = users.filter((u) => u.current_role_id.startsWith("platform_")).length;
  const clientsCount = users.filter((u) => u.current_role_id.startsWith("client_") || u.role === "client").length;
  const vendorsCount = users.filter((u) => u.current_role_id.startsWith("vendor_") || u.role === "vendor").length;

  return (
    <div className="p-6 md:p-8 space-y-6 w-full" dir="rtl">
      
      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center shadow-md shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">استوديو إدارة الأدوار والصلاحيات (Dynamic RBAC Studio)</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              تصميم وبناء الأدوار المخصصة، ضبط الصلاحيات الدقيقة، وإسناد المهام مع حماية أمنية سيرفرية كاملة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setBuilderModal({ open: true, mode: "create", role: null })}
            className="h-10 px-4.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء دور وصلاحيات جديدة</span>
          </button>

          <button
            type="button"
            onClick={refreshAll}
            disabled={loading}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">إجمالي الأدوار المتاحة</span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">{roles.length} دوراً</p>
          <span className="text-[10px] text-blue-600 font-bold mt-0.5 block">{customRolesCount} دور مخصص مضاف</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/30 shadow-xs">
          <span className="text-xs font-bold text-purple-700 block">فريق إدارة المنصة (Staff)</span>
          <p className="text-2xl font-black text-purple-900 font-mono mt-1">{platformStaffCount} مشرفين</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/30 shadow-xs">
          <span className="text-xs font-bold text-blue-700 block">أعضاء منشآت العملاء</span>
          <p className="text-2xl font-black text-blue-900 font-mono mt-1">{clientsCount} عميل</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 shadow-xs">
          <span className="text-xs font-bold text-emerald-700 block">أعضاء متاجر الموردين</span>
          <p className="text-2xl font-black text-emerald-900 font-mono mt-1">{vendorsCount} مورد</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/30 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-amber-700 block">إجمالي الأعضاء</span>
          <p className="text-2xl font-black text-amber-900 font-mono mt-1">{users.length} عضو</p>
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
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 3 MAIN TABS NAVIGATION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "studio"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>باني واستوديو الأدوار ({roles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignment")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "assignment"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>إسناد الأدوار للأعضاء ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "matrix"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>مصفوفة الصلاحيات الشاملة</span>
          </button>

        </div>
      </div>

      {/* ────────────────── TAB 1: ROLES & PERMISSIONS STUDIO ────────────────── */}
      {activeTab === "studio" && (
        <div className="space-y-4">
          
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: "all", label: "كافة الأدوار" },
                { id: "custom", label: "أدوار مخصصة فقط ✨" },
                { id: "platform", label: "فريق المنصة (Staff)" },
                { id: "client", label: "العملاء (Clients)" },
                { id: "vendor", label: "الموردين (Vendors)" },
              ].map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => setSelectedScope(scope.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedScope === scope.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم الدور أو المعرف..."
                className="w-full h-9 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Roles Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role) => {
              const perms = role.permissions || [];
              const sensitiveCount = perms.filter((p) => SENSITIVE_PERMISSIONS.has(p)).length;

              return (
                <div
                  key={role.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  {/* Card Top */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            role.scope === "platform"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : role.scope === "client"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {role.scope === "platform" ? "إدارة المنصة" : role.scope === "client" ? "عميل B2B" : "مورد قطع"}
                        </span>

                        {role.is_system ? (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> أساسي
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                            مخصص ✨
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-mono font-bold text-slate-400">
                        {perms.length} صلاحية
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {role.name_ar}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {role.description_ar}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">
                      {role.id}
                    </span>
                  </div>

                  {/* Permissions Chips Sample */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-bold">الصلاحيات:</span>
                      {sensitiveCount > 0 && (
                        <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {sensitiveCount} حساسة
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {perms.slice(0, 3).map((p) => (
                        <span key={p} className="text-[9px] bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-md">
                          {p}
                        </span>
                      ))}
                      {perms.length > 3 && (
                        <span className="text-[9px] text-slate-400 font-bold">+{perms.length - 3} أخرى</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>الأعضاء المسند لهم:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {role.members_count || 0} مستخدم
                      </span>
                    </div>
                  </div>

                  {/* Card Actions Bar */}
                  <div className="flex items-center justify-between gap-1 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setBuilderModal({ open: true, mode: "edit", role })}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="تعديل وتخصيص الدور"
                      >
                        <Edit className="w-3 h-3" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBuilderModal({ open: true, mode: "clone", role })}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="استنساخ الدور"
                      >
                        <Copy className="w-3 h-3" />
                        <span>استنساخ</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setBuilderModal({ open: true, mode: "preview", role })}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title="معاينة الصلاحيات الكاملة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {!role.is_system ? (
                        <button
                          type="button"
                          onClick={() => setDeleteRole(role)}
                          className="px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="حذف الدور المخصص"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف</span>
                        </button>
                      ) : (
                        <span
                          className="p-1.5 rounded-xl text-slate-300 flex items-center cursor-not-allowed"
                          title="دور نظام أساسي محمي من الحذف"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-300" />
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ────────────────── TAB 2: ROLE ASSIGNMENTS ────────────────── */}
      {activeTab === "assignment" && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: "all", label: "الكل" },
                { id: "platform", label: "فريق المنصة (Staff)" },
                { id: "client", label: "العملاء" },
                { id: "vendor", label: "الموردين" },
              ].map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => setSelectedScope(scope.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedScope === scope.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الجوال أو الكود..."
                className="w-full h-9 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">المستخدم / العضو</th>
                    <th className="p-4">النوع والمنشأة</th>
                    <th className="p-4">الدور الوظيفي الحالي</th>
                    <th className="p-4">إسناد وتغيير الدور</th>
                    <th className="p-4 text-center">الاستثناءات والصلاحيات الدقيقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        <span>جاري تحميل الأعضاء والأدوار...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        لا توجد نتائج مطابقة للبحث أو الفلتر المحدد.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const selectedRole = selectedRolesMap[user.id] || user.current_role_id;
                      const isModified = selectedRole !== user.current_role_id;
                      const isSaving = updatingUserId === user.id;
                      const isPlatformStaff = user.current_role_id.startsWith("platform_");

                      const currentRoleDef = roles.find((r) => r.id === user.current_role_id);
                      const roleName = currentRoleDef?.name_ar || user.current_role_id;

                      const customOverridesCount = (user.custom_permissions?.length || 0) + (user.explicit_denies?.length || 0);

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* User Info */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                  isPlatformStaff
                                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                                    : user.role === "vendor"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {user.full_name?.charAt(0) || "ع"}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{user.full_name}</span>
                                  {isPlatformStaff && (
                                    <span className="text-[9px] bg-purple-600 text-white font-black px-1.5 py-0.2 rounded-full">
                                      مشرف منصة 🛡️
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                                  {user.phone} {user.ref_code ? `• ${user.ref_code}` : ""}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Entity Info */}
                          <td className="p-4">
                            <span className="font-bold text-slate-800 block">{user.company_name || "حساب فردي"}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {user.role === "vendor" ? "مورد B2B" : "عميل B2B"}
                            </span>
                          </td>

                          {/* Current Role Badge */}
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-black border inline-block ${
                                user.current_role_id.startsWith("platform_")
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : user.current_role_id.startsWith("vendor_")
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}
                            >
                              {roleName}
                            </span>
                            {customOverridesCount > 0 && (
                              <span className="mr-1.5 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                                {customOverridesCount} استثناء
                              </span>
                            )}
                          </td>

                          {/* Role Selector Dropdown (All Dynamic & System Roles) */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedRole}
                                onChange={(e) => {
                                  setSelectedRolesMap((prev) => ({
                                    ...prev,
                                    [user.id]: e.target.value,
                                  }));
                                }}
                                className="h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer min-w-[220px]"
                              >
                                <optgroup label="── أدوار فريق المنصة (Platform Staff) ──">
                                  {roles.filter((r) => r.scope === "platform").map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name_ar} {!r.is_system ? "✨ (مخصص)" : ""}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="── أدوار منشآت العملاء (Clients) ──">
                                  {roles.filter((r) => r.scope === "client").map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name_ar} {!r.is_system ? "✨ (مخصص)" : ""}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="── أدوار متاجر الموردين (Vendors) ──">
                                  {roles.filter((r) => r.scope === "vendor").map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name_ar} {!r.is_system ? "✨ (مخصص)" : ""}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>

                              {isModified && (
                                <button
                                  type="button"
                                  onClick={() => handleAssignRole(user)}
                                  disabled={isSaving}
                                  className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
                                >
                                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                  <span>حفظ</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Fine-grained Overrides Action */}
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => setMatrixMember(user)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5 text-blue-600" />
                              <span>تخصيص استثناءات الصلاحيات</span>
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ────────────────── TAB 3: MATRIX VIEW ────────────────── */}
      {activeTab === "matrix" && (
        <RoleMatrixView roles={roles} />
      )}

      {/* ── ROLE BUILDER DRAWER / MODAL ── */}
      {builderModal.open && (
        <RoleBuilderModal
          open={builderModal.open}
          mode={builderModal.mode}
          initialRole={builderModal.role}
          onClose={() => setBuilderModal({ open: false, mode: "create", role: null })}
          onSaved={() => {
            refreshAll();
            setMsg({ type: "success", text: "تم حفظ وتحديث بيانات الدور بنجاح!" });
          }}
          onDelete={(role) => setDeleteRole(role)}
        />
      )}

      {/* ── DELETE ROLE DIALOG ── */}
      {deleteRole && (
        <DeleteRoleDialog
          open={Boolean(deleteRole)}
          role={deleteRole}
          onClose={() => setDeleteRole(null)}
          onDeleted={() => {
            refreshAll();
            setMsg({ type: "success", text: "تم حذف الدور المخصص بنجاح!" });
          }}
        />
      )}

      {/* ── USER OVERRIDES MATRIX MODAL ── */}
      {matrixMember && (
        <RolePermissionMatrixModal
          open={Boolean(matrixMember)}
          onClose={() => setMatrixMember(null)}
          member={{
            id: matrixMember.id,
            fullName: matrixMember.full_name,
            email: matrixMember.phone,
            roleId: matrixMember.current_role_id as RoleId,
            customPermissions: matrixMember.custom_permissions || [],
            explicitDenies: matrixMember.explicit_denies || [],
          }}
          roleDefinition={roles.find((r) => r.id === matrixMember.current_role_id)}
          onSave={async (memberId, customPerms, explicitDenies) => {
            await fetch("/api/v1/admin/assign-role", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: memberId,
                roleId: matrixMember.current_role_id,
                organizationId: matrixMember.organization_id,
                customPermissions: customPerms,
                explicitDenies: explicitDenies,
              }),
            });
            setMsg({ type: "success", text: "تم تحديث استثناءات الصلاحيات للعضو بنجاح" });
            refreshAll();
          }}
        />
      )}

    </div>
  );
}

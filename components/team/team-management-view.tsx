"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  Sliders,
  Trash2,
  UserX,
  UserCheck,
  RefreshCw,
  Copy,
  Check,
  Building2,
  FileText,
  Activity,
  ChevronDown,
  Sparkles,
  Info,
  Loader2,
  Layers,
  Search,
  ExternalLink,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Pencil,
  User,
} from "lucide-react";
import { RolePermissionMatrixModal } from "./role-permission-matrix-modal";
import { RoleId, CustomRoleDefinition } from "@/lib/rbac/permissions";

interface TeamMember {
  id: string;
  user_id?: string;
  email: string;
  phone?: string;
  full_name?: string;
  role_id: RoleId;
  custom_permissions: string[];
  explicit_denies: string[];
  status: "invited" | "active" | "suspended" | "revoked";
  invitation_expires_at?: string;
  created_at: string;
  last_active_at?: string;
  accepted_at?: string;
}

interface AuditLog {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  resource_type: string;
  severity: "info" | "warning" | "high" | "critical";
  created_at: string;
  ip_address?: string;
}

const ROLE_METADATA_FALLBACK: Record<string, { labelAr: string; descAr: string; color: string }> = {
  // Client
  client_owner: { labelAr: "المالك / المدير التنفيذي", descAr: "إشراف كامل على الحساب والصلاحيات والميزانيات", color: "bg-purple-100 text-purple-800 border-purple-200" },
  client_procurement_manager: { labelAr: "مدير المشتريات", descAr: "إنشاء الطلبات، قبول العروض، واعتماد الشراء والدفع", color: "bg-blue-100 text-blue-800 border-blue-200" },
  client_rfq_supervisor: { labelAr: "مراقب طلبات التسعير والنشاط", descAr: "مراقبة وتدقيق الطلبات والعروض بدون صلاحيات دفع", color: "bg-amber-100 text-amber-800 border-amber-200" },
  client_accountant: { labelAr: "محاسب المنشأة", descAr: "الفواتير الضريبية، شحن المحفظة، والتقارير المالية", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  client_technician: { labelAr: "فني الورشة / طالب القطع", descAr: "رفع طلبات القطع واستلام الشحنات", color: "bg-slate-100 text-slate-800 border-slate-200" },

  // Vendor
  vendor_owner: { labelAr: "مالك المتجر / المعرض", descAr: "إدارة كاملة لحساب التوريد، الفروع، وسحب الأرباح", color: "bg-purple-100 text-purple-800 border-purple-200" },
  vendor_sales_agent: { labelAr: "مسؤول التسعير والمبيعات", descAr: "متابعة الرادار، تسعير القطع، والرد على الطلبات", color: "bg-blue-100 text-blue-800 border-blue-200" },
  vendor_warehouse_clerk: { labelAr: "أمين المستودع والتجهيز", descAr: "تجهيز الطلبات وتسليمها في الفرع أو للشحن", color: "bg-amber-100 text-amber-800 border-amber-200" },
  vendor_accountant: { labelAr: "محاسب مبيعات المتجر", descAr: "الفواتير الضريبية وكشف حساب الأرباح", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

export default function TeamManagementView({ role }: { role: "client" | "vendor" }) {
  const [activeSubTab, setActiveSubTab] = useState<"members" | "roles" | "audit">("members");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<CustomRoleDefinition[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [roleSearch, setRoleSearch] = useState("");

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [createdInvitePassword, setCreatedInvitePassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [inviteRole, setInviteRole] = useState<RoleId>(
    role === "vendor" ? "vendor_sales_agent" : "client_procurement_manager"
  );
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateRandomInvitePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInvitePassword(pwd);
    setShowInvitePassword(true);
  };

  const handleCloseInvite = () => {
    setIsInviteOpen(false);
    setInviteEmail("");
    setInviteFullName("");
    setInvitePhone("");
    setInvitePassword("");
    setShowInvitePassword(false);
    setCreatedInviteUrl(null);
    setCreatedInvitePassword(null);
    setInviteError(null);
    setCopied(false);
    setCopiedPassword(false);
  };

  // Change Role Modal
  const [changeRoleTarget, setChangeRoleTarget] = useState<TeamMember | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<string>("");
  const [changingRole, setChangingRole] = useState(false);

  // Delete Member Confirmation Modal
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Comprehensive Edit Member Modal
  const [editMemberTarget, setEditMemberTarget] = useState<TeamMember | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRoleId, setEditRoleId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Permission Matrix Modal
  const [matrixMember, setMatrixMember] = useState<TeamMember | null>(null);
  const [inspectedRole, setInspectedRole] = useState<CustomRoleDefinition | null>(null);

  // ── Load Roles (Scoped to client / vendor) ──
  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch(`/api/v1/team/roles?scope=${role}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.roles)) {
        setRoles(data.roles);
      }
    } catch (err: any) {
      console.warn("Failed to load roles:", err);
    } finally {
      setRolesLoading(false);
    }
  };

  // ── Load Members & Audit Logs ──
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Members
      const res = await fetch("/api/v1/team/members");
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
        setIsOwner(Boolean(data.isOwner));
        setCurrentUserRole(data.currentUserRole || "");
      }

      // 2. Audit Logs
      const auditRes = await fetch("/api/v1/team/audit");
      const auditData = await auditRes.json();
      if (auditData.success) {
        setAuditLogs(auditData.logs || []);
      }
    } catch (err: any) {
      console.warn("Failed to load team data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadRoles();
  }, [role]);

  // ── Available Roles with Custom Roles merged ──
  const availableRoles = useMemo(() => {
    if (roles.length > 0) {
      return roles.map((r) => ({
        id: r.id,
        label: r.name_ar,
        description: r.description_ar,
        is_system: Boolean(r.is_system),
        badge_color: r.badge_color || "blue",
        permissions: r.permissions || [],
        members_count: r.members_count || 0,
      }));
    }

    // Fallback static list
    return role === "vendor"
      ? [
          { id: "vendor_sales_agent", label: "مسؤول التسعير والمبيعات", description: "متابعة الرادار، تسعير القطع، والرد على الطلبات", is_system: true, badge_color: "blue", permissions: [], members_count: 0 },
          { id: "vendor_warehouse_clerk", label: "أمين المستودع والتجهيز", description: "تجهيز الطلبات وتسليمها في الفرع أو للشحن", is_system: true, badge_color: "amber", permissions: [], members_count: 0 },
          { id: "vendor_accountant", label: "محاسب المبيعات والفواتير", description: "الفواتير الضريبية وكشف حساب الأرباح", is_system: true, badge_color: "emerald", permissions: [], members_count: 0 },
          { id: "vendor_owner", label: "مالك المتجر / شريك مفوض", description: "إدارة كاملة لحساب التوريد، الفروع، وسحب الأرباح", is_system: true, badge_color: "purple", permissions: [], members_count: 0 },
        ]
      : [
          { id: "client_procurement_manager", label: "مدير المشتريات", description: "إنشاء الطلبات، قبول العروض، واعتماد الشراء والدفع", is_system: true, badge_color: "blue", permissions: [], members_count: 0 },
          { id: "client_rfq_supervisor", label: "مراقب طلبات التسعير والنشاط", description: "مراقبة وتدقيق الطلبات والعروض بدون صلاحيات دفع", is_system: true, badge_color: "amber", permissions: [], members_count: 0 },
          { id: "client_accountant", label: "محاسب المنشأة", description: "الفواتير الضريبية، شحن المحفظة، والتقارير المالية", is_system: true, badge_color: "emerald", permissions: [], members_count: 0 },
          { id: "client_technician", label: "فني الورشة / طالب القطع", description: "رفع طلبات القطع واستلام الشحنات", is_system: true, badge_color: "slate", permissions: [], members_count: 0 },
          { id: "client_owner", label: "المالك / المدير العام", description: "إشراف كامل على الحساب والصلاحيات والميزانيات", is_system: true, badge_color: "purple", permissions: [], members_count: 0 },
        ];
  }, [roles, role]);

  // ── Dynamic Metadata Map for Members Display ──
  const roleMetaMap = useMemo(() => {
    const map: Record<string, { labelAr: string; descAr: string; color: string; isCustom: boolean; permissionsCount: number }> = {};

    // 1. Defaults
    Object.entries(ROLE_METADATA_FALLBACK).forEach(([k, v]) => {
      map[k] = { ...v, isCustom: false, permissionsCount: 0 };
    });

    // 2. Roles from DB
    roles.forEach((r) => {
      let colorClass = "bg-blue-50 text-blue-700 border-blue-200";
      if (r.badge_color === "purple") colorClass = "bg-purple-50 text-purple-700 border-purple-200";
      else if (r.badge_color === "emerald") colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      else if (r.badge_color === "amber") colorClass = "bg-amber-50 text-amber-700 border-amber-200";
      else if (r.badge_color === "rose") colorClass = "bg-rose-50 text-rose-700 border-rose-200";
      else if (r.badge_color === "indigo") colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200";

      map[r.id] = {
        labelAr: r.name_ar,
        descAr: r.description_ar,
        color: colorClass,
        isCustom: !r.is_system,
        permissionsCount: r.permissions?.length || 0,
      };
    });

    return map;
  }, [roles]);

  // ── Filtered Roles for Catalog View ──
  const filteredRoles = useMemo(() => {
    const q = roleSearch.toLowerCase().trim();
    if (!q) return availableRoles;
    return availableRoles.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [availableRoles, roleSearch]);

  const customRolesCount = availableRoles.filter((r) => !r.is_system).length;

  // ── Handle Invite Member ──
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setMsg(null);

    try {
      const res = await fetch("/api/v1/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteFullName,
          phone: invitePhone,
          roleId: inviteRole,
          password: invitePassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل إرسال الدعوة");
      }

      setCreatedInviteUrl(data.invitationUrl);
      setCreatedInvitePassword(invitePassword || data.password || null);
      setInviteError(null);
      setMsg({ type: "success", text: "تم إنشاء رابط الدعوة بنجاح وتخصيص الدور المحدد!" });
      loadData();
    } catch (err: any) {
      const errorMsg = err.message || "فشل إرسال الدعوة";
      setInviteError(errorMsg);
      setMsg({ type: "error", text: errorMsg });
    } finally {
      setInviting(false);
    }
  };

  // ── Handle Change Member Role ──
  const handleChangeRoleSubmit = async () => {
    if (!changeRoleTarget || !newSelectedRole) return;
    setChangingRole(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/v1/team/members/${changeRoleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: newSelectedRole }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تعديل الدور الوظيفي");
      }

      setMsg({ type: "success", text: `تم تحديث دور الموظف إلى [${roleMetaMap[newSelectedRole]?.labelAr || newSelectedRole}] بنجاح!` });
      setChangeRoleTarget(null);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setChangingRole(false);
    }
  };

  // ── Handle Save Custom Permissions ──
  const handleSaveCustomPermissions = async (
    memberId: string,
    customPermissions: string[],
    explicitDenies: string[]
  ) => {
    const res = await fetch(`/api/v1/team/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customPermissions, explicitDenies }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      setMsg({ type: "error", text: data.error || "فشل حفظ الصلاحيات" });
    } else {
      setMsg({ type: "success", text: "تم تحديث الصلاحيات الفعالة للموظف بنجاح" });
      loadData();
    }
  };

  // ── Handle Open Edit Modal ──
  const handleOpenEditModal = (member: TeamMember) => {
    setEditMemberTarget(member);
    setEditFullName(member.full_name || "");
    setEditEmail(member.email || "");
    setEditPhone(member.phone || "");
    setEditRoleId(member.role_id || "");
    setEditStatus(member.status === "suspended" ? "suspended" : "active");
    setEditPassword("");
    setShowEditPassword(false);
    setEditError(null);
  };

  const generateRandomEditPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditPassword(pwd);
    setShowEditPassword(true);
  };

  // ── Handle Save Member Edit ──
  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMemberTarget) return;
    if (!editFullName.trim()) {
      setEditError("يرجى إدخال اسم الموظف");
      return;
    }
    if (!editRoleId) {
      setEditError("يرجى اختيار الدور الوظيفي");
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/v1/team/members/${editMemberTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          email: editEmail.trim().toLowerCase(),
          phone: editPhone.trim(),
          roleId: editRoleId,
          status: editStatus,
          password: editPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تحديث بيانات العضو");
      }

      const updatedName = editFullName.trim();
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editMemberTarget.id
            ? {
                ...m,
                full_name: updatedName,
                email: editEmail.trim().toLowerCase(),
                phone: editPhone.trim(),
                role_id: editRoleId as RoleId,
                status: editStatus,
              }
            : m
        )
      );

      setMsg({
        type: "success",
        text: `تم حفظ وتحديث كافة بيانات الموظف [${updatedName}] بنجاح!`,
      });
      setEditMemberTarget(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || "حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Handle Toggle Status (Suspend/Activate) ──
  const handleToggleStatus = async (member: TeamMember) => {
    const newStatus = member.status === "active" ? "suspended" : "active";
    const res = await fetch(`/api/v1/team/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      setMsg({ type: "error", text: data.error || "تعذر تعديل حالة العضو" });
    } else {
      setMsg({ type: "success", text: `تم ${newStatus === "active" ? "تفعيل" : "تعليق"} حساب الموظف بنجاح` });
      loadData();
    }
  };

  // ── Handle Open Delete Modal ──
  const handleOpenDeleteModal = (member: TeamMember, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMemberToDelete(member);
  };

  // ── Handle Confirm Delete Member ──
  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/v1/team/members/${memberToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل حذف الموظف");
      }

      const deletedName = memberToDelete.full_name || memberToDelete.email;
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setMsg({
        type: "success",
        text: `تم حذف الموظف [${deletedName}] بنجاح من قائمة أعضاء المنشأة`,
      });
      setMemberToDelete(null);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "حدث خطأ أثناء محاولة الحذف" });
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = () => {
    if (createdInviteUrl) {
      navigator.clipboard.writeText(createdInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeCount = members.filter((m) => m.status === "active").length;
  const invitedCount = members.filter((m) => m.status === "invited").length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-[#0B1528] via-[#0F1C36] to-[#0B1528] text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                إدارة الأدوار وفريق العمل (Enterprise RBAC)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {role === "vendor" ? "نطاق الموردين (Vendors)" : "نطاق العملاء (Clients)"}
              </span>
              {customRolesCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{customRolesCount} أدوار مخصصة مضافة</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
              استعراض كافة الأدوار المعتمدة لمنشأتك، دعوة موظفين جدد بأدوار محددة، وتخصيص الصلاحيات الدقيقة مع حماية متكاملة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              loadData();
              loadRoles();
            }}
            disabled={loading || rolesLoading}
            className="h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || rolesLoading) ? "animate-spin text-emerald-400" : ""}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreatedInviteUrl(null);
              setInviteError(null);
              setIsInviteOpen(true);
            }}
            className="h-10 px-4.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>دعوة موظف جديد</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
          </button>
        </div>
      </div>

      {/* ── KPI METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Available Roles Card */}
        <div
          onClick={() => setActiveSubTab("roles")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeSubTab === "roles"
              ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20"
              : "bg-white border-slate-200/90 hover:border-blue-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>الأدوار المعتمدة</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
            {availableRoles.length} دوراً
          </p>
          <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
            {customRolesCount > 0 ? `${customRolesCount} مخصص من الإدارة ✨` : "أدوار قياسية متكاملة"}
          </span>
        </div>

        {/* Total Members */}
        <div
          onClick={() => setActiveSubTab("members")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeSubTab === "members"
              ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200/90 hover:border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>أعضاء المنشأة</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
            {members.length} أعضاء
          </p>
          <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
            {activeCount} نشط في المنظومة ✓
          </span>
        </div>

        {/* Pending Invites */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>دعوات بالانتظار</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 font-mono mt-1">{invitedCount} دعوة</p>
          <span className="text-[10px] text-amber-600 font-bold block mt-0.5">بانتظار قبول الموظف</span>
        </div>

        {/* Audit Logs */}
        <div
          onClick={() => setActiveSubTab("audit")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeSubTab === "audit"
              ? "bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20"
              : "bg-white border-slate-200/90 hover:border-purple-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>سجل الرقابة والأمان</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-700 font-mono mt-1">{auditLogs.length} حركة</p>
          <span className="text-[10px] text-purple-600 font-bold block mt-0.5">سجل غير قابل للتعديل 🛡️</span>
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
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── SUB-NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab("members")}
          className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "members"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>أعضاء الفريق والدعوات ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("roles")}
          className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "roles"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>دليل الأدوار المعتمدة للمنشأة ({availableRoles.length})</span>
          {customRolesCount > 0 && (
            <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
              {customRolesCount} جديد ✨
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("audit")}
          className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "audit"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Activity className="w-4 h-4 text-purple-400" />
          <span>سجل الرقابة والتتبع ({auditLogs.length})</span>
        </button>
      </div>

      {/* ────────────────── SUB-TAB 1: MEMBERS LIST ────────────────── */}
      {activeSubTab === "members" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900">أعضاء الفريق والصلاحيات المسندة</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreatedInviteUrl(null);
                setIsInviteOpen(true);
              }}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>دعوة عضو جديد</span>
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-bold">جاري تحميل أعضاء الفريق...</span>
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">لا يوجد أعضاء مضافون في المنشأة بعد.</p>
              <p className="text-[11px] text-slate-400">اضغط على زر "دعوة عضو جديد" بالأعلى للبدء في توزيع المهام.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const meta = roleMetaMap[member.role_id] || {
                  labelAr: member.role_id,
                  descAr: "عضو في المنشأة",
                  color: "bg-slate-100 text-slate-700 border-slate-200",
                  isCustom: false,
                  permissionsCount: 0,
                };

                const isOwnerRole = member.role_id === "client_owner" || member.role_id === "vendor_owner";

                return (
                  <div
                    key={member.id}
                    onClick={() => handleOpenEditModal(member)}
                    className="p-4.5 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs cursor-pointer group"
                  >
                    {/* Member Info */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-sm shrink-0 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors">
                        {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                            {member.full_name || "عضو منشأة"}
                          </span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${meta.color} flex items-center gap-1`}>
                            {meta.labelAr}
                            {meta.isCustom && <span className="text-amber-600">✨</span>}
                          </span>

                          {member.status === "invited" && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> دعوة معلقة
                            </span>
                          )}

                          {member.status === "suspended" && (
                            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                              معلق 🚫
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap font-medium">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="font-mono text-slate-600">{member.email}</span>
                          </span>
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="font-mono text-slate-600">{member.phone}</span>
                            </span>
                          )}
                          <span>• {meta.descAr}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(member);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="تعديل كافة بيانات الموظف"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>تعديل</span>
                      </button>

                      {/* Change Role Button (only if not owner or owner editing staff) */}
                      {!isOwnerRole && isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChangeRoleTarget(member);
                            setNewSelectedRole(member.role_id);
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                          title="تعديل الدور الوظيفي"
                        >
                          تغيير الدور
                        </button>
                      )}

                      {/* Matrix button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const customDef = roles.find((r) => r.id === member.role_id) || null;
                          setInspectedRole(customDef);
                          setMatrixMember(member);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-blue-600" />
                        <span>الصلاحيات</span>
                      </button>

                      {/* Suspend / Activate button (only if not owner) */}
                      {!isOwnerRole && isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(member);
                          }}
                          className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                            member.status === "active"
                              ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={member.status === "active" ? "تعليق الحساب" : "تفعيل الحساب"}
                        >
                          {member.status === "active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Remove button (only if not owner) */}
                      {!isOwnerRole && isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteModal(member, e);
                          }}
                          className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف الموظف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── SUB-TAB 2: ROLES & PERMISSIONS CATALOG ────────────────── */}
      {activeSubTab === "roles" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>دليل الأدوار الوظيفية المعتمدة لنطاق المنشأة</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                كافة الأدوار القياسية والمخصصة التي أنشأتها إدارة المنصة وتستطيع إسنادها لأعضاء فريقك
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="بحث في الأدوار أو المعرف..."
                className="w-full h-9 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {rolesLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2 bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-bold">جاري استرجاع الأدوار المعتمدة...</span>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
              <ShieldAlert className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">لم يتم العثور على أدوار مطابقة للبحث.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoles.map((r) => {
                const isCustom = !r.is_system;
                const permsCount = r.permissions?.length || 0;

                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            role === "vendor"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {role === "vendor" ? "متاجر الموردين" : "منشآت العملاء"}
                        </span>

                        {isCustom ? (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>دور مخصص معتمد ✨</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> أساسي
                          </span>
                        )}
                      </div>

                      {/* Title & Desc */}
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        {r.label}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>

                      <span className="inline-block mt-2 font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {r.id}
                      </span>
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>الصلاحيات الممنوحة:</span>
                        <strong className="text-slate-800 font-mono">
                          {permsCount > 0 ? `${permsCount} صلاحية` : "قياسية"}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const fullRole = roles.find((item) => item.id === r.id) || null;
                            setInspectedRole(fullRole);
                            setMatrixMember({
                              id: `role-${r.id}`,
                              email: `${r.id}@organization`,
                              full_name: r.label,
                              role_id: r.id as RoleId,
                              custom_permissions: r.permissions,
                              explicit_denies: [],
                              status: "active",
                              created_at: new Date().toISOString(),
                            });
                          }}
                          className="flex-1 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-blue-600" />
                          <span>فحص الصلاحيات</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInviteRole(r.id as RoleId);
                            setCreatedInviteUrl(null);
                            setIsInviteOpen(true);
                          }}
                          className="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="دعوة موظف بهذا الدور"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>دعوة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── SUB-TAB 3: AUDIT LOG ────────────────── */}
      {activeSubTab === "audit" && (
        <div className="bg-[#0B1528] rounded-3xl border border-slate-800 p-5 sm:p-7 text-white shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-black text-white">سجل التتبع والرقابة الأمني (Audit Trail)</h3>
            </div>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              غير قابل للتعديل Append-Only 🛡️
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">لا توجد سجلات أمنية مسجلة حتى الآن.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-white block truncate">{log.action}</span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        بواسطة: <strong className="text-slate-300">{log.actor_name}</strong> ({log.actor_role})
                      </span>
                    </div>
                  </div>

                  <div className="text-left shrink-0 font-mono text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleString("ar-SA")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INVITE MEMBER MODAL ── */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">دعوة موظف جديد للمنشأة</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseInvite}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            {inviteError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <p className="font-black text-rose-800">تعذر إنشاء الدعوة:</p>
                  <p className="text-[11px] text-rose-600 leading-relaxed font-medium">{inviteError}</p>
                </div>
              </div>
            )}

            {!createdInviteUrl ? (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الاسم الكامل للموظف</label>
                  <input
                    type="text"
                    required
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    placeholder="مثال: عبدالله القحطاني"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">البريد الإلكتروني الرسمي *</label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="employee@company.com"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-left text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">رقم الجوال للتواصل</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-left text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Password / PIN field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      تعيين كلمة المرور / الرقم السري للحساب (اختياري)
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomInvitePassword}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>توليد تلقائي 🎲</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showInvitePassword ? "text" : "password"}
                      dir="ltr"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="أدخل كلمة المرور (6 خانات على الأقل)..."
                      className="w-full h-10 px-3.5 pr-10 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-left text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowInvitePassword(!showInvitePassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showInvitePassword ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                    >
                      {showInvitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    يمكن للموظف استخدام كلمة المرور هذه لتسجيل الدخول مباشرة عبر البريد الإلكتروني أو رقم الجوال دون الحاجة لانتظار رابط البريد.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 block">الدور الوظيفي والصلاحيات الأساسية *</label>
                    <span className="text-[10px] text-blue-600 font-bold">{availableRoles.length} أدوار متاحة</span>
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as RoleId)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label} {!r.is_system ? "✨ (دور مخصص معتمد)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {availableRoles.find((r) => r.id === inviteRole)?.description}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إنشاء الدعوة المشفرة...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>توليد وإرسال رابط الدعوة الآمن</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم إنشاء رمز ورابط الدعوة المشفر بنجاح!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    شارك هذا الرابط مع الموظف ليقوم بتفعيل حسابه والانضمام للمنشأة. الرابط صالح للاستخدام مرة واحدة لمدة 7 أيام.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    dir="ltr"
                    value={createdInviteUrl}
                    className="w-full bg-transparent font-mono text-xs text-slate-700 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span>
                  </button>
                </div>

                {createdInvitePassword && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-bold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>كلمة المرور المحددة للحساب:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdInvitePassword);
                          setCopiedPassword(true);
                          setTimeout(() => setCopiedPassword(false), 2000);
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPassword ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPassword ? "تم النسخ" : "نسخ كلمة المرور"}</span>
                      </button>
                    </div>
                    <p className="font-mono text-xs font-black text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-left select-all" dir="ltr">
                      {createdInvitePassword}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCloseInvite}
                  className="w-full h-10 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHANGE MEMBER ROLE MODAL ── */}
      {changeRoleTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">تعديل الدور الوظيفي للموظف</h3>
              </div>
              <button
                type="button"
                onClick={() => setChangeRoleTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{changeRoleTarget.full_name || changeRoleTarget.email}</p>
              <p className="text-slate-500 font-mono text-[11px]">{changeRoleTarget.email}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">اختر الدور الوظيفي الجديد *</label>
              <select
                value={newSelectedRole}
                onChange={(e) => setNewSelectedRole(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {availableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} {!r.is_system ? "✨ (دور مخصص معتمد)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setChangeRoleTarget(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleChangeRoleSubmit}
                disabled={changingRole}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {changingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ الدور الجديد</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION POPUP MODAL ── */}
      {memberToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setMemberToDelete(null);
          }}
        >
          <div
            dir="rtl"
            className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-2xl max-w-md w-full text-center space-y-5 animate-in zoom-in-95 duration-200 relative"
          >
            {/* Close button */}
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setMemberToDelete(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Banner */}
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                هل تريد الحذف ؟
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                أنت على وشك حذف هذا الموظف من قائمة أعضاء المنشأة بشكل نهائي.
              </p>
            </div>

            {/* Member Details Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-right space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">
                  {memberToDelete.full_name || "عضو فريق العمل"}
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    roleMetaMap[memberToDelete.role_id]?.color || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {roleMetaMap[memberToDelete.role_id]?.labelAr || memberToDelete.role_id}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{memberToDelete.email}</span>
              </div>
              {memberToDelete.phone && (
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{memberToDelete.phone}</span>
                </div>
              )}
            </div>

            {/* Alert Notice */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-bold flex items-center gap-2 text-right">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                لن يتمكن هذا الحساب من تسجيل الدخول أو استعراض أي بيانات خاصة بالمنشأة بعد الحذف.
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setMemberToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                إلغاء وتراجع
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteMember}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، احذف الموظف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPREHENSIVE EDIT MEMBER MODAL ── */}
      {editMemberTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingEdit) setEditMemberTarget(null);
          }}
        >
          <div
            dir="rtl"
            className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-2xl max-w-xl w-full text-right space-y-5 animate-in zoom-in-95 duration-200 my-8 relative"
          >
            {/* Close button */}
            <button
              type="button"
              disabled={savingEdit}
              onClick={() => setEditMemberTarget(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-blue-500/20 shrink-0">
                {editFullName?.charAt(0) || editMemberTarget.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>تعديل بيانات العضو</span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      roleMetaMap[editRoleId]?.color || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {roleMetaMap[editRoleId]?.labelAr || editRoleId}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحديث الاسم، البريد، رقم الجوال، الدور الوظيفي، وتعيين كلمة مرور جديدة
                </p>
              </div>
            </div>

            {/* Error banner if any */}
            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveMemberEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>الاسم الكامل *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="مثال: أحمد المنصور"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>البريد الإلكتروني *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-mono"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>رقم الجوال</span>
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {/* Job Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>الدور الوظيفي والصلاحيات *</span>
                  </label>
                  <select
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label} {!r.is_system ? "✨ (دور مخصص معتمد)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password Section */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>تعيين كلمة مرور / رقم سري جديد (اختياري)</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomEditPassword}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>توليد تلقائي 🎲</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="اترك هذا الحقل فارغاً إذا كنت لا ترغب بتغيير كلمة المرور الحالية"
                    className="w-full h-10 px-3.5 pl-10 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  يمكن للموظف استخدام كلمة المرور الجديدة لتسجيل الدخول فوراً عبر حسابه.
                </p>
              </div>

              {/* Status Section */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">حالة حساب الموظف في المنشأة</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditStatus("active")}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editStatus === "active"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20 font-black shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>حساب نشط (مفعل) ✓</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus("suspended")}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editStatus === "suspended"
                        ? "bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-500/20 font-black shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <UserX className="w-4 h-4 text-amber-600" />
                    <span>حساب معلق (موقوف مؤقتاً) 🚫</span>
                  </button>
                </div>
              </div>

              {/* Shortcut to Granular RBAC Permissions */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const target = editMemberTarget;
                    setEditMemberTarget(null);
                    const customDef = roles.find((r) => r.id === target.role_id) || null;
                    setInspectedRole(customDef);
                    setMatrixMember(target);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>تخصيص مصفوفة الصلاحيات التفصيلية (Granular RBAC) لهذا الموظف</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditMemberTarget(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ التعديلات...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ROLE PERMISSIONS MATRIX MODAL ── */}
      {matrixMember && (
        <RolePermissionMatrixModal
          open={Boolean(matrixMember)}
          onClose={() => {
            setMatrixMember(null);
            setInspectedRole(null);
          }}
          member={{
            id: matrixMember.id,
            fullName: matrixMember.full_name || matrixMember.email,
            email: matrixMember.email,
            roleId: matrixMember.role_id,
            customPermissions: matrixMember.custom_permissions || [],
            explicitDenies: matrixMember.explicit_denies || [],
          }}
          roleDefinition={inspectedRole}
          onSave={handleSaveCustomPermissions}
        />
      )}
    </div>
  );
}

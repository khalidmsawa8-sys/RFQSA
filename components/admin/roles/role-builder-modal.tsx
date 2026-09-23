"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Shield,
  ShieldAlert,
  Check,
  X,
  Lock,
  Sparkles,
  AlertTriangle,
  Info,
  Save,
  Loader2,
  Search,
  Sliders,
  CheckCircle2,
  Copy,
  Layers,
  Truck,
  FileText,
  CreditCard,
  Users,
  Store,
  FileCheck2,
  Tags,
  PackageCheck,
  Scale,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  SystemPermission,
  RoleScope,
  PermissionModule,
  PERMISSION_CATALOG,
  SENSITIVE_PERMISSIONS,
  CustomRoleDefinition,
  ROLE_TEMPLATES_PRESETS,
} from "@/lib/rbac/permissions";

interface RoleBuilderModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit" | "clone" | "preview";
  initialRole?: CustomRoleDefinition | null;
  onSaved: (role: CustomRoleDefinition) => void;
  onDelete?: (role: CustomRoleDefinition) => void;
}

const COLOR_OPTIONS = [
  { id: "purple", label: "أرجواني (إدارة)", bg: "bg-purple-600", border: "border-purple-500", text: "text-purple-700", lightBg: "bg-purple-50" },
  { id: "blue", label: "أزرق (عملاء B2B)", bg: "bg-blue-600", border: "border-blue-500", text: "text-blue-700", lightBg: "bg-blue-50" },
  { id: "emerald", label: "زمردي (موردين)", bg: "bg-emerald-600", border: "border-emerald-500", text: "text-emerald-700", lightBg: "bg-emerald-50" },
  { id: "amber", label: "كهرماني (لوجستيات)", bg: "bg-amber-600", border: "border-amber-500", text: "text-amber-700", lightBg: "bg-amber-50" },
  { id: "rose", label: "وردي (نزاعات)", bg: "bg-rose-600", border: "border-rose-500", text: "text-rose-700", lightBg: "bg-rose-50" },
  { id: "cyan", label: "سماوي (تسعير)", bg: "bg-cyan-600", border: "border-cyan-500", text: "text-cyan-700", lightBg: "bg-cyan-50" },
  { id: "indigo", label: "نيلي (تدقيق)", bg: "bg-indigo-600", border: "border-indigo-500", text: "text-indigo-700", lightBg: "bg-indigo-50" },
];

export function RoleBuilderModal({
  open,
  onClose,
  mode,
  initialRole,
  onSaved,
  onDelete,
}: RoleBuilderModalProps) {
  const [scope, setScope] = useState<RoleScope>(initialRole?.scope || "client");
  const [roleId, setRoleId] = useState(initialRole?.id || "");
  const [nameAr, setNameAr] = useState(initialRole?.name_ar || "");
  const [nameEn, setNameEn] = useState(initialRole?.name_en || "");
  const [descriptionAr, setDescriptionAr] = useState(initialRole?.description_ar || "");
  const [badgeColor, setBadgeColor] = useState(initialRole?.badge_color || "blue");
  const [selectedPerms, setSelectedPerms] = useState<Set<SystemPermission>>(
    new Set(initialRole?.permissions || [])
  );
  const [searchPerms, setSearchPerms] = useState("");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset form on open/change
  useEffect(() => {
    if (initialRole) {
      setScope(initialRole.scope);
      setRoleId(mode === "clone" ? `${initialRole.scope}_copy_${Date.now().toString(36)}` : initialRole.id);
      setNameAr(mode === "clone" ? `${initialRole.name_ar} (نسخة)` : initialRole.name_ar);
      setNameEn(initialRole.name_en || "");
      setDescriptionAr(initialRole.description_ar);
      setBadgeColor(initialRole.badge_color || (initialRole.scope === "platform" ? "purple" : initialRole.scope === "vendor" ? "emerald" : "blue"));
      setSelectedPerms(new Set(initialRole.permissions || []));
    } else {
      setScope("client");
      setRoleId("");
      setNameAr("");
      setNameEn("");
      setDescriptionAr("");
      setBadgeColor("blue");
      setSelectedPerms(new Set());
    }
    setErrorMsg(null);
    setSearchPerms("");
    setSelectedModuleFilter("all");
  }, [initialRole, mode, open]);

  // Filter Catalog by scope, search, and module
  const catalogForScope = useMemo(() => {
    return PERMISSION_CATALOG.filter((p) => p.allowedScopes.includes(scope));
  }, [scope]);

  const filteredPermissions = useMemo(() => {
    const q = searchPerms.toLowerCase().trim();
    return catalogForScope.filter((p) => {
      const matchSearch =
        !q ||
        p.labelAr.toLowerCase().includes(q) ||
        p.descAr.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q);
      const matchModule = selectedModuleFilter === "all" || p.module === selectedModuleFilter;
      return matchSearch && matchModule;
    });
  }, [catalogForScope, searchPerms, selectedModuleFilter]);

  // Group by Module
  const groupedModules = useMemo(() => {
    const map = new Map<string, { moduleNameAr: string; permissions: typeof catalogForScope }>();
    filteredPermissions.forEach((p) => {
      if (!map.has(p.module)) {
        map.set(p.module, { moduleNameAr: p.moduleNameAr, permissions: [] });
      }
      map.get(p.module)!.permissions.push(p);
    });
    return Array.from(map.entries()).map(([moduleKey, data]) => ({
      moduleKey,
      moduleNameAr: data.moduleNameAr,
      permissions: data.permissions,
    }));
  }, [filteredPermissions]);

  // Toggle single permission
  const handleTogglePerm = (key: SystemPermission) => {
    if (mode === "preview") return;
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select all / Deselect all in module
  const handleSelectAllInModule = (perms: typeof catalogForScope, select: boolean) => {
    if (mode === "preview") return;
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => {
        if (select) {
          next.add(p.key);
        } else {
          next.delete(p.key);
        }
      });
      return next;
    });
  };

  // Apply starter preset
  const handleApplyPreset = (preset: (typeof ROLE_TEMPLATES_PRESETS)[0]) => {
    if (mode === "preview") return;
    setScope(preset.scope);
    setNameAr(preset.name_ar);
    setDescriptionAr(preset.description_ar);
    setBadgeColor(preset.badge_color);
    setSelectedPerms(new Set(preset.permissions));
  };

  // Sensitive permissions count in selection
  const sensitiveSelectedCount = useMemo(() => {
    let count = 0;
    selectedPerms.forEach((k) => {
      if (SENSITIVE_PERMISSIONS.has(k)) count++;
    });
    return count;
  }, [selectedPerms]);

  // Save handler
  const handleSave = async () => {
    if (!nameAr.trim()) {
      setErrorMsg("يرجى إدخال اسم الدور بالعربية");
      return;
    }
    if (!descriptionAr.trim()) {
      setErrorMsg("يرجى إدخال الوصف الوظيفي للدور");
      return;
    }
    if (selectedPerms.size === 0) {
      setErrorMsg("يرجى تحديد صلاحية واحدة على الأقل للدور");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const permsArray = Array.from(selectedPerms);
      let res: Response;

      if (mode === "create" || mode === "clone") {
        res = await fetch("/api/v1/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: roleId || undefined,
            scope,
            name_ar: nameAr,
            name_en: nameEn || undefined,
            description_ar: descriptionAr,
            badge_color: badgeColor,
            permissions: permsArray,
          }),
        });
      } else {
        // Edit mode
        res = await fetch(`/api/v1/admin/roles/${initialRole?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name_ar: nameAr,
            name_en: nameEn || undefined,
            description_ar: descriptionAr,
            badge_color: badgeColor,
            permissions: permsArray,
          }),
        });
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل حفظ الدور");
      }

      onSaved(data.role);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع أثناء حفظ الدور");
    } finally {
      setSaving(false);
    }
  };

  const isSystemProtected = initialRole?.is_system && mode === "edit";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-slate-900 border-slate-800 text-slate-100 shadow-2xl" dir="rtl">
        
        {/* ── HEADER ── */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                  <span>
                    {mode === "create" && "إنشاء دور وظيفي وصلاحيات جديدة"}
                    {mode === "edit" && `تعديل وتخصيص الدور [${initialRole?.name_ar}]`}
                    {mode === "clone" && `استنساخ دور وظيفي [${initialRole?.name_ar}]`}
                    {mode === "preview" && `معاينة مصفوفة صلاحيات [${initialRole?.name_ar}]`}
                  </span>
                  {initialRole?.is_system && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                      دور نظام محمي 🔒
                    </span>
                  )}
                </DialogTitle>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  تحديد نطاق الدور والصلاحيات التفصيلية بدقة مع حماية الـ Server Guard
                </p>
              </div>
            </div>

            {/* Live Counter Badge */}
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3.5 py-1.5 rounded-2xl shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold">الصلاحيات المحددة</span>
                <span className="text-sm font-black text-blue-400 font-mono">
                  {selectedPerms.size} <span className="text-[10px] text-slate-400">/ {catalogForScope.length}</span>
                </span>
              </div>
              {sensitiveSelectedCount > 0 && (
                <div className="mr-2 pr-2 border-r border-slate-700 text-right">
                  <span className="text-[10px] text-rose-400 block font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> حساسة
                  </span>
                  <span className="text-sm font-black text-rose-400 font-mono">{sensitiveSelectedCount}</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ── BODY (SCROLLABLE) ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/50">

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* System Role Immutability Notice */}
          {isSystemProtected && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span>هذا الدور من الأدوار الأساسية المحمية للنظام (System Protected Role).</span>
                <p className="text-[11px] text-amber-200/70 font-normal mt-0.5">
                  يمكن تعديل الوصف واللون فقط لحماية المعمارية والعمليات، بينما يتم إنشاء دور مخصص مستقل في حال الرغبة في تعديل حزمة الصلاحيات.
                </p>
              </div>
            </div>
          )}

          {/* Affected Members Warning on Edit */}
          {mode === "edit" && (initialRole?.members_count || 0) > 0 && (
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                تنبيه: هذا الدور مسند حالياً لـ <span className="font-mono text-white underline">{initialRole?.members_count}</span> مستخدم. أي تعديل في الصلاحيات سيصبح نافذاً عليهم فوراً.
              </span>
            </div>
          )}

          {/* Quick Preset Templates (Only on Create/Clone) */}
          {(mode === "create" || mode === "clone") && (
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                قوالب سريعة جاهزة كنقطة انطلاق (Starter Presets):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {ROLE_TEMPLATES_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0"
                  >
                    <span>{preset.name_ar}</span>
                    <span className="text-[10px] opacity-60 font-mono">({preset.permissions.length})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Role Core Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Scope Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">نطاق الدور (Scope) *</label>
              <select
                value={scope}
                disabled={mode === "preview" || isSystemProtected}
                onChange={(e) => {
                  const newScope = e.target.value as RoleScope;
                  setScope(newScope);
                  // Filter out invalid perms
                  const allowedKeys = new Set(PERMISSION_CATALOG.filter(p => p.allowedScopes.includes(newScope)).map(p => p.key));
                  setSelectedPerms(prev => new Set(Array.from(prev).filter(k => allowedKeys.has(k))));
                }}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="client">منشآت العملاء (B2B Clients)</option>
                <option value="vendor">متاجر الموردين (B2B Vendors)</option>
                <option value="platform">فريق إدارة المنصة (Platform Staff)</option>
              </select>
            </div>

            {/* Name Arabic */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">اسم الدور بالعربية *</label>
              <input
                type="text"
                value={nameAr}
                disabled={mode === "preview"}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: مدير مشتريات الورش"
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Badge Color Picker */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">لون الشارة والمظهر</label>
              <div className="flex items-center gap-1.5 h-10 bg-slate-950 border border-slate-700 rounded-xl px-2.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={mode === "preview"}
                    onClick={() => setBadgeColor(c.id)}
                    className={`w-6 h-6 rounded-lg ${c.bg} transition-all cursor-pointer flex items-center justify-center ${
                      badgeColor === c.id ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"
                    }`}
                    title={c.label}
                  >
                    {badgeColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">الوصف الوظيفي والمسؤوليات *</label>
            <textarea
              value={descriptionAr}
              disabled={mode === "preview"}
              onChange={(e) => setDescriptionAr(e.target.value)}
              rows={2}
              placeholder="وصف واضح لدور الموظف ومسؤولياته في المنصة..."
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 leading-relaxed resize-none"
            />
          </div>

          {/* ── GRANULAR PERMISSIONS SECTION ── */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  مصفوفة الصلاحيات التفصيلية (Granular Permissions)
                </h3>
                <p className="text-[11px] text-slate-400">حدد الصلاحيات الممنوحة لهذا الدور بدقة</p>
              </div>

              {/* Filters Bar */}
              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchPerms}
                    onChange={(e) => setSearchPerms(e.target.value)}
                    placeholder="بحث في الصلاحيات..."
                    className="w-full h-8 pr-8 pl-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modules Accordion / Groups */}
            <div className="space-y-4">
              {groupedModules.map((group) => {
                const groupSelectedCount = group.permissions.filter((p) => selectedPerms.has(p.key)).length;
                const allSelected = groupSelectedCount === group.permissions.length && group.permissions.length > 0;

                return (
                  <div key={group.moduleKey} className="bg-slate-950/70 rounded-2xl border border-slate-800 p-4 space-y-3">
                    
                    {/* Group Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-white">{group.moduleNameAr}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-full font-bold">
                          {groupSelectedCount} / {group.permissions.length}
                        </span>
                      </div>

                      {mode !== "preview" && !isSystemProtected && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectAllInModule(group.permissions, true)}
                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                          >
                            تحديد الكل
                          </button>
                          <span className="text-slate-600 text-xs">•</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllInModule(group.permissions, false)}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-400 cursor-pointer"
                          >
                            إلغاء التحديد
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Permissions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedPerms.has(perm.key);
                        const isSensitive = perm.isSensitive;

                        return (
                          <div
                            key={perm.key}
                            onClick={() => !isSystemProtected && handleTogglePerm(perm.key)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                              isChecked
                                ? isSensitive
                                  ? "bg-rose-950/20 border-rose-500/40 text-white"
                                  : "bg-blue-950/20 border-blue-500/40 text-white"
                                : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700"
                            } ${isSystemProtected ? "cursor-default" : ""}`}
                          >
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                isChecked
                                  ? isSensitive
                                    ? "bg-rose-600 border-rose-500 text-white"
                                    : "bg-blue-600 border-blue-500 text-white"
                                  : "border-slate-700 bg-slate-950"
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs font-bold ${isChecked ? "text-white" : "text-slate-300"}`}>
                                  {perm.labelAr}
                                </span>
                                {isSensitive && (
                                  <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded font-black">
                                    صلاحية حساسة 🛡️
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{perm.descAr}</p>
                              <span className="text-[9px] text-slate-600 font-mono block mt-1">{perm.key}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              {mode === "preview" ? "إغلاق" : "إلغاء"}
            </button>

            {mode === "edit" && initialRole && !initialRole.is_system && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(initialRole);
                }}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف هذا الدور</span>
              </button>
            )}
          </div>

          {mode !== "preview" && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{mode === "create" ? "إنشاء وحفظ الدور" : mode === "clone" ? "حفظ كدور جديد مستقل" : "حفظ التعديلات"}</span>
            </button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}

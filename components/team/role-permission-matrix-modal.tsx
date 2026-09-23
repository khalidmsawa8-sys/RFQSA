"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  Lock,
  FileText,
  CreditCard,
  Users,
  Store,
  Sparkles,
  AlertTriangle,
  Info,
  Save,
  Loader2,
  Search,
  Sliders,
  Layers,
  Ban,
  Plus,
} from "lucide-react";
import {
  SystemPermission,
  RoleId,
  ROLE_DEFAULT_PERMISSIONS,
  SENSITIVE_PERMISSIONS,
  PERMISSION_CATALOG,
  CustomRoleDefinition,
} from "@/lib/rbac/permissions";

interface RolePermissionMatrixModalProps {
  open: boolean;
  onClose: () => void;
  member: {
    id: string;
    fullName: string;
    email: string;
    roleId: RoleId;
    customPermissions: string[];
    explicitDenies: string[];
  };
  roleDefinition?: CustomRoleDefinition | null;
  onSave: (memberId: string, customPermissions: string[], explicitDenies: string[]) => Promise<void>;
}

export function RolePermissionMatrixModal({
  open,
  onClose,
  member,
  roleDefinition,
  onSave,
}: RolePermissionMatrixModalProps) {
  // Determine role default permissions
  const defaultPerms = useMemo(() => {
    if (roleDefinition?.permissions) {
      return new Set(roleDefinition.permissions);
    }
    return new Set(ROLE_DEFAULT_PERMISSIONS[member.roleId] || []);
  }, [member.roleId, roleDefinition]);

  const [customGrants, setCustomGrants] = useState<Set<string>>(new Set(member.customPermissions || []));
  const [explicitDenies, setExplicitDenies] = useState<Set<string>>(new Set(member.explicitDenies || []));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Group permissions by module
  const groupedModules = useMemo(() => {
    const q = search.toLowerCase().trim();
    const map = new Map<string, { moduleNameAr: string; permissions: typeof PERMISSION_CATALOG }>();

    PERMISSION_CATALOG.forEach((p) => {
      const matchSearch =
        !q ||
        p.labelAr.toLowerCase().includes(q) ||
        p.descAr.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q);

      if (matchSearch) {
        if (!map.has(p.module)) {
          map.set(p.module, { moduleNameAr: p.moduleNameAr, permissions: [] });
        }
        map.get(p.module)!.permissions.push(p);
      }
    });

    return Array.from(map.entries()).map(([moduleKey, data]) => ({
      moduleKey,
      moduleNameAr: data.moduleNameAr,
      permissions: data.permissions,
    }));
  }, [search]);

  // Handle cycle state: Default (Inherited) -> Override -> Reset
  const handleToggle = (permKey: SystemPermission, isDefault: boolean) => {
    if (isDefault) {
      // It is inherited by default: toggle DENY
      setExplicitDenies((prev) => {
        const next = new Set(prev);
        if (next.has(permKey)) {
          next.delete(permKey);
        } else {
          next.add(permKey);
        }
        return next;
      });
    } else {
      // It is not default: toggle ALLOW grant
      setCustomGrants((prev) => {
        const next = new Set(prev);
        if (next.has(permKey)) {
          next.delete(permKey);
        } else {
          next.add(permKey);
        }
        return next;
      });
    }
  };

  const handleSaveMatrix = async () => {
    setSaving(true);
    try {
      await onSave(member.id, Array.from(customGrants), Array.from(explicitDenies));
      onClose();
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-slate-900 border-slate-800 text-white shadow-2xl" dir="rtl">
        
        {/* ── HEADER ── */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                  <span>تخصيص استثناءات الصلاحيات الدقيقة للمستخدم</span>
                </DialogTitle>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {member.fullName} ({member.email}) • الدور الأساسي: <span className="text-blue-400 font-bold">{member.roleId}</span>
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 text-xs font-mono shrink-0">
              <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-bold">
                +{customGrants.size} منح استثنائي
              </span>
              <span className="bg-rose-950/60 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-xl font-bold">
                -{explicitDenies.size} حجب استثنائي
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* ── SEARCH & LEGEND ── */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الصلاحيات..."
              className="w-full h-8 pr-8 pl-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> موروثة من الدور
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> منح إضافي (ALLOW)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> حجب مقصود (DENY)
            </span>
          </div>
        </div>

        {/* ── PERMISSIONS TREE ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/50">
          {groupedModules.map((group) => (
            <div key={group.moduleKey} className="bg-slate-950/70 rounded-2xl border border-slate-800 p-4 space-y-3">
              
              {/* Module Header */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="font-black text-xs text-white">{group.moduleNameAr}</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.2 rounded-full font-mono font-bold">
                  {group.permissions.length}
                </span>
              </div>

              {/* Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {group.permissions.map((perm) => {
                  const isDefault = defaultPerms.has(perm.key);
                  const isGrantedCustom = customGrants.has(perm.key);
                  const isDeniedExplicit = explicitDenies.has(perm.key);

                  // Effective State
                  const isEffectiveActive = (isDefault || isGrantedCustom) && !isDeniedExplicit;

                  return (
                    <div
                      key={perm.key}
                      onClick={() => handleToggle(perm.key, isDefault)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                        isDeniedExplicit
                          ? "bg-rose-950/20 border-rose-500/40 text-rose-300"
                          : isGrantedCustom
                          ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                          : isDefault
                          ? "bg-blue-950/20 border-blue-500/40 text-blue-200"
                          : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {/* State Icon */}
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-black transition-all ${
                          isDeniedExplicit
                            ? "bg-rose-600 text-white"
                            : isGrantedCustom
                            ? "bg-emerald-600 text-white"
                            : isDefault
                            ? "bg-blue-600 text-white"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {isDeniedExplicit ? <Ban className="w-3.5 h-3.5" /> : isEffectiveActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">{perm.labelAr}</span>
                          {isDeniedExplicit && (
                            <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.2 rounded">
                              محجوبة (DENY)
                            </span>
                          )}
                          {isGrantedCustom && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                              منح استثنائي (ALLOW)
                            </span>
                          )}
                          {isDefault && !isDeniedExplicit && (
                            <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded">
                              موروثة (Inherited)
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
          ))}
        </div>

        {/* ── FOOTER ── */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSaveMatrix}
            disabled={saving}
            className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ الاستثناءات للمستخدم</span>
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

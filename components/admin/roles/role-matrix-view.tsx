"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Shield,
  Search,
  Check,
  X,
  AlertTriangle,
  Lock,
  Filter,
  Layers,
} from "lucide-react";
import {
  CustomRoleDefinition,
  PERMISSION_CATALOG,
  SENSITIVE_PERMISSIONS,
  RoleScope,
} from "@/lib/rbac/permissions";

interface RoleMatrixViewProps {
  roles: CustomRoleDefinition[];
  onSelectRole?: (role: CustomRoleDefinition) => void;
}

export function RoleMatrixView({ roles, onSelectRole }: RoleMatrixViewProps) {
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<RoleScope | "all">("all");

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => scopeFilter === "all" || r.scope === scopeFilter);
  }, [roles, scopeFilter]);

  const filteredPermissions = useMemo(() => {
    const q = search.toLowerCase().trim();
    return PERMISSION_CATALOG.filter((p) => {
      const matchSearch =
        !q ||
        p.labelAr.toLowerCase().includes(q) ||
        p.descAr.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q);
      const matchScope =
        scopeFilter === "all" || p.allowedScopes.includes(scopeFilter);
      return matchSearch && matchScope;
    });
  }, [search, scopeFilter]);

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const map = new Map<string, { moduleNameAr: string; items: typeof filteredPermissions }>();
    filteredPermissions.forEach((p) => {
      if (!map.has(p.module)) {
        map.set(p.module, { moduleNameAr: p.moduleNameAr, items: [] });
      }
      map.get(p.module)!.items.push(p);
    });
    return Array.from(map.entries());
  }, [filteredPermissions]);

  return (
    <div className="space-y-4" dir="rtl">
      
      {/* ── CONTROLS BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "كافة النطاقات" },
            { id: "platform", label: "إدارة المنصة (Staff)" },
            { id: "client", label: "منشآت العملاء (B2B)" },
            { id: "vendor", label: "متاجر الموردين (B2B)" },
          ].map((scope) => (
            <button
              key={scope.id}
              onClick={() => setScopeFilter(scope.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                scopeFilter === scope.id
                  ? "bg-slate-900 text-white shadow-xs"
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
            placeholder="بحث في الصلاحيات والمفاتيح..."
            className="w-full h-9 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ── MATRIX TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-right text-xs border-collapse">
            
            {/* Table Header: Roles */}
            <thead className="bg-slate-900 text-white sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="p-4 min-w-[280px] bg-slate-900 sticky right-0 z-30 font-black border-l border-slate-800">
                  الصلاحيات والوحدات الوظيفية ({filteredPermissions.length})
                </th>
                {filteredRoles.map((role) => (
                  <th
                    key={role.id}
                    className="p-3 text-center min-w-[120px] max-w-[150px] font-bold border-l border-slate-800"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                        role.scope === "platform"
                          ? "bg-purple-500/20 text-purple-300"
                          : role.scope === "vendor"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}>
                        {role.scope === "platform" ? "إدارة" : role.scope === "vendor" ? "مورد" : "عميل"}
                      </span>
                      <span className="text-xs font-black text-white line-clamp-1" title={role.name_ar}>
                        {role.name_ar}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        {role.permissions.length} صلاحية
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Grouped Permissions */}
            <tbody className="divide-y divide-slate-100">
              {groupedPermissions.map(([moduleKey, { moduleNameAr, items }]) => (
                <React.Fragment key={moduleKey}>
                  
                  {/* Module Group Banner */}
                  <tr className="bg-slate-100/90 font-black text-slate-800">
                    <td
                      colSpan={filteredRoles.length + 1}
                      className="p-3 text-xs font-black text-slate-900 sticky right-0 bg-slate-100/95 z-10 flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>{moduleNameAr}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.2 rounded-full font-mono">
                        ({items.length})
                      </span>
                    </td>
                  </tr>

                  {/* Permissions rows */}
                  {items.map((perm) => {
                    const isSensitive = perm.isSensitive;

                    return (
                      <tr key={perm.key} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Permission Title & Info (Sticky First Column) */}
                        <td className="p-3.5 sticky right-0 bg-white hover:bg-slate-50/80 z-10 border-l border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{perm.labelAr}</span>
                            {isSensitive && (
                              <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 font-black px-1.5 py-0.2 rounded">
                                حساسة 🛡️
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {perm.key}
                          </span>
                        </td>

                        {/* Roles matrix cells */}
                        {filteredRoles.map((role) => {
                          const hasRolePerm = role.permissions.includes(perm.key);

                          return (
                            <td
                              key={role.id}
                              className="p-3 text-center border-l border-slate-100"
                            >
                              {hasRolePerm ? (
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mx-auto" />
                              )}
                            </td>
                          );
                        })}

                      </tr>
                    );
                  })}

                </React.Fragment>
              ))}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
}

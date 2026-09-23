"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, ChevronLeft, Users, Home } from "lucide-react";
import TeamManagementView from "@/components/team/team-management-view";

export default function ClientRolesPage() {
  return (
    <div className="space-y-6 pb-16 font-sans text-slate-900 w-full" dir="rtl">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
        <Link href="/client" className="hover:text-slate-900 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          <span>الرئيسية</span>
        </Link>
        <ChevronLeft className="w-3 h-3 text-slate-400" />
        <span className="text-slate-900">الأدوار وفريق العمل (RBAC)</span>
      </div>

      {/* Main Studio View */}
      <TeamManagementView role="client" />
    </div>
  );
}

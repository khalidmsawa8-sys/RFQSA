"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  UserCheck,
  Loader2,
  ArrowLeft,
  Sparkles,
  Key,
} from "lucide-react";
import Link from "next/link";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const orgId = searchParams.get("org");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(orgId);
  const [assignedRole, setAssignedRole] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!token) {
      setError("رمز الدعوة غير موجود في الرابط");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          // Redirect to login preserving the token return URL
          router.push(`/auth/login?returnUrl=${encodeURIComponent(window.location.href)}`);
          return;
        }
        throw new Error(data.error || "فشل قبول الدعوة");
      }

      setSuccess(true);
      setTargetOrgId(data.organizationId);
      setAssignedRole(data.roleId);

      if (typeof document !== "undefined") {
        const isVendor = data.roleId?.startsWith("vendor_");
        document.cookie = `rfq_session=${isVendor ? "vendor" : "client"}; path=/; max-age=86400; SameSite=Lax`;
        if (data.roleId) document.cookie = `rfq_role=${data.roleId}; path=/; max-age=86400; SameSite=Lax`;
        if (data.memberId) document.cookie = `rfq_member_id=${data.memberId}; path=/; max-age=86400; SameSite=Lax`;
        if (data.email) document.cookie = `rfq_user_email=${data.email}; path=/; max-age=86400; SameSite=Lax`;
      }

      setTimeout(() => {
        if (data.roleId?.startsWith("vendor_")) {
          window.location.href = "/vendor";
        } else {
          window.location.href = "/client";
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1224] via-[#0F1C36] to-[#0A1224] text-white flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        
        {/* Top Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-xl font-black text-white">دعوة للانضمام إلى فريق العمل</h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
            تمت دعوتك للانضمام إلى منظومة المنشأة لتوزيع المهام وإدارة الصلاحيات
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 text-right">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold space-y-2 text-center animate-in fade-in">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-black text-white">تم قبول الدعوة وتفعيل حسابك بنجاح!</p>
            <p className="text-[11px] text-emerald-300/80 font-medium">الدور الوظيفي المعين: {assignedRole}</p>
            <p className="text-[11px] text-slate-400">جاري توجيهك إلى لوحة التحكم...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 text-xs space-y-2 text-right">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>حساب موثق B2B</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                بالضغط على الزر أدناه، سيتم ربط حسابك بالمنشأة وتفعيل صلاحياتك المعتمدة فورياً.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAccept}
              disabled={loading || !token}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تفعيل العضوية...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>قبول الدعوة والانضمام للمنشأة 🚀</span>
                </>
              )}
            </button>

            <Link
              href="/"
              className="inline-block text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A1224] text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

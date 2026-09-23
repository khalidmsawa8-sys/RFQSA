"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, ShieldAlert, ArrowLeft, LogIn, Headset, CheckCircle2 } from "lucide-react";
import { RfqLogo } from "@/components/rfq-logo";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between relative selection:bg-[#10B981] selection:text-white" dir="rtl">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center pt-28 pb-16 px-4">
        <Card className="w-full max-w-lg shadow-2xl rounded-3xl border-slate-200/80 bg-white overflow-hidden">
          {/* Top Security Banner */}
          <div className="bg-amber-500/10 border-b border-amber-200/60 p-4 text-center">
            <div className="inline-flex items-center gap-2 text-amber-800 text-xs font-bold bg-amber-100/80 px-3 py-1 rounded-full">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>نظام الحسابات المعتمدة المركزية</span>
            </div>
          </div>

          <CardHeader className="text-center flex flex-col items-center pt-6 pb-2">
            <div className="mb-4">
              <RfqLogo size="lg" />
            </div>

            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 mb-3 border border-slate-200 shadow-xs">
              <Lock className="w-7 h-7 text-[#073966]" />
            </div>

            <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              التسجيل المباشر مغلق حالياً
            </CardTitle>
            <CardDescription className="text-slate-600 text-sm mt-2 max-w-md">
              يتم إنشاء وتفعيل حسابات المنصة (العملاء، الموردين، ومناديب التوصيل) من خلال إدارة المنصة حصراً لضمان موثوقية وجودة التعاملات B2B.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4 pb-8">
            {/* Feature Note Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs mb-1">
                <span>إجراءات الانضمام إلى شبكة المنصة:</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>التحقق والاعتماد المسبق للسجل التجاري والرقم الضريبي لموردي قطع الغيار.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>تخصيص حسابات المناديب وربطها بأساطيل التوصيل المعتمدة رسمياً.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>إنشاء وتفعيل محافظ العملاء المعتمدة لضمان أمان الدفعات والحركات المالية.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                asChild
                className="w-full bg-[#073966] hover:bg-[#052c50] text-white font-bold rounded-2xl py-3 text-sm shadow-md transition-all h-12 gap-2"
              >
                <Link href="/auth/login">
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول إلى حساب موجود</span>
                  <ArrowLeft className="w-4 h-4 mr-auto" />
                </Link>
              </Button>

              <div className="text-center">
                <p className="text-xs text-slate-500">
                  هل تحتاج إلى فتح حساب جديد لمنشأتك؟{" "}
                  <Link
                    href="/#contact"
                    className="font-bold text-[#10B981] hover:underline inline-flex items-center gap-1"
                  >
                    <Headset className="w-3.5 h-3.5" />
                    <span>تواصل مع فريق الدعم والإدارة</span>
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs sm:text-sm text-slate-500">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 منصة رِفْق (Rifq B2B SaaS) - جميع الحقوق محفوظة</p>
          <div className="flex items-center gap-4 text-slate-600 font-semibold text-xs">
            <Link href="/#products" className="hover:text-[#073966]">المنتجات</Link>
            <Link href="/#services" className="hover:text-[#073966]">الخدمات</Link>
            <Link href="/#solutions" className="hover:text-[#073966]">الحلول</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

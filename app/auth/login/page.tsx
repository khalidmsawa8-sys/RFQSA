"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { RfqLogo } from "@/components/rfq-logo";

const supabase = createClient();

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const performLogin = async (targetIdentifier: string, targetPass: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: targetIdentifier.trim(),
          password: targetPass,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "بيانات تسجيل الدخول غير صحيحة");
      }

      // Also set client cookies directly for immediate local sync
      const maxAge = 60 * 60 * 24 * 7;
      if (data.user) {
        document.cookie = `rfq_session=${data.user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `rfq_user_id=${data.user.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `rfq_user_email=${data.user.email || ""}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `rfq_user_name=${encodeURIComponent(data.user.fullName || "")}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `rfq_role=${data.user.roleId || ""}; path=/; max-age=${maxAge}; SameSite=Lax`;

        // Sync to client-side localStorage profiles for immediate component availability
        try {
          const rawProfiles = localStorage.getItem("rfq_demo_profiles");
          let pList = rawProfiles ? JSON.parse(rawProfiles) : [];
          const idx = pList.findIndex((p: any) => p.id === data.user.id);
          const pObj = {
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.fullName,
            company_name: data.user.fullName,
            role: data.user.role,
            ref_code: data.user.refCode,
            is_active: true,
          };
          if (idx >= 0) {
            pList[idx] = { ...pList[idx], ...pObj };
          } else {
            pList.push(pObj);
          }
          localStorage.setItem("rfq_demo_profiles", JSON.stringify(pList));
        } catch (e) {}
      }

      try {
        await (supabase.auth as any).signInWithPassword({
          email: data.user?.email || targetIdentifier,
          role: data.user?.role,
          id: data.user?.id,
        });
      } catch (e) {}

      const targetRoute = data.redirectUrl || (data.user?.role === "vendor" ? "/vendor" : data.user?.role === "admin" ? "/admin" : "/client");
      window.location.href = targetRoute;
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تسجيل الدخول");
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("يرجى إدخال البريد الإلكتروني أو رقم الجوال أو الرقم المرجعي");
      return;
    }
    if (!password) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }
    await performLogin(identifier, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between relative selection:bg-[#10B981] selection:text-white">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center pt-28 pb-16 px-4">
        <Card className="w-full max-w-md shadow-2xl rounded-3xl border-slate-200/80 bg-white">
          <CardHeader className="text-center flex flex-col items-center pt-8">
            <div className="mb-3">
              <RfqLogo size="lg" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">تسجيل الدخول</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              منصة رِفق RFQ للمشتريات وعروض الأسعار B2B
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-3.5 text-sm text-destructive font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="identifier" className="font-semibold text-slate-700">
                  البريد الإلكتروني / رقم الجوال / الرقم المرجعي
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="user@example.com أو 05xxxxxxxx أو CUST-xxxxx"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  dir="ltr"
                  className="rounded-2xl py-2.5 text-left"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold text-slate-700">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-2xl py-2.5 text-left"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#073966] hover:bg-[#052d52] text-white font-bold rounded-2xl py-3 text-base shadow-md transition-all mt-2 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحقق وتسجيل الدخول...
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>

              <div className="text-center text-sm text-slate-600 pt-3">
                ليس لديك حساب؟{" "}
                <Link
                  href="/auth/signup"
                  className="font-bold text-[#10B981] hover:underline"
                >
                  إنشاء حساب جديد
                </Link>
              </div>
            </form>
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
